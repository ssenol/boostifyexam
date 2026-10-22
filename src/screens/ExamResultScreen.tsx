import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Kicker from '../components/Kicker';
import StateView from '../components/StateView';
import Tag from '../components/Tag';
import useAsyncData from '../hooks/useAsyncData';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';
import { EXAM_TYPE_LABEL } from '../types/exam';

const { colors, fonts, typography } = theme;

// Writing / speaking puanlanırken (yaklaşık 1 dk) bu aralıkla yeniden sorulur
const EVALUATING_POLL_MS = 30_000;

interface ExamResultScreenProps {
  sessionId: string;
}

// Bitiş ekranı ("Sınavın tamamlandı"): state.result'taki seviye. Ayrıntılar raporda.
export default function ExamResultScreen({ sessionId }: ExamResultScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const load = useCallback(() => examService.getSession(sessionId), [sessionId]);
  const { data: state, loading, error, reload, reloadQuietly } = useAsyncData(load);

  const evaluating = state?.status === 'awaiting_evaluation';
  useEffect(() => {
    if (!evaluating) return;
    const timer = setInterval(reloadQuietly, EVALUATING_POLL_MS);
    return () => clearInterval(timer);
  }, [evaluating, reloadQuietly]);

  if (!state) return <StateView loading={loading} error={error} onRetry={reload} />;

  const result = state.result;
  const noLevel = !result || result.noEvidence || result.insufficientEvidence || !result.cefrLevel;
  const endedByRules = !!state.guard.endedBy;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(28, insets.top + 12), paddingBottom: bottom(16) + 16 }]}
    >
      <View style={styles.columns}>
        <View style={styles.column}>
          <Kicker accent>{`${EXAM_TYPE_LABEL[state.examType]} · Completed`}</Kicker>
          {endedByRules && (
            <View style={styles.rules}>
              <Text style={styles.rulesTitle}>Your test was ended because of the test rules.</Text>
              <Text style={styles.note}>The answers you gave will be scored.</Text>
            </View>
          )}
          <Text style={styles.levelLabel}>Your level</Text>
          {noLevel ? (
            <>
              <Text style={styles.noLevel}>Not determined</Text>
              <Text style={styles.note}>There weren’t enough answers to set your level.</Text>
            </>
          ) : (
            <View style={styles.levelRow}>
              <Text style={styles.level}>{result.cefrLevel}</Text>
              {evaluating && <Tag label="Evaluating" tone="neutral" style={styles.levelTag} />}
            </View>
          )}
          {evaluating && !noLevel && (
            <Text style={styles.note}>Your writing and speaking are being scored. Your level may change.</Text>
          )}
        </View>

        <View style={styles.column}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Kicker>Scale score</Kicker>
              {result?.scaleScore != null ? (
                <Text style={styles.statValue}>
                  {result.scaleScore}
                  <Text style={styles.statUnit}> / 100</Text>
                </Text>
              ) : (
                <Text style={styles.statValue}>—</Text>
              )}
            </View>
            <View style={[styles.stat, styles.statDivided]}>
              <Kicker>Answered</Kicker>
              <Text style={styles.statValue}>
                {result?.itemsAnswered ?? state.progress.answered}
                <Text style={styles.statUnit}> questions</Text>
              </Text>
            </View>
          </View>
          <Text style={typography.muted}>Skill results and feedback are in your report.</Text>
          <View style={styles.actions}>
            <Button
              label="View report"
              trailing
              onPress={() => router.push({ pathname: '/report/[id]', params: { id: sessionId, from: 'result' } })}
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
    rules: {
      gap: 4,
      paddingLeft: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.warn,
    },
    rulesTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
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
    noLevel: {
      fontFamily: fonts.extraBold,
      fontSize: 36,
      lineHeight: 40,
      color: colors.text,
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
