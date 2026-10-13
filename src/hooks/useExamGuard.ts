import { useEffect, useLayoutEffect, useRef } from 'react';
import { AppState, AppStateStatus, BackHandler, Dimensions, Platform, useWindowDimensions } from 'react-native';
import type { SecurityEventType } from '../types/exam';

// Pencere ekranın bu oranından daralırsa (iPad Split View / Slide Over, Android çoklu pencere) çıkış sayılır
const SPLIT_RATIO = 0.85;

interface LeaveInfo {
  type: SecurityEventType;
  reason: string;
}

interface ExamGuardOptions {
  // Yalnızca sınav sürerken (oturum aktif) izlenir; duraklatılmış "Welcome back" ekranında izlenmez
  enabled: boolean;
  // Öğrenci sınav ekranından ayrıldığı an (süre burada durdurulmalı)
  onLeave: (info: LeaveInfo) => void;
  // Geri döndüğünde; ayrılma süresince olan en "ağır" olay ile çağrılır (uyarı penceresi burada açılır)
  onReturn: (info: LeaveInfo) => void;
  // Android donanım geri tuşu / geri hareketi
  onBackPress: () => void;
}

const BACKGROUND: LeaveInfo = { type: 'app_background', reason: 'You switched to another app.' };
const INACTIVE: LeaveInfo = {
  type: 'app_inactive',
  reason: 'You opened the control centre, notifications or the app switcher.',
};
const SPLIT: LeaveInfo = { type: 'window_resized', reason: 'The screen was split or a side panel opened.' };

// Kişisel cihazda uygulama kilitlenemez; bu hook ayrılmaları tespit eder (bkz. .claude/notes/mimari-ve-guvenlik-karari.md)
export default function useExamGuard({ enabled, onLeave, onReturn, onBackPress }: ExamGuardOptions) {
  const away = useRef<LeaveInfo | null>(null);
  const handlers = useRef({ onLeave, onReturn, onBackPress });
  const enabledRef = useRef(enabled);
  // Abonelikler bir kez kurulur; güncel callback'ler ref üzerinden okunur
  useLayoutEffect(() => {
    handlers.current = { onLeave, onReturn, onBackPress };
    enabledRef.current = enabled;
  });

  // Uygulamadan ayrılma. iOS: önce "inactive" (kontrol merkezi, bildirim, uygulama değiştirici, gelen arama),
  // devam ederse "background". Android'de bildirim paneli "blur" olarak gelir.
  useEffect(() => {
    const leave = (info: LeaveInfo) => {
      if (!away.current) {
        if (!enabledRef.current) return;
        away.current = info;
        handlers.current.onLeave(info);
      } else if (info.type === 'app_background') {
        // inactive → background: uygulamadan tamamen çıktı
        away.current = info;
      }
    };

    const back = () => {
      const info = away.current;
      away.current = null;
      if (info) handlers.current.onReturn(info);
    };

    const change = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') back();
      else leave(next === 'background' ? BACKGROUND : INACTIVE);
    });

    const subs = [change];
    if (Platform.OS === 'android') {
      subs.push(AppState.addEventListener('blur', () => leave(INACTIVE)));
      subs.push(AppState.addEventListener('focus', () => {
        if (AppState.currentState === 'active') back();
      }));
    }
    return () => subs.forEach((s) => s.remove());
  }, []);

  // Ekran bölme: pencere genişliği ekran genişliğinden belirgin şekilde küçükse. Ekran boyutu yönle birlikte döndüğü
  // için cihazı çevirmek tetiklemez.
  const { width } = useWindowDimensions();
  const isSplit = width < Dimensions.get('screen').width * SPLIT_RATIO;
  const wasSplit = useRef(isSplit);
  useEffect(() => {
    if (isSplit && !wasSplit.current && enabledRef.current) {
      handlers.current.onLeave(SPLIT);
      handlers.current.onReturn(SPLIT);
    }
    wasSplit.current = isSplit;
  }, [isSplit]);

  // Android geri tuşu sınavı kapatmaz; "Pause" penceresini açar
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handlers.current.onBackPress();
      return true;
    });
    return () => sub.remove();
  }, []);
}
