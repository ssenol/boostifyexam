import { isAxiosError } from 'axios';

// Kullanıcıya gösterilecek hata metni. Backend'in { message } alanı varsa o kullanılır.
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'No connection. Check your internet and try again.';
    const message = (error.response.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message) return message;
    return 'The server could not complete the request.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}
