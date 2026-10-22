import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import HtmlBlock from '../components/HtmlBlock';
import { HeadphonesIcon, MicIcon } from '../components/icons';
import Kicker from '../components/Kicker';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import useAsyncData from '../hooks/useAsyncData';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useMicPermission from '../hooks/useMicPermission';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';
import { EXAM_TYPE_LABEL, type AssignedExam } from '../types/exam';

const { colors, fonts, typography } = theme;

const SOUND_CHECK = require('../../assets/sounds/sound-check.wav');

interface ExamIntroScreenProps {
  assignmentId: string;
}

interface Rule {
  title: string;
  detail: string;
}

// Kurallar sınavın süresine ve bölümlerine göre (kaynak: "Placement ve Progress Sınavları Nasıl İşler")
function buildRules(exam: AssignedExam): Rule[] {
  const { parts, timeLimitMinutes } = exam;
  const rules: Rule[] = [
    timeLimitMinutes
      ? { title: `${timeLimitMinutes} minutes`, detail: 'The timer starts when you tap Start.' }
      : { title: 'No time limit', detail: 'Take the time you need.' },
    { title: 'One question at a time', detail: 'Answer to continue. You can’t go back.' },
  ];
  if (parts.listening) {
    rules.push({ title: 'Recordings have limited plays', detail: 'Each play is counted, so listen carefully.' });
  }
  if (parts.writing || parts.speaking) {
    rules.push({
      title: 'Writing and speaking come last',
      detail: timeLimitMinutes ? 'The last 20 minutes are kept for them.' : 'One task each.',
    });
  }
  rules.push(
    { title: 'Single attempt', detail: 'If you stop, you continue where you left off.' },
    { title: 'Stay in the app', detail: 'Leaving the app 3 times or not touching the screen for 10 minutes ends your test.' },
  );
  return rules;
}

const DESCRIPTION = {
  placement: 'Questions start in the middle and adapt to your answers. You won’t see a question twice.',
  progress: 'Questions start near your last level and adapt to your answers. You won’t see a question twice.',
};

type SoundState = 'idle' | 'played' | 'heard';

// Sınav girişi: yönerge, kurallar ve cihaz kontrolü. Sınavı burası başlatmaz; Start sınav ekranını açar,
// deneme orada POST /exams/:id/start ile oluşturulur.
export default function ExamIntroScreen({ assignmentId }: ExamIntroScreenProps) {
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const load = useCallback(() => examService.getExam(assignmentId), [assignmentId]);
  const { data: exam, loading, error, reload } = useAsyncData(load);

  const player = useAudioPlayer(SOUND_CHECK);
  const [sound, setSound] = useState<SoundState>('idle');
  // Reddedilse de sınav başlar; speaking görevinde "teknik sorun" yolu var
  const { status: mic, request: askMic, openSettings } = useMicPermission();

  const playSound = async () => {
    // Telefon sessizdeyken de çalsın (sınavdaki dinleme kayıtları için de gerekli)
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.seekTo(0);
    player.play();
    setSound((s) => (s === 'heard' ? s : 'played'));
  };

  const header = <ScreenHeader backLabel="Assignments" onBack={() => router.back()} />;

  if (!exam) {
    return (
      <View style={styles.root}>
        {header}
        <StateView loading={loading} error={error} onRetry={reload} />
      </View>
    );
  }

  const { parts } = exam;
  const soundDone = !parts.listening || sound === 'heard';
  const micDone = !parts.speaking || mic !== 'unknown';
  const checksDone = soundDone && micDone;
  const canStart = exam.action === 'start' || exam.action === 'resume';

  const start = () => router.replace({ pathname: '/exam/[id]/session', params: { id: exam.assignmentId } });

  const pending = [!soundDone && 'headphones', !micDone && 'microphone'].filter(Boolean).join(' and ');
  const hint = !canStart
    ? null
    : !checksDone
      ? `Check your ${pending} first.`
      : parts.speaking && mic === 'denied'
        ? 'Microphone access is off. You can start, but your speaking task can’t be recorded.'
        : null;

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.heading}>
            <Kicker accent>{EXAM_TYPE_LABEL[exam.examType]}</Kicker>
            <Text style={styles.title} accessibilityRole="header">{exam.title}</Text>
            <Text style={styles.description}>{DESCRIPTION[exam.examType]}</Text>
          </View>

          {!!exam.instructionsHtml.trim() && (
            <View style={styles.instructions}>
              <Kicker>Instructions</Kicker>
              <HtmlBlock html={exam.instructionsHtml} />
            </View>
          )}

          <View style={styles.rules}>
            {buildRules(exam).map((rule, i) => (
              <View key={rule.title} style={styles.rule}>
                <Text style={styles.ruleNumber}>{String(i + 1).padStart(2, '0')}</Text>
                <View style={styles.ruleText}>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                  <Text style={styles.ruleDetail}>{rule.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          {(parts.listening || parts.speaking) && (
            <View style={styles.checks}>
              <Kicker>Device check</Kicker>
              <View style={styles.checkGrid}>
                {parts.listening && (
                  <DeviceCheck
                    icon={<HeadphonesIcon />}
                    label="Headphones"
                    detail={sound === 'heard' ? 'Sound works.' : 'Put them on and play a sound.'}
                    first
                  >
                    {sound === 'heard' ? (
                      <Button label="Heard ✓" variant="ghost" size="compact" disabled onPress={() => {}} style={checkStyles.doneButton} />
                    ) : (
                      <>
                        <Button label={sound === 'idle' ? 'Play sound' : 'Play again'} variant="secondary" size="compact" onPress={playSound} />
                        {sound === 'played' && (
                          <Button label="I heard it" variant="secondary" size="compact" onPress={() => setSound('heard')} />
                        )}
                      </>
                    )}
                  </DeviceCheck>
                )}
                {parts.speaking && (
                  <DeviceCheck
                    icon={<MicIcon />}
                    label="Microphone"
                    detail={
                      mic === 'granted'
                        ? 'Ready to record.'
                        : mic === 'denied'
                          ? 'Access is off. Turn it on in Settings.'
                          : 'Needed for the speaking task.'
                    }
                    first={!parts.listening}
                  >
                    {mic === 'granted' ? (
                      <Button label="Allowed ✓" variant="ghost" size="compact" disabled onPress={() => {}} style={checkStyles.doneButton} />
                    ) : mic === 'denied' ? (
                      <Button label="Settings" variant="secondary" size="compact" onPress={openSettings} />
                    ) : (
                      <Button label="Allow" variant="secondary" size="compact" onPress={askMic} />
                    )}
                  </DeviceCheck>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom(12) }]}>
        {!!hint && <Text style={styles.footerHint}>{hint}</Text>}
        <Button
          label={
            exam.action === 'resume'
              ? 'Continue test'
              : exam.action === 'start'
                ? 'Start test · timer begins'
                : 'This test is not open'
          }
          size="large"
          trailing={canStart || undefined}
          disabled={!canStart || !checksDone}
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
  detail: string;
  first?: boolean;
  children: ReactNode;
}

function DeviceCheck({ icon, label, detail, first, children }: DeviceCheckProps) {
  return (
    <View style={[checkStyles.cell, first && checkStyles.cellFirst]}>
      <View style={checkStyles.info}>
        {icon}
        <View style={checkStyles.text}>
          <Text style={checkStyles.label}>{label}</Text>
          <Text style={typography.muted}>{detail}</Text>
        </View>
      </View>
      <View style={checkStyles.actions}>{children}</View>
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
    instructions: {
      backgroundColor: colors.surface,
      padding: 16,
      gap: 8,
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
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.bg,
  },
  // Prototipte ilk hücrenin solunda boşluk yok
  cellFirst: {
    paddingLeft: 0,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Onaylanmış durum soluk görünmesin
  doneButton: {
    opacity: 1,
  },
});
