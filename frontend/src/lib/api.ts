import axios from 'axios';

// Use the same hostname the browser is on — enables phone testing on LAN
const API_URL = `http://${window.location.hostname}:8000`;

export const api = axios.create({
  baseURL: API_URL,
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If token expires, redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('qs_token');
      localStorage.removeItem('qs_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Hardware ID — persistent per browser, used for anti-proxy device lock
export const getHardwareId = (): string => {
  let hwid = localStorage.getItem('qs_hwid');
  if (!hwid) {
    hwid = 'WEB-' + crypto.randomUUID();
    localStorage.setItem('qs_hwid', hwid);
  }
  return hwid;
};

// Auth helpers
export const saveAuth = (token: string, user: any) => {
  localStorage.setItem('qs_token', token);
  localStorage.setItem('qs_user', JSON.stringify(user));
};

export const getUser = () => {
  const raw = localStorage.getItem('qs_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const logout = () => {
  localStorage.removeItem('qs_token');
  localStorage.removeItem('qs_user');
  window.location.href = '/';
};

export const isLoggedIn = () => !!localStorage.getItem('qs_token');
