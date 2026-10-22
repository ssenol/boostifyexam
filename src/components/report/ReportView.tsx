import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import {
  CEFR_LEVELS,
  RECEPTIVE_SKILLS,
  SKILL_LABEL,
  type CertificateStatus,
  type ProductiveReport,
  type ProductiveScore,
  type ResultReport,
} from '../../types/exam';
import { formatDate, formatDuration } from '../../utils/format';
import Button from '../Button';
import Instructions from '../exam/Instructions';
import { PlayIcon } from '../icons';
import Kicker from '../Kicker';
import RemoteImage from '../RemoteImage';
import Tag from '../Tag';

const { colors, fonts, typography } = theme;

const CERTIFICATE_REASON: Record<string, string> = {
  evaluating: 'Your certificate will be ready when scoring is finished.',
  no_level: 'This test has no certificate because a level couldn’t be set.',
};

interface ReportViewProps {
  report: ResultReport;
  certificate: CertificateStatus;
  isTablet: boolean;
  onOpenCertificate: () => void;
}

// Rapor (GET /results/:id): seviye, beceriler, geliştirilecek alanlar, writing / speaking ayrıntısı, sınav kuralları,
// sertifika. Güvenlik gereği soruların kendisi ve doğru cevaplar yoktur.
export default function ReportView({ report, certificate, isTablet, onOpenCertificate }: ReportViewProps) {
  const { result } = report;
  const noLevel = result.noEvidence || result.insufficientEvidence || !result.cefrLevel;
  const evaluating = certificate.reason === 'evaluating' || result.productivePending > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.topCol}>
          <Kicker accent>{`${report.assignmentTitle} · ${formatDate(report.finishedAt)}`}</Kicker>
          {noLevel ? (
            <>
              <Text style={styles.noLevel}>Level not determined</Text>
              <Text style={styles.summary}>There weren’t enough answers to set your level.</Text>
            </>
          ) : (
            <View style={styles.levelRow}>
              <Text style={[styles.level, { fontSize: isTablet ? 80 : 64, lineHeight: isTablet ? 74 : 60 }]}>{result.cefrLevel}</Text>
              {evaluating && <Tag label="Evaluating" tone="neutral" style={styles.levelTag} />}
            </View>
          )}
          {evaluating && (
            <Text style={styles.summary}>Your writing and speaking are being scored. This page updates by itself.</Text>
          )}
        </View>
        <View style={[styles.topCol, styles.stats]}>
          <Stat label="Scale score" value={result.scaleScore != null ? `${result.scaleScore} / 100` : '—'} />
          <Stat label="Answered" value={String(result.itemsAnswered)} divided />
          <Stat label="Time" value={formatDuration(report.durationSec)} divided />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text style={styles.small}>A1 → C2 · 10 steps</Text>
        </View>
        {RECEPTIVE_SKILLS.map((skill) => {
          const s = result.skills[skill];
          return s ? <SkillRow key={skill} name={SKILL_LABEL[skill]} level={s.cefrLevel} meta={`${s.correct} / ${s.total} correct`} /> : null;
        })}
        {(['writing', 'speaking'] as const).map((skill) => {
          const p = result.productive[skill];
          return p ? <SkillRow key={skill} name={SKILL_LABEL[skill]} level={p.cefrLevel ?? ''} meta={productiveMeta(p)} /> : null;
        })}
      </View>

      {result.focusAreas.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitlePadded]}>Areas to work on</Text>
          <View style={styles.chips}>
            {result.focusAreas.map((area) => (
              <Tag key={area} label={area} />
            ))}
          </View>
        </View>
      )}

      {report.productive.length > 0 && (
        <View style={styles.feedbackGrid}>
          {report.productive.map((task) => (
            <TaskFeedback key={task.itemId} task={task} />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.sectionTitlePadded]}>Test rules</Text>
        {!!report.proctoring.endedBy && (
          <Text style={styles.ended}>The test was ended because of the test rules.</Text>
        )}
        <RuleRow label="Times you left the app" value={report.proctoring.tabSwitchCount} />
        <RuleRow label="Inactivity warnings" value={report.proctoring.inactivityWarnCount} />
        <RuleRow label="Paste attempts" value={report.proctoring.pasteBlockedCount} />
      </View>

      <View style={styles.certificate}>
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>Certificate</Text>
          <Text style={typography.muted}>
            {certificate.available ? 'Your certificate is ready. You can share it as a PDF.' : CERTIFICATE_REASON[certificate.reason] ?? 'Your certificate is not ready yet.'}
          </Text>
        </View>
        <Button
          label="View certificate"
          trailing
          onPress={onOpenCertificate}
          disabled={!certificate.available}
          style={isTablet ? styles.certificateButton : undefined}
        />
      </View>
    </View>
  );
}

function productiveMeta(p: ProductiveScore): string {
  if (p.technical) return 'Technical problem, not scored';
  if (p.status === 'done' && p.score != null) return `Score ${p.score} / 100`;
  if (p.status === 'pending' || p.status === 'evaluating') return 'Evaluating';
  return 'Not scored';
}

function Stat({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  return (
    <View style={[styles.stat, divided && styles.statDivided]}>
      <Kicker>{label}</Kicker>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// Seviye + 10 adımlık CEFR çubuğu
function SkillRow({ name, level, meta }: { name: string; level: string; meta: string }) {
  const li = CEFR_LEVELS.indexOf(level as (typeof CEFR_LEVELS)[number]);
  return (
    <View style={styles.skillRow}>
      <View style={styles.skillLine}>
        <Text style={styles.skillName}>{name}</Text>
        <Text style={styles.skillLevel}>{level || '—'}</Text>
      </View>
      <View style={styles.skillLine}>
        <View style={styles.segments} accessibilityLabel={`${name}: ${level || 'no level'}`}>
          {CEFR_LEVELS.map((l, i) => (
            <View
              key={l}
              style={[styles.segment, { backgroundColor: i < li ? colors.text : i === li ? colors.accent : colors.neutral300 }]}
            />
          ))}
        </View>
        <Text style={styles.small}>{meta}</Text>
      </View>
    </View>
  );
}

function RuleRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={styles.ruleValue}>{value}</Text>
    </View>
  );
}

// "organisation" → "Organisation"
const criterionName = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

function TaskFeedback({ task }: { task: ProductiveReport }) {
  const title = SKILL_LABEL[task.skill];
  const strengths = task.feedback.strengths ?? [];
  const improvements = task.feedback.improvements ?? [];
  const criteria = Object.entries(task.criteria);
  const answer = task.skill === 'writing' ? task.text : task.transcript;

  return (
    <View style={styles.feedback}>
      <View style={styles.feedbackHead}>
        <Text style={[styles.sectionTitle, styles.flex]}>{title}</Text>
        {!!task.cefrLevel && <Text style={styles.sectionTitle}>{task.cefrLevel}</Text>}
        {task.score != null && <Text style={typography.muted}>{`${task.score} / 100`}</Text>}
      </View>

      {task.technical ? (
        <Text style={styles.ended}>Technical problem: this task wasn’t scored.</Text>
      ) : task.status !== 'done' ? (
        <Text style={typography.muted}>{task.status === 'pending' ? 'Being scored…' : 'This task wasn’t scored.'}</Text>
      ) : null}

      {criteria.length > 0 && (
        <View style={styles.list}>
          {criteria.map(([key, value]) => (
            <View key={key} style={styles.criterion}>
              <Text style={styles.criterionName}>{criterionName(key)}</Text>
              <View style={styles.criterionTrack}>
                <View style={[styles.criterionFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
              </View>
              <Text style={styles.criterionValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {strengths.length > 0 && (
        <View style={styles.list}>
          <Kicker>Strengths</Kicker>
          {strengths.map((g) => (
            <View key={g} style={styles.listRow}>
              <Text style={styles.bullet}>+</Text>
              <Text style={styles.listText}>{g}</Text>
            </View>
          ))}
        </View>
      )}
      {improvements.length > 0 && (
        <View style={styles.list}>
          <Kicker>To improve</Kicker>
          {improvements.map((g) => (
            <View key={g} style={styles.listRow}>
              <Text style={[styles.bullet, { color: colors.accent700 }]}>→</Text>
              <Text style={styles.listText}>{g}</Text>
            </View>
          ))}
        </View>
      )}

      {!!task.teacherFeedback && (
        <View style={styles.source}>
          <Kicker>Note from your teacher</Kicker>
          <Text style={styles.sourceText}>{task.teacherFeedback}</Text>
        </View>
      )}

      <View style={styles.source}>
        <Kicker>Task</Kicker>
        <Text style={styles.sourceText}>{task.prompt}</Text>
        {!!task.imageUrl && <RemoteImage uri={task.imageUrl} style={styles.taskImage} />}
      </View>
      {!!task.instructions && <Instructions title={task.skill === 'writing' ? 'Your text should include' : 'In your answer'} text={task.instructions} />}

      {!!task.audioUrl && <RecordingPlayer uri={task.audioUrl} />}
      {!!answer && (
        <View style={styles.source}>
          <Kicker>{task.skill === 'writing' ? 'Your text' : 'Your answer (text)'}</Kicker>
          <Text style={styles.sourceText}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

// Speaking kaydı. Adres kısa süreli: rapor yenilenince yenisi gelir.
function RecordingPlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration - 0.25) player.seekTo(0);
    player.play();
  };

  return (
    <Button
      label={status.playing ? 'Pause' : 'Listen to your recording'}
      variant="secondary"
      size="compact"
      trailing={<PlayIcon color={colors.text} />}
      onPress={toggle}
    />
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
  noLevel: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    lineHeight: 36,
    color: colors.text,
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
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: colors.divider,
  },
  statValue: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    lineHeight: 26,
    color: colors.text,
  },
  section: {
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  sectionHeader: {
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
  sectionTitlePadded: {
    paddingTop: 14,
    paddingBottom: 10,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  criterion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  criterionName: {
    width: 110,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  criterionTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral300,
  },
  criterionFill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  criterionValue: {
    width: 28,
    textAlign: 'right',
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  source: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  sourceText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.neutral800,
  },
  taskImage: {
    maxWidth: 360,
    aspectRatio: 4 / 3,
    marginTop: 4,
  },
  ended: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.warn700,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  ruleLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  ruleValue: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  certificate: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 14,
  },
  certificateButton: {
    width: 280,
  },
});
