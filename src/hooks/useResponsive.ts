import { Platform, useWindowDimensions } from 'react-native';
import { theme } from '../theme';

// iPad mini (744pt) ve üzeri genişlik tablet yerleşimi kullanır
export const TABLET_BREAKPOINT = 744;

// Pencere boyutunu canlı okur. iPadOS 26+ uygulama pencerelerini her zaman yeniden boyutlandırılabilir
// yaptığı için (requireFullScreen dikkate alınmıyor) Dimensions.get('window') modül seviyesinde
// kullanılmamalı: değer uygulama açılırken bir kez okunur ve pencere küçülünce güncellenmez.
export interface ResponsiveInfo {
  width: number;
  height: number;
  isTablet: boolean;
  // Alt kenara yakın öğelere (tab bar, modal butonları) eklenecek ek boşluk; yalnızca Android tablette > 0
  bottomDockOffset: number;
}

export default function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const bottomDockOffset = Platform.OS === 'android' && isTablet ? theme.layout.androidTabletDockOffset : 0;
  return { width, height, isTablet, bottomDockOffset };
}
