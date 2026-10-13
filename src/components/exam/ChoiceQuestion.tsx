import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import type { ChoiceItem } from '../../types/exam';
import ImagePlaceholder from '../ImagePlaceholder';

const { colors, fonts } = theme;

interface ChoiceQuestionProps {
  item: ChoiceItem;
  selected: string | null;
  onSelect: (key: string) => void;
  isTablet: boolean;
  disabled?: boolean;
}

// Yönerge + soru kökü + (varsa) görsel + A–D seçenekleri
export default function ChoiceQuestion({ item, selected, onSelect, isTablet, disabled }: ChoiceQuestionProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.stemBlock}>
        <Text style={styles.instruction}>{item.instruction}</Text>
        <Text style={[styles.stem, { fontSize: isTablet ? 22 : 20, lineHeight: isTablet ? 31 : 28 }]}>{item.stem}</Text>
      </View>

      {item.imageLabel && <ImagePlaceholder label={item.imageLabel} maxWidth={420} />}

      <View accessibilityRole="radiogroup" style={styles.options}>
        {item.options.map((option) => {
          const isSelected = selected === option.key;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              accessibilityLabel={`${option.key}. ${option.text}`}
              disabled={disabled}
              onPress={() => onSelect(option.key)}
              style={({ pressed }) => [
                styles.option,
                isSelected ? styles.optionSelected : pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.key, isSelected && styles.keySelected]}>
                <Text style={[styles.keyText, isSelected && styles.keyTextSelected]}>{option.key}</Text>
              </View>
              <Text style={styles.optionText}>{option.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 20,
  },
  stemBlock: {
    gap: 8,
  },
  instruction: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral700,
  },
  stem: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    borderWidth: 2,
    borderColor: colors.neutral300,
    backgroundColor: colors.bg,
  },
  optionPressed: {
    borderColor: colors.accent,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent100,
  },
  key: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  keySelected: {
    backgroundColor: colors.accent,
  },
  keyText: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    color: colors.text,
  },
  keyTextSelected: {
    color: colors.bg,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
});
