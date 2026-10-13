import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Storage } from 'redux-persist';

// redux-persist için auth depolaması: accessToken/refreshToken SecureStore'da (iOS Keychain / Android Keystore),
// kalan alanlar (currentUser vb.) AsyncStorage'da. Kullanıcı objesi Android SecureStore'un 2048 byte sınırını
// aşabildiği için kaydın tamamı SecureStore'a konmaz.
//
// redux-persist kaydı şu biçimde yazar: her alan ayrıca JSON.stringify edilmiş bir obje, ör.
// {"accessToken":"\"eyJ…\"","currentUser":"{…}","_persist":"{…}"}. Token alanları bu ham string'lerle taşınır.

const TOKEN_FIELDS = ['accessToken', 'refreshToken'] as const;

// SecureStore anahtarlarında ':' kullanılamaz ("persist:auth" → "persist_auth_accessToken")
const secureKey = (storageKey: string, field: string) => `${storageKey.replace(/[^A-Za-z0-9._-]/g, '_')}_${field}`;

// Son yazılan token değerleri; redux-persist her state değişikliğinde kaydı yeniden yazar, SecureStore'a
// yalnızca token değişince yazılır
const lastWritten = new Map<string, string | null>();

async function readSecure(key: string): Promise<string | null> {
  const value = await SecureStore.getItemAsync(key);
  lastWritten.set(key, value);
  return value;
}

async function writeSecure(key: string, serialized: string): Promise<void> {
  if (lastWritten.get(key) === serialized) return;
  // Çıkışta token null olur: anahtarı sil
  if (serialized === 'null') {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, serialized);
  }
  lastWritten.set(key, serialized);
}

const secureAuthStorage: Storage = {
  async getItem(key: string): Promise<string | null> {
    const raw = await AsyncStorage.getItem(key);

    if (!raw) {
      // Kayıt yok (ilk kurulum, yeniden kurulum veya AsyncStorage temizlendi): iOS Keychain uygulama silinince
      // temizlenmediği için önceki kurulumdan kalan token'lar kullanılmaz ve silinir
      for (const field of TOKEN_FIELDS) {
        const sk = secureKey(key, field);
        await SecureStore.deleteItemAsync(sk);
        lastWritten.set(sk, null);
      }
      return raw;
    }

    const stored = JSON.parse(raw) as Record<string, string>;
    for (const field of TOKEN_FIELDS) {
      const secureValue = await readSecure(secureKey(key, field));
      if (secureValue !== null) {
        stored[field] = secureValue;
      }
    }
    return JSON.stringify(stored);
  },

  async setItem(key: string, value: string): Promise<void> {
    const stored = JSON.parse(value) as Record<string, string>;

    // Önce token'lar SecureStore'a; AsyncStorage'daki kayıt ancak ondan sonra token'sız yazılır. Arada bir kesinti
    // olursa eski kayıt kalır, veri kaybı olmaz
    for (const field of TOKEN_FIELDS) {
      if (stored[field] === undefined) continue;
      await writeSecure(secureKey(key, field), stored[field]);
      delete stored[field];
    }

    await AsyncStorage.setItem(key, JSON.stringify(stored));
  },

  async removeItem(key: string): Promise<void> {
    for (const field of TOKEN_FIELDS) {
      const sk = secureKey(key, field);
      await SecureStore.deleteItemAsync(sk);
      lastWritten.set(sk, null);
    }
    await AsyncStorage.removeItem(key);
  },
};

export default secureAuthStorage;
