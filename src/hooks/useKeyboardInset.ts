import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, LayoutAnimation, Platform, View } from 'react-native';

// Klavyenin bir kutunun altını ne kadar kapattığı (dp). Kutuya paddingBottom olarak verilir; içerik klavyenin üstünde kalır.
//
// KeyboardAvoidingView yerine kullanılıyor:
// - Android "height" modu ilk ölçtüğü yüksekliği saklıyor; cihaz döndürülünce yanlış hesaplayıp titriyordu,
//   ayrıca kendine flex: 0 verdiği için yatay satırda genişliği çöküyordu.
// - Hesabı ebeveyne göre (frame.y) yapıyor; üstte başlık çubuğu olan ekranda payı eksik buluyor.
// Burada kutu pencere koordinatında ölçülür (measureInWindow) ve klavyenin üst kenarıyla (screenY) karşılaştırılır.
// Padding kutunun kendi boyunu değiştirmediği için ölçüm döngüye girmez.
export default function useKeyboardInset() {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);
  const keyboardTop = useRef<number | null>(null);

  const measure = useCallback(() => {
    const top = keyboardTop.current;
    const node = ref.current;
    if (top === null || !node) {
      setInset(0);
      return;
    }
    node.measureInWindow((_x, y, _w, height) => {
      setInset(Math.max(0, Math.round(y + height - top)));
    });
  }, []);

  useEffect(() => {
    // iOS'ta yumuşak geçiş için klavyenin kendi animasyon süresi kullanılır
    const animate = (e: KeyboardEvent) => {
      if (Platform.OS === 'ios' && e.duration) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { duration: e.duration, type: LayoutAnimation.Types.keyboard },
        });
      }
    };

    // Android'de yalnızca "did" olayları var; klavye yüksekliği değişince (döndürme, emoji paneli) yeniden gelir
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      animate(e);
      measure();
    });
    const hide = Keyboard.addListener(hideEvent, (e) => {
      keyboardTop.current = null;
      animate(e);
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [measure]);

  // Kutu yeniden yerleşince (döndürme, pencere boyutu) klavye açıksa pay yeniden hesaplanır
  return { ref, inset, onLayout: measure };
}
