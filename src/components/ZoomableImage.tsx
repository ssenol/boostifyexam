import { useState } from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useBottomSpacing from '../hooks/useBottomSpacing';
import { theme } from '../theme';
import Button from './Button';
import RemoteImage from './RemoteImage';

const { colors, fonts } = theme;

interface ZoomableImageProps {
  uri: string;
  // Önizlemenin kutusu
  style?: StyleProp<ViewStyle>;
  hint?: string;
}

// Küçük önizleme; dokununca tam ekran açılır
export default function ZoomableImage({ uri, style, hint = 'Tap to enlarge' }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpacing();
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="Open the picture">
        <RemoteImage uri={uri} style={style} />
        <Text style={styles.hint}>{hint}</Text>
      </Pressable>
      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)} supportedOrientations={['portrait', 'landscape']}>
        {/* Tam ekran pencere safe area'yı kendisi hesaplar: resim saatin altına, düğme alt çubuğa girmesin */}
        <View style={[styles.fullscreen, { paddingTop: insets.top + 16, paddingBottom: bottom(16) }]}>
          <RemoteImage uri={uri} style={styles.image} />
          <Button label="Close" variant="secondary" onPress={() => setOpen(false)} style={styles.close} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
  fullscreen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 16,
    backgroundColor: colors.bg,
  },
  image: {
    flex: 1,
  },
  close: {
    alignSelf: 'center',
    minWidth: 200,
  },
});
