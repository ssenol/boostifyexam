import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import type { Passage } from '../../types/exam';

const { colors, fonts, typography } = theme;

interface ReadingPassageProps {
  passage: Passage;
  // Tablette yan panelde "Reading text" üst başlığıyla gösterilir
  showKicker?: boolean;
}

// Paragraf numaralı okuma metni. Seçilip kopyalanamaz (Text varsayılan olarak selectable değil).
export default function ReadingPassage({ passage, showKicker }: ReadingPassageProps) {
  return (
    <View>
      {showKicker && <Text style={[typography.kicker, styles.kicker]}>Reading text</Text>}
      <Text style={[styles.title, showKicker && styles.titleLarge]}>{passage.title}</Text>
      {passage.paragraphs.map((p) => (
        <Text key={p.n} style={styles.paragraph}>
          <Text style={styles.number}>{p.n}  </Text>
          {p.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    lineHeight: 26,
    marginBottom: 14,
    color: colors.text,
  },
  titleLarge: {
    fontSize: 24,
    lineHeight: 29,
    marginBottom: 16,
  },
  paragraph: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 28,
    marginBottom: 14,
    color: colors.text,
  },
  number: {
    fontFamily: fonts.extraBold,
    color: colors.accent700,
  },
});
