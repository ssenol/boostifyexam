import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import Tag from '../components/Tag';
import useAsyncData from '../hooks/useAsyncData';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { useAppDispatch } from '../store/hooks';
import { theme } from '../theme';
import type { CompletedExam, OpenExam, ProgressSeries, SeriesState } from '../types/exam';
import { performLogout } from '../utils/logoutHelper';

const { colors, fonts, typography } = theme;

type Tab = 'open' | 'done';

export default function AssignmentsScreen() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);
  const [tab, setTab] = useState<Tab>('open');

  const load = useCallback(() => examService.getAssignments(), []);
  const { data, loading, refreshing, error, reload } = useAsyncData(load);

  // Sınavdan dönünce (bitti / duraklatıldı) liste güncellensin; ilk odaklanmada useAsyncData zaten yüklüyor
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  const header = (
    <ScreenHeader
      title="Boostify"
      right={<Button label="Sign out" variant="ghost" size="compact" onPress={() => performLogout({ dispatch })} />}
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

  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(32, insets.bottom + 16) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.accent} />}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">Assignments</Text>
          <View style={styles.tabs} accessibilityRole="tablist">
            <TabButton label={`Open · ${data.open.length}`} active={tab === 'open'} onPress={() => setTab('open')} />
            <TabButton label={`Completed · ${data.completed.length}`} active={tab === 'done'} onPress={() => setTab('done')} />
          </View>
        </View>

        {tab === 'open' ? (
          <>
            {data.open.length === 0 ? (
              <EmptyNote title="No open tests" body="New tests from your teacher appear here." />
            ) : (
              data.open.map((exam) => <OpenExamCard key={exam.id} exam={exam} />)
            )}
            {data.series && <SeriesGrid series={data.series} />}
          </>
        ) : data.completed.length === 0 ? (
          <EmptyNote title="No completed tests yet" body="Finished tests and their reports appear here." />
        ) : (
          <View style={styles.doneGrid}>
            {data.completed.map((exam) => (
              <CompletedCard key={exam.id} exam={exam} isTablet={isTablet} />
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

function OpenExamCard({ exam }: { exam: OpenExam }) {
  const isPaused = exam.sessionState !== 'none';
  return (
    <View style={cardStyles.openCard}>
      {/* TODO: Kart görseli API'den gelecek */}
      <View style={cardStyles.cardImage}>
        <Text style={cardStyles.placeholderLabel}>Card image</Text>
      </View>
      <View style={cardStyles.openBody}>
        <View style={cardStyles.tags}>
          <Tag label={exam.typeLabel} />
          {exam.singleAttempt && <Tag label="Single attempt" tone="neutral" />}
          {isPaused && <Tag label="Paused" tone="neutral" />}
        </View>
        <Text style={cardStyles.openTitle}>{exam.title}</Text>
        <View style={cardStyles.facts}>
          <View style={cardStyles.fact}>
            <Text style={typography.kicker}>Closes</Text>
            <Text style={cardStyles.factValue}>{exam.closesLabel}</Text>
          </View>
          <View style={[cardStyles.fact, cardStyles.factDivided]}>
            <Text style={typography.kicker}>Duration</Text>
            <Text style={cardStyles.factValue}>{exam.durationMinutes} minutes</Text>
          </View>
        </View>
        <Button
          label={isPaused ? 'Continue' : 'Start'}
          trailing
          onPress={() => router.push({ pathname: '/exam/[id]', params: { id: exam.id } })}
        />
      </View>
    </View>
  );
}

const SERIES_DOT: Record<SeriesState, string> = {
  done: colors.text,
  open: colors.accent,
  upcoming: colors.neutral300,
};

const SERIES_STATE_LABEL: Record<SeriesState, string> = {
  done: 'Completed',
  open: 'Open now',
  upcoming: 'Upcoming',
};

function SeriesGrid({ series }: { series: ProgressSeries }) {
  const doneCount = series.items.filter((i) => i.state === 'done').length;
  return (
    <View style={seriesStyles.wrap}>
      <View style={seriesStyles.header}>
        <Text style={seriesStyles.title}>{series.title}</Text>
        <Text style={typography.muted}>{`${doneCount} of ${series.items.length} done`}</Text>
      </View>
      <View style={seriesStyles.grid}>
        {series.items.map((item) => (
          <View key={item.id} style={seriesStyles.cell}>
            <View style={seriesStyles.stateRow}>
              <View style={[seriesStyles.dot, { backgroundColor: SERIES_DOT[item.state] }]} />
              <Text style={typography.kicker}>{SERIES_STATE_LABEL[item.state]}</Text>
            </View>
            <Text style={seriesStyles.short}>{item.short}</Text>
            <Text style={typography.muted}>{item.meta}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CompletedCard({ exam, isTablet }: { exam: CompletedExam; isTablet: boolean }) {
  return (
    <View style={[cardStyles.doneCard, isTablet && cardStyles.doneCardTablet]}>
      <View style={cardStyles.doneTop}>
        <View style={cardStyles.thumb}>
          <Text style={[cardStyles.placeholderLabel, { fontSize: 9 }]}>Image</Text>
        </View>
        <View style={cardStyles.doneInfo}>
          <Tag label={exam.typeLabel} />
          <Text style={cardStyles.doneTitle}>{exam.title}</Text>
          <Text style={typography.muted}>{exam.completedLabel}</Text>
        </View>
      </View>
      <View style={cardStyles.doneFacts}>
        <View style={cardStyles.doneFact}>
          <Text style={typography.kicker}>Level</Text>
          <View style={cardStyles.levelRow}>
            <Text style={cardStyles.level}>{exam.level}</Text>
            <Tag label={exam.status} tone="neutral" />
          </View>
        </View>
        <View style={[cardStyles.doneFact, cardStyles.factDivided]}>
          <Text style={typography.kicker}>{exam.change ? 'Change' : 'Starting level'}</Text>
          <Text style={cardStyles.change}>{exam.change ?? 'Baseline'}</Text>
        </View>
      </View>
      <View style={cardStyles.doneAction}>
        <Button
          label="View report"
          variant="secondary"
          trailing
          onPress={() => router.push({ pathname: '/report/[id]', params: { id: exam.id, from: 'assign' } })}
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
    title: {
      fontFamily: fonts.extraBold,
      fontSize: 28,
      lineHeight: 32,
      color: colors.text,
    },
    tabs: {
      flexDirection: 'row',
      gap: 24,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
    },
    doneGrid: {
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
  openCard: {
    maxWidth: 440,
    backgroundColor: colors.surface,
  },
  cardImage: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.neutral300,
    justifyContent: 'flex-end',
    padding: 12,
  },
  placeholderLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.neutral800,
  },
  openBody: {
    padding: 16,
    gap: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  openTitle: {
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
  doneCard: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  doneCardTablet: {
    flexBasis: 320,
    flexGrow: 1,
    width: undefined,
  },
  doneTop: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 0,
  },
  thumb: {
    width: 72,
    height: 72,
    backgroundColor: colors.neutral300,
    justifyContent: 'flex-end',
    padding: 6,
  },
  doneInfo: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  doneTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
  },
  doneFacts: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  doneFact: {
    flex: 1,
    paddingVertical: 12,
    gap: 4,
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
  change: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    lineHeight: 22,
    paddingTop: 6,
    color: colors.text,
  },
  doneAction: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

const seriesStyles = StyleSheet.create({
  wrap: {
    maxWidth: 920,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.text,
  },
  // 2px boşluklar arkadaki divider rengini göstererek ızgara çizgisi oluşturur
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    backgroundColor: colors.divider,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  cell: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: colors.bg,
    padding: 12,
    gap: 4,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
  },
  short: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
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
