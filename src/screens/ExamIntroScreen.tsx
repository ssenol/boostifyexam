import { router } from 'expo-router';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { HeadphonesIcon, MicIcon } from '../components/icons';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import useAsyncData from '../hooks/useAsyncData';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';

const { colors, fonts, typography } = theme;

interface ExamIntroScreenProps {
  examId: string;
}

export default function ExamIntroScreen({ examId }: ExamIntroScreenProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const load = useCallback(() => examService.getExamDetail(examId), [examId]);
  const { data: exam, loading, error, reload } = useAsyncData(load);

  // TODO: Gerçek kontroller: kulaklık için kısa bir ses çalınacak (expo-audio + ses çıkışı tespiti),
  // mikrofon için izin istenecek. Şimdilik prototipteki gibi dokununca onaylanıyor.
  const [audioOk, setAudioOk] = useState(false);
  const [micOk, setMicOk] = useState(false);

  const goBack = () => router.back();
  const header = <ScreenHeader backLabel="Assignments" onBack={goBack} />;

  if (!exam) {
    return (
      <View style={styles.root}>
        {header}
        <StateView loading={loading} error={error} onRetry={reload} />
      </View>
    );
  }

  const isContinue = exam.sessionState !== 'none';
  // Konuşma görevi mikrofon olmadan yapılamaz; cihaz kontrolü bitmeden sınav başlamaz
  const checksDone = (!exam.needsHeadphones || audioOk) && (!exam.needsMicrophone || micOk);

  const start = () => router.replace({ pathname: '/exam/[id]/session', params: { id: exam.id } });

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.heading}>
            <Text style={typography.kickerAccent}>{exam.kicker}</Text>
            <Text style={styles.title} accessibilityRole="header">{exam.title}</Text>
            <Text style={styles.description}>{exam.description}</Text>
          </View>

          {!!exam.teacherNote && (
            <View style={styles.note}>
              <Text style={typography.kicker}>Note from your teacher</Text>
              <Text style={styles.noteText}>{exam.teacherNote}</Text>
            </View>
          )}

          <View style={styles.rules}>
            {exam.rules.map((rule, i) => (
              <View key={rule.title} style={styles.rule}>
                <Text style={styles.ruleNumber}>{String(i + 1).padStart(2, '0')}</Text>
                <View style={styles.ruleText}>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                  <Text style={styles.ruleDetail}>{rule.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          {(exam.needsHeadphones || exam.needsMicrophone) && (
            <View style={styles.checks}>
              <Text style={typography.kicker}>Device check</Text>
              <View style={styles.checkGrid}>
                {exam.needsHeadphones && (
                  <DeviceCheck
                    icon={<HeadphonesIcon />}
                    label="Headphones"
                    done={audioOk}
                    actionLabel="Sound test"
                    doneLabel="Heard ✓"
                    onPress={() => setAudioOk(true)}
                    first
                  />
                )}
                {exam.needsMicrophone && (
                  <DeviceCheck
                    icon={<MicIcon />}
                    label="Microphone"
                    done={micOk}
                    actionLabel="Allow"
                    doneLabel="Allowed ✓"
                    onPress={() => setMicOk(true)}
                    first={!exam.needsHeadphones}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
        {!checksDone && <Text style={styles.footerHint}>Check your headphones and microphone first.</Text>}
        <Button
          label={isContinue ? 'Continue test' : 'Start test · timer begins'}
          size="large"
          trailing
          disabled={!checksDone}
          onPress={start}
          style={styles.startButton}
        />
      </View>
    </View>
  );
}

interface DeviceCheckProps {
  icon: ReactNode;
  label: string;
  done: boolean;
  actionLabel: string;
  doneLabel: string;
  onPress: () => void;
  first?: boolean;
}

function DeviceCheck({ icon, label, done, actionLabel, doneLabel, onPress, first }: DeviceCheckProps) {
  return (
    <View style={[checkStyles.cell, first && checkStyles.cellFirst]}>
      {icon}
      <Text style={checkStyles.label}>{label}</Text>
      <Button
        label={done ? doneLabel : actionLabel}
        variant={done ? 'ghost' : 'secondary'}
        size="compact"
        onPress={onPress}
        disabled={done}
        style={done ? checkStyles.doneButton : undefined}
      />
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
      paddingTop: 28,
      paddingBottom: 32,
    },
    inner: {
      maxWidth: 760,
      gap: 24,
    },
    heading: {
      gap: 8,
    },
    title: {
      fontFamily: fonts.extraBold,
      fontSize: isTablet ? 32 : 28,
      lineHeight: isTablet ? 37 : 32,
      letterSpacing: -0.3,
      color: colors.text,
    },
    description: {
      ...typography.body,
      color: colors.neutral800,
    },
    note: {
      backgroundColor: colors.surface,
      padding: 16,
      gap: 4,
    },
    noteText: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    rules: {
      borderTopWidth: 2,
      borderTopColor: colors.divider,
    },
    rule: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    ruleNumber: {
      width: 28,
      paddingTop: 2,
      fontFamily: fonts.extraBold,
      fontSize: 13,
      color: colors.accent,
    },
    ruleText: {
      flex: 1,
      gap: 2,
    },
    ruleTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 16,
      color: colors.text,
    },
    ruleDetail: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.neutral800,
    },
    checks: {
      gap: 10,
    },
    checkGrid: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 2,
      backgroundColor: colors.divider,
    },
    footer: {
      borderTopWidth: 2,
      borderTopColor: colors.divider,
      paddingHorizontal: padX,
      paddingTop: 12,
      gap: 8,
      backgroundColor: colors.bg,
    },
    footerHint: {
      ...typography.muted,
    },
    startButton: {
      maxWidth: 760,
    },
  });
};

const checkStyles = StyleSheet.create({
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.bg,
  },
  // Prototipte ilk hücrenin solunda boşluk yok
  cellFirst: {
    paddingLeft: 0,
  },
  label: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  // Onaylanmış durum soluk görünmesin
  doneButton: {
    opacity: 1,
  },
});
