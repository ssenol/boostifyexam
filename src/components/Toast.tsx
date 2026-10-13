import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { LockIcon } from './icons';

const { colors, fonts } = theme;

const TOAST_MS = 2200;

// Kısa bilgi mesajı ("Pasting is disabled in this test"). Ekran useToast() ile tetikler, <Toast> ile çizer.
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { message, show };
}

interface ToastProps {
  message: string | null;
  // Alt çubuğun üstünde durması için alttan uzaklık
  bottom: number;
  padX: number;
}

export default function Toast({ message, bottom, padX }: ToastProps) {
  if (!message) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.toast, { bottom, left: padX, right: padX }]}>
      <LockIcon size={18} color={colors.bg} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.text,
    shadowColor: colors.neutral900,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  text: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.bg,
  },
});
