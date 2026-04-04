import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password });

export const logout = () =>
  client.post('/auth/logout');

export const getMe = () =>
  client.get('/auth/me');

export const forgotPassword = (email) =>
  client.post('/auth/forgot-password', { email });

export const resetPassword = (email, otp, newPassword) =>
  client.post('/auth/reset-password', { email, otp, newPassword });
