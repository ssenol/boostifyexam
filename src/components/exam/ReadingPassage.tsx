import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import type { Stimulus } from '../../types/exam';
import Kicker from '../Kicker';
import RemoteImage from '../RemoteImage';

const { colors, fonts } = theme;

interface ReadingPassageProps {
  stimulus: Stimulus;
  // Tablette yan panelde "Reading text" üst başlığıyla gösterilir
  showKicker?: boolean;
}

// Okuma metni (stimulus.kind = passage). Metindeki boş satır (\n\n) paragraf aralığıdır; paragraflar numaralanır.
// Seçilip kopyalanamaz (Text varsayılan olarak selectable değil).
export default function ReadingPassage({ stimulus, showKicker }: ReadingPassageProps) {
  const paragraphs = stimulus.text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <View>
      {showKicker && <Kicker style={styles.kicker}>Reading text</Kicker>}
      {!!stimulus.title && <Text style={[styles.title, showKicker && styles.titleLarge]}>{stimulus.title}</Text>}
      {!!stimulus.imageUrl && <RemoteImage uri={stimulus.imageUrl} style={styles.image} />}
      {paragraphs.map((text, i) => (
        <Text key={i} style={styles.paragraph}>
          {paragraphs.length > 1 && <Text style={styles.number}>{`${i + 1}  `}</Text>}
          {text}
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
  image: {
    aspectRatio: 4 / 3,
    marginBottom: 14,
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
