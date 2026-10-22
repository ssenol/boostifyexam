import { useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';
import ImagePlaceholder from './ImagePlaceholder';

interface CoverImageProps {
  uri: string;
  // Görsel yoksa yer tutucuda görünen etiket
  label: string;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
}

// Sınav kartındaki kapak resmi. Adres boşsa ya da yüklenemezse yer tutucu gösterilir.
export default function CoverImage({ uri, label, aspectRatio = 16 / 9, style }: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return <ImagePlaceholder label={label} aspectRatio={aspectRatio} style={style} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { aspectRatio }, style as StyleProp<ImageStyle>]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    backgroundColor: theme.colors.neutral300,
  },
});
