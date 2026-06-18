import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';   // NestJS backend
const ML_URL  = import.meta.env.VITE_ML_URL  || 'http://localhost:8000';  // FastAPI ML service

// Separate axios instances so we can attach different interceptors if needed
export const apiClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

export const mlClient = axios.create({
    baseURL: ML_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every NestJS request, if we have one
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('fraudguard_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If the API returns 401, auto-logout by clearing the token
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('fraudguard_token');
            localStorage.removeItem('fraudguard_user');
            // Reload to reset the app state
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);