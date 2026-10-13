import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import type { WritingTask } from '../../types/exam';
import { countWords } from '../../utils/format';
import Button from '../Button';
import { CameraIcon } from '../icons';

const { colors, fonts } = theme;

// Tek seferde bundan fazla karakter eklenirse yapıştırma sayılır. Klavyede kaydırarak yazma (swipe) tek kelime
// ekler; dikte de uzun cümle eklediği için bu sınavda engellenmiş olur.
const PASTE_THRESHOLD = 20;

interface WritingTaskViewProps {
  task: WritingTask;
  text: string;
  onChangeText: (text: string) => void;
  onPasteBlocked: () => void;
  onPhoto: () => void;
  isTablet: boolean;
  editable: boolean;
}

export default function WritingTaskView({ task, text, onChangeText, onPasteBlocked, onPhoto, isTablet, editable }: WritingTaskViewProps) {
  const [focused, setFocused] = useState(false);
  const lastText = useRef(text);
  const words = countWords(text);
  const outOfRange = words > 0 && (words < task.minWords || words > task.maxWords);

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
        <Text style={styles.kicker}>{`Writing task · ${task.minWords}–${task.maxWords} words`}</Text>
        <Text style={[styles.title, { fontSize: isTablet ? 22 : 20, lineHeight: isTablet ? 31 : 28 }]}>{task.title}</Text>
        <Text style={styles.prompt}>{task.prompt}</Text>
      </View>

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
          <Text style={[styles.countValue, outOfRange && styles.countWarn]}>{words}</Text>
          <Text style={styles.countLabel}>{`/ ${task.minWords}–${task.maxWords} words`}</Text>
        </View>
        <Button label="Upload photo" variant="secondary" size="compact" leading={<CameraIcon />} onPress={onPhoto} style={styles.photo} />
      </View>
      <Text style={styles.note}>Paste and autocorrect are off · saved automatically</Text>
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
  title: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  prompt: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.neutral800,
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
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
  photo: {
    marginLeft: 'auto',
    alignSelf: 'auto',
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
});
