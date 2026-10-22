import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import CoverImage from '../components/CoverImage';
import Kicker from '../components/Kicker';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import Tag from '../components/Tag';
import useAsyncData from '../hooks/useAsyncData';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';
import type { AssignedExam, ExamKind, ResultSummary } from '../types/exam';
import { formatDate, formatDateTime } from '../utils/format';

const { colors, fonts, typography } = theme;

type Tab = 'tests' | 'results';

const TYPE_LABEL: Record<ExamKind, string> = {
  placement: 'Placement test',
  progress: 'Progress test',
};

// Başlanabilir ya da devam edilebilir sınav
const isActionable = (exam: AssignedExam) => exam.action === 'start' || exam.action === 'resume';

// Ana ekran: GET /exams (Tests) + GET /results (Results)
export default function AssignmentsScreen() {
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);
  const [tab, setTab] = useState<Tab>('tests');

  const load = useCallback(async () => {
    const [list, results] = await Promise.all([examService.getExams(), examService.getResults()]);
    return { list, results };
  }, []);
  const { data, loading, refreshing, error, reload } = useAsyncData(load);

  // Sınavdan dönünce (bitti / duraklatıldı) liste güncellensin; ilk odaklanmada useAsyncData zaten yüklüyor
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  // Açık bir placement varsa önce o çözülmeli: en üstte ve vurgulu
  const exams = useMemo(() => {
    if (!data) return [];
    const { exams: all, mustTakePlacement } = data.list;
    if (!mustTakePlacement) return all;
    const first = (e: AssignedExam) => e.examType === 'placement' && isActionable(e);
    return [...all.filter(first), ...all.filter((e) => !first(e))];
  }, [data]);

  const header = (
    <ScreenHeader
      title="Boostify"
      right={<Button label="Profile" variant="ghost" size="compact" onPress={() => router.push('/profile')} />}
    />
  );

  if (!data) {
    return (
      <View style={styles.root}>
        {header}
        <StateView loading={loading} error={error} onRetry={reload} />
      </View>
    );
  }

  const { level, mustTakePlacement } = data.list;
  const { results } = data;

  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom(16) + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.accent} />}
      >
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title} accessibilityRole="header">Assignments</Text>
            <View style={styles.levelBox}>
              <Kicker>Your level</Kicker>
              <Text style={level ? styles.level : styles.levelEmpty}>{level ? level.cefrLevel : 'Not measured yet'}</Text>
            </View>
          </View>
          <View style={styles.tabs} accessibilityRole="tablist">
            <TabButton label={`Tests · ${exams.length}`} active={tab === 'tests'} onPress={() => setTab('tests')} />
            <TabButton label={`Results · ${results.length}`} active={tab === 'results'} onPress={() => setTab('results')} />
          </View>
        </View>

        {tab === 'tests' ? (
          <>
            {mustTakePlacement && (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>Take your placement test first</Text>
                <Text style={styles.noticeBody}>It sets your starting level. Your other work opens when you finish it.</Text>
              </View>
            )}
            {exams.length === 0 ? (
              <EmptyNote title="No tests assigned to you" body="New tests from your school appear here." />
            ) : (
              <View style={styles.grid}>
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.assignmentId}
                    exam={exam}
                    highlighted={mustTakePlacement && exam.examType === 'placement' && isActionable(exam)}
                  />
                ))}
              </View>
            )}
          </>
        ) : results.length === 0 ? (
          <EmptyNote title="No completed tests yet" body="Finished tests and their reports appear here." />
        ) : (
          <View style={styles.grid}>
            {results.map((result) => (
              <ResultCard key={result.sessionId} result={result} isTablet={isTablet} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[tabStyles.tab, { borderBottomColor: active ? colors.accent : 'transparent' }]}
    >
      <Text style={[tabStyles.label, active ? tabStyles.labelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const durationText = (minutes: number | null) => (minutes ? `${minutes} minutes` : 'No time limit');

// Karttaki iki bilgi kutusu; içeriği action'a göre değişir
function examFacts(exam: AssignedExam): [string, string][] {
  switch (exam.action) {
    case 'start':
      return [['Closes', formatDateTime(exam.dueDate)], ['Duration', durationText(exam.timeLimitMinutes)]];
    case 'resume': {
      const left = exam.remainingSec == null ? 'No time limit' : `${Math.ceil(exam.remainingSec / 60)} minutes`;
      return [['Closes', formatDateTime(exam.dueDate)], ['Time left', left]];
    }
    case 'wait':
      return [['Opens', formatDateTime(exam.startDate)], ['Duration', durationText(exam.timeLimitMinutes)]];
    case 'view_result':
      return [['Level', exam.cefrLevel || '—'], ['Duration', durationText(exam.timeLimitMinutes)]];
    case 'closed':
    case 'missed':
      return [['Closed', formatDateTime(exam.dueDate)]];
  }
}

function ExamAction({ exam }: { exam: AssignedExam }) {
  switch (exam.action) {
    case 'start':
      return (
        <Button
          label="Start"
          trailing
          onPress={() => router.push({ pathname: '/exam/[id]', params: { id: exam.assignmentId } })}
        />
      );
    case 'resume':
      // "Devam et" giriş ekranını atlar ve aynı denemeyi kaldığı yerden açar
      return (
        <Button
          label="Continue"
          trailing
          onPress={() => router.push({ pathname: '/exam/[id]/session', params: { id: exam.assignmentId } })}
        />
      );
    case 'view_result':
      return (
        <Button
          label="View result"
          variant="secondary"
          trailing
          onPress={() => router.push({ pathname: '/report/[id]', params: { id: exam.sessionId, from: 'assign' } })}
        />
      );
    case 'wait':
      return <Button label={`Opens ${formatDate(exam.startDate)}`} variant="secondary" disabled onPress={() => {}} />;
    case 'closed':
      return <Button label="Test closed" variant="secondary" disabled onPress={() => {}} />;
    case 'missed':
      return <Button label="Missed" variant="secondary" disabled onPress={() => {}} />;
  }
}

function ExamCard({ exam, highlighted }: { exam: AssignedExam; highlighted: boolean }) {
  return (
    <View style={[cardStyles.examCard, highlighted && cardStyles.examCardHighlighted]}>
      <CoverImage uri={exam.coverImage} label="Card image" />
      <View style={cardStyles.examBody}>
        <View style={cardStyles.tags}>
          <Tag label={TYPE_LABEL[exam.examType]} />
          {exam.action === 'start' && <Tag label="Single attempt" tone="neutral" />}
          {exam.action === 'resume' && <Tag label={exam.paused ? 'Paused' : 'In progress'} tone="neutral" />}
        </View>
        <Text style={cardStyles.examTitle}>{exam.title}</Text>
        <View style={cardStyles.facts}>
          {examFacts(exam).map(([label, value], i) => (
            <View key={label} style={[cardStyles.fact, i > 0 && cardStyles.factDivided]}>
              <Kicker>{label}</Kicker>
              <Text style={cardStyles.factValue}>{value}</Text>
            </View>
          ))}
        </View>
        <ExamAction exam={exam} />
      </View>
    </View>
  );
}

function ResultCard({ result, isTablet }: { result: ResultSummary; isTablet: boolean }) {
  return (
    <View style={[cardStyles.resultCard, isTablet && cardStyles.resultCardTablet]}>
      <View style={cardStyles.resultTop}>
        <CoverImage uri={result.coverImage} label="Image" aspectRatio={1} style={cardStyles.thumb} />
        <View style={cardStyles.resultInfo}>
          <Tag label={TYPE_LABEL[result.examType]} />
          <Text style={cardStyles.resultTitle}>{result.title}</Text>
          <Text style={typography.muted}>{`Finished ${formatDate(result.finishedAt)}`}</Text>
        </View>
      </View>
      <View style={cardStyles.resultLevel}>
        <Kicker>Level</Kicker>
        {result.noLevel ? (
          <Text style={cardStyles.noLevel}>Level not determined</Text>
        ) : (
          <View style={cardStyles.levelRow}>
            <Text style={cardStyles.level}>{result.cefrLevel}</Text>
            {result.evaluating && <Tag label="Evaluating" tone="neutral" />}
          </View>
        )}
      </View>
      <View style={cardStyles.resultAction}>
        <Button
          label="View report"
          variant="secondary"
          trailing
          onPress={() => router.push({ pathname: '/report/[id]', params: { id: result.sessionId, from: 'assign' } })}
        />
      </View>
    </View>
  );
}

function EmptyNote({ title, body }: { title: string; body: string }) {
  return (
    <View style={emptyStyles.wrap}>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.body}>{body}</Text>
    </View>
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
      paddingTop: 24,
      gap: 24,
    },
    titleBlock: {
      gap: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
    },
    title: {
      fontFamily: fonts.extraBold,
      fontSize: 28,
      lineHeight: 32,
      color: colors.text,
    },
    levelBox: {
      alignItems: 'flex-end',
      gap: 2,
    },
    level: {
      fontFamily: fonts.extraBold,
      fontSize: 22,
      lineHeight: 26,
      color: colors.accent,
    },
    levelEmpty: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    tabs: {
      flexDirection: 'row',
      gap: 24,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
    },
    notice: {
      maxWidth: 920,
      gap: 4,
      paddingLeft: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
    },
    noticeTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 16,
      color: colors.text,
    },
    noticeBody: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.neutral700,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      maxWidth: 920,
    },
  });
};

const tabStyles = StyleSheet.create({
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    marginBottom: -2,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.neutral700,
  },
  labelActive: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
});

const cardStyles = StyleSheet.create({
  examCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
  },
  examCardHighlighted: {
    borderTopWidth: 4,
    borderTopColor: colors.accent,
  },
  examBody: {
    padding: 16,
    gap: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  examTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.text,
  },
  facts: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  fact: {
    flex: 1,
    paddingVertical: 10,
    gap: 2,
  },
  factDivided: {
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  factValue: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  resultCard: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  resultCardTablet: {
    flexBasis: 320,
    flexGrow: 1,
    width: undefined,
  },
  resultTop: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 0,
  },
  thumb: {
    width: 72,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  resultTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
  },
  resultLevel: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    gap: 4,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  level: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    lineHeight: 34,
    color: colors.accent,
  },
  noLevel: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    lineHeight: 22,
    paddingTop: 6,
    color: colors.text,
  },
  resultAction: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

const emptyStyles = StyleSheet.create({
  wrap: {
    maxWidth: 440,
    gap: 4,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 14,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral700,
  },
});
