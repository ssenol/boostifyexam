import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme';
import Button from './Button';

const { colors, fonts } = theme;

interface RemoteImageProps {
  uri: string;
  // Görselin kutusu (yükseklik / en-boy oranı burada verilir)
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

// Sunucudan gelen soru / şık görseli. Yüklenemezse "Try again": bazı sorular görselsiz anlaşılmaz.
export default function RemoteImage({ uri, style, accessibilityLabel }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);
  // Değişince expo-image görseli baştan ister
  const [attempt, setAttempt] = useState(0);

  if (failed) {
    return (
      <View style={[styles.box, styles.failed, style]}>
        <Text style={styles.failedText}>The image could not load.</Text>
        <Button
          label="Try again"
          variant="secondary"
          size="compact"
          onPress={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.box, style]}>
      <Image
        key={attempt}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={150}
        onError={() => setFailed(true)}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  failed: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  failedText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral700,
    textAlign: 'center',
  },
});
