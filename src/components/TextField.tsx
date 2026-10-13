import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../theme';

const { colors, fonts } = theme;

interface TextFieldProps extends TextInputProps {
  label: string;
}

// Prototipteki .field + .input karşılığı
const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.neutral500}
        selectionColor={colors.accent}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, style]}
      />
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 5,
    color: colors.label,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
});
