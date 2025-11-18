import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const directToken = localStorage.getItem('token');
  if (directToken) {
    return directToken;
  }

  const persistedState = localStorage.getItem('auth-storage');
  if (persistedState) {
    try {
      const parsed = JSON.parse(persistedState);
      return parsed?.state?.token ?? null;
    } catch {
      return null;
    }
  }

  return null;
};

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default api;
