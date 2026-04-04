import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import AppRouter from './router/AppRouter';
import { logout, setSession } from './features/auth/authSlice';

function normalizeStudentUser(data) {
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    studentId: data.student_id || data.studentId || null,
  };
}

export default function App() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((s) => s.auth);
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (accessToken && user) {
      setReady(true);
      return;
    }

    (async () => {
      try {
        const refreshRes = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        const { accessToken: nextAccessToken } = refreshRes.data;
        const meRes = await axios.get('/api/v1/auth/me', {
          withCredentials: true,
          headers: { Authorization: `Bearer ${nextAccessToken}` },
        });
        const nextUser = normalizeStudentUser(meRes.data || {});

        if (nextUser.role !== 'student' || !nextUser.studentId) {
          throw new Error('Student session required');
        }

        dispatch(setSession({ accessToken: nextAccessToken, user: nextUser }));
      } catch {
        await axios.post('/api/v1/auth/logout', {}, { withCredentials: true }).catch(() => {});
        dispatch(logout());
      } finally {
        setReady(true);
      }
    })();
  }, [accessToken, dispatch, user]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-slate-200 border-t-[#7a1324] animate-spin" />
          <p className="text-sm text-slate-500">Restoring session...</p>
        </div>
      </div>
    );
  }

  return <AppRouter />;
}
