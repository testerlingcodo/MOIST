import client from './client';

export const getPayments = (params) => client.get('/payments', { params });
export const getPayment = (id) => client.get(`/payments/${id}`);
export const createPaymentLink = (data) => client.post('/payments/create-link', data);
export const refundPayment = (id) => client.patch(`/payments/${id}/refund`);
