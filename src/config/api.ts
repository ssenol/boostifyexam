import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { store } from "../store/index";
import { logout, setCredentials } from "../store/slices/authSlice";
import type { ApiResponse, AuthUser } from "../types/api";

// Uygulamaya özel axios config alanları
declare module "axios" {
  interface AxiosRequestConfig {
    // true ise request interceptor Authorization header'ına dokunmaz (ör. sınava özel geçici token)
    skipAuthInterceptor?: boolean;
    // 401 sonrası tek seferlik retry işareti
    _retry?: boolean;
  }
}

interface RefreshResponseData {
  accessToken: string;
  user?: AuthUser;
}

const BASE_URL = "https://quizmaker-api.onrender.com/api/v0.0.1";

const api = axios.create({
  timeout: 20000,
});

export const API_ENDPOINTS = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    refresh: `${BASE_URL}/auth/refresh-mobile-app-access-token`,
  },
  // TODO: Sınav endpoint'leri (atanan sınavlar, sınav oturumu, cevap kaydı, raporlar) backend ile netleşince eklenecek
} as const;

// Refresh token ile yeni access token alır ve store'u günceller
const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const response = await axios.post<ApiResponse<RefreshResponseData>>(
    API_ENDPOINTS.auth.refresh,
    { refreshToken }
  );
  const { accessToken: newAccessToken, user: newUser } = response.data.data!;

  store.dispatch(setCredentials({
    token: newAccessToken,
    user: { ...store.getState().auth.currentUser, ...newUser },
    refreshToken: refreshToken,
    tokenAcquiredAt: Date.now(),
  }));

  return newAccessToken;
};

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken, tokenAcquiredAt, refreshToken } = store.getState().auth;

    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh')) {
      return config;
    }

    if (config.skipAuthInterceptor) {
      return config;
    }

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (accessToken && tokenAcquiredAt && now - tokenAcquiredAt > twentyFourHours) {
      if (refreshToken) {
        try {
          const newAccessToken = await refreshAccessToken(refreshToken);
          config.headers.Authorization = `Bearer ${newAccessToken}`;
          return config;
        } catch (e) {
          store.dispatch(logout());
          return Promise.reject(e);
        }
      }
      store.dispatch(logout());
      return Promise.reject(new Error("No refresh token"));
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (originalRequest && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { refreshToken } = store.getState().auth;

      if (refreshToken) {
        try {
          const newAccessToken = await refreshAccessToken(refreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          store.dispatch(logout());
          return Promise.reject(refreshError);
        }
      }
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;
