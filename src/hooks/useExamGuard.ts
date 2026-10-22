import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AppState, BackHandler } from 'react-native';

// Webdeki gibi bundan kısa ayrılışlar sayılmaz
const MIN_AWAY_SECONDS = 0.6;

interface ExamGuardOptions {
  // Sınav sürerken izlenir
  enabled: boolean;
  // Uygulama arka plana alınıp geri gelindi; sunucuya tabSwitch olarak gider
  onReturn: (secondsAway: number) => void;
  // Android donanım geri tuşu / geri hareketi
  onBackPress: () => void;
  // Hareketsizlik sayacı işlesin mi (dinleme çalarken, kayıt alınırken, uyarı penceresi açıkken işlemez)
  inactivityCounting: boolean;
  inactivityWarnSeconds: number;
  inactivityEndSeconds: number;
  onInactivityWarn: () => void;
  onInactivityEnd: () => void;
}

// Kişisel cihazda uygulama kilitlenemez: ayrılma ve hareketsizlik tespit edilir, karar sunucuda verilir
// (rehber: "Süre, duraklatma ve sınav kuralları").
// - Sadece "background" sayılır. iOS'ta bildirim / kontrol merkezi ve uygulamanın kendi izin pencereleri yalnızca
//   "inactive" yapar; bunlar sayılmaz.
// - Ekrana dokunma, yazma ve kaydırma etkinliktir: ekran markActive'i çağırır.
export default function useExamGuard(options: ExamGuardOptions) {
  const handlers = useRef(options);
  useLayoutEffect(() => {
    handlers.current = options;
  });

  const leftAt = useRef<number | null>(null);
  // Sayaç başlarken (effect) ayarlanır
  const lastActive = useRef(0);
  // Hareketsizlik aşaması; etkinlik olunca başa döner
  const stage = useRef<'active' | 'warned' | 'ended'>('active');

  const markActive = useCallback(() => {
    lastActive.current = Date.now();
    if (stage.current === 'warned') stage.current = 'active';
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        if (handlers.current.enabled && leftAt.current == null) leftAt.current = Date.now();
      } else if (next === 'active') {
        const since = leftAt.current;
        leftAt.current = null;
        // Arka planda geçen süre hareketsizlik sayılmaz
        lastActive.current = Date.now();
        if (since == null) return;
        const seconds = (Date.now() - since) / 1000;
        if (seconds >= MIN_AWAY_SECONDS) handlers.current.onReturn(seconds);
      }
    });
    return () => sub.remove();
  }, []);

  const { enabled, inactivityCounting, inactivityWarnSeconds, inactivityEndSeconds } = options;
  useEffect(() => {
    if (!enabled || !inactivityCounting) return;
    // Sayaç durduktan sonra baştan başlar
    lastActive.current = Date.now();
    if (stage.current !== 'ended') stage.current = 'active';
    const timer = setInterval(() => {
      const idle = (Date.now() - lastActive.current) / 1000;
      if (idle >= inactivityEndSeconds && stage.current !== 'ended') {
        stage.current = 'ended';
        handlers.current.onInactivityEnd();
      } else if (idle >= inactivityWarnSeconds && stage.current === 'active') {
        stage.current = 'warned';
        handlers.current.onInactivityWarn();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [enabled, inactivityCounting, inactivityWarnSeconds, inactivityEndSeconds]);

  // Android geri tuşu sınavı kapatmaz; "Sınavdan çık" penceresini açar
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handlers.current.onBackPress();
      return true;
    });
    return () => sub.remove();
  }, []);

  return { markActive };
}
