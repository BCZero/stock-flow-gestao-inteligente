import axios from 'axios';

// Endereço da API definido no build (ex.: VITE_API_URL=https://stockflow-api.onrender.com).
// Sem a variável, usa a API local do ambiente de desenvolvimento.
const origemApi = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const api = axios.create({
  baseURL: origemApi + '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
