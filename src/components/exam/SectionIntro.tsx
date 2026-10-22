import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { SKILL_LABEL, type SectionProgress, type Skill } from '../../types/exam';
import Button from '../Button';
import Kicker from '../Kicker';

const { colors, fonts, typography } = theme;

const DESCRIPTION: Partial<Record<Skill, string>> = {
  language_use: 'Grammar and vocabulary questions, one at a time.',
  reading: 'Read the text, then answer the questions about it.',
  listening: 'Listen to each recording, then answer. Recordings have limited plays, so listen carefully.',
};

interface SectionIntroProps {
  section: SectionProgress;
  onContinue: () => void;
  isTablet: boolean;
}

// Bölüm geçişi ("Part 2 of 3 · Reading"). Bölüm değişince bir kez gösterilir; süre bu sırada da işler.
export default function SectionIntro({ section, onContinue, isTablet }: SectionIntroProps) {
  return (
    <View style={styles.wrap}>
      <Kicker accent>{`Part ${section.index} of ${section.total}`}</Kicker>
      <Text style={[styles.title, { fontSize: isTablet ? 40 : 32, lineHeight: isTablet ? 44 : 36 }]} accessibilityRole="header">
        {SKILL_LABEL[section.skill]}
      </Text>
      {!!DESCRIPTION[section.skill] && <Text style={styles.body}>{DESCRIPTION[section.skill]}</Text>}
      <Text style={typography.muted}>The number of questions depends on your answers.</Text>
      <Button label="Start this part" size="large" trailing onPress={onContinue} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    paddingTop: 24,
  },
  title: {
    fontFamily: fonts.extraBold,
    letterSpacing: -0.4,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.neutral800,
  },
  button: {
    marginTop: 12,
    maxWidth: 360,
  },
});
