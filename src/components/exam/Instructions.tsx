import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { instructionLines } from '../../utils/format';
import Kicker from '../Kicker';

const { colors, fonts } = theme;

interface InstructionsProps {
  title: string;
  text: string;
}

// Writing / speaking yönergesi. Birden çok madde gelirse liste olarak gösterilir.
export default function Instructions({ title, text }: InstructionsProps) {
  const lines = instructionLines(text);
  if (lines.length === 0) return null;
  return (
    <View style={styles.box}>
      <Kicker>{title}</Kicker>
      {lines.length === 1 ? (
        <Text style={styles.text}>{lines[0]}</Text>
      ) : (
        lines.map((line) => (
          <View key={line} style={styles.row}>
            <Text style={styles.bullet}>•</Text>
            <Text style={[styles.text, styles.flex]}>{line}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    padding: 14,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  bullet: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.accent,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.neutral800,
  },
});
