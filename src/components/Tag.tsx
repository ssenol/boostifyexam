import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme';

const { colors, fonts } = theme;

interface TagProps {
  label: string;
  // level: CEFR seviyesi (turuncu); koyu ton, küçük yazıda okunurluk için
  tone?: 'accent' | 'neutral' | 'warn' | 'level';
  style?: StyleProp<ViewStyle>;
}

const BACKGROUND = { accent: colors.accent, neutral: colors.neutral800, warn: colors.warn700, level: colors.primaryPressed } as const;

// Prototipteki .tag-accent / .tag-neutral, renkleri ters: açık zeminler kartların gri zemininde kayboluyordu
// (kullanıcı kararı, 2026-10-22). Koyu zemin, açık yazı.
export default function Tag({ label, tone = 'accent', style }: TagProps) {
  return (
    <View style={[styles.tag, { backgroundColor: BACKGROUND[tone] }, style]}>
      <Text style={[styles.label, { color: tone === 'accent' ? colors.accent100 : colors.neutral100 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
