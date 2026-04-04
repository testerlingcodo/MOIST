import axios from 'axios';
import { store } from '../store/store';
import { setSession, logout } from '../features/auth/authSlice';

const client = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function normalizeStudentUser(data) {
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    studentId: data.student_id || data.studentId || null,
  };
}

async function restoreStudentSession() {
  const refreshRes = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
  const { accessToken } = refreshRes.data;
  const meRes = await axios.get('/api/v1/auth/me', {
    withCredentials: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const user = normalizeStudentUser(meRes.data || {});

  if (user.role !== 'student' || !user.studentId) {
    throw Object.assign(new Error('Student session required'), { status: 403 });
  }

  store.dispatch(setSession({ accessToken, user }));
  return accessToken;
}

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const accessToken = await restoreStudentSession();
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await axios.post('/api/v1/auth/logout', {}, { withCredentials: true }).catch(() => {});
        store.dispatch(logout());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
