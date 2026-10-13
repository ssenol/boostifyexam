import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import type { SpeakingTask } from '../../types/exam';
import { formatClock } from '../../utils/format';
import ImagePlaceholder from '../ImagePlaceholder';
import { MicIcon, StopIcon } from '../icons';

const { colors, fonts } = theme;

export type RecordState = 'idle' | 'recording' | 'done';

// Kayıt durumu. Süre dolunca kayıt kendiliğinden durur; tek kayıt hakkı vardır (yeniden kayıt yok).
// TODO: Gerçek kayıt expo-audio ile yapılacak; kayıt dosyası submitSpeaking'e gönderilecek.
export function useRecorder(maxSeconds: number, paused: boolean) {
  const [state, setState] = useState<RecordState>('idle');
  const [seconds, setSeconds] = useState(0);
  const recording = state === 'recording' && seconds < maxSeconds;

  useEffect(() => {
    if (!recording || paused) return;
    const timer = setInterval(() => setSeconds((s) => Math.min(maxSeconds, s + 1)), 1000);
    return () => clearInterval(timer);
  }, [recording, paused, maxSeconds]);

  // Süre dolduysa "done" sayılır
  const effective: RecordState = state === 'recording' && seconds >= maxSeconds ? 'done' : state;

  const toggle = useCallback(() => {
    setState((s) => (s === 'idle' ? 'recording' : s === 'recording' ? 'done' : s));
  }, []);

  const stop = useCallback(() => {
    setState((s) => (s === 'recording' ? 'done' : s));
  }, []);

  return { state: effective, seconds, toggle, stop };
}

interface SpeakingTaskViewProps {
  task: SpeakingTask;
  state: RecordState;
  seconds: number;
  onToggle: () => void;
  isTablet: boolean;
}

const LABEL: Record<RecordState, string> = {
  idle: 'Tap to record',
  recording: 'Recording',
  done: 'Recorded',
};

export default function SpeakingTaskView({ task, state, seconds, onToggle, isTablet }: SpeakingTaskViewProps) {
  const pct = Math.min(100, (seconds / task.maxSeconds) * 100);
  const minutes = Math.round(task.maxSeconds / 60);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.kicker}>{`Speaking task · ${minutes} minute${minutes === 1 ? '' : 's'} to answer`}</Text>
        <Text style={[styles.title, { fontSize: isTablet ? 22 : 20, lineHeight: isTablet ? 31 : 28 }]}>{task.title}</Text>
        <Text style={styles.prompt}>{task.prompt}</Text>
      </View>

      {task.imageLabel && <ImagePlaceholder label={task.imageLabel} aspectRatio={16 / 10} maxWidth={480} />}

      <View style={styles.recorder}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={LABEL[state]}
          accessibilityState={{ disabled: state === 'done' }}
          disabled={state === 'done'}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.recButton,
            state === 'done' ? styles.recButtonDone : pressed && styles.recButtonPressed,
          ]}
        >
          {state === 'recording' ? <StopIcon /> : <MicIcon size={30} color={colors.bg} />}
        </Pressable>
        <View style={styles.recInfo}>
          <View style={styles.recRow}>
            <Text style={styles.recLabel}>{LABEL[state]}</Text>
            <Text style={styles.recTime}>{`${formatClock(seconds)} / ${formatClock(task.maxSeconds)}`}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.note}>Recording stops automatically when time is up.</Text>
        </View>
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
  title: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  prompt: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.neutral800,
  },
  recorder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 16,
  },
  recButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  recButtonPressed: {
    backgroundColor: colors.accent700,
  },
  recButtonDone: {
    backgroundColor: colors.neutral600,
  },
  recInfo: {
    flex: 1,
    gap: 8,
  },
  recRow: {
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
  fill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
});
