import * as Haptics from "expo-haptics";
import authService from "../services/auth";
import biometricAuth from "../services/biometricAuth";
import { store, type AppDispatch } from "../store";
import { logout as logoutAction } from "../store/slices/authSlice";

interface LogoutOptions {
  dispatch: AppDispatch;
}

// Ortak logout fonksiyonu. Yeni slice'lar eklendikçe kullanıcıya ait cache'ler de burada temizlenmeli.
export async function performLogout({ dispatch }: LogoutOptions): Promise<void> {
  const { refreshToken } = store.getState().auth;

  // Sunucuya bildir ama bekleme: cevap ne gelirse gelsin (ağ hatası dahil) tokenlar telefondan silinir.
  // Erişim anahtarı çıkıştan sonra 2 saat daha geçerli kaldığı için yerel silme şart.
  if (refreshToken) {
    authService.logout(refreshToken).catch(() => {});
  }

  // Biyometrik kapalıysa son girişin şifresi telefonda kalmaz; açıksa sonraki giriş için saklanır
  try {
    if (!(await biometricAuth.isEnabled())) await biometricAuth.clearCredentials();
  } catch (error) {
    console.log("Logout credential cleanup error:", error);
  }

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.log("Logout haptics error:", error);
  } finally {
    dispatch(logoutAction());
  }
}
