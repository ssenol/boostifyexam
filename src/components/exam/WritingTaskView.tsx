import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import type { SessionItem } from '../../types/exam';
import { countWords } from '../../utils/format';
import RemoteImage from '../RemoteImage';
import Instructions from './Instructions';

const { colors, fonts } = theme;

// Tek seferde bundan fazla karakter eklenirse yapıştırma sayılır. Klavyede kaydırarak yazma (swipe) tek kelime
// ekler; dikte de uzun cümle eklediği için bu sınavda engellenmiş olur.
const PASTE_THRESHOLD = 20;

// "30–60 words" / "at least 30 words" / "up to 60 words"; 0 = o sınır yok
export function wordRange(minWords: number, maxWords: number): string {
  if (minWords && maxWords) return `${minWords}–${maxWords} words`;
  if (minWords) return `at least ${minWords} words`;
  if (maxWords) return `up to ${maxWords} words`;
  return '';
}

// Sınırların dışında teslim engellenmez; sadece uyarı gösterilir
export function lengthWarning(words: number, minWords: number, maxWords: number): string | null {
  if (words === 0) return null;
  if (minWords && words < minWords) return 'Below the suggested length';
  if (maxWords && words > maxWords) return 'Above the suggested length';
  return null;
}

interface WritingTaskViewProps {
  item: SessionItem;
  text: string;
  onChangeText: (text: string) => void;
  onPasteBlocked: () => void;
  isTablet: boolean;
  editable: boolean;
}

// Writing görevi: görev (stem), "Your text should include" yönergesi, varsa resim, metin kutusu, kelime sayacı.
// Writing'in kendi süresi yoktur; sınavın kalan süresi geçerlidir. Taslak heartbeat ile kaydedilir.
export default function WritingTaskView({ item, text, onChangeText, onPasteBlocked, isTablet, editable }: WritingTaskViewProps) {
  const [focused, setFocused] = useState(false);
  const lastText = useRef(text);
  const spec = item.productive;
  const minWords = spec?.minWords ?? 0;
  const maxWords = spec?.maxWords ?? 0;
  const words = countWords(text);
  const range = wordRange(minWords, maxWords);
  const warning = lengthWarning(words, minWords, maxWords);

  const handleChange = (next: string) => {
    if (next.length - lastText.current.length > PASTE_THRESHOLD) {
      onPasteBlocked();
      return;
    }
    lastText.current = next;
    onChangeText(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.kicker}>{range ? `Writing task · ${range}` : 'Writing task'}</Text>
        <Text style={[styles.stem, { fontSize: isTablet ? 22 : 20, lineHeight: isTablet ? 31 : 28 }]}>{item.stem}</Text>
      </View>

      {!!spec?.instructions && <Instructions title="Your text should include" text={spec.instructions} />}

      {!!item.imageUrl && <RemoteImage uri={item.imageUrl} style={styles.image} accessibilityLabel="Task picture" />}

      <TextInput
        value={text}
        onChangeText={handleChange}
        editable={editable}
        multiline
        textAlignVertical="top"
        placeholder="Write your text here…"
        placeholderTextColor={colors.neutral500}
        selectionColor={colors.accent}
        // Yardımlar kapalı: otomatik düzeltme, yazım denetimi, öneriler, otomatik doldurma
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        smartInsertDelete={false}
        // Kopyala / yapıştır / seç menüsü gösterilmez
        contextMenuHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused]}
        accessibilityLabel="Your text"
      />

      <View style={styles.meta}>
        <View style={styles.count}>
          <Text style={[styles.countValue, !!warning && styles.countWarn]}>{words}</Text>
          {!!range && <Text style={styles.countLabel}>{`/ ${range}`}</Text>}
        </View>
        {!!warning && <Text style={styles.warning}>{warning}</Text>}
      </View>
      <Text style={styles.note}>Paste and autocorrect are off · your draft is saved as you write</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  head: {
    gap: 8,
  },
  kicker: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral700,
  },
  stem: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  image: {
    maxWidth: 480,
    aspectRatio: 4 / 3,
  },
  input: {
    minHeight: 240,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 27,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.divider,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 12,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  countValue: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  countWarn: {
    color: colors.warn700,
  },
  countLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral700,
  },
  warning: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.warn700,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
});
