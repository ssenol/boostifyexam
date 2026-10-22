import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

// unknown: henüz sorulmadı (ya da tekrar sorulabilir); denied: reddedildi, sadece Ayarlar'dan açılır
export type MicPermission = 'unknown' | 'granted' | 'denied';

// Mikrofon izni (speaking görevi). Ayarlar'dan dönünce yeniden okunur.
export default function useMicPermission() {
  const [status, setStatus] = useState<MicPermission>('unknown');

  useEffect(() => {
    // Okunamazsa mevcut durum kalır
    const check = () =>
      getRecordingPermissionsAsync()
        .then((p) => setStatus(p.granted ? 'granted' : p.canAskAgain ? 'unknown' : 'denied'))
        .catch(() => {});
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, []);

  const request = useCallback(async () => {
    try {
      const p = await requestRecordingPermissionsAsync();
      setStatus(p.granted ? 'granted' : 'denied');
    } catch {
      setStatus('denied');
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  return { status, request, openSettings };
}
