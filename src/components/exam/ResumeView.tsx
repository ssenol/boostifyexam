import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useBottomSpacing from '../../hooks/useBottomSpacing';
import { theme } from '../../theme';
import Button from '../Button';
import Tag from '../Tag';
import Kicker from '../Kicker';

const { colors, fonts, typography } = theme;

interface ResumeViewProps {
  answeredCount: number;
  timeText: string;
  onContinue: () => void;
  onLeave: () => void;
  busy: boolean;
  isTablet: boolean;
}

// Duraklatılmış oturum ("Pause and leave" sonrası geri gelince)
export default function ResumeView({ answeredCount, timeText, onContinue, onLeave, busy, isTablet }: ResumeViewProps) {
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpacing();
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;

  return (
    <View style={[styles.root, { paddingHorizontal: padX, paddingTop: insets.top, paddingBottom: bottom(16) }]}>
      <View style={styles.inner}>
        <View style={styles.head}>
          <Tag label="Paused" />
          <Text style={[styles.title, { fontSize: isTablet ? 32 : 28 }]} accessibilityRole="header">Welcome back</Text>
          <Text style={styles.body}>Answers saved. Time away wasn’t counted.</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Kicker>Answered</Kicker>
            <Text style={styles.statValue}>{answeredCount}</Text>
            <Text style={styles.statUnit}>questions</Text>
          </View>
          <View style={[styles.stat, styles.statDivided]}>
            <Kicker>Time left</Kicker>
            <Text style={styles.statValue}>{timeText}</Text>
            <Text style={styles.statUnit}>minutes</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Button label="Continue" size="large" trailing onPress={onContinue} loading={busy} />
          <Button label="Back to assignments" variant="secondary" onPress={onLeave} disabled={busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  inner: {
    maxWidth: 640,
    width: '100%',
    gap: 24,
  },
  head: {
    gap: 8,
  },
  title: {
    fontFamily: fonts.extraBold,
    letterSpacing: -0.3,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.neutral800,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.divider,
  },
  stat: {
    flex: 1,
    paddingVertical: 16,
    gap: 4,
  },
  statDivided: {
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.divider,
  },
  statValue: {
    fontFamily: fonts.extraBold,
    fontSize: 36,
    lineHeight: 38,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  actions: {
    gap: 8,
  },
});
