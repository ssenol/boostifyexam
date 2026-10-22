import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { levelColors } from '../../theme/levels';
import {
  EXAM_TYPE_LABEL,
  RECEPTIVE_SKILLS,
  SKILL_LABEL,
  type CertificateStatus,
  type ProductiveReport,
  type ProductiveScore,
  type ResultReport,
  type Skill,
} from '../../types/exam';
import { formatClock, formatDateRange, formatDuration } from '../../utils/format';
import { resultNotes } from '../../utils/resultNotes';
import Button from '../Button';
import Collapsible from '../Collapsible';
import Instructions from '../exam/Instructions';
import { ArrowRightIcon, BookIcon, CheckIcon, HeadphonesIcon, MicIcon, PenIcon, PlayIcon, SpellCheckIcon } from '../icons';
import Kicker from '../Kicker';
import LevelBadge from '../LevelBadge';
import Tag from '../Tag';
import RemoteImage from '../RemoteImage';

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

// Beceri simgeleri (webdeki gibi)
function SkillIcon({ skill, size = 20 }: { skill: Skill; size?: number }) {
  const color = colors.accent;
  switch (skill) {
    case 'language_use':
      return <SpellCheckIcon size={size} color={color} />;
    case 'reading':
      return <BookIcon size={size} color={color} />;
    case 'listening':
      return <HeadphonesIcon size={size} color={color} />;
    case 'writing':
      return <PenIcon size={size} color={color} />;
    case 'speaking':
      return <MicIcon size={size} color={color} />;
  }
}

// --- Overview sekmesi ------------------------------------------------------------------------------

interface ReportOverviewProps {
  report: ResultReport;
  certificate: CertificateStatus;
  isTablet: boolean;
  onOpenCertificate: () => void;
  // Writing / speaking kartına dokununca o görevin sekmesi açılır
  onOpenTask: (skill: 'writing' | 'speaking') => void;
}

// Kısa, tek ekranlık özet: genel seviye, beceriler, "Worth working on", sertifika
export function ReportOverview({ report, certificate, isTablet, onOpenCertificate, onOpenTask }: ReportOverviewProps) {
  const { result } = report;
  const noLevel = result.noEvidence || result.insufficientEvidence || !result.cefrLevel;
  const evaluating = certificate.reason === 'evaluating' || result.productivePending > 0;
  const confidence = !noLevel ? CONFIDENCE[result.confidence] : undefined;
  const hasSkills =
    RECEPTIVE_SKILLS.some((skill) => result.skills[skill]) || !!result.productive.writing || !!result.productive.speaking;

  // Özet kartının altındaki bilgiler; webdeki gibi boşsa gösterilmez (hiç ayrılmadıysa)
  const facts = (
    [
      ['Time in the test', formatDuration(report.durationSec)],
      // Webdeki "Left the test" duraklatma sayısıdır (Pause and leave + sunucunun otomatik duraklatmaları)
      report.pauseCount > 0 && ['Left the test', `${report.pauseCount} ${report.pauseCount === 1 ? 'time' : 'times'}`],
      // Uzun olduğu için telefonda tam satır
      ['Date', formatDateRange(report.startedAt, report.finishedAt)],
    ] as const
  ).filter((f): f is [string, string] => !!f);

  const notes = resultNotes(result, {
    timeUp: report.stopReason === 'time_up',
    endedByRules: !!report.proctoring?.endedBy,
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.heading}>
          <Kicker accent>{EXAM_TYPE_LABEL[report.examType]}</Kicker>
          <Text style={styles.title}>{report.assignmentTitle}</Text>
        </View>

        {/* Özet kartı: solda seviye, sağda ölçek puanı ve soru sayısı */}
        <View style={[styles.card, styles.summaryCard, isTablet && styles.summaryCardTablet]}>
          <View style={styles.summaryLevel}>
            <Kicker>Overall level</Kicker>
            {noLevel ? (
              <Text style={[styles.level, styles.levelNone]}>—</Text>
            ) : (
              <Text
                style={[
                  styles.level,
                  { fontSize: isTablet ? 72 : 56, lineHeight: isTablet ? 76 : 60, color: levelColors(result.cefrLevel).fg },
                ]}
              >
                {result.cefrLevel}
              </Text>
            )}
            <Text style={styles.levelNote}>
              {noLevel ? 'Not determined' : [evaluating && 'Evaluating', confidence].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Kicker>Scale score</Kicker>
              <Text style={styles.summaryValue}>
                {result.scaleScore != null ? result.scaleScore : '—'}
                {result.scaleScore != null && <Text style={styles.summaryUnit}> / 100</Text>}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Kicker>Questions</Kicker>
              <Text style={styles.summaryValue}>{result.itemsAnswered}</Text>
            </View>
          </View>
        </View>

        {evaluating && (
          <Text style={styles.summary}>Your writing and speaking are being scored. This page updates by itself.</Text>
        )}
        {notes.map((note) => (
          <Notice key={note} text={note} />
        ))}
        {!noLevel && result.profile?.capped && !!result.profile.productiveLevel && (
          <Notice
            tone="info"
            text={`Your overall level takes your writing and speaking (${result.profile.productiveLevel}) into account: it is at most one CEFR band above them.`}
          />
        )}

        <View style={styles.facts}>
          {facts.map(([label, value]) => (
            <View key={label} style={[styles.fact, { flexBasis: isTablet ? '25%' : label === 'Date' ? '100%' : '50%' }]}>
              <Text style={typography.muted}>{label}</Text>
              <Text style={styles.factValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {hasSkills && (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skills}>
            {RECEPTIVE_SKILLS.map((skill) => {
              const s = result.skills[skill];
              if (!s) return null;
              return (
                <View key={skill} style={[styles.card, styles.skill, { flexBasis: isTablet ? '30%' : '100%' }]}>
                  <View style={styles.skillHead}>
                    <SkillIcon skill={skill} />
                    <Text style={styles.skillName}>{SKILL_LABEL[skill]}</Text>
                    {!!s.cefrLevel && <LevelBadge level={s.cefrLevel} />}
                  </View>
                  <View style={styles.track} accessibilityLabel={`${SKILL_LABEL[skill]}: ${s.correct} of ${s.total} correct`}>
                    <View style={[styles.fill, { width: `${s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0}%` }]} />
                  </View>
                  <Text style={typography.muted}>{`${s.correct} of ${s.total} correct`}</Text>
                </View>
              );
            })}
            {(['writing', 'speaking'] as const).map((skill) => {
              const p = result.productive[skill];
              return p ? (
                <ProductiveCard key={skill} skill={skill} score={p} isTablet={isTablet} onPress={() => onOpenTask(skill)} />
              ) : null;
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

      <View style={[styles.card, styles.certificate]}>
        <View style={styles.certificateText}>
          <Text style={styles.sectionTitle}>Certificate</Text>
          <Text style={typography.muted}>
            {certificate.available
              ? 'Your certificate is ready. You can share it as a PDF.'
              : CERTIFICATE_REASON[certificate.reason] ?? 'Your certificate is not ready yet.'}
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

// Writing / speaking kartı: seviye ya da durum + puan; dokununca ayrıntı sekmesi
function ProductiveCard({
  skill,
  score,
  isTablet,
  onPress,
}: {
  skill: 'writing' | 'speaking';
  score: ProductiveScore;
  isTablet: boolean;
  onPress: () => void;
}) {
  const scored = score.status === 'done' && score.score != null;
  const skipped = score.status === 'skipped';
  const pending = score.status === 'pending' || score.status === 'evaluating';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.skill, { flexBasis: isTablet ? '30%' : '100%' }, pressed && styles.pressed]}
    >
      <View style={styles.skillHead}>
        <SkillIcon skill={skill} />
        <Text style={styles.skillName}>{SKILL_LABEL[skill]}</Text>
        {score.technical ? (
          <Tag label="Microphone problem" tone="warn" />
        ) : skipped ? (
          <Tag label="Skipped" tone="neutral" />
        ) : pending ? (
          <Tag label="Evaluating" tone="neutral" />
        ) : (
          !!score.cefrLevel && <LevelBadge level={score.cefrLevel} />
        )}
      </View>
      <View style={styles.skillFoot}>
        <Text style={typography.muted}>
          {scored
            ? `Score ${score.score}/100`
            : score.technical
              ? 'Not measured'
              : skipped
                ? 'Score 0/100'
                : pending
                  ? 'Being scored…'
                  : 'Not scored'}
        </Text>
        <Text style={styles.link}>Feedback</Text>
        <ArrowRightIcon size={16} color={colors.accent} />
      </View>
    </Pressable>
  );
}

// --- Writing / Speaking sekmesi --------------------------------------------------------------------

// Öğrencinin en çok ihtiyacı olan önce: geri bildirim, puanlar; uzun içerik (cevap, görev, açıklama) açılır bölümlerde
export function TaskReport({ task }: { task: ProductiveReport }) {
  const strengths = task.feedback.strengths ?? [];
  const nextSteps = task.feedback.improvements ?? [];
  const criteria = Object.entries(task.criteria);
  const answer = task.skill === 'writing' ? task.text : task.transcript;
  // Speaking ses ölçümleri (webdeki adlarla)
  const voice: [string, number][] = [];
  if (task.voice?.pronunciation != null) voice.push(['Pronunciation', task.voice.pronunciation]);
  if (task.voice?.fluency != null) voice.push(['Fluency', task.voice.fluency]);
  if (task.voice?.prosody != null) voice.push(['Intonation', task.voice.prosody]);

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.taskHead}>
          <SkillIcon skill={task.skill} size={24} />
          <Text style={styles.title}>{SKILL_LABEL[task.skill]}</Text>
          {task.technical ? (
            <Tag label="Microphone problem" tone="warn" />
          ) : task.status === 'skipped' ? (
            <Tag label="Skipped" tone="neutral" />
          ) : (
            !!task.cefrLevel && <LevelBadge level={task.cefrLevel} />
          )}
          {task.needsReview && <Tag label="Teacher review" tone="neutral" />}
        </View>
        <Text style={typography.muted}>
          {[
            task.score != null && `Score ${task.score}/100`,
            task.weight != null && `Weight in the overall level: ${Math.round(task.weight * 1000) / 10}%`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {task.technical && (
          <Notice text="You reported that the microphone did not work. This task did not count towards your level." />
        )}
        {task.status === 'skipped' && <Notice text="This task was skipped and counted as 0 points." />}
        {!task.technical && task.status === 'pending' && <Notice tone="info" text="This task is being scored." />}
        {task.needsReview && <Notice tone="info" text="Your teacher will also check this answer." />}
      </View>

      {strengths.length > 0 && (
        <FeedbackBox tone="good" title="Strengths" icon={<CheckIcon color={levelColors('B1').fg} />} items={strengths} />
      )}
      {nextSteps.length > 0 && (
        <FeedbackBox tone="next" title="Next steps" icon={<ArrowRightIcon size={18} color={colors.accent800} />} items={nextSteps} />
      )}

      {!!task.teacherFeedback && (
        <View style={[styles.card, styles.teacher]}>
          <Kicker>Note from your teacher</Kicker>
          <Text style={styles.answerText}>{task.teacherFeedback}</Text>
        </View>
      )}

      {criteria.length > 0 && (
        <View style={[styles.card, styles.scores]}>
          <ScoreGroup title={voice.length > 0 ? 'Content' : 'Scores'} rows={criteria.map(([k, v]) => [criterionName(k), v])} />
          {voice.length > 0 && <ScoreGroup title="Voice" rows={voice} />}
        </View>
      )}

      <View>
        {(!!answer || !!task.audioUrl) && (
          <Collapsible title={task.skill === 'writing' ? 'Your text' : 'Your answer'}>
            {!!task.audioUrl &&
              (isWebm(task.audioUrl) && Platform.OS === 'ios' ? (
                <WebmNotice />
              ) : (
                <RecordingPlayer uri={task.audioUrl} durationSec={task.durationSec} />
              ))}
            {!!answer && (
              <View style={styles.list}>
                {task.skill === 'speaking' && (
                  <View style={styles.inlineHead}>
                    <Kicker>Transcript</Kicker>
                    {task.transcriptConfirmed && <Text style={styles.checked}>✓ Checked by you</Text>}
                  </View>
                )}
                <View style={styles.answer}>
                  <Text style={styles.answerText}>{answer}</Text>
                </View>
              </View>
            )}
          </Collapsible>
        )}
        <Collapsible title="The task">
          <Text style={styles.prompt}>{task.prompt}</Text>
          {!!task.instructions && (
            <Instructions title={task.skill === 'writing' ? 'Your text should include' : 'In your answer'} text={task.instructions} />
          )}
          {/* Sadece hatırlatma: küçük önizleme, büyütme yok */}
          {!!task.imageUrl && <RemoteImage uri={task.imageUrl} style={styles.thumb} />}
        </Collapsible>
        {!!task.feedback.evidence && (
          <Collapsible title="Why this score">
            <Text style={styles.evidence}>{task.feedback.evidence}</Text>
          </Collapsible>
        )}
      </View>
    </View>
  );
}

// Strengths (yeşil) / Next steps (mavi) kutusu
function FeedbackBox({ tone, title, icon, items }: { tone: 'good' | 'next'; title: string; icon: ReactNode; items: string[] }) {
  const good = tone === 'good';
  const fg = good ? levelColors('B1').fg : colors.accent800;
  return (
    <View style={[styles.feedbackBox, { backgroundColor: good ? levelColors('B1').bg : colors.accent100 }]}>
      <View style={styles.inlineHead}>
        {icon}
        <Text style={[styles.feedbackTitle, { color: fg }]}>{title}</Text>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.listRow}>
          <Text style={[styles.bullet, { color: fg }]}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ScoreGroup({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <View style={styles.list}>
      <Kicker>{title}</Kicker>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.criterion}>
          <Text style={styles.criterionName}>{label}</Text>
          <View style={styles.criterionTrack}>
            <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
          </View>
          <Text style={styles.criterionValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

// Uyarı (turuncu) ya da bilgi (mavi) kutusu
function Notice({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'info' }) {
  const info = tone === 'info';
  return (
    <View style={[styles.notice, { backgroundColor: info ? colors.accent100 : colors.warn100 }]}>
      <Text style={[styles.noticeText, { color: info ? colors.accent800 : colors.warn700 }]}>{text}</Text>
    </View>
  );
}

// Web'de (tarayıcıda) alınan kayıtlar WebM; iOS'un yerel oynatıcısı (AVPlayer) WebM çalamaz
const isWebm = (uri: string) => /\.webm(\?|$)/i.test(uri);

// iOS'ta WebM kayıt çalınamıyor: tarayıcının MediaRecorder WebM'inde süre bilgisi yok, AVPlayer WebM açmıyor;
// WebView ile denendi, ses çıkmadı (2026-10-22). Sunucu m4a sağlayana kadar not gösterilir
// (bkz. .claude/notes/api-entegrasyon-plani.md, "Backend'e iletilecekler").
function WebmNotice() {
  return (
    <View style={styles.list}>
      <Kicker>Recording</Kicker>
      <Text style={typography.muted}>This recording was made on the web and can’t be played in the app yet.</Text>
    </View>
  );
}

// Speaking kaydı. Adres kısa süreli: rapor yenilenince yenisi gelir.
function RecordingPlayer({ uri, durationSec }: { uri: string; durationSec: number | null }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const total = status.duration || durationSec || 0;
  const pct = total > 0 ? Math.min(100, (status.currentTime / total) * 100) : 0;

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration - 0.25) player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.list}>
      <View style={styles.inlineHead}>
        <Kicker>Recording</Kicker>
        {total > 0 && <Text style={typography.muted}>{`${formatClock(status.currentTime)} / ${formatClock(total)}`}</Text>}
      </View>
      <View style={styles.player}>
        <Button
          label={status.playing ? 'Pause' : 'Play'}
          variant="secondary"
          size="compact"
          trailing={<PlayIcon color={colors.text} />}
          onPress={toggle}
        />
        <View style={styles.criterionTrack}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 24,
  },
  // Üst kısım: başlık, özet kartı, notlar ve bilgiler arası eşit boşluk
  top: {
    gap: 16,
  },
  heading: {
    gap: 4,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    lineHeight: 29,
    color: colors.text,
  },
  // Bölümleri çizgi yerine kartlar ayırır
  card: {
    backgroundColor: colors.surface,
    padding: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  summaryCard: {
    flexDirection: 'row',
  },
  summaryCardTablet: {
    maxWidth: 560,
  },
  summaryLevel: {
    flex: 1,
    gap: 4,
  },
  level: {
    fontFamily: fonts.extraBold,
    letterSpacing: -1.3,
  },
  levelNone: {
    fontSize: 56,
    lineHeight: 60,
    color: colors.neutral500,
  },
  levelNote: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral700,
  },
  summaryStats: {
    flex: 1,
    gap: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.divider,
  },
  summaryStat: {
    gap: 4,
  },
  summaryValue: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    lineHeight: 30,
    color: colors.text,
  },
  summaryUnit: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.neutral700,
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
    rowGap: 16,
  },
  fact: {
    flexGrow: 0,
    paddingRight: 12,
    gap: 4,
  },
  factValue: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  block: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.text,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skill: {
    flexGrow: 1,
    gap: 8,
  },
  skillHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillName: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  skillFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    marginLeft: 'auto',
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.accent,
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
  },
  certificate: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
  },
  certificateText: {
    flex: 1,
    minWidth: 220,
    gap: 10,
  },
  certificateButton: {
    width: 280,
  },
  taskHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 10,
    rowGap: 6,
  },
  notice: {
    padding: 12,
  },
  noticeText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 21,
  },
  feedbackBox: {
    padding: 16,
    gap: 8,
  },
  feedbackTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
  },
  inlineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teacher: {
    gap: 6,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  scores: {
    gap: 16,
  },
  list: {
    gap: 6,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    width: 12,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    lineHeight: 22,
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
  checked: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: levelColors('B1').fg,
  },
  answer: {
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
  prompt: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  thumb: {
    width: 160,
    aspectRatio: 1,
  },
  evidence: {
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 21,
    color: colors.neutral800,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
