import axios, { AxiosError, AxiosRequestConfig, create } from "axios";
import { store } from "../store/index";
import { logout, setCredentials } from "../store/slices/authSlice";
import type { ApiSuccess, AuthSession } from "../types/api";
import { ApiError, toApiError } from "../utils/errors";

// Uygulamaya özel axios config alanı
declare module "axios" {
  interface AxiosRequestConfig {
    // 401 sonrası tek seferlik retry işareti
    _retry?: boolean;
  }
}

// Adres ortam ayarıdır: EXPO_PUBLIC_API_BASE_URL verilirse (ör. test sunucusu) o kullanılır
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://quizmaker-api.onrender.com/api/v0.0.1/mobile/exam";

export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  },
  me: "/me",
  exams: "/exams",
  exam: (assignmentId: string) => `/exams/${assignmentId}`,
  results: "/results",
  result: (sessionId: string) => `/results/${sessionId}`,
  certificate: (sessionId: string) => `/results/${sessionId}/certificate`,
  start: (assignmentId: string) => `/exams/${assignmentId}/start`,
  session: (sessionId: string) => `/sessions/${sessionId}`,
  answer: (sessionId: string) => `/sessions/${sessionId}/answer`,
  audioPlay: (sessionId: string) => `/sessions/${sessionId}/audio/play`,
  heartbeat: (sessionId: string) => `/sessions/${sessionId}/heartbeat`,
  pause: (sessionId: string) => `/sessions/${sessionId}/pause`,
  events: (sessionId: string) => `/sessions/${sessionId}/events`,
  transcribe: (sessionId: string) => `/sessions/${sessionId}/speaking/transcribe`,
  productive: (sessionId: string) => `/sessions/${sessionId}/productive`,
} as const;

const TIMEOUT_MS = 20000;

const api = create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
});

// /auth/* istekleri token taşımaz ve 401 aldığında yenileme/çıkış tetiklemez (ör. yanlış şifre)
const isAuthPath = (url?: string) => !!url?.startsWith("/auth/");

// Devam eden yenileme. Aynı anda 401 alan istekler tek yenilemeyi bekler.
let refreshInFlight: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = requestNewTokens().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function requestNewTokens(): Promise<string> {
  const refreshToken = store.getState().auth.refreshToken;
  if (!refreshToken) {
    throw new ApiError("refresh_missing", 401, "No refresh token");
  }
  try {
    // Interceptor'lardan geçmesin diye ayrı axios çağrısı
    const response = await axios.post<ApiSuccess<AuthSession>>(
      `${BASE_URL}${API_ENDPOINTS.auth.refresh}`,
      { refreshToken },
      { timeout: TIMEOUT_MS }
    );
    // Yenileme sürerken çıkış yapıldıysa oturumu geri açma
    if (store.getState().auth.refreshToken !== refreshToken) {
      throw new ApiError("refresh_revoked", 401, "Signed out during refresh");
    }
    const { accessToken, refreshToken: newRefreshToken, user } = response.data.data;
    store.dispatch(setCredentials({ accessToken, refreshToken: newRefreshToken, user }));
    return accessToken;
  } catch (error) {
    throw toApiError(error);
  }
}

api.interceptors.request.use((config) => {
  const { accessToken } = store.getState().auth;
  if (accessToken && !isAuthPath(config.url)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Bütün hatalar ApiError olarak döner; ekranlar error.code ile karar verir
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const apiError = toApiError(error);
    const original = error.config;

    if (apiError.status !== 401 || !original || isAuthPath(original.url)) {
      throw apiError;
    }

    // Erişim anahtarının süresi dolduysa ya da bozuksa sessizce yenile ve isteği bir kez tekrarla
    if ((apiError.code === "token_expired" || apiError.code === "token_invalid") && !original._retry) {
      original._retry = true;
      let accessToken: string;
      try {
        accessToken = await refreshAccessToken();
      } catch (refreshError) {
        const refreshApiError = toApiError(refreshError);
        // Yenileme anahtarı geçersizse (refresh_*, account_disabled) çıkış. Ağ ya da sunucu hatasında oturum
        // korunur: eski anahtar sunucuda 60 sn daha kabul edildiği için sonraki istek yeniden dener.
        if (refreshApiError.status === 401) store.dispatch(logout());
        throw refreshApiError;
      }
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    }

    // token_missing, account_disabled ya da yenilemeden sonra yine 401
    store.dispatch(logout());
    throw apiError;
  }
);

// Yanıtın data alanını döner. Boş gövde gereken POST isteklerinde {} gönderilir.
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiSuccess<T>>(url, config);
  return response.data.data;
}

export async function apiPost<T>(url: string, body: unknown = {}, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<ApiSuccess<T>>(url, body, config);
  return response.data.data;
}

export default api;
