import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { CEFR_LEVELS, type ProgressReport } from '../../types/exam';

const { colors, fonts, typography } = theme;

// Grafikte her CEFR adımı 20px; toplam 10 adım = 200px
const STEP_HEIGHT = 20;
const CHART_HEIGHT = STEP_HEIGHT * CEFR_LEVELS.length;
const Y_LABELS = [...CEFR_LEVELS].reverse();

// "Progress over time" görünümü: başlangıç → son seviye, sütun grafik, test listesi
export default function ReportProgress({ progress, isTablet }: { progress: ProgressReport; isTablet: boolean }) {
  const { baseline, latest } = progress;
  const headline = baseline && latest && baseline.short !== latest.short ? `${baseline.level} → ${latest.level}` : latest?.level ?? '—';
  const latestId = [...progress.points].reverse().find((p) => p.level)?.id;

  const stats = [
    { label: 'Baseline', value: baseline?.level ?? '—', sub: baseline?.short ?? '' },
    { label: 'Latest', value: latest?.level ?? '—', sub: latest?.short ?? '' },
    { label: 'Change', value: `${progress.steps > 0 ? '+' : ''}${progress.steps}`, sub: Math.abs(progress.steps) === 1 ? 'step' : 'steps' },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={typography.kickerAccent}>{progress.title}</Text>
        <Text style={[styles.headline, { fontSize: isTablet ? 80 : 64, lineHeight: isTablet ? 76 : 61 }]}>{headline}</Text>
        <Text style={styles.note}>{progress.note}</Text>
      </View>

      <View style={styles.stats}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.stat, i > 0 && styles.statDivided]}>
            <Text style={typography.kicker}>{s.label}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statSub} numberOfLines={1}>{s.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chart} accessibilityLabel={`Level over time: ${headline}`}>
        <View style={styles.yAxis}>
          {Y_LABELS.map((l) => (
            <Text key={l} style={styles.yLabel}>{l}</Text>
          ))}
        </View>
        <View style={styles.chartBody}>
          <View style={styles.plot}>
            {Y_LABELS.map((l, i) => (
              <View key={l} style={[styles.gridLine, { bottom: i * STEP_HEIGHT }]} />
            ))}
            {progress.points.map((p) => {
              const li = p.level ? CEFR_LEVELS.indexOf(p.level) : -1;
              return (
                <View key={p.id} style={styles.barCol}>
                  <Text style={[styles.barLabel, !p.level && styles.barLabelEmpty]}>{p.level ?? (p.isOpen ? 'Open' : '—')}</Text>
                  <View
                    style={{
                      height: li >= 0 ? (li + 1) * STEP_HEIGHT - 18 : 0,
                      backgroundColor: p.id === latestId ? colors.accent : colors.accent300,
                    }}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.xAxis}>
            {progress.points.map((p) => (
              <Text key={p.id} style={styles.xLabel}>{p.short}</Text>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.rows}>
        {progress.points.map((p) => (
          <View key={p.id} style={styles.row}>
            <View style={styles.rowLine}>
              <Text style={styles.rowTitle}>{p.short}</Text>
              <Text style={[styles.rowLevel, !p.level && { color: colors.neutral500 }]}>{p.level ?? '—'}</Text>
            </View>
            <View style={styles.rowLine}>
              <Text style={styles.rowMeta}>{p.dateLabel}</Text>
              <Text style={styles.rowMeta}>{p.change}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 24,
  },
  head: {
    gap: 8,
  },
  headline: {
    fontFamily: fonts.extraBold,
    letterSpacing: -1.3,
    color: colors.accent,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.neutral800,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.divider,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    gap: 4,
  },
  statDivided: {
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.divider,
  },
  statValue: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    lineHeight: 27,
    color: colors.text,
  },
  statSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
  chart: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxis: {
    width: 32,
  },
  yLabel: {
    height: STEP_HEIGHT,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: STEP_HEIGHT,
    color: colors.neutral700,
  },
  chartBody: {
    flex: 1,
  },
  plot: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.text,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.neutral300,
  },
  barCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barLabel: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    lineHeight: 14,
    color: colors.text,
  },
  barLabelEmpty: {
    color: colors.neutral600,
  },
  xAxis: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  xLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.neutral800,
  },
  rows: {
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  row: {
    paddingVertical: 12,
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  rowLevel: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.text,
  },
  rowMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral700,
  },
});
