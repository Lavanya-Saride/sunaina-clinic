import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
  //import.meta.env.VITE_API_BASE_URL || 'https://sunaina-clinic-api.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;