import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme';

const { colors, fonts } = theme;

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  // Etiketin sağında gösterilir; varsa etiket sola, ikon sağa yaslanır (prototipteki "Sign in →")
  trailing?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Prototipteki .btn-primary / .btn-secondary karşılığı (min 52px, köşesiz)
export default function Button({ label, onPress, variant = 'primary', trailing, loading, disabled, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const fg = isPrimary ? colors.bg : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        trailing && <View>{trailing}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primary: {
    backgroundColor: colors.accent,
  },
  primaryPressed: {
    backgroundColor: colors.accent700,
  },
  secondary: {
    borderColor: colors.divider,
  },
  secondaryPressed: {
    backgroundColor: 'rgba(32, 30, 29, 0.14)',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
  },
});
