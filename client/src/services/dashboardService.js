import api from './api';

const STORAGE_KEY = 'sc_dashboard_session';
const PROTECTED_PREFIXES = ['/dashboard', '/auth/me', '/auth/logout'];

let unauthorizedHandler = null;

export function getStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.expiresAt || new Date(session.expiresAt) <= new Date()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function storeSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function isProtected(url = '') {
  return PROTECTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

api.interceptors.request.use((config) => {
  if (isProtected(config.url)) {
    const session = getStoredSession();
    if (session) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && isProtected(error.config?.url)) {
      clearSession();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password });
  return response.data.data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    clearSession();
  }
}

export async function fetchCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data.data;
}

export async function fetchAppointments(params, signal, { background = false } = {}) {
  const response = await api.get('/dashboard/appointments', {
    params,
    signal,
    headers: background ? { 'X-Background-Poll': '1' } : undefined,
  });
  return response.data;
}

export async function createOfflineAppointment(payload) {
  const response = await api.post('/dashboard/appointments', payload);
  return response.data.data;
}

export async function confirmPayment(id, payload) {
  const response = await api.post(`/dashboard/appointments/${id}/confirm-payment`, payload);
  return response.data.data;
}

export async function markAttendance(id, status) {
  const response = await api.post(`/dashboard/appointments/${id}/attendance`, { status });
  return response.data.data;
}

export async function cancelAppointment(id, reason) {
  const response = await api.post(`/dashboard/appointments/${id}/cancel`, reason ? { reason } : {});
  return response.data.data;
}

export async function retryAutomation(id) {
  const response = await api.post(`/dashboard/appointments/${id}/retry`);
  return response.data.data;
}

export async function searchPatients(search) {
  const response = await api.get('/dashboard/patients', { params: { search } });
  return response.data.data;
}
