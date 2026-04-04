import client from './client';

export const getEnrollments = (params) => client.get('/enrollments', { params });
export const getEnrollment = (id) => client.get(`/enrollments/${id}`);
export const createEnrollment = (data) => client.post('/enrollments', data);
export const updateEnrollment = (id, data) => client.patch(`/enrollments/${id}`, data);
export const deleteEnrollment = (id) => client.delete(`/enrollments/${id}`);
export const getSubjects = (params) => client.get('/subjects', { params });
