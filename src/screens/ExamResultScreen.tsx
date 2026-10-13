import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import StateView from '../components/StateView';
import Tag from '../components/Tag';
import useAsyncData from '../hooks/useAsyncData';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';

const { colors, fonts, typography } = theme;

interface ExamResultScreenProps {
  examId: string;
}

export default function ExamResultScreen({ examId }: ExamResultScreenProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const load = useCallback(() => examService.getResult(examId), [examId]);
  const { data: result, loading, error, reload } = useAsyncData(load);

  if (!result) return <StateView loading={loading} error={error} onRetry={reload} />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(28, insets.top + 12), paddingBottom: Math.max(32, insets.bottom + 16) }]}
    >
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={typography.kickerAccent}>{`${result.typeLabel} · Completed`}</Text>
          <Text style={styles.levelLabel}>Your level</Text>
          <View style={styles.levelRow}>
            <Text style={styles.level}>{result.level}</Text>
            <Tag label={result.status} tone="neutral" style={styles.levelTag} />
          </View>
          <Text style={styles.summary}>{result.summary}</Text>
          {!!result.note && <Text style={styles.note}>{result.note}</Text>}
        </View>

        <View style={styles.column}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={typography.kicker}>Scale score</Text>
              <Text style={styles.statValue}>
                {result.scaleScore}
                <Text style={styles.statUnit}> / 100</Text>
              </Text>
            </View>
            <View style={[styles.stat, styles.statDivided]}>
              <Text style={typography.kicker}>Answered</Text>
              <Text style={styles.statValue}>
                {result.answeredCount}
                <Text style={styles.statUnit}> questions</Text>
              </Text>
            </View>
          </View>
          <Text style={typography.muted}>Skill results and feedback are in your report.</Text>
          <View style={styles.actions}>
            <Button
              label="View report"
              trailing
              onPress={() => router.push({ pathname: '/report/[id]', params: { id: examId, from: 'result' } })}
            />
            <Button label="Back to assignments" variant="secondary" onPress={() => router.dismissTo('/')} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (isTablet: boolean) => {
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: padX,
    },
    columns: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 32,
      columnGap: 48,
      alignItems: 'flex-start',
    },
    column: {
      flexGrow: 1,
      flexBasis: 300,
      gap: 12,
    },
    levelLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: colors.text,
    },
    levelRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 14,
    },
    level: {
      fontFamily: fonts.extraBold,
      fontSize: isTablet ? 112 : 88,
      lineHeight: isTablet ? 104 : 82,
      letterSpacing: -2,
      color: colors.accent,
    },
    levelTag: {
      marginBottom: 8,
    },
    summary: {
      ...typography.body,
      marginTop: 8,
    },
    note: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
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
      paddingVertical: 14,
      gap: 4,
    },
    statDivided: {
      paddingLeft: 16,
      borderLeftWidth: 2,
      borderLeftColor: colors.divider,
    },
    statValue: {
      fontFamily: fonts.extraBold,
      fontSize: 32,
      lineHeight: 34,
      color: colors.text,
    },
    statUnit: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.neutral700,
    },
    actions: {
      gap: 8,
    },
  });
};
