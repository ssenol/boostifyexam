import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useResponsive from './useResponsive';

// Ekranın altındaki buton / içerik boşluğu. Sistem alanı (home indicator, nav bar) + Android tablette dock payı.
// Kullanım: const bottom = useBottomSpacing(); paddingBottom: bottom(12)
export default function useBottomSpacing() {
  const insets = useSafeAreaInsets();
  const { bottomDockOffset } = useResponsive();
  return useCallback((min: number) => Math.max(min, insets.bottom) + bottomDockOffset, [insets.bottom, bottomDockOffset]);
}
