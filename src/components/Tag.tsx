import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme';

const { colors, fonts } = theme;

interface TagProps {
  label: string;
  tone?: 'accent' | 'neutral';
  style?: StyleProp<ViewStyle>;
}

// Prototipteki .tag-accent / .tag-neutral
export default function Tag({ label, tone = 'accent', style }: TagProps) {
  const isAccent = tone === 'accent';
  return (
    <View style={[styles.tag, { backgroundColor: isAccent ? colors.accent100 : colors.neutral100 }, style]}>
      <Text style={[styles.label, { color: isAccent ? colors.accent800 : colors.neutral800 }]} numberOfLines={1}>
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
