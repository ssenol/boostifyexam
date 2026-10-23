import { API_ENDPOINTS, apiGet, apiPost } from "../config/api";
import type { AuthSession, AuthUser } from "../types/api";

// Giriş, profil ve çıkış. Token yenileme API katmanında (src/config/api.ts) otomatik yapılır.
class AuthService {
  // Hatalar: 400 credentials_required, 401 invalid_credentials, 403 students_only, 401 account_disabled,
  // 429 too_many_requests
  login(username: string, password: string): Promise<AuthSession> {
    return apiPost<AuthSession>(API_ENDPOINTS.auth.login, { username, password });
  }

  // Web'den (service.ueslms) deep link ile gelen şifreli SSO token'ını oturuma çevirir. Yanıt /auth/login ile aynı,
  // öğrenci kontrolü (students_only) dahil. /auth/* olduğu için mevcut access token'ı göndermez, 401'de yenilemez.
  loginWithSsoToken(ssoToken: string): Promise<AuthSession> {
    return apiPost<AuthSession>(API_ENDPOINTS.auth.ssoMobile, { token: ssoToken });
  }

  async me(): Promise<AuthUser> {
    const data = await apiGet<{ user: AuthUser }>(API_ENDPOINTS.me);
    return data.user;
  }

  // Yenileme anahtarını sunucuda geçersiz kılar. Sonucu beklenmez: tokenlar her durumda telefondan silinir.
  async logout(refreshToken: string): Promise<void> {
    await apiPost(API_ENDPOINTS.auth.logout, { refreshToken });
  }
}

export default new AuthService();
