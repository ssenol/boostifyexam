import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { levelColors } from '../theme/levels';

const { fonts } = theme;

interface LevelBadgeProps {
  level: string;
  style?: StyleProp<ViewStyle>;
}

// CEFR seviyesi etiketi: seviyenin rengiyle açık zemin, koyu yazı (web raporundaki gibi)
export default function LevelBadge({ level, style }: LevelBadgeProps) {
  const { bg, fg } = levelColors(level);
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: fg }]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    fontFamily: fonts.extraBold,
    fontSize: 13,
  },
});
