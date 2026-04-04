import axios from 'axios';

export const login = (identifier, password) =>
  axios.post('/api/v1/auth/login', { studentNumber: identifier, password }, { withCredentials: true });

export const logout = () =>
  axios.post('/api/v1/auth/logout', {}, { withCredentials: true });
