import client from './client';

export const getGrades = (params) => client.get('/grades', { params });
export const getGrade = (id) => client.get(`/grades/${id}`);
export const encodeGrade = (data) => client.post('/grades', data);
export const updateGrade = (id, data) => client.patch(`/grades/${id}`, data);
export const submitGrade = (id) => client.post(`/grades/${id}/submit`);
