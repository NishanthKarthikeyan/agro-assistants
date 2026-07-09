import axios from 'axios';
import { auth } from '../config/firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5002';
console.log('[api.js] Using API base URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Attach Firebase ID token to every request automatically
api.interceptors.request.use(async (config) => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // getIdToken(false) uses cached token; refreshes automatically when expired
      const idToken = await currentUser.getIdToken(false);
      config.headers.Authorization = `Bearer ${idToken}`;
    }
  } catch (err) {
    console.warn('Could not get Firebase ID token:', err.message);
  }
  return config;
}, (error) => Promise.reject(error));

// Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — Firebase auth listener will handle re-login
      console.warn('401 received — Firebase session may have expired');
    }
    const message = error.response?.data?.error || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export default api;
