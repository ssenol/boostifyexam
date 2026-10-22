import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import type { SessionItem } from '../../types/exam';
import RemoteImage from '../RemoteImage';

const { colors, fonts } = theme;

// Ekranda gösterilen harf şıkkın sırasına göredir; sunucuya giden değer her zaman şıkkın key alanı
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface ChoiceQuestionProps {
  item: SessionItem;
  selected: string | null;
  onSelect: (key: string) => void;
  isTablet: boolean;
  disabled?: boolean;
}

// Soru kökü + (varsa) görsel + şıklar. single_choice (2–4 şık) ve true_false (2 şık) aynı biçimde çizilir.
// Şıklar sunucunun gönderdiği sırayla gösterilir; sıralanmaz, harfe göre dizilmez.
export default function ChoiceQuestion({ item, selected, onSelect, isTablet, disabled }: ChoiceQuestionProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.stemBlock}>
        {item.itemType === 'true_false' && <Text style={styles.instruction}>True or false?</Text>}
        <Text style={[styles.stem, { fontSize: isTablet ? 22 : 20, lineHeight: isTablet ? 31 : 28 }]}>{item.stem}</Text>
      </View>

      {!!item.imageUrl && <RemoteImage uri={item.imageUrl} style={styles.image} accessibilityLabel="Question picture" />}

      <View accessibilityRole="radiogroup" style={styles.options}>
        {item.options.map((option, i) => {
          const isSelected = selected === option.key;
          const letter = LETTERS[i] ?? String(i + 1);
          return (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              accessibilityLabel={`${letter}. ${option.text}`}
              disabled={disabled}
              onPress={() => onSelect(option.key)}
              style={({ pressed }) => [
                styles.option,
                isSelected ? styles.optionSelected : pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.key, isSelected && styles.keySelected]}>
                <Text style={[styles.keyText, isSelected && styles.keyTextSelected]}>{letter}</Text>
              </View>
              <View style={styles.optionBody}>
                {!!option.imageUrl && <RemoteImage uri={option.imageUrl} style={styles.optionImage} />}
                {!!option.text && <Text style={styles.optionText}>{option.text}</Text>}
              </View>
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
  image: {
    maxWidth: 420,
    aspectRatio: 4 / 3,
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
  optionBody: {
    flex: 1,
    gap: 8,
  },
  optionImage: {
    maxWidth: 240,
    aspectRatio: 4 / 3,
  },
  optionText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
});
