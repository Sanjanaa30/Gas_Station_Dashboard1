import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; password: string; full_name: string; business_name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Stations
export const stationsApi = {
  getAll: () => api.get('/stations'),
  get: (id: number) => api.get(`/stations/${id}`),
  create: (data: { name: string; location: string; city?: string; state?: string }) =>
    api.post('/stations', data),
  update: (id: number, data: any) => api.put(`/stations/${id}`, data),
  delete: (id: number) => api.delete(`/stations/${id}`),
};

// Fuel Types
export const fuelTypesApi = {
  getAll: () => api.get('/fuel-types'),
};

// Invoices
export const invoicesApi = {
  getAll: (params?: { station_id?: number; fuel_type_id?: number; start_date?: string; end_date?: string; search?: string }) =>
    api.get('/invoices', { params }),
  get: (id: number) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  update: (id: number, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  uploadPdf: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/invoices/${id}/upload-pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  exportCsv: (params?: { station_id?: number; fuel_type_id?: number; start_date?: string; end_date?: string }) => {
    const token = localStorage.getItem('token');
    const queryString = new URLSearchParams(
      Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== null) as [string, string][]
    ).toString();
    window.open(`${API_BASE_URL}/invoices/export/csv?${queryString}`, '_blank');
  },
};

// Sales
export const salesApi = {
  getAll: (params?: { station_id?: number; fuel_type_id?: number; start_date?: string; end_date?: string }) =>
    api.get('/sales', { params }),
  get: (id: number) => api.get(`/sales/${id}`),
  create: (data: any) => api.post('/sales', data),
  update: (id: number, data: any) => api.put(`/sales/${id}`, data),
  delete: (id: number) => api.delete(`/sales/${id}`),
  exportCsv: (params?: { station_id?: number; fuel_type_id?: number; start_date?: string; end_date?: string }) => {
    const queryString = new URLSearchParams(
      Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== null) as [string, string][]
    ).toString();
    window.open(`${API_BASE_URL}/sales/export/csv?${queryString}`, '_blank');
  },
};

// Dashboard
export const dashboardApi = {
  get: (params?: { station_id?: number; days?: number; start_date?: string; end_date?: string }) =>
    api.get('/dashboard', { params }),
};

export default api;
