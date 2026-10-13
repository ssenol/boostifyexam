import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import type { AudioClip } from '../../types/exam';
import Button from '../Button';
import { HeadphonesIcon, PlayIcon } from '../icons';

const { colors, fonts } = theme;

interface ListeningPlayerProps {
  audio: AudioClip;
  // Sunucuya dinleme hakkını düşürtür; null dönerse çalınmaz
  onRequestPlay: (audioId: string) => Promise<{ playsUsed: number; maxPlays: number } | null>;
  // Pause penceresi / arka plan sırasında çalma durur
  paused: boolean;
}

const TICK_MS = 250;

// Dinleme kartı. Öğrenci kaydı ileri/geri saramaz, durduramaz; yalnızca baştan çalar.
// Ekran bunu key={audio.id} ile çizer: aynı kayda bağlı bir sonraki soruda durum korunur, farklı kayıtta sıfırlanır.
// TODO: Gerçek ses expo-audio ile çalınacak (audio.url). Şimdilik süre simüle ediliyor.
export default function ListeningPlayer({ audio, onRequestPlay, paused }: ListeningPlayerProps) {
  const [playsUsed, setPlaysUsed] = useState(audio.playsUsed);
  const [started, setStarted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const durationMs = audio.durationSeconds * 1000;
  const playing = started && elapsedMs < durationMs;

  useEffect(() => {
    if (!playing || paused) return;
    const timer = setInterval(() => setElapsedMs((ms) => Math.min(durationMs, ms + TICK_MS)), TICK_MS);
    return () => clearInterval(timer);
  }, [playing, paused, durationMs]);

  const playsLeft = audio.maxPlays - playsUsed;

  const play = async () => {
    if (playing || requesting || playsLeft <= 0) return;
    setRequesting(true);
    const result = await onRequestPlay(audio.id);
    setRequesting(false);
    if (!result) return;
    setPlaysUsed(result.playsUsed);
    setElapsedMs(0);
    setStarted(true);
  };

  const label = playing ? 'Playing…' : playsLeft <= 0 ? 'No plays left' : playsUsed === 0 ? 'Play recording' : 'Play once more';
  const pct = durationMs > 0 ? Math.min(100, (elapsedMs / durationMs) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <HeadphonesIcon />
        <View style={styles.titles}>
          <Text style={styles.title}>{audio.title}</Text>
          <Text style={styles.subtitle}>{audio.subtitle}</Text>
        </View>
        <Text style={styles.plays}>{`${playsLeft} / ${audio.maxPlays} plays`}</Text>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Button
        label={label}
        trailing={<PlayIcon />}
        onPress={play}
        loading={requesting}
        disabled={playing || playsLeft <= 0}
      />
      <Text style={styles.note}>Plays are counted on the server.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titles: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral700,
  },
  plays: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
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
