import { isAxiosError } from 'axios';
import type { ApiErrorBody } from '../types/api';

// API'den dönen hata. Ağ hatasında (yanıt hiç gelmedi) code 'network_error', status 0 olur.
export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(code: string, status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  get isNetworkError(): boolean {
    return this.code === NETWORK_ERROR;
  }
}

export const NETWORK_ERROR = 'network_error';

// Axios hatasını ApiError'a çevirir. Gövde rehberdeki kalıpta değilse HTTP durumundan genel bir kod üretilir.
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    if (!error.response) return new ApiError(NETWORK_ERROR, 0, error.message);
    const body = error.response.data as Partial<ApiErrorBody> | undefined;
    const status = error.response.status;
    if (body?.error?.code) {
      return new ApiError(body.error.code, status, body.error.message ?? '', body.error.details);
    }
    return new ApiError(status >= 500 ? 'server_error' : 'bad_request', status, error.message);
  }
  return new ApiError('unknown', 0, error instanceof Error ? error.message : String(error));
}

export function isApiError(error: unknown, ...codes: string[]): error is ApiError {
  return error instanceof ApiError && (codes.length === 0 || codes.includes(error.code));
}

const GENERIC_MESSAGE = 'Something went wrong. Try again.';

// Öğrenciye gösterilecek metinler. Rehberdeki hata tablosunun İngilizce karşılığı; tabloda "gösterilmez" olan
// kodlar (token_*, invalid_id, route_not_found vb.) burada yok ve genel metne düşer.
const MESSAGES: Record<string, string> = {
  [NETWORK_ERROR]: 'You seem to be offline. Check your connection and try again.',
  credentials_required: 'Enter your username and password.',
  invalid_credentials: 'The username or password is not correct.',
  students_only: 'This app is for students. Please use the web panel.',
  account_disabled: 'Your account is not active. Please talk to your school.',
  refresh_expired: 'Your session has ended. Please sign in again.',
  refresh_invalid: 'Your session has ended. Please sign in again.',
  refresh_revoked: 'Your session has ended. Please sign in again.',
  not_assigned: 'This test is not assigned to you.',
  not_found: 'Test not found.',
  not_started: 'This test is not open yet.',
  closed: 'This test is closed.',
  invalid_answer: 'Your answer could not be saved. Try again.',
  no_plays_left: 'You have no plays left for this recording.',
  no_audio_file: 'Recording not found. Record again.',
  bad_upload: 'The recording could not be sent. Try again.',
  audio_too_large: 'The recording is too long.',
  unsupported_audio: 'This recording format is not supported.',
  not_finished: 'This test is not finished yet.',
  result_not_found: 'Result not found.',
  certificate_not_ready: 'Your certificate is not ready yet.',
  body_too_large: 'The text is too long.',
  too_many_requests: 'Too many attempts. Wait a moment and try again.',
  server_error: GENERIC_MESSAGE,
  server_misconfigured: 'Something went wrong. Please try again later.',
};

// Kullanıcıya gösterilecek hata metni. Sunucunun message alanı kullanılmaz; metin koddan seçilir.
export function getErrorMessage(error: unknown): string {
  // Uygulamanın kendi fırlattığı hatalar (ör. sahte sunucu) olduğu gibi gösterilir
  if (!(error instanceof ApiError) && !isAxiosError(error) && error instanceof Error && error.message) {
    return error.message;
  }
  const apiError = toApiError(error);
  return MESSAGES[apiError.code] ?? GENERIC_MESSAGE;
}
