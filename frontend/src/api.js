import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// إضافة التوكن تلقائيًا في كل طلب إذا كان موجودًا
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const createInvoice = (invoice) => api.post('/invoices/', invoice);
export const getInvoices = () => api.get('/invoices/');

export const sendToPortal = (invoice) => api.post('/portal/', invoice);

export default api;
