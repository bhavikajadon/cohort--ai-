import axios from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_CRM_URL || '';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
});

export const customersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; tier?: string }) =>
    api.get('/customers', { params }).then(r => r.data),
  stats: () => api.get('/customers/stats').then(r => r.data),
  get: (id: string) => api.get(`/customers/${id}`).then(r => r.data),
};

export const segmentsApi = {
  list: () => api.get('/segments').then(r => r.data),
  aiBuild: (query: string) => api.post('/segments/ai-build', { query }).then(r => r.data),
  create: (data: object) => api.post('/segments', data).then(r => r.data),
  customers: (id: string) => api.get(`/segments/${id}/customers`).then(r => r.data),
  delete: (id: string) => api.delete(`/segments/${id}`).then(r => r.data),
};

export const campaignsApi = {
  list: () => api.get('/campaigns').then(r => r.data),
  get: (id: string) => api.get(`/campaigns/${id}`).then(r => r.data),
  communications: (id: string) => api.get(`/campaigns/${id}/communications`).then(r => r.data),
  create: (data: object) => api.post('/campaigns', data).then(r => r.data),
  send: (id: string) => api.post(`/campaigns/${id}/send`).then(r => r.data),
  stats: (id: string) => api.get(`/receipts/campaign/${id}/stats`).then(r => r.data),
};
