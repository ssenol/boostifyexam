import { setAudioModeAsync } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Dialog, { DialogConfig } from '../components/Dialog';
import ChoiceQuestion from '../components/exam/ChoiceQuestion';
import { ChromeStep, ExamChromeProps, ExamSidePanel, ExamTopBar, LOW_TIME_SECONDS, TABLET_TOP_EXTRA } from '../components/exam/ExamChrome';
import ListeningPlayer from '../components/exam/ListeningPlayer';
import ReadingPassage from '../components/exam/ReadingPassage';
import SectionIntro from '../components/exam/SectionIntro';
import SpeakingTaskView, { type Confirm } from '../components/exam/SpeakingTaskView';
import Watermark from '../components/exam/Watermark';
import WritingTaskView, { lengthWarning } from '../components/exam/WritingTaskView';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import Toast, { useToast } from '../components/Toast';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useExamGuard from '../hooks/useExamGuard';
import useExamSession from '../hooks/useExamSession';
import useKeyboardInset from '../hooks/useKeyboardInset';
import useMicPermission from '../hooks/useMicPermission';
import useResponsive from '../hooks/useResponsive';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/slices/authSlice';
import { theme } from '../theme';
import { EXAM_TYPE_LABEL, RECEPTIVE_SKILLS, SKILL_LABEL, type SessionState, type Skill } from '../types/exam';
import { getErrorMessage, isApiError } from '../utils/errors';
import { countWords, formatClock } from '../utils/format';

const { colors, fonts } = theme;

// Writing / speaking onayı: birincil düğme true, ikincil false döner
type Ask = Omit<DialogConfig, 'onPrimary' | 'onSecondary'> & { resolve: (ok: boolean) => void };

// exit: öğrenci Pause'a bastı · warn / final: uygulamadan çıkma uyarısı (sunucunun kararı) · inactive: hareketsizlik
type Overlay = { kind: 'exit' } | { kind: 'warn'; count: number; limit: number } | { kind: 'final' } | { kind: 'inactive' };

type Pane = 'text' | 'question';

interface ExamSessionScreenProps {
  assignmentId: string;
  // Listeden / girişten gelir; yoksa sınav türü gösterilir
  title?: string;
}

// Sınav ekranı. Tek veri kaynağı sunucunun state'i: hangi ekranın çizileceğine phase ve currentItem karar verir.
export default function ExamSessionScreen({ assignmentId, title }: ExamSessionScreenProps) {
  // Ekran kararırsa uygulama arka plana düşer ve "uygulamadan çıkma" sayılır; sınav boyunca açık kalır
  useKeepAwake();

  const session = useExamSession(assignmentId);
  const { state, remaining, busy } = session;
  const item = state?.currentItem ?? null;
  const itemId = item?.id ?? null;

  const user = useAppSelector(selectCurrentUser);
  const insets = useSafeAreaInsets();
  const { isTablet, width, height } = useResponsive();
  const isPortrait = height > width;
  const styles = useMemo(() => createStyles(isTablet, isPortrait), [isTablet, isPortrait]);
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;
  const toast = useToast();
  const bottom = useBottomSpacing();
  const { ref: keyboardRef, inset: keyboardInset, onLayout: onKeyboardAreaLayout } = useKeyboardInset();

  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Soruya bağlı yerel durumlar; soru değişince kendiliğinden geçersiz olur (itemId eşleşmezse yok sayılır)
  const [selection, setSelection] = useState<{ itemId: string; key: string } | null>(null);
  const [paneState, setPaneState] = useState<{ itemId: string; pane: Pane } | null>(null);
  // Metni okunmuş stimulus: aynı metnin sonraki sorularında telefonda doğrudan soru açılır
  const [passageSeen, setPassageSeen] = useState<string | null>(null);
  // Metnin kaydırma yeri (stimulus id → y): aynı metne bağlı sorular arasında korunur
  const [passageOffsets, setPassageOffsets] = useState<Record<string, number>>({});
  const passageScrollY = useRef(0);
  // Geçiş ekranı gösterilmiş bölüm
  const [introDone, setIntroDone] = useState<Skill | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  // Writing metni; açılışta sunucudaki taslak (state.currentDraft)
  const [writing, setWriting] = useState<{ itemId: string; text: string } | null>(null);
  const mic = useMicPermission();
  // Soru ekranda ne zamandan beri (cevapla timeSec olarak gider)
  const shownAt = useRef<{ itemId: string; at: number } | null>(null);

  const showError = (e: unknown) => toast.show(getErrorMessage(e));

  // Telefon sessizdeyken de dinleme kayıtları çalsın
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (itemId) shownAt.current = { itemId, at: Date.now() };
  }, [itemId]);

  // Sınav ekranı ilk açıldığında bir kez "monitored"
  const { sendEvent, refresh, setDraft } = session;

  // Writing taslağı heartbeat ve pause ile gider; writing dışında gönderilmez
  const isWriting = item?.itemType === 'writing_prompt';
  const writingText = isWriting ? (writing?.itemId === item.id ? writing.text : (state?.currentDraft ?? '')) : '';
  useEffect(() => {
    setDraft(isWriting ? writingText : undefined);
  }, [isWriting, writingText, setDraft]);

  // Görev zaten teslim edilmiş (ör. ağ hatasından sonra tekrar gönderildi): durumu yenile
  const productiveSubmitted = !!state?.productiveSubmitted;
  useEffect(() => {
    if (productiveSubmitted) refresh().catch(() => {});
  }, [productiveSubmitted, refresh]);
  const hasState = !!state;
  const monitoredSent = useRef(false);
  useEffect(() => {
    if (!hasState || monitoredSent.current) return;
    monitoredSent.current = true;
    sendEvent('monitored').catch(() => {});
  }, [hasState, sendEvent]);

  // Süre bitti, son görev teslim edildi ya da kurallarla kapandı
  const phase = state?.phase;
  useEffect(() => {
    if (phase === 'done') router.replace({ pathname: '/exam/[id]/result', params: { id: assignmentId } });
  }, [phase, assignmentId]);

  const running = !!state && state.phase !== 'done';
  const { markActive } = useExamGuard({
    enabled: running,
    onLeave: session.flushHeartbeat,
    onReturn: (seconds) => {
      sendEvent('tabSwitch', Math.round(seconds))
        .then((v) => {
          if (v?.verdict === 'warn') setOverlay({ kind: 'warn', count: v.count, limit: v.limit });
          else if (v?.verdict === 'final') setOverlay({ kind: 'final' });
          // terminate: dönen state phase = done, bitiş ekranına geçilir
        })
        .catch(() => {})
        // Uzun süre arka planda kalınmış olabilir: ekranı tazele
        .finally(() => refresh().catch(() => {}));
    },
    onBackPress: () => {
      if (running && !overlay) setOverlay({ kind: 'exit' });
    },
    // Dinleme çalarken, kayıt alınırken ve (hareketsizlik uyarısı dışında) bir pencere açıkken sayaç işlemez
    inactivityCounting: !audioPlaying && !recordingActive && !ask && (!overlay || overlay.kind === 'inactive'),
    inactivityWarnSeconds: state?.guard.inactivityWarnSeconds ?? 300,
    inactivityEndSeconds: state?.guard.inactivityEndSeconds ?? 600,
    onInactivityWarn: () => {
      sendEvent('inactivityWarn').catch(() => {});
      setOverlay({ kind: 'inactive' });
    },
    onInactivityEnd: () => {
      sendEvent('inactivityEnd').catch(() => {});
    },
  });

  const confirm: Confirm = (config) =>
    new Promise((resolve) => {
      setAsk({ ...config, resolve });
    });

  const answerAsk = (ok: boolean) => {
    ask?.resolve(ok);
    setAsk(null);
  };

  // "Sınavdan çık": saat durur. İstek ulaşmasa da çıkılır; sunucu heartbeat gelmeyince saati kendisi durdurur.
  const pauseAndLeave = () => {
    setLeaving(true);
    session
      .pause()
      .catch(() => {})
      .finally(() => router.dismissTo('/'));
  };

  if (!state || state.phase === 'done') {
    return (
      <View style={styles.root}>
        {!state && session.error && <ScreenHeader backLabel="Assignments" onBack={() => router.dismissTo('/')} />}
        <StateView loading={session.loading || state?.phase === 'done'} error={session.error} onRetry={session.reload} />
      </View>
    );
  }

  // currentItem boş ama sınav bitmemiş: hook kısa süre sonra yeniden sorar
  if (!item) return <StateView loading />;

  const section = state.phase === 'receptive' ? state.section : null;
  const isSpeaking = item.itemType === 'speaking_prompt';
  const words = countWords(writingText);
  const showIntro = !!section && section.answered === 0 && introDone !== section.skill;
  const isChoice = state.phase === 'receptive';

  const selectedKey = selection?.itemId === item.id ? selection.key : null;
  const passage = item.stimulus?.kind === 'passage' ? item.stimulus : null;
  const audio = item.stimulus?.audioKey
    ? { key: item.stimulus.audioKey, left: item.stimulus.playsLeft ?? 0, max: item.stimulus.maxPlays }
    : item.audioKey
      ? { key: item.audioKey, left: item.audioPlaysLeft ?? 0, max: item.audioMaxPlays ?? 0 }
      : null;

  const next = () => {
    if (!selectedKey) return;
    const timeSec = shownAt.current?.itemId === item.id ? Math.round((Date.now() - shownAt.current.at) / 1000) : 0;
    session.answer(item.id, selectedKey, timeSec).catch((e) => {
      if (isApiError(e, 'invalid_answer')) refresh().catch(() => {});
      showError(e);
    });
  };

  const playAudio = (key: string) =>
    session.playAudio(key).catch((e) => {
      // Ekrandaki soru değişmiş olabilir
      if (isApiError(e, 'no_audio', 'wrong_audio')) refresh().catch(() => {});
      throw e;
    });

  // Okuma metni yatay tablette soruyla yan yana; telefonda ve dikey tablette Text / Question sekmeleri
  const showSidePassage = !!passage && isTablet && !isPortrait;
  const showPaneTabs = !!passage && !showSidePassage && !showIntro;
  const defaultPane: Pane = passage && passageSeen === passage.id ? 'question' : 'text';
  const pane = paneState?.itemId === item.id ? paneState.pane : defaultPane;
  const showInlinePassage = showPaneTabs && pane === 'text';

  const switchPane = (nextPane: Pane) => {
    if (passage && pane === 'text') {
      // Metinden çıkarken kaydırma yeri saklanır
      setPassageOffsets((o) => ({ ...o, [passage.id]: passageScrollY.current }));
      setPassageSeen(passage.id);
    }
    setPaneState({ itemId: item.id, pane: nextPane });
  };

  const submitWriting = async () => {
    const spec = item.productive;
    const warning = lengthWarning(words, spec?.minWords ?? 0, spec?.maxWords ?? 0);
    const ok = await confirm(
      words > 0
        ? {
            kicker: 'Writing task',
            title: 'Submit your text?',
            body: `Your text (${words} words) can’t be changed after you submit.${warning ? ` ${warning}.` : ''}`,
            primaryLabel: 'Submit',
            secondaryLabel: 'Keep writing',
          }
        : {
            kicker: 'Empty answer',
            title: 'Skip this task?',
            body: 'You haven’t written anything. This task will score 0.',
            tone: 'warn',
            primaryLabel: 'Skip, score 0',
            secondaryLabel: 'Keep writing',
          },
    );
    if (!ok) return;
    session
      .submitTask(words > 0 ? { itemId: item.id, text: writingText } : { itemId: item.id, skipped: true })
      .catch(showError);
  };

  const onContentScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (showInlinePassage) passageScrollY.current = e.nativeEvent.contentOffset.y;
  };

  const askDialog: DialogConfig | null = ask && {
    ...ask,
    onPrimary: () => answerAsk(true),
    onSecondary: ask.secondaryLabel ? () => answerAsk(false) : undefined,
    busy: busy,
  };

  const dialog = askDialog ?? buildDialog({
    overlay,
    leaving,
    inactivityLeftMinutes: Math.round((state.guard.inactivityEndSeconds - state.guard.inactivityWarnSeconds) / 60),
    onClose: () => {
      setOverlay(null);
      markActive();
    },
    onLeave: pauseAndLeave,
  });

  const chrome: ExamChromeProps = {
    examTitle: title || EXAM_TYPE_LABEL[state.examType],
    skill: SKILL_LABEL[item.skill],
    numberKicker: isChoice ? 'Question' : 'Task',
    numberValue: isChoice ? String((section?.answered ?? 0) + 1).padStart(2, '0') : item.skill === 'writing' ? 'W' : 'S',
    timeText: remaining == null ? null : formatClock(remaining),
    timeLow: remaining != null && remaining <= LOW_TIME_SECONDS,
    steps: buildSteps(state),
    saveState: session.saveState,
    onPause: () => setOverlay({ kind: 'exit' }),
  };

  const footerPadding = bottom(12);
  const footerLift = keyboardInset > 0 ? Math.max(0, keyboardInset - (footerPadding - 12)) : 0;
  const watermarkText = [user?.username, [user?.name, user?.lastName].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ');

  return (
    // Ekrana dokunmak etkinliktir (hareketsizlik sayacı); dokunma olayları alt bileşenlerden buraya kabarır
    <View style={[styles.root, isTablet && styles.rootTablet]} onTouchStart={markActive}>
      {isTablet ? <ExamSidePanel {...chrome} /> : <ExamTopBar {...chrome} />}

      {/* Android edge-to-edge çizildiği için pencere klavyeyle küçülmez. Klavye açılınca yalnızca alt çubuk klavyenin
          üstüne kaldırılır; ScrollView'ın boyu değişmez (bkz. CLAUDE.md "Klavye"). */}
      <View ref={keyboardRef} onLayout={onKeyboardAreaLayout} style={styles.main}>
        <View style={styles.body}>
          {showSidePassage && passage && !showIntro && (
            <ScrollView
              key={passage.id}
              style={styles.sidePassage}
              contentContainerStyle={[styles.sidePassageContent, { paddingTop: Math.max(28, insets.top + 16) + TABLET_TOP_EXTRA }]}
            >
              <ReadingPassage stimulus={passage} showKicker />
            </ScrollView>
          )}

          <ScrollView
            key={`${item.id}:${showInlinePassage ? 'text' : 'question'}`}
            style={styles.content}
            contentContainerStyle={[
              styles.contentInner,
              isTablet && { paddingTop: Math.max(24, insets.top + 12) + TABLET_TOP_EXTRA },
              keyboardInset > 0 && { paddingBottom: 28 + footerLift },
            ]}
            contentOffset={showInlinePassage && passage ? { x: 0, y: passageOffsets[passage.id] ?? 0 } : undefined}
            onScroll={onContentScroll}
            scrollEventThrottle={100}
            keyboardShouldPersistTaps="handled"
            scrollsChildToFocus={false}
          >
            <View style={styles.column}>
              {showIntro && section ? (
                <SectionIntro section={section} onContinue={() => setIntroDone(section.skill)} isTablet={isTablet} />
              ) : isWriting ? (
                <WritingTaskView
                  item={item}
                  text={writingText}
                  onChangeText={(text) => {
                    setWriting({ itemId: item.id, text });
                    markActive();
                  }}
                  onPasteBlocked={() => {
                    toast.show('Pasting is turned off in this test.');
                    sendEvent('pasteBlocked').catch(() => {});
                  }}
                  isTablet={isTablet}
                  editable={!busy && !productiveSubmitted}
                />
              ) : isSpeaking ? (
                <SpeakingTaskView
                  key={item.id}
                  item={item}
                  isTablet={isTablet}
                  mic={mic.status}
                  requestMic={mic.request}
                  confirm={confirm}
                  onTranscribe={(uri) => session.transcribe(item.id, uri)}
                  onSubmit={(recording) => session.submitTask({ recording: { itemId: item.id, ...recording } })}
                  onSubmitWithout={(kind) =>
                    session.submitTask(kind === 'technical' ? { itemId: item.id, technical: true } : { itemId: item.id, skipped: true })
                  }
                  onRecordingChange={setRecordingActive}
                  onActivity={markActive}
                  busy={busy}
                />
              ) : !isChoice ? null : (
                <>
                  {showPaneTabs && (
                    <View style={styles.paneTabs} accessibilityRole="tablist">
                      <PaneTab label="Text" active={pane === 'text'} onPress={() => switchPane('text')} />
                      <PaneTab label="Question" active={pane === 'question'} onPress={() => switchPane('question')} divided />
                    </View>
                  )}

                  {showInlinePassage && passage ? (
                    <View>
                      <ReadingPassage stimulus={passage} />
                      <Button label="Go to question" variant="secondary" trailing onPress={() => switchPane('question')} />
                    </View>
                  ) : (
                    <View style={styles.question}>
                      {audio && (
                        <ListeningPlayer
                          key={audio.key}
                          audioKey={audio.key}
                          maxPlays={audio.max}
                          playsLeft={audio.left}
                          onPlay={playAudio}
                          stopSignal={item.id}
                          frozen={!!overlay || !!ask}
                          onPlayingChange={setAudioPlaying}
                        />
                      )}
                      <ChoiceQuestion
                        item={item}
                        selected={selectedKey}
                        onSelect={(key) => setSelection({ itemId: item.id, key })}
                        isTablet={isTablet}
                        disabled={busy}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>

        {isWriting && (
          <View style={[styles.footer, { paddingBottom: footerPadding, transform: [{ translateY: -footerLift }] }]}>
            <Text style={styles.hint}>
              {words > 0 ? 'You can’t change your text after you submit.' : 'Write your text, then submit it.'}
            </Text>
            <Button
              label={words > 0 ? 'Submit text' : 'Skip task'}
              size="large"
              trailing
              onPress={submitWriting}
              loading={busy}
              disabled={productiveSubmitted}
              style={styles.nextButton}
            />
          </View>
        )}

        {isChoice && !showIntro && (
          <View style={[styles.footer, { paddingBottom: footerPadding, transform: [{ translateY: -footerLift }] }]}>
            <Text style={styles.hint}>{selectedKey ? 'No going back after this.' : 'Choose an answer to continue.'}</Text>
            <Button
              label="Next"
              size="large"
              trailing
              onPress={next}
              loading={busy}
              disabled={!selectedKey}
              style={styles.nextButton}
            />
          </View>
        )}
      </View>

      <Watermark text={watermarkText} />
      {dialog && <Dialog {...dialog} />}
      <Toast message={toast.message} bottom={bottom(12) + 84} padX={padX} />
    </View>
  );
}

// Bölüm adımları: çoktan seçmeli bölümler (sıra sabit) + writing / speaking
function buildSteps(state: SessionState): ChromeStep[] {
  const { section, progress, phase } = state;
  const steps: ChromeStep[] = [];

  if (phase === 'receptive' && section) {
    RECEPTIVE_SKILLS.slice(0, section.total).forEach((skill, i) => {
      const index = i + 1;
      const stepState = index < section.index ? 'done' : index === section.index ? 'current' : 'todo';
      steps.push({
        key: skill,
        label: SKILL_LABEL[skill],
        state: stepState,
        meta: stepState === 'current' ? `Question ${section.answered + 1}` : stepState === 'done' ? 'Done' : '',
        progress: stepState === 'current' ? Math.min(1, section.answered / Math.max(1, section.max)) : 0,
      });
    });
  } else {
    steps.push({ key: 'receptive', label: 'Multiple choice', state: 'done', meta: 'Done', progress: 0 });
  }

  const productive: Skill[] =
    progress.productiveTotal >= 2
      ? ['writing', 'speaking']
      : progress.productiveTotal === 1
        ? [state.currentItem?.skill === 'speaking' ? 'speaking' : 'writing']
        : [];
  productive.forEach((skill, i) => {
    const stepState =
      phase !== 'productive' ? 'todo' : i < progress.productiveDone ? 'done' : i === progress.productiveDone ? 'current' : 'todo';
    steps.push({
      key: skill,
      label: SKILL_LABEL[skill],
      state: stepState,
      meta: stepState === 'current' ? 'Now' : stepState === 'done' ? 'Done' : '1 task',
      progress: 0,
    });
  });

  return steps;
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

interface DialogContext {
  overlay: Overlay | null;
  leaving: boolean;
  inactivityLeftMinutes: number;
  onClose: () => void;
  onLeave: () => void;
}

function buildDialog(ctx: DialogContext): DialogConfig | null {
  switch (ctx.overlay?.kind) {
    case 'exit':
      return {
        kicker: 'Pause',
        title: 'Do you want to leave the test?',
        body: 'Your answers are saved and the timer stops. When you come back, you continue from this question.',
        primaryLabel: 'Back to test',
        onPrimary: ctx.onClose,
        secondaryLabel: ctx.leaving ? 'Leaving…' : 'Pause and leave',
        onSecondary: ctx.onLeave,
        busy: ctx.leaving,
      };
    case 'warn':
      return {
        kicker: `Warning · ${ctx.overlay.count} of ${ctx.overlay.limit}`,
        title: 'Don’t leave the app during the test',
        body: `Every exit is recorded. Leaving the app ${ctx.overlay.limit} times ends your test.`,
        tone: 'warn',
        primaryLabel: 'Back to test',
        onPrimary: ctx.onClose,
      };
    case 'final':
      return {
        kicker: 'Last warning',
        title: 'One more exit ends your test',
        body: 'If you leave the app once more, your test ends and your answers so far are scored.',
        tone: 'warn',
        primaryLabel: 'Back to test',
        onPrimary: ctx.onClose,
      };
    case 'inactive':
      return {
        kicker: 'Are you still there?',
        title: 'Continue your test',
        body: `Your test ends if you don’t touch the screen for ${ctx.inactivityLeftMinutes} more minutes.`,
        tone: 'warn',
        primaryLabel: 'Continue',
        onPrimary: ctx.onClose,
      };
    default:
      return null;
  }
}

const createStyles = (isTablet: boolean, isPortrait: boolean) => {
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
    // Dikey tablette yan panel yer kapladığı için buton daralır; ipucu metni sığsın
    nextButton: isTablet ? { width: isPortrait ? 240 : 320 } : {},
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
