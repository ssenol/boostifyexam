import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReportProgress from '../components/report/ReportProgress';
import ReportSingle from '../components/report/ReportSingle';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import useAsyncData from '../hooks/useAsyncData';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';

const { colors, fonts } = theme;

type View_ = 'single' | 'progress';

interface ReportScreenProps {
  examId: string;
  // Hangi ekrandan gelindi; geri butonunun etiketi buna göre
  from: 'assign' | 'result';
}

export default function ReportScreen({ examId, from }: ReportScreenProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);
  const [view, setView] = useState<View_>('single');

  const loadReport = useCallback(() => examService.getReport(examId), [examId]);
  const report = useAsyncData(loadReport);
  const loadProgress = useCallback(() => examService.getProgressReport(), []);
  const progress = useAsyncData(loadProgress);

  const header = (
    <ScreenHeader
      backLabel={from === 'assign' ? 'Assignments' : 'Result'}
      onBack={() => router.back()}
      right={report.data && <Text style={styles.headerRight}>{`${report.data.typeLabel} report`}</Text>}
    />
  );

  if (!report.data) {
    return (
      <View style={styles.root}>
        {header}
        <StateView loading={report.loading} error={report.error} onRetry={report.reload} />
      </View>
    );
  }

  const showProgress = report.data.hasProgress && view === 'progress';

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(40, insets.bottom + 16) }]}>
        <View style={styles.inner}>
          {report.data.hasProgress && (
            <View style={styles.toggle} accessibilityRole="tablist">
              <ToggleButton label="This test" active={!showProgress} onPress={() => setView('single')} />
              <ToggleButton label="Progress over time" active={showProgress} onPress={() => setView('progress')} divided />
            </View>
          )}

          {showProgress ? (
            progress.data ? (
              <ReportProgress progress={progress.data} isTablet={isTablet} />
            ) : (
              <View style={styles.progressState}>
                <StateView loading={progress.loading} error={progress.error} onRetry={progress.reload} />
              </View>
            )
          ) : (
            <ReportSingle report={report.data} isTablet={isTablet} />
          )}

          <Text style={styles.footnote}>Questions and answers are not shown in reports.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleButton({ label, active, onPress, divided }: { label: string; active: boolean; onPress: () => void; divided?: boolean }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[toggleStyles.button, divided && toggleStyles.divided, active && toggleStyles.active]}
    >
      <Text style={[toggleStyles.label, active && toggleStyles.labelActive]}>{label}</Text>
    </Pressable>
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
    toggle: {
      flexDirection: 'row',
      maxWidth: 440,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    progressState: {
      minHeight: 240,
    },
    footnote: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 20,
      color: colors.neutral700,
      borderTopWidth: 2,
      borderTopColor: colors.divider,
      paddingTop: 12,
    },
  });
};

const toggleStyles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divided: {
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  active: {
    backgroundColor: colors.text,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  labelActive: {
    color: colors.bg,
  },
});
