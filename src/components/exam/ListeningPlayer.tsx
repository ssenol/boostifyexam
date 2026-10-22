import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import type { AudioPlay } from '../../types/exam';
import { isApiError } from '../../utils/errors';
import Button from '../Button';
import { HeadphonesIcon, PlayIcon } from '../icons';

const { colors, fonts } = theme;

interface ListeningPlayerProps {
  audioKey: string;
  maxPlays: number;
  // Sunucunun son state'indeki kalan hak
  playsLeft: number;
  // POST audio/play: bir hak düşer, 15 dk geçerli adres döner
  onPlay: (key: string) => Promise<AudioPlay>;
  // Değişince (cevap gönderildi) çalma durur
  stopSignal: string;
  // Pencere açıkken / arka planda çalma durur
  frozen: boolean;
  // Çalarken hareketsizlik sayacı işlemez
  onPlayingChange: (playing: boolean) => void;
}

// Dinleme kartı. İleri sarma ve hız değiştirme yok (webdeki gibi). Hak kayda aittir: aynı kayda bağlı sonraki
// sorularda da aynı sayı geçerlidir. Ekran bunu key={audioKey} ile çizer.
export default function ListeningPlayer({
  audioKey,
  maxPlays,
  playsLeft,
  onPlay,
  stopSignal,
  frozen,
  onPlayingChange,
}: ListeningPlayerProps) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  // Çaldıktan sonra sunucunun döndürdüğü hak; state yenilenene kadar bu gösterilir
  const [localLeft, setLocalLeft] = useState<number | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const left = Math.min(playsLeft, localLeft ?? playsLeft);
  const playing = status.playing;
  const duration = status.duration || 0;
  const finished = status.didJustFinish || (duration > 0 && status.currentTime >= duration - 0.25);
  // Arka plana geçince yarıda kalan çalma, hak harcamadan sürdürülebilir
  const interrupted = started && !playing && !finished && status.currentTime > 0;

  useEffect(() => {
    onPlayingChange(playing);
  }, [playing, onPlayingChange]);

  useEffect(() => {
    player.pause();
  }, [stopSignal, player]);

  useEffect(() => {
    if (frozen) player.pause();
  }, [frozen, player]);

  const play = async () => {
    if (playing || requesting || left <= 0) return;
    setRequesting(true);
    setProblem(null);
    try {
      const result = await onPlay(audioKey);
      setLocalLeft(result.playsLeft);
      // Adres saklanmaz; her çalışta yenisi istenir
      player.replace({ uri: result.url });
      player.play();
      setStarted(true);
    } catch (e) {
      if (isApiError(e, 'no_plays_left')) setLocalLeft(0);
      // Hak zaten düşmüş olabilir; kalan hak varsa öğrenci tekrar dinleyebilir
      else setProblem('Connection problem. Check your connection and try again.');
    } finally {
      setRequesting(false);
    }
  };

  const label = playing
    ? 'Playing…'
    : interrupted
      ? 'Continue playing'
      : left <= 0
        ? 'No plays left'
        : started
          ? 'Play once more'
          : 'Play recording';
  const pct = duration > 0 ? Math.min(100, (status.currentTime / duration) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <HeadphonesIcon />
        <View style={styles.titles}>
          <Text style={styles.title}>Recording</Text>
          <Text style={styles.subtitle}>Listen, then answer the question.</Text>
        </View>
        <Text style={styles.plays}>{`${left} / ${maxPlays} plays left`}</Text>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Button
        label={label}
        trailing={<PlayIcon />}
        onPress={interrupted ? () => player.play() : play}
        loading={requesting}
        disabled={playing || (!interrupted && left <= 0)}
      />
      {!!problem && <Text style={styles.problem}>{problem}</Text>}
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
  problem: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.warn700,
  },
});
