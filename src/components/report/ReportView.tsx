import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import {
  RECEPTIVE_SKILLS,
  SKILL_LABEL,
  type CertificateStatus,
  type ProductiveReport,
  type ProductiveScore,
  type ResultReport,
} from '../../types/exam';
import { formatDateTime, formatDuration } from '../../utils/format';
import { resultNotes } from '../../utils/resultNotes';
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

// Ölçümün kesinliği. medium webdeki ifade; high / low tahmin, webdeki karşılığıyla doğrulanmalı.
const CONFIDENCE: Record<string, string> = {
  high: 'Precise',
  medium: 'Fairly precise',
  low: 'Rough estimate',
};

// Kriter adları webdekiyle aynı
const CRITERION: Record<string, string> = {
  task: 'Task achievement',
};
const criterionName = (key: string) => CRITERION[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

interface ReportViewProps {
  report: ResultReport;
  certificate: CertificateStatus;
  isTablet: boolean;
  onOpenCertificate: () => void;
}

// Rapor (GET /results/:id), web raporuyla aynı yapı: genel seviye ve özet, beceriler + "Worth working on",
// writing / speaking ayrıntısı, sertifika. Güvenlik gereği soruların kendisi ve doğru cevaplar yoktur.
export default function ReportView({ report, certificate, isTablet, onOpenCertificate }: ReportViewProps) {
  const { result } = report;
  const noLevel = result.noEvidence || result.insufficientEvidence || !result.cefrLevel;
  const evaluating = certificate.reason === 'evaluating' || result.productivePending > 0;
  const confidence = !noLevel ? CONFIDENCE[result.confidence] : undefined;
  const hasSkills =
    RECEPTIVE_SKILLS.some((skill) => result.skills[skill]) || !!result.productive.writing || !!result.productive.speaking;

  // Webdeki gibi boş bilgiler gösterilmez (puan yoksa, hiç ayrılmadıysa)
  const facts = (
    [
      result.scaleScore != null && ['Scale score', `${result.scaleScore} / 100`],
      ['Questions', String(result.itemsAnswered)],
      ['Time in the test', formatDuration(report.durationSec)],
      // Webdeki "Left the test" duraklatma sayısıdır (Pause and leave + sunucunun otomatik duraklatmaları)
      report.pauseCount > 0 && ['Left the test', `${report.pauseCount} ${report.pauseCount === 1 ? 'time' : 'times'}`],
      // Başlama ve bitiş yan yana (telefonda iki sütun)
      ['Started', formatDateTime(report.startedAt)],
      ['Finished', formatDateTime(report.finishedAt)],
    ] as const
  ).filter((f): f is [string, string] => !!f);

  const notes = resultNotes(result, {
    timeUp: report.stopReason === 'time_up',
    endedByRules: !!report.proctoring.endedBy,
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Kicker accent>{report.assignmentTitle}</Kicker>
        <Text style={styles.overall}>Overall level</Text>
        {noLevel ? (
          <Text style={styles.noLevel}>Not determined</Text>
        ) : (
          <>
            <Text style={[styles.level, { fontSize: isTablet ? 80 : 64, lineHeight: isTablet ? 74 : 60 }]}>{result.cefrLevel}</Text>
            {/* Ölçümün kesinliği ve puanlama durumu seviyenin altında sade metin */}
            {(evaluating || !!confidence) && (
              <Text style={styles.levelNote}>{[evaluating && 'Evaluating', confidence].filter(Boolean).join(' · ')}</Text>
            )}
          </>
        )}
        {evaluating && (
          <Text style={styles.summary}>Your writing and speaking are being scored. This page updates by itself.</Text>
        )}

        {notes.map((note) => (
          <View key={note} style={styles.notice}>
            <Text style={styles.noticeText}>{note}</Text>
          </View>
        ))}

        <View style={styles.facts}>
          {facts.map(([label, value]) => (
            <View key={label} style={[styles.fact, { flexBasis: isTablet ? '20%' : '50%' }]}>
              <Text style={typography.muted}>{label}</Text>
              <Text style={styles.factValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {hasSkills && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitlePadded]}>Skills</Text>
          <View style={styles.skills}>
            {RECEPTIVE_SKILLS.map((skill) => {
              const s = result.skills[skill];
              if (!s) return null;
              return (
                <SkillCard
                  key={skill}
                  name={SKILL_LABEL[skill]}
                  tag={s.cefrLevel}
                  ratio={s.total > 0 ? s.correct / s.total : 0}
                  meta={`${s.correct} of ${s.total} correct`}
                  isTablet={isTablet}
                />
              );
            })}
            {(['writing', 'speaking'] as const).map((skill) => {
              const p = result.productive[skill];
              return p ? <ProductiveCard key={skill} name={SKILL_LABEL[skill]} score={p} isTablet={isTablet} /> : null;
            })}
          </View>
          {result.focusAreas.length > 0 && (
            <View style={styles.focus}>
              <Text style={typography.muted}>Worth working on:</Text>
              {result.focusAreas.map((area) => (
                <Tag key={area} label={area} />
              ))}
            </View>
          )}
        </View>
      )}

      {report.productive.map((task) => (
        <TaskFeedback key={task.itemId} task={task} />
      ))}

      <View style={styles.certificate}>
        <View style={styles.certificateText}>
          <Text style={styles.sectionTitle}>Certificate</Text>
          <Text style={typography.muted}>
            {certificate.available ? 'Your certificate is ready. You can share it as a PDF.' : CERTIFICATE_REASON[certificate.reason] ?? 'Your certificate is not ready yet.'}
          </Text>
        </View>
        {/* Hazır değilken düğme yok; puanlama bitince rapor yenilenir ve düğme belirir */}
        {certificate.available && (
          <Button label="View certificate" trailing onPress={onOpenCertificate} style={isTablet ? styles.certificateButton : undefined} />
        )}
      </View>
    </View>
  );
}

// Çoktan seçmeli beceri: seviye etiketi + doğru oranı çubuğu
function SkillCard({ name, tag, ratio, meta, isTablet }: { name: string; tag: string; ratio: number; meta: string; isTablet: boolean }) {
  return (
    <View style={[styles.skill, { flexBasis: isTablet ? '30%' : '100%' }]}>
      <View style={styles.skillHead}>
        <Text style={styles.skillName}>{name}</Text>
        {!!tag && <Tag label={tag} tone="level" />}
      </View>
      <View style={styles.track} accessibilityLabel={`${name}: ${meta}`}>
        <View style={[styles.fill, { width: `${Math.round(Math.min(1, ratio) * 100)}%` }]} />
      </View>
      <Text style={typography.muted}>{meta}</Text>
    </View>
  );
}

// Writing / speaking: seviye ya da durum etiketi + puan
function ProductiveCard({ name, score, isTablet }: { name: string; score: ProductiveScore; isTablet: boolean }) {
  const scored = score.status === 'done' && score.score != null;
  const pending = score.status === 'pending' || score.status === 'evaluating';
  return (
    <View style={[styles.skill, { flexBasis: isTablet ? '30%' : '100%' }]}>
      <View style={styles.skillHead}>
        <Text style={styles.skillName}>{name}</Text>
        {score.technical ? (
          <Tag label="Microphone problem" tone="warn" />
        ) : pending ? (
          <Tag label="Evaluating" tone="neutral" />
        ) : (
          !!score.cefrLevel && <Tag label={score.cefrLevel} tone="level" />
        )}
      </View>
      <Text style={typography.muted}>
        {scored ? `Score ${score.score}/100` : score.technical ? 'Not measured' : pending ? 'Being scored…' : 'Not scored'}
      </Text>
    </View>
  );
}

function TaskFeedback({ task }: { task: ProductiveReport }) {
  const strengths = task.feedback.strengths ?? [];
  const nextSteps = task.feedback.improvements ?? [];
  const criteria = Object.entries(task.criteria);
  const answer = task.skill === 'writing' ? task.text : task.transcript;

  return (
    <View style={styles.section}>
      <View style={styles.taskHead}>
        <Text style={styles.sectionTitle}>{SKILL_LABEL[task.skill]}</Text>
        {task.technical ? (
          <Tag label="Microphone problem" tone="warn" />
        ) : (
          !!task.cefrLevel && <Tag label={task.cefrLevel} tone="level" />
        )}
        {task.score != null && <Text style={typography.muted}>{`Score ${task.score}/100`}</Text>}
        {task.weight != null && (
          <Text style={typography.muted}>{`Weight in the overall level: ${Math.round(task.weight * 1000) / 10}%`}</Text>
        )}
      </View>

      <View style={styles.taskBody}>
        <Text style={styles.prompt}>{task.prompt}</Text>
        {!!task.instructions && <Instructions title={task.skill === 'writing' ? 'Your text should include' : 'In your answer'} text={task.instructions} />}
        {!!task.imageUrl && <RemoteImage uri={task.imageUrl} style={styles.taskImage} />}

        {task.technical && (
          <View style={styles.problem}>
            <Text style={styles.problemText}>
              You reported that the microphone did not work. This task did not count towards your level.
            </Text>
          </View>
        )}
        {!task.technical && task.status !== 'done' && (
          <Text style={typography.muted}>{task.status === 'pending' ? 'Being scored…' : 'This task wasn’t scored.'}</Text>
        )}

        {!!task.audioUrl && <RecordingPlayer uri={task.audioUrl} />}
        {!!answer && (
          <View style={styles.answer}>
            <Text style={styles.answerText}>{answer}</Text>
          </View>
        )}

        {criteria.length > 0 && (
          <View style={styles.list}>
            {criteria.map(([key, value]) => (
              <View key={key} style={styles.criterion}>
                <Text style={styles.criterionName}>{criterionName(key)}</Text>
                <View style={styles.criterionTrack}>
                  <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
                </View>
                <Text style={styles.criterionValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {!!task.feedback.evidence && <Text style={styles.evidence}>{task.feedback.evidence}</Text>}

        {strengths.length > 0 && <FeedbackList title="Strengths" items={strengths} bullet="+" />}
        {nextSteps.length > 0 && <FeedbackList title="Next steps" items={nextSteps} bullet="→" />}

        {!!task.teacherFeedback && (
          <View style={styles.answer}>
            <Kicker>Note from your teacher</Kicker>
            <Text style={styles.answerText}>{task.teacherFeedback}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function FeedbackList({ title, items, bullet }: { title: string; items: string[]; bullet: string }) {
  return (
    <View style={styles.list}>
      <Kicker>{title}</Kicker>
      {items.map((item) => (
        <View key={item} style={styles.listRow}>
          <Text style={styles.bullet}>{bullet}</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
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
  top: {
    gap: 8,
  },
  overall: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  // CEFR seviyeleri bu sayfada turuncu (kullanıcı kararı)
  level: {
    fontFamily: fonts.extraBold,
    letterSpacing: -1.3,
    color: colors.primary,
  },
  levelNote: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral700,
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
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  fact: {
    flexGrow: 0,
    paddingRight: 12,
    gap: 2,
  },
  factValue: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  section: {
    borderTopWidth: 2,
    borderTopColor: colors.divider,
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
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skill: {
    flexGrow: 1,
    gap: 8,
    padding: 14,
    backgroundColor: colors.surface,
  },
  skillHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  skillName: {
    flexShrink: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  track: {
    height: 6,
    backgroundColor: colors.neutral300,
  },
  fill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  focus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  taskHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 6,
    paddingTop: 14,
    paddingBottom: 10,
  },
  taskBody: {
    gap: 14,
  },
  prompt: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    lineHeight: 25,
    color: colors.text,
  },
  taskImage: {
    maxWidth: 420,
    aspectRatio: 1,
  },
  notice: {
    marginTop: 4,
    padding: 12,
    backgroundColor: colors.warn100,
  },
  noticeText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 21,
    color: colors.warn700,
  },
  problem: {
    padding: 12,
    backgroundColor: colors.warn100,
    borderLeftWidth: 4,
    borderLeftColor: colors.warn700,
  },
  problemText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 21,
    color: colors.warn700,
  },
  answer: {
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  answerText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },
  list: {
    gap: 6,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
  },
  // Strengths (+) ve Next steps (→) işaretleri aynı renk
  bullet: {
    width: 16,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.accent,
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
    width: 130,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  criterionTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral300,
  },
  criterionValue: {
    width: 28,
    textAlign: 'right',
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  evidence: {
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 21,
    color: colors.neutral800,
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
  // Başlık ile metin arası "Skills" başlığıyla aynı (sectionTitlePadded paddingBottom)
  certificateText: {
    flex: 1,
    minWidth: 220,
    gap: 10,
  },
  certificateButton: {
    width: 280,
  },
});
