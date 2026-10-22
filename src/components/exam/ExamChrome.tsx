import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useBottomSpacing from '../../hooks/useBottomSpacing';
import type { SaveState } from '../../hooks/useExamSession';
import { theme } from '../../theme';
import Button from '../Button';
import { CloseIcon } from '../icons';
import Tag from '../Tag';
import Kicker from '../Kicker';

const { colors, fonts } = theme;

// Son 5 dakikada süre turuncuya döner
export const LOW_TIME_SECONDS = 5 * 60;

// Tablette (iPad, Android tablet) üst kenar boşluğuna eklenen pay: Pause butonu durum çubuğuna yapışmasın.
// Sağdaki içerik de aynı payla aşağı iner, hizalı kalır.
export const TABLET_TOP_EXTRA = 20;

export type StepState = 'done' | 'current' | 'todo';

// Sınavın bölümleri: çoktan seçmeli bölümler + writing / speaking
export interface ChromeStep {
  key: string;
  label: string;
  state: StepState;
  // Yan panelde sağdaki not ("Question 3", "Done")
  meta: string;
  // Mevcut bölümde ilerleme (0–1); bölüm erken bitebildiği için kesin sayı yerine çubuk
  progress: number;
}

export interface ExamChromeProps {
  examTitle: string;
  skill: string;
  numberKicker: string; // "Question" | "Task"
  numberValue: string; // "01" | "W"
  // null = süre yok
  timeText: string | null;
  timeLow: boolean;
  steps: ChromeStep[];
  saveState: SaveState;
  onPause: () => void;
}

const STEP_COLOR: Record<StepState, string> = {
  done: colors.text,
  current: colors.accent,
  todo: colors.neutral300,
};

const CONNECTION: Record<SaveState, { color: string; label: string; short: string }> = {
  saved: { color: colors.online, label: 'Connected · every answer saved instantly', short: 'Saved' },
  saving: { color: colors.neutral500, label: 'Saving…', short: 'Saving' },
  offline: { color: colors.warn, label: 'Not saved · check your connection', short: 'Offline' },
};

// Telefon: üstte iki satırlık başlık (Pause, sınav adı, süre / soru no, bölüm çubukları, bağlantı)
export function ExamTopBar(props: ExamChromeProps) {
  const insets = useSafeAreaInsets();
  const conn = CONNECTION[props.saveState];

  return (
    <View style={[topStyles.bar, { paddingTop: Math.max(8, insets.top) }]}>
      <View style={topStyles.row}>
        <Button
          label=""
          accessibilityLabel="Pause"
          variant="secondary"
          size="compact"
          leading={<CloseIcon />}
          onPress={props.onPause}
          style={topStyles.pause}
        />
        <View style={topStyles.titleCol}>
          <Text style={topStyles.examTitle} numberOfLines={1}>{props.examTitle}</Text>
          <Tag label={props.skill} style={topStyles.skillTag} />
        </View>
        {props.timeText != null && (
          <View style={topStyles.timeCol}>
            <Kicker style={topStyles.timeKicker}>Time left</Kicker>
            <Text style={[topStyles.time, props.timeLow && topStyles.timeLow]}>{props.timeText}</Text>
          </View>
        )}
      </View>
      <View style={topStyles.row2}>
        <View style={topStyles.numberRow}>
          <Kicker>{props.numberKicker}</Kicker>
          <Text style={topStyles.number}>{props.numberValue}</Text>
        </View>
        <View style={topStyles.steps}>
          {props.steps.map((s) => (
            <View key={s.key} style={[topStyles.step, { backgroundColor: s.state === 'current' ? colors.neutral300 : STEP_COLOR[s.state] }]}>
              {s.state === 'current' && <View style={[topStyles.stepFill, { width: `${Math.round(s.progress * 100)}%` }]} />}
            </View>
          ))}
        </View>
        <View style={topStyles.conn}>
          <View style={[topStyles.connDot, { backgroundColor: conn.color }]} />
          <Text style={topStyles.connText}>{conn.short}</Text>
        </View>
      </View>
    </View>
  );
}

// Tablet: solda 300px'lik panel (büyük soru numarası, süre, bölüm listesi, bağlantı durumu)
export function ExamSidePanel(props: ExamChromeProps) {
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpacing();
  const conn = CONNECTION[props.saveState];

  return (
    <View style={[sideStyles.panel, { paddingTop: Math.max(20, insets.top) + TABLET_TOP_EXTRA, paddingBottom: bottom(20) }]}>
      <View style={sideStyles.topRow}>
        <Button label="Pause" variant="secondary" size="compact" leading={<CloseIcon size={18} />} onPress={props.onPause} />
      </View>

      <Text style={sideStyles.examTitle}>{props.examTitle}</Text>

      <View style={sideStyles.numberBlock}>
        <Kicker>{props.numberKicker}</Kicker>
        <Text style={sideStyles.number}>{props.numberValue}</Text>
        <Tag label={props.skill} style={sideStyles.skillTag} />
      </View>

      {props.timeText != null && (
        <View style={sideStyles.timeBlock}>
          <Kicker>Time left</Kicker>
          <Text style={[sideStyles.time, props.timeLow && sideStyles.timeLow]}>{props.timeText}</Text>
          {props.timeLow && <Text style={sideStyles.lowNote}>Last 5 minutes. The test ends at 00:00.</Text>}
        </View>
      )}

      <View style={sideStyles.steps}>
        {props.steps.map((s) => (
          <View key={s.key}>
            <View style={sideStyles.step}>
              <View style={[sideStyles.stepDot, { backgroundColor: STEP_COLOR[s.state] }]} />
              <Text style={[sideStyles.stepLabel, s.state === 'current' && sideStyles.stepLabelCurrent]}>{s.label}</Text>
              <Text style={sideStyles.stepMeta}>{s.meta}</Text>
            </View>
            {s.state === 'current' && s.progress > 0 && (
              <View style={sideStyles.stepTrack}>
                <View style={[sideStyles.stepFill, { width: `${Math.round(s.progress * 100)}%` }]} />
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={sideStyles.conn}>
        <View style={[sideStyles.connDot, { backgroundColor: conn.color }]} />
        <Text style={sideStyles.connText}>{conn.label}</Text>
      </View>
    </View>
  );
}

const tabular = { fontVariant: ['tabular-nums' as const] };

const topStyles = StyleSheet.create({
  bar: {
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
    paddingHorizontal: '4%',
    paddingBottom: 10,
    gap: 8,
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pause: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    justifyContent: 'center',
    gap: 0,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  examTitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
  skillTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timeCol: {
    alignItems: 'flex-end',
  },
  timeKicker: {
    fontSize: 10,
  },
  time: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    lineHeight: 28,
    color: colors.text,
    ...tabular,
  },
  timeLow: {
    color: colors.warn,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  number: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    lineHeight: 24,
    color: colors.text,
    ...tabular,
  },
  steps: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  step: {
    flex: 1,
    height: 6,
  },
  stepFill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  conn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  connDot: {
    width: 7,
    height: 7,
  },
  connText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.neutral700,
  },
});

const sideStyles = StyleSheet.create({
  panel: {
    width: 300,
    borderRightWidth: 2,
    borderRightColor: colors.divider,
    paddingHorizontal: 24,
    backgroundColor: colors.bg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  examTitle: {
    marginTop: 28,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral800,
  },
  numberBlock: {
    marginTop: 20,
  },
  number: {
    fontFamily: fonts.extraBold,
    fontSize: 72,
    lineHeight: 74,
    letterSpacing: -1.4,
    color: colors.text,
    ...tabular,
  },
  skillTag: {
    marginTop: 8,
  },
  timeBlock: {
    marginTop: 28,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 16,
    gap: 2,
  },
  time: {
    fontFamily: fonts.extraBold,
    fontSize: 44,
    lineHeight: 46,
    color: colors.text,
    ...tabular,
  },
  timeLow: {
    color: colors.warn,
  },
  lowNote: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.warn700,
  },
  steps: {
    marginTop: 24,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
  },
  stepLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  stepLabelCurrent: {
    fontFamily: fonts.extraBold,
  },
  stepMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
  stepTrack: {
    height: 4,
    marginLeft: 22,
    marginBottom: 6,
    backgroundColor: colors.neutral300,
  },
  stepFill: {
    height: 4,
    backgroundColor: colors.accent,
  },
  conn: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connDot: {
    width: 8,
    height: 8,
  },
  connText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
});
