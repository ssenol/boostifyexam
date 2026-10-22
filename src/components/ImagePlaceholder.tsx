import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { toUpperCaseEn } from './Kicker';

const { colors, fonts } = theme;

interface ImagePlaceholderProps {
  label: string;
  aspectRatio?: number;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}

// Görsel adresi boşsa ya da yüklenemezse gösterilen gri kutu (prototipteki yer tutucu); bkz. CoverImage
export default function ImagePlaceholder({ label, aspectRatio = 16 / 9, maxWidth, style }: ImagePlaceholderProps) {
  return (
    <View style={[styles.box, { aspectRatio, maxWidth }, style]} accessibilityRole="image" accessibilityLabel={label}>
      <Text style={styles.label}>{toUpperCaseEn(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: colors.neutral300,
    justifyContent: 'flex-end',
    padding: 12,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    letterSpacing: 0.9,
    color: colors.neutral800,
  },
});
