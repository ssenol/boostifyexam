import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Dialog, { DialogConfig } from '../components/Dialog';
import ChoiceQuestion from '../components/exam/ChoiceQuestion';
import { ExamChromeProps, ExamSidePanel, ExamTopBar, LOW_TIME_SECONDS } from '../components/exam/ExamChrome';
import ListeningPlayer from '../components/exam/ListeningPlayer';
import ReadingPassage from '../components/exam/ReadingPassage';
import ResumeView from '../components/exam/ResumeView';
import SpeakingTaskView, { useRecorder } from '../components/exam/SpeakingTaskView';
import Watermark from '../components/exam/Watermark';
import WritingTaskView from '../components/exam/WritingTaskView';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import Toast, { useToast } from '../components/Toast';
import useExamGuard from '../hooks/useExamGuard';
import useExamSession from '../hooks/useExamSession';
import useResponsive from '../hooks/useResponsive';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/slices/authSlice';
import { theme } from '../theme';
import type { ExamItem } from '../types/exam';
import { getErrorMessage } from '../utils/errors';
import { countWords, formatClock } from '../utils/format';

const { colors, fonts } = theme;

// exit: öğrenci Pause'a bastı · left: uygulamadan ayrıldı (güvenlik uyarısı) · submit/skip: görev gönderimi
type Overlay = 'exit' | 'left' | 'submit' | 'skip';

type Pane = 'text' | 'question';

interface ExamSessionScreenProps {
  examId: string;
}

export default function ExamSessionScreen({ examId }: ExamSessionScreenProps) {
  // Ekran kararırsa uygulama arka plana düşer ve çıkış sayılır; sınav boyunca açık kalır
  useKeepAwake();

  const session = useExamSession(examId);
  const { snapshot, remaining, busy } = session;
  const item = snapshot?.item ?? null;

  const user = useAppSelector(selectCurrentUser);
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;
  const toast = useToast();

  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [leftReason, setLeftReason] = useState('');
  const [exits, setExits] = useState(0);

  // Soruya bağlı yerel durumlar; soru değişince kendiliğinden sıfırlanır (itemId eşleşmezse yok sayılır)
  const [selection, setSelection] = useState<{ itemId: string; key: string } | null>(null);
  const [paneState, setPaneState] = useState<{ itemId: string; pane: Pane } | null>(null);
  const [writing, setWriting] = useState<{ taskId: string; text: string } | null>(null);

  const selectedKey = item && selection?.itemId === item.id ? selection.key : null;
  const pane: Pane = item && paneState?.itemId === item.id ? paneState.pane : 'text';
  const writingText = item?.kind === 'writing' ? (writing?.taskId === item.id ? writing.text : item.draft) : '';

  const isActive = snapshot?.status === 'active';
  // Pause / güvenlik penceresi açıkken ve oturum duraklatılmışken dinleme ve kayıt durur
  const frozen = !isActive || overlay === 'exit' || overlay === 'left';
  const recorder = useRecorder(item?.kind === 'speaking' ? item.maxSeconds : 60, frozen);

  // Süre dolunca ya da son görev gönderilince sunucu oturumu kapatır
  useEffect(() => {
    if (snapshot?.status === 'finished') {
      router.replace({ pathname: '/exam/[id]/result', params: { id: examId } });
    }
  }, [snapshot?.status, examId]);

  const showError = (e: unknown) => toast.show(getErrorMessage(e));

  const openExit = () => {
    setOverlay('exit');
    session.pause().catch(showError);
  };

  const backToTest = () => {
    session
      .resume()
      .then(() => setOverlay(null))
      .catch(showError);
  };

  // Oturum zaten duraklatıldı. Pencere kapatılmaz: kapanırsa ekran kapanmadan "Welcome back" bir an görünür
  const leaveToAssignments = () => router.dismissTo('/');

  useExamGuard({
    enabled: isActive,
    onLeave: (info) => {
      // Süre ayrılır ayrılmaz durur; olay sunucuya kaydedilir
      session.pause().catch(() => {});
      session.logEvent({ type: info.type, detail: info.reason });
    },
    onReturn: (info) => {
      if (info.type === 'app_background') session.logEvent({ type: info.type, detail: info.reason });
      setExits((n) => n + 1);
      setLeftReason(info.reason);
      setOverlay('left');
    },
    onBackPress: () => {
      if (isActive && !overlay) openExit();
    },
  });

  if (!snapshot || snapshot.status === 'finished') {
    return (
      <View style={styles.root}>
        {!snapshot && session.error && <ScreenHeader backLabel="Assignments" onBack={() => router.dismissTo('/')} />}
        <StateView loading={session.loading || snapshot?.status === 'finished'} error={session.error} onRetry={session.reload} />
      </View>
    );
  }

  const timeText = formatClock(remaining);

  // "Pause and leave" sonrası geri gelindi
  if (snapshot.status === 'paused' && !overlay) {
    return (
      <>
        <ResumeView
          answeredCount={snapshot.answeredCount}
          timeText={timeText}
          onContinue={() => session.resume().catch(showError)}
          onLeave={leaveToAssignments}
          busy={session.saveState === 'saving'}
          isTablet={isTablet}
        />
        <Toast message={toast.message} bottom={Math.max(24, insets.bottom + 16)} padX={padX} />
      </>
    );
  }

  if (!item) return <StateView loading />;

  const words = countWords(writingText);

  const next = () => {
    if (item.kind === 'choice') {
      if (!selectedKey) return;
      session.answerChoice(item.id, selectedKey).catch(showError);
    } else if (item.kind === 'writing') {
      setOverlay(words > 0 ? 'submit' : 'skip');
    } else {
      setOverlay(recorder.state === 'idle' ? 'skip' : 'submit');
    }
  };

  // submit: cevabı gönder · skip: boş geç (0 puan)
  const confirmTask = (skip: boolean) => {
    let request: Promise<unknown>;
    if (item.kind === 'writing') {
      request = session.submitWriting(item.id, skip ? null : writingText);
    } else if (item.kind === 'speaking') {
      // Kayıt sürerken gönderilirse önce durdurulur
      recorder.stop();
      request = session.submitSpeaking(item.id, !skip);
    } else {
      return;
    }
    request.then(() => setOverlay(null)).catch(showError);
  };

  const dialog = buildDialog({
    overlay,
    item,
    words,
    exits,
    leftReason,
    busy,
    onBackToTest: backToTest,
    onLeave: leaveToAssignments,
    onClose: () => setOverlay(null),
    onConfirm: confirmTask,
  });

  const chrome: ExamChromeProps = {
    examTitle: snapshot.examTitle,
    skill: item.skill,
    numberKicker: item.kind === 'choice' ? 'Question' : 'Task',
    numberValue: item.kind === 'choice' ? String(snapshot.itemNumber).padStart(2, '0') : item.kind === 'writing' ? 'W1' : 'S1',
    timeText,
    timeLow: remaining <= LOW_TIME_SECONDS,
    sections: snapshot.sections,
    currentSection: snapshot.currentSection,
    itemNumber: snapshot.itemNumber,
    saveState: session.saveState,
    onPause: openExit,
  };

  const reading = item.kind === 'choice' && !!item.passage;
  const showSidePassage = reading && isTablet;
  const showPaneTabs = reading && !isTablet;
  const showInlinePassage = showPaneTabs && pane === 'text';

  const hint = hintFor(item, { selectedKey, words, recordState: recorder.state });
  const nextLabel = item.kind === 'choice' ? 'Next' : item.kind === 'writing' ? 'Submit text' : 'Submit recording';
  const watermarkText = [user?.username, [user?.name, user?.surname ?? user?.lastName].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.root, isTablet && styles.rootTablet]}>
      {isTablet ? <ExamSidePanel {...chrome} /> : <ExamTopBar {...chrome} />}

      <KeyboardAvoidingView style={styles.main} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          {showSidePassage && item.kind === 'choice' && item.passage && (
            <ScrollView style={styles.sidePassage} contentContainerStyle={[styles.sidePassageContent, { paddingTop: Math.max(28, insets.top + 16) }]}>
              <ReadingPassage passage={item.passage} showKicker />
            </ScrollView>
          )}

          <ScrollView
            key={item.id}
            style={styles.content}
            contentContainerStyle={[styles.contentInner, isTablet && { paddingTop: Math.max(24, insets.top + 12) }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.column}>
              {showPaneTabs && (
                <View style={styles.paneTabs} accessibilityRole="tablist">
                  <PaneTab label="Text" active={pane === 'text'} onPress={() => setPaneState({ itemId: item.id, pane: 'text' })} />
                  <PaneTab label="Question" active={pane === 'question'} onPress={() => setPaneState({ itemId: item.id, pane: 'question' })} divided />
                </View>
              )}

              {showInlinePassage && item.kind === 'choice' && item.passage ? (
                <View>
                  <ReadingPassage passage={item.passage} />
                  <Button
                    label="Go to question"
                    variant="secondary"
                    trailing
                    onPress={() => setPaneState({ itemId: item.id, pane: 'question' })}
                  />
                </View>
              ) : item.kind === 'choice' ? (
                <View style={styles.question}>
                  {item.audio && (
                    <ListeningPlayer key={item.audio.id} audio={item.audio} onRequestPlay={session.registerPlay} paused={frozen} />
                  )}
                  <ChoiceQuestion
                    item={item}
                    selected={selectedKey}
                    onSelect={(key) => setSelection({ itemId: item.id, key })}
                    isTablet={isTablet}
                    disabled={busy}
                  />
                </View>
              ) : item.kind === 'writing' ? (
                <WritingTaskView
                  task={item}
                  text={writingText}
                  onChangeText={(text) => {
                    setWriting({ taskId: item.id, text });
                    session.saveDraft(item.id, text);
                  }}
                  onPasteBlocked={() => {
                    toast.show('Pasting is disabled in this test');
                    session.logEvent({ type: 'paste_blocked' });
                  }}
                  // TODO: Fotoğraf yükleme (el yazısı → metin) backend ile netleşince
                  onPhoto={() => toast.show('The photo will be converted to text once uploaded')}
                  isTablet={isTablet}
                  editable={!busy}
                />
              ) : (
                <SpeakingTaskView task={item} state={recorder.state} seconds={recorder.seconds} onToggle={recorder.toggle} isTablet={isTablet} />
              )}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
          <Text style={styles.hint}>{hint}</Text>
          <Button
            label={nextLabel}
            size="large"
            trailing
            onPress={next}
            loading={busy && !overlay}
            disabled={item.kind === 'choice' && !selectedKey}
            style={styles.nextButton}
          />
        </View>
      </KeyboardAvoidingView>

      <Watermark text={watermarkText} />
      {dialog && <Dialog {...dialog} />}
      <Toast message={toast.message} bottom={Math.max(96, insets.bottom + 84)} padX={padX} />
    </View>
  );
}

function PaneTab({ label, active, onPress, divided }: { label: string; active: boolean; onPress: () => void; divided?: boolean }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[paneStyles.tab, divided && paneStyles.divided, active && paneStyles.active]}
    >
      <Text style={[paneStyles.label, active && paneStyles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

function hintFor(item: ExamItem, ctx: { selectedKey: string | null; words: number; recordState: string }) {
  if (item.kind === 'choice') return ctx.selectedKey ? 'No going back after this.' : 'Choose an answer to continue.';
  if (item.kind === 'writing') {
    if (ctx.words < item.minWords) return `Write at least ${item.minWords} words.`;
    if (ctx.words > item.maxWords) return `${item.maxWords} words maximum.`;
    return 'Word count is within range.';
  }
  if (ctx.recordState === 'idle') return 'Tap the microphone to start recording.';
  if (ctx.recordState === 'recording') return 'Tap the square to stop recording.';
  return 'Recording ready.';
}

interface DialogContext {
  overlay: Overlay | null;
  item: ExamItem;
  words: number;
  exits: number;
  leftReason: string;
  busy: boolean;
  onBackToTest: () => void;
  onLeave: () => void;
  onClose: () => void;
  onConfirm: (skip: boolean) => void;
}

// Prototipteki dört pencere (exit, left, submit, skip)
function buildDialog(ctx: DialogContext): DialogConfig | null {
  const isWriting = ctx.item.kind === 'writing';
  switch (ctx.overlay) {
    case 'exit':
      return {
        kicker: 'Pause',
        title: 'Do you want to leave the test?',
        body: 'Answers are saved and the timer stops. You’ll resume from this question.',
        primaryLabel: 'Back to test',
        onPrimary: ctx.onBackToTest,
        secondaryLabel: 'Pause and leave',
        onSecondary: ctx.onLeave,
      };
    case 'left':
      return {
        kicker: `Security alert · exit ${ctx.exits}`,
        title: 'You left the test screen',
        body: `${ctx.leftReason} Timer paused; exit recorded.`,
        tone: 'warn',
        primaryLabel: 'Back to test',
        onPrimary: ctx.onBackToTest,
      };
    case 'submit':
      return {
        kicker: isWriting ? 'Writing task' : 'Speaking task',
        title: 'Submit your answer?',
        body: isWriting ? `Your text (${ctx.words} words) can’t be changed after this.` : 'Your recording can’t be changed after this.',
        primaryLabel: 'Submit',
        onPrimary: () => ctx.onConfirm(false),
        secondaryLabel: 'Go back',
        onSecondary: ctx.onClose,
        busy: ctx.busy,
      };
    case 'skip':
      return {
        kicker: 'Empty answer',
        title: 'Skip this task?',
        body: 'This task is empty. Skipping scores 0.',
        tone: 'warn',
        primaryLabel: isWriting ? 'Back to writing' : 'Back to recording',
        onPrimary: ctx.onClose,
        secondaryLabel: ctx.busy ? 'Skipping…' : 'Skip, score 0',
        onSecondary: () => ctx.onConfirm(true),
      };
    default:
      return null;
  }
}

const createStyles = (isTablet: boolean) => {
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    rootTablet: {
      flexDirection: 'row',
    },
    main: {
      flex: 1,
      minWidth: 0,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
    },
    sidePassage: {
      width: '46%',
      flexGrow: 0,
      borderRightWidth: 2,
      borderRightColor: colors.divider,
      backgroundColor: colors.surface,
    },
    sidePassageContent: {
      paddingHorizontal: 32,
      paddingBottom: 28,
    },
    content: {
      flex: 1,
    },
    contentInner: {
      paddingHorizontal: padX,
      paddingTop: 24,
      paddingBottom: 28,
    },
    column: {
      maxWidth: 720,
      gap: 20,
    },
    paneTabs: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.divider,
    },
    question: {
      gap: 20,
    },
    footer: {
      flexDirection: isTablet ? 'row' : 'column',
      alignItems: isTablet ? 'center' : 'stretch',
      gap: isTablet ? 16 : 8,
      borderTopWidth: 2,
      borderTopColor: colors.divider,
      paddingHorizontal: padX,
      paddingTop: 10,
      backgroundColor: colors.bg,
    },
    hint: {
      flex: isTablet ? 1 : undefined,
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.neutral700,
    },
    nextButton: isTablet ? { width: 320 } : {},
  });
};

const paneStyles = StyleSheet.create({
  tab: {
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
