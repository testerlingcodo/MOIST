import client from './client';

export const getStudents = (params) => client.get('/students', { params });
export const getStudent = (id) => client.get(`/students/${id}`);
export const createStudent = (data) => client.post('/students', data);
export const updateStudent = (id, data) => client.patch(`/students/${id}`, data);
export const deleteStudent = (id) => client.delete(`/students/${id}`);
export const approveStudent = (id) => client.patch(`/students/${id}/approve`);
export const rejectStudent = (id) => client.patch(`/students/${id}/reject`);
export const getStudentGrades = (id) => client.get(`/students/${id}/grades`);
export const getStudentEnrollments = (id) => client.get(`/students/${id}/enrollments`);
export const getStudentPayments = (id) => client.get(`/students/${id}/payments`);
