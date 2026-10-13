import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { ArrowRightIcon } from './icons';

const { colors, fonts } = theme;

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'large' | 'medium' | 'compact';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  // large: 56px (sınav alt çubuğu), medium: 52px (varsayılan), compact: 44px, içeriğe göre genişlik
  size?: Size;
  // Etiketin solunda (ör. "Pause" X ikonu)
  leading?: ReactNode;
  // Etiketin sağında; true ise ok ikonu. Varsa etiket sola, ikon sağa yaslanır (prototipteki "Sign in →")
  trailing?: ReactNode | true;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const MIN_HEIGHT: Record<Size, number> = { large: 56, medium: 52, compact: 44 };
const FONT_SIZE: Record<Size, number> = { large: 16, medium: 16, compact: 15 };

// Prototipteki .btn-primary / .btn-secondary / .btn-ghost karşılığı (köşesiz)
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  leading,
  trailing,
  loading,
  disabled,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const fg = variant === 'primary' ? colors.bg : variant === 'ghost' ? colors.accent : colors.text;
  const isCompact = size === 'compact';
  const trailingNode = trailing === true ? <ArrowRightIcon color={fg} size={isCompact ? 18 : 20} /> : trailing;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { minHeight: MIN_HEIGHT[size] },
        isCompact ? styles.compact : styles.full,
        trailingNode || loading ? styles.spaceBetween : styles.start,
        variantStyles[variant],
        pressed && pressedStyles[variant],
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {leading}
      <Text style={[styles.label, { color: fg, fontSize: FONT_SIZE[size] }]} numberOfLines={1}>
        {label}
      </Text>
      {loading ? <ActivityIndicator color={fg} /> : trailingNode ? <View>{trailingNode}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  full: {
    width: '100%',
  },
  compact: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  start: {
    justifyContent: 'flex-start',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fonts.extraBold,
    flexShrink: 1,
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: { borderColor: colors.divider },
  ghost: { paddingHorizontal: 4 },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent700 },
  secondary: { backgroundColor: 'rgba(32, 30, 29, 0.14)' },
  ghost: { backgroundColor: 'rgba(63, 81, 240, 0.18)' },
});
