import axios from 'axios';

const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL?.trim();

const API_BASE_URL =
  configuredApiUrl ||
  (import.meta.env.PROD
    ? 'https://sunaina-clinic-api.onrender.com/api'
    : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ''),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default api;