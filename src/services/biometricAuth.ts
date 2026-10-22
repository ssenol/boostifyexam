import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Biyometrik giriş (Speak'teki kalıp): çıkıştan ya da oturum düştükten sonra şifre yazmadan giriş.
// Uygulama kilidi değildir; oturum açıkken ve sınav sırasında devreye girmez.
//
// Son başarılı girişin kullanıcı adı ve şifresi yalnızca SecureStore'da (iOS Keychain / Android Keystore) tutulur;
// Profil'den sonradan açılınca bunlar kullanılır. Biyometrik kapalıyken çıkış yapılırsa silinir.

const CREDENTIALS_KEY = 'biometric_credentials'; // SecureStore
const ENABLED_KEY = 'biometric_enabled'; // AsyncStorage
const PROMPT_SHOWN_KEY = 'biometric_prompt_shown'; // AsyncStorage: girişten sonraki teklif bir kez gösterilir
const READY_KEY = 'biometric_storage_ready'; // AsyncStorage: kurulum işareti

export interface StoredCredentials {
  username: string;
  password: string;
}

export interface BiometricAvailability {
  // Cihazda donanım var
  supported: boolean;
  // Cihazda kayıtlı yüz / parmak izi var
  enrolled: boolean;
  // "Face ID", "Touch ID", "Fingerprint"…
  label: string;
}

// iOS Keychain uygulama silinince temizlenmez: işaret yoksa (ilk açılış / yeniden kurulum) önceki kurulumdan
// kalan bilgiler silinir
let storageReady: Promise<void> | null = null;
function ensureStorageReady(): Promise<void> {
  if (!storageReady) {
    storageReady = (async () => {
      if (await AsyncStorage.getItem(READY_KEY)) return;
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      await AsyncStorage.setItem(READY_KEY, 'true');
    })().catch(() => {
      storageReady = null;
    });
  }
  return storageReady;
}

async function getLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  if (Platform.OS === 'ios') return face ? 'Face ID' : finger ? 'Touch ID' : 'Biometrics';
  if (finger && !face) return 'Fingerprint';
  if (face && !finger) return 'Face unlock';
  return 'Biometrics';
}

class BiometricAuthService {
  async getAvailability(): Promise<BiometricAvailability> {
    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      if (!supported) return { supported: false, enrolled: false, label: 'Biometrics' };
      const [enrolled, label] = await Promise.all([LocalAuthentication.isEnrolledAsync(), getLabel()]);
      return { supported, enrolled, label };
    } catch {
      return { supported: false, enrolled: false, label: 'Biometrics' };
    }
  }

  // Sistemin Face ID / parmak izi penceresi. İptal ya da başarısızlıkta false.
  async authenticate(promptMessage: string): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  }

  async isEnabled(): Promise<boolean> {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
  }

  async wasPromptShown(): Promise<boolean> {
    return (await AsyncStorage.getItem(PROMPT_SHOWN_KEY)) === 'true';
  }

  async markPromptShown(): Promise<void> {
    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, 'true');
  }

  async saveCredentials(credentials: StoredCredentials): Promise<void> {
    await ensureStorageReady();
    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
  }

  async getCredentials(): Promise<StoredCredentials | null> {
    await ensureStorageReady();
    const value = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    return value ? (JSON.parse(value) as StoredCredentials) : null;
  }

  async clearCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  }

  // Şifre değiştiyse (invalid_credentials) ya da kullanıcı kapattıysa
  async disable(): Promise<void> {
    await this.setEnabled(false);
    await this.clearCredentials();
  }
}

export default new BiometricAuthService();
