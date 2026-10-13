import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { CEFR_LEVELS, type ExamReport } from '../../types/exam';
import Tag from '../Tag';
import Kicker from '../Kicker';

const { colors, fonts, typography } = theme;

// "This test" görünümü: seviye, beceriler (10 adımlık CEFR çubuğu), yazma/konuşma geri bildirimi
export default function ReportSingle({ report, isTablet }: { report: ExamReport; isTablet: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.topCol}>
          <Kicker accent>{`${report.title} · ${report.dateLabel}`}</Kicker>
          <View style={styles.levelRow}>
            <Text style={[styles.level, { fontSize: isTablet ? 80 : 64, lineHeight: isTablet ? 74 : 60 }]}>{report.level}</Text>
            <Tag label={report.status} style={styles.levelTag} />
          </View>
          <Text style={styles.summary}>{report.summary}</Text>
        </View>
        <View style={[styles.topCol, styles.stats]}>
          <View style={styles.stat}>
            <Kicker>Scale score</Kicker>
            <Text style={styles.statValue}>{`${report.scaleScore} / 100`}</Text>
          </View>
          <View style={[styles.stat, styles.statDivided]}>
            <Kicker>Next level</Kicker>
            <Text style={styles.statValue}>{report.nextLevel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.skills}>
        <View style={styles.skillsHeader}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text style={styles.small}>A1 → C2 · 10 steps</Text>
        </View>
        {report.skills.map((s) => {
          const li = CEFR_LEVELS.indexOf(s.level);
          return (
            <View key={s.skill} style={styles.skillRow}>
              <View style={styles.skillLine}>
                <Text style={styles.skillName}>{s.skill}</Text>
                <Text style={styles.skillLevel}>{s.level}</Text>
              </View>
              <View style={styles.skillLine}>
                <View style={styles.segments} accessibilityLabel={`${s.skill}: ${s.level}`}>
                  {CEFR_LEVELS.map((l, i) => (
                    <View
                      key={l}
                      style={[
                        styles.segment,
                        { backgroundColor: i < li ? colors.text : i === li ? colors.accent : colors.neutral300 },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.small}>{s.meta}</Text>
              </View>
            </View>
          );
        })}
        {!!report.hardestAreas && (
          <Text style={styles.hardest}>
            Hardest areas: <Text style={styles.hardestValue}>{report.hardestAreas}</Text>
          </Text>
        )}
      </View>

      <View style={styles.feedbackGrid}>
        {report.feedback.map((f) => (
          <View key={f.title} style={styles.feedback}>
            <View style={styles.feedbackHead}>
              <Text style={[styles.sectionTitle, styles.flex]}>{f.title}</Text>
              <Text style={styles.sectionTitle}>{f.level}</Text>
              <Text style={typography.muted}>{f.score}</Text>
            </View>
            <View style={styles.list}>
              <Kicker>Strengths</Kicker>
              {f.strengths.map((g) => (
                <View key={g} style={styles.listRow}>
                  <Text style={styles.bullet}>+</Text>
                  <Text style={styles.listText}>{g}</Text>
                </View>
              ))}
            </View>
            <View style={styles.list}>
              <Kicker>To improve</Kicker>
              {f.improvements.map((g) => (
                <View key={g} style={styles.listRow}>
                  <Text style={[styles.bullet, { color: colors.accent700 }]}>→</Text>
                  <Text style={styles.listText}>{g}</Text>
                </View>
              ))}
            </View>
            <View style={styles.source}>
              <Kicker>{f.sourceLabel}</Kicker>
              <Text style={styles.sourceText}>{f.source}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 32,
  },
  flex: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    rowGap: 24,
    columnGap: 48,
  },
  topCol: {
    flexGrow: 1,
    flexBasis: 260,
    gap: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  level: {
    fontFamily: fonts.extraBold,
    letterSpacing: -1.3,
    color: colors.accent,
  },
  levelTag: {
    marginBottom: 6,
  },
  summary: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  stats: {
    flexDirection: 'row',
    gap: 0,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  stat: {
    flex: 1,
    paddingVertical: 12,
    gap: 2,
  },
  statDivided: {
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.divider,
  },
  statValue: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    lineHeight: 31,
    color: colors.text,
  },
  skills: {
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.text,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral700,
  },
  skillRow: {
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  skillLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skillName: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  skillLevel: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.text,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  segment: {
    flex: 1,
    height: 8,
  },
  hardest: {
    paddingTop: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral800,
  },
  hardestValue: {
    fontFamily: fonts.semiBold,
  },
  feedbackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 32,
    columnGap: 48,
  },
  feedback: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 14,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 14,
  },
  feedbackHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  list: {
    gap: 6,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    width: 16,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  listText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  source: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  sourceText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.neutral800,
  },
});
