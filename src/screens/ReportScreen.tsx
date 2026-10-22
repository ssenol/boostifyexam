import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import ReportView from '../components/report/ReportView';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import useAsyncData from '../hooks/useAsyncData';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';
import { EXAM_TYPE_LABEL } from '../types/exam';

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

  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom(24) + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.inner}>
          <ReportView
            report={data.report}
            certificate={data.certificate}
            isTablet={isTablet}
            onOpenCertificate={() => router.push({ pathname: '/certificate/[id]', params: { id: sessionId } })}
          />
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
