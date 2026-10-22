import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ReportOverview, TaskReport } from '../components/report/ReportView';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import useAsyncData from '../hooks/useAsyncData';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';
import { EXAM_TYPE_LABEL, SKILL_LABEL } from '../types/exam';

type ReportTab = 'overview' | 'writing' | 'speaking';

const { colors, fonts } = theme;

// Puanlama sürerken (certificate.reason = evaluating) rapor bu aralıkla yeniden çekilir
const EVALUATING_POLL_MS = 30_000;

interface ReportScreenProps {
  sessionId: string;
  // Hangi ekrandan gelindi; geri butonunun etiketi buna göre
  from: 'assign' | 'result';
}

export default function ReportScreen({ sessionId, from }: ReportScreenProps) {
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const load = useCallback(() => examService.getReport(sessionId), [sessionId]);
  const { data, loading, refreshing, error, reload, reloadQuietly } = useAsyncData(load);
  const [tab, setTab] = useState<ReportTab>('overview');

  // Reason boş gelince seviye kesindir ve sertifika düğmesi açılır
  const evaluating = data?.certificate.reason === 'evaluating';
  useEffect(() => {
    if (!evaluating) return;
    const timer = setInterval(reloadQuietly, EVALUATING_POLL_MS);
    return () => clearInterval(timer);
  }, [evaluating, reloadQuietly]);

  const header = (
    <ScreenHeader
      backLabel={from === 'assign' ? 'Assignments' : 'Result'}
      onBack={() => router.back()}
      right={data && <Text style={styles.headerRight}>{`${EXAM_TYPE_LABEL[data.report.examType]} report`}</Text>}
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

  // Overview + raporda bulunan her writing / speaking görevi için bir sekme
  const tasks = data.report.productive;
  const tabs: ReportTab[] = ['overview', ...tasks.map((t) => t.skill)];
  const task = tasks.find((t) => t.skill === tab);

  return (
    <View style={styles.root}>
      {header}
      {tabs.length > 1 && (
        <View style={styles.tabs} accessibilityRole="tablist">
          {tabs.map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'overview' ? 'Overview' : SKILL_LABEL[t]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <ScrollView
        // Sekme değişince sayfa başa döner
        key={tab}
        contentContainerStyle={[styles.content, { paddingBottom: bottom(24) + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.inner}>
          {task ? (
            <TaskReport task={task} />
          ) : (
            <ReportOverview
              report={data.report}
              certificate={data.certificate}
              isTablet={isTablet}
              onOpenCertificate={() => router.push({ pathname: '/certificate/[id]', params: { id: sessionId } })}
              onOpenTask={setTab}
            />
          )}
        </View>
      </ScrollView>
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
    headerRight: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.neutral700,
    },
    // Başlığın altında sabit sekmeler (Assignments'taki sekmelerle aynı görünüm)
    tabs: {
      flexDirection: 'row',
      gap: 24,
      paddingHorizontal: padX,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
      backgroundColor: colors.bg,
    },
    tab: {
      minHeight: 44,
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      marginBottom: -2,
    },
    tabActive: {
      borderBottomColor: colors.accent,
    },
    tabLabel: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.neutral700,
    },
    tabLabelActive: {
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    content: {
      paddingHorizontal: padX,
      paddingTop: 24,
    },
    inner: {
      maxWidth: 1040,
      gap: 32,
    },
  });
};
