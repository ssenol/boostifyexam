import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MicPermission } from '../../hooks/useMicPermission';
import type { Transcription } from '../../services/exam';
import { theme } from '../../theme';
import type { SessionItem } from '../../types/exam';
import { getErrorMessage } from '../../utils/errors';
import { formatClock } from '../../utils/format';
import Button from '../Button';
import type { DialogConfig } from '../Dialog';
import RemoteImage from '../RemoteImage';
import Instructions from './Instructions';
import { MicIcon, PlayIcon, StopIcon } from '../icons';

const { colors, fonts, typography } = theme;

// Kaydedicinin üst sınırı gelmezse
const DEFAULT_MAX_SECONDS = 300;

type Stage = 'idle' | 'recording' | 'transcribing' | 'review';

export interface Confirm {
  (config: Omit<DialogConfig, 'onPrimary' | 'onSecondary'>): Promise<boolean>;
}

export interface FinishedRecording {
  fileUri: string;
  durationSec: number;
  transcript: string;
  transcriptEdited: boolean;
}

interface SpeakingTaskViewProps {
  item: SessionItem;
  isTablet: boolean;
  mic: MicPermission;
  requestMic: () => Promise<void>;
  // Ekranın onay penceresi; birincil düğmeye basılırsa true
  confirm: Confirm;
  onTranscribe: (fileUri: string) => Promise<Transcription>;
  onSubmit: (recording: FinishedRecording) => Promise<unknown>;
  // Kayıt olmadan: mikrofon çalışmadı (technical, puanlamadan çıkarılır) ya da öğrenci geçti (skipped, 0 puan)
  onSubmitWithout: (kind: 'technical' | 'skipped') => Promise<unknown>;
  // Kayıt sürerken hareketsizlik sayacı işlemez
  onRecordingChange: (recording: boolean) => void;
  // Metni düzeltmek etkinliktir
  onActivity: () => void;
  busy: boolean;
}

// "1 minute 40 seconds"
function spokenDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const parts = [m && `${m} minute${m === 1 ? '' : 's'}`, s && `${s} second${s === 1 ? '' : 's'}`].filter(Boolean);
  return parts.join(' ');
}

// metering (dBFS, yaklaşık -60..0) → 0..1
const levelOf = (metering?: number) => (metering == null ? 0 : Math.max(0, Math.min(1, (metering + 60) / 60)));

// Speaking görevi (webdekiyle aynı): kaydet → metne çevir ve göster → onaylayıp teslim et. Tek kayıt alınır: öğrenci
// durdurduğunda kayıt biter, yeniden kayıt yoktur. Ekran bunu key={item.id} ile çizer.
export default function SpeakingTaskView({
  item,
  isTablet,
  mic,
  requestMic,
  confirm,
  onTranscribe,
  onSubmit,
  onSubmitWithout,
  onRecordingChange,
  onActivity,
  busy,
}: SpeakingTaskViewProps) {
  const spec = item.productive;
  const maxSeconds = spec?.maxResponseSeconds || DEFAULT_MAX_SECONDS;
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recState = useAudioRecorderState(recorder, 200);

  const [stage, setStage] = useState<Stage>('idle');
  const [recording, setRecording] = useState<{ uri: string; durationSec: number } | null>(null);
  const [transcript, setTranscript] = useState('');
  const [original, setOriginal] = useState('');
  const [transcribeFailed, setTranscribeFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    onRecordingChange(stage === 'recording');
  }, [stage, onRecordingChange]);

  const start = async () => {
    setError(null);
    if (mic !== 'granted') {
      // İzin penceresi uygulamadan ayrılma sayılmaz
      await requestMic();
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      // Üst sınırda kayıt kendiliğinden durur
      recorder.record({ forDuration: maxSeconds });
      setStage('recording');
    } catch {
      setError('The recording could not start. Check your microphone or report a technical problem.');
    }
  };

  // Kaydı bitirir ve metne çevirir
  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    const durationSec = Math.max(1, Math.round(recorder.getStatus().durationMillis / 1000));
    try {
      await recorder.stop();
    } catch {
      // Kendiliğinden durmuş olabilir
    }
    // Kayıt modu açık kalırsa iOS sesi ahizeden çalar
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    const uri = recorder.uri;
    if (!uri) {
      setStage('idle');
      setError('The recording could not be saved. Report a technical problem if this happens again.');
      finishing.current = false;
      return;
    }
    setRecording({ uri, durationSec });
    setStage('transcribing');
    try {
      const result = await onTranscribe(uri);
      const text = result.failed ? '' : result.transcript.trim();
      setTranscript(text);
      setOriginal(text);
      setTranscribeFailed(!text);
    } catch {
      // Metne çevrilemese de teslim engellenmez
      setTranscribeFailed(true);
    }
    setStage('review');
  }, [recorder, onTranscribe]);

  // forDuration ile üst sınırda kendiliğinden durdu
  useEffect(() => {
    if (stage === 'recording' && !recState.isRecording && recState.durationMillis > 0) {
      Promise.resolve().then(finish);
    }
  }, [stage, recState.isRecording, recState.durationMillis, finish]);

  // Uygulama arka plana alınırsa kayıt kesilir (arka planda kayıt kapalı): o ana kadarki kayıt kullanılır
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && stage === 'recording') finish();
    });
    return () => sub.remove();
  }, [stage, finish]);

  const stop = async () => {
    const ok = await confirm({
      kicker: 'Speaking task',
      title: 'Finish recording?',
      body: 'You can’t record again. Next, you can listen to your recording and check the text.',
      primaryLabel: 'Finish recording',
      secondaryLabel: 'Keep recording',
    });
    if (ok && stage === 'recording') finish();
  };

  const submit = async () => {
    if (!recording) return;
    const ok = await confirm({
      kicker: 'Speaking task',
      title: 'Submit your recording?',
      body: 'Your recording and text can’t be changed after this.',
      primaryLabel: 'Submit',
      secondaryLabel: 'Go back',
    });
    if (!ok) return;
    setError(null);
    try {
      await onSubmit({
        fileUri: recording.uri,
        durationSec: recording.durationSec,
        transcript: transcript.trim(),
        transcriptEdited: transcript.trim() !== original,
      });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const reportProblem = async () => {
    const ok = await confirm({
      kicker: 'Technical problem',
      title: 'Your microphone doesn’t work?',
      body: 'Your speaking task will be marked as a technical problem. It won’t count as 0, and your teacher will see it in your report.',
      tone: 'warn',
      primaryLabel: 'Report a problem',
      secondaryLabel: 'Go back',
    });
    if (ok) onSubmitWithout('technical').catch((e) => setError(getErrorMessage(e)));
  };

  const skip = async () => {
    const ok = await confirm({
      kicker: 'Empty answer',
      title: 'Skip this task?',
      body: 'This task will score 0.',
      tone: 'warn',
      primaryLabel: 'Back to recording',
      secondaryLabel: 'Skip, score 0',
    });
    // Birincil düğme geri dönmek; ikincil geçmek
    if (!ok) onSubmitWithout('skipped').catch((e) => setError(getErrorMessage(e)));
  };

  const seconds = Math.floor(recState.durationMillis / 1000);
  const level = levelOf(recState.metering);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.kicker}>
          {spec?.responseSeconds ? `Speaking task · speak for about ${spokenDuration(spec.responseSeconds)}` : 'Speaking task'}
        </Text>
        <Text style={[styles.stem, { fontSize: isTablet ? 22 : 20, lineHeight: isTablet ? 31 : 28 }]}>{item.stem}</Text>
      </View>

      {!!spec?.instructions && <Instructions title="In your answer" text={spec.instructions} />}

      {/* Resim görevin parçası: büyük, dokununca tam ekran */}
      {!!item.imageUrl && (
        <Pressable onPress={() => setImageOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="Open the picture">
          <RemoteImage uri={item.imageUrl} style={styles.image} />
          <Text style={styles.imageHint}>Tap the picture to enlarge it</Text>
        </Pressable>
      )}

      {stage === 'idle' && (
        <View style={styles.recorder}>
          {mic === 'denied' ? (
            <View style={styles.denied}>
              <Text style={styles.deniedTitle}>Microphone access is off</Text>
              <Text style={typography.muted}>
                You can’t record without the microphone. Report a technical problem; your teacher will see it.
              </Text>
            </View>
          ) : (
            <View style={styles.recRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start recording"
                onPress={start}
                style={({ pressed }) => [styles.recButton, pressed && styles.recButtonPressed]}
              >
                <MicIcon size={30} color={colors.bg} />
              </Pressable>
              <View style={styles.recInfo}>
                <Text style={styles.recLabel}>Tap to start recording</Text>
                <Text style={typography.muted}>{`You can record only once, up to ${formatClock(maxSeconds)}.`}</Text>
              </View>
            </View>
          )}
          <View style={styles.secondary}>
            <Button label="Report a technical problem" variant="secondary" size="compact" onPress={reportProblem} disabled={busy} />
            <Button label="Skip this task" variant="ghost" size="compact" onPress={skip} disabled={busy} />
          </View>
        </View>
      )}

      {stage === 'recording' && (
        <View style={styles.recorder}>
          <View style={styles.recRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Finish recording"
              onPress={stop}
              style={({ pressed }) => [styles.recButton, styles.recButtonLive, pressed && styles.recButtonPressed]}
            >
              <StopIcon />
            </Pressable>
            <View style={styles.recInfo}>
              <View style={styles.recTop}>
                <Text style={styles.recLabel}>Recording</Text>
                <Text style={styles.recTime}>{`${formatClock(seconds)} / ${formatClock(maxSeconds)}`}</Text>
              </View>
              {/* Ses seviyesi göstergesi */}
              <View style={styles.track}>
                <View style={[styles.levelFill, { width: `${Math.round(level * 100)}%` }]} />
              </View>
              <Text style={typography.muted}>Recording stops automatically when time is up.</Text>
            </View>
          </View>
        </View>
      )}

      {stage === 'transcribing' && (
        <View style={[styles.recorder, styles.recRow]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.recLabel}>Turning your recording into text…</Text>
        </View>
      )}

      {stage === 'review' && recording && (
        <View style={styles.recorder}>
          <RecordingPlayback uri={recording.uri} />
          {transcribeFailed ? (
            <Text style={styles.notice}>Your recording couldn’t be turned into text. You can still submit it.</Text>
          ) : (
            <View style={styles.transcript}>
              <Text style={styles.transcriptLabel}>
                This is what we understood. If a word is wrong, you can fix it.
              </Text>
              <TextInput
                value={transcript}
                onChangeText={(text) => {
                  setTranscript(text);
                  onActivity();
                }}
                multiline
                textAlignVertical="top"
                autoCorrect={false}
                spellCheck={false}
                autoCapitalize="none"
                autoComplete="off"
                contextMenuHidden
                style={styles.transcriptInput}
                accessibilityLabel="Text of your recording"
              />
            </View>
          )}
          <Button label="Submit recording" size="large" trailing onPress={submit} loading={busy} />
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!!item.imageUrl && (
        <Modal visible={imageOpen} animationType="fade" onRequestClose={() => setImageOpen(false)} supportedOrientations={['portrait', 'landscape']}>
          <View style={styles.fullscreen}>
            <RemoteImage uri={item.imageUrl} style={styles.fullscreenImage} />
            <Button label="Close" variant="secondary" onPress={() => setImageOpen(false)} style={styles.fullscreenClose} />
          </View>
        </Modal>
      )}
    </View>
  );
}

// Öğrenci teslimden önce kendi kaydını dinleyebilir
function RecordingPlayback({ uri }: { uri: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const pct = status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0;

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration - 0.25) player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.playback}>
      <Button
        label={status.playing ? 'Pause' : 'Listen to your recording'}
        variant="secondary"
        size="compact"
        trailing={<PlayIcon color={colors.text} />}
        onPress={toggle}
      />
      <View style={styles.track}>
        <View style={[styles.playFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  head: {
    gap: 8,
  },
  kicker: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral700,
  },
  stem: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  image: {
    maxWidth: 560,
    aspectRatio: 4 / 3,
  },
  imageHint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
  recorder: {
    gap: 14,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 16,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  recButtonLive: {
    backgroundColor: colors.text,
  },
  recButtonPressed: {
    opacity: 0.85,
  },
  recInfo: {
    flex: 1,
    gap: 6,
  },
  recTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  recLabel: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.text,
  },
  recTime: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    backgroundColor: colors.neutral300,
  },
  levelFill: {
    height: 6,
    backgroundColor: colors.primary,
  },
  playFill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  secondary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  denied: {
    gap: 4,
    paddingLeft: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warn,
  },
  deniedTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.text,
  },
  playback: {
    gap: 8,
  },
  transcript: {
    gap: 8,
  },
  transcriptLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  transcriptInput: {
    minHeight: 140,
    padding: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.divider,
  },
  notice: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.warn700,
  },
  error: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.warn700,
  },
  fullscreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    gap: 16,
    backgroundColor: colors.bg,
  },
  fullscreenImage: {
    flex: 1,
  },
  fullscreenClose: {
    alignSelf: 'center',
    minWidth: 200,
  },
});
