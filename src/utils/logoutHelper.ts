import * as Haptics from "expo-haptics";
import { logout as logoutAction } from "../store/slices/authSlice";
import type { AppDispatch } from "../store";

interface LogoutOptions {
  dispatch: AppDispatch;
}

// Ortak logout fonksiyonu. Yeni slice'lar eklendikçe kullanıcıya ait cache'ler de burada temizlenmeli.
export async function performLogout({ dispatch }: LogoutOptions): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.log("Logout haptics error:", error);
  } finally {
    dispatch(logoutAction());
  }
}
