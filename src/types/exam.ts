import type { EnglishLevel } from './api';

// Sınav akışının tipleri. Liste tipleri mobil sınav API'sine göre (rehber); oturum ve rapor tipleri henüz
// src/mocks/examServer.ts'in şekli ve sırasıyla API'ye geçirilecek (.claude/notes/api-entegrasyon-plani.md).

export const CEFR_LEVELS = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type ExamKind = 'placement' | 'progress';

export const EXAM_TYPE_LABEL: Record<ExamKind, string> = {
  placement: 'Placement test',
  progress: 'Progress test',
};

// --- Sınav ve sonuç listeleri (GET /exams, GET /results) ---------------------------------------------

// Kartta hangi düğmenin gösterileceğini sunucu söyler; uygulama tarih veya durum hesabı yapmaz
export type ExamAction = 'start' | 'resume' | 'view_result' | 'wait' | 'closed' | 'missed';

// Bilgi amaçlı; düğme için action kullanılır
export type ExamWindow = 'open' | 'upcoming' | 'closed';

export interface ExamParts {
  listening: boolean;
  writing: boolean;
  speaking: boolean;
}

export interface AssignedExam {
  assignmentId: string;
  examType: ExamKind;
  title: string;
  instructionsHtml: string;
  // Boş olabilir; boşsa varsayılan görsel
  coverImage: string;
  startDate: string;
  dueDate: string;
  // null = süre yok
  timeLimitMinutes: number | null;
  window: ExamWindow;
  parts: ExamParts;
  requireBeforeOtherWork: boolean;
  // Başlanmış deneme yoksa boş string
  sessionId: string;
  sessionStatus: string;
  sessionPhase: string;
  // Bitmiş denemenin seviyesi, yoksa boş string
  cefrLevel: string;
  // Sadece yarım kalmış denemede gelir
  paused?: boolean;
  remainingSec?: number | null;
  action: ExamAction;
}

export interface ExamList {
  level: EnglishLevel | null;
  // Açık ve bitmemiş bir placement var, önce o çözülmeli
  mustTakePlacement: boolean;
  exams: AssignedExam[];
}

export interface ResultSummary {
  sessionId: string;
  assignmentId: string;
  examType: ExamKind;
  title: string;
  coverImage: string;
  finishedAt: string;
  status: string;
  cefrLevel: string;
  // Writing veya speaking henüz puanlanıyor
  evaluating: boolean;
  // Çok az cevap var, seviye verilmedi
  noLevel: boolean;
}

// --- Sınav oturumu (rehber: "Sınavı başlatma ve state nesnesi") -----------------------------------------
// Sınav ekranının tek veri kaynağı: her istek güncel state'i döner, ekran her seferinde ona göre yeniden çizilir.

export type Skill = 'language_use' | 'reading' | 'listening' | 'writing' | 'speaking';

export const SKILL_LABEL: Record<Skill, string> = {
  language_use: 'Language use',
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

// Çoktan seçmeli bölümlerin sabit sırası
export const RECEPTIVE_SKILLS: Skill[] = ['language_use', 'reading', 'listening'];

// receptive: çoktan seçmeli bölümler · productive: writing ve speaking · done: bitti
export type SessionPhase = 'receptive' | 'productive' | 'done';

// awaiting_evaluation: writing / speaking puanlanıyor
export type AttemptStatus = 'in_progress' | 'awaiting_evaluation' | 'completed';

export type ItemType = 'single_choice' | 'true_false' | 'writing_prompt' | 'speaking_prompt';

export interface ItemOption {
  // Sunucuya giden değer; ekrandaki harf değil
  key: string;
  text: string;
  imageUrl: string;
}

// Okuma metni ya da dinleme kaydı. Aynı stimulus'a bağlı sorular arka arkaya gelir (id aynı kalır).
export interface Stimulus {
  id: string;
  kind: 'passage' | 'audio';
  title: string;
  // kind = passage: okuma metni (\n\n paragraf aralığı); audio'da boş (transcript gelmez)
  text: string;
  audioUrl: string;
  imageUrl: string;
  maxPlays: number;
  // Sadece dinlemede: POST audio/play anahtarı ve kalan hak (hak kayda aittir, soru başına yenilenmez)
  audioKey?: string;
  playsLeft?: number;
}

// Writing / speaking görevinin ayrıntıları (Aşama 5)
export interface ProductiveSpec {
  instructions: string;
  // 0 = sınır yok
  minWords: number;
  maxWords: number;
  responseSeconds: number;
  maxResponseSeconds: number;
}

export interface SessionItem {
  id: string;
  skill: Skill;
  itemType: ItemType;
  // Boşluk ___ olarak gelir
  stem: string;
  // Geldiği sırayla gösterilir; sıra öğrenciye göre karıştırılmış olabilir
  options: ItemOption[];
  imageUrl: string;
  audioUrl?: string;
  audioMaxPlays?: number;
  // Nadiren kayıt sorunun kendisine bağlıdır
  audioKey?: string;
  audioPlaysLeft?: number;
  stimulus: Stimulus | null;
  productive: ProductiveSpec | null;
}

export interface SessionProgress {
  // Pilot (puanlanmayan) soruları da sayar; bölüm ilerlemesi için section.answered kullanılır
  answered: number;
  receptiveMax: number;
  productiveDone: number;
  productiveTotal: number;
}

// Sadece çoktan seçmeli kısımda
export interface SectionProgress {
  skill: Skill;
  // 1'den başlar
  index: number;
  total: number;
  answered: number;
  // Sunucu ölçümü yeterli bulursa bölümü erken bitirebilir; kesin sayı değil
  max: number;
}

export interface SessionGuard {
  tabSwitchLimit: number;
  tabSwitchCount: number;
  inactivityWarnSeconds: number;
  inactivityEndSeconds: number;
  // Kurallarla bittiyse sebep
  endedBy: string;
}

export interface SessionState {
  sessionId: string;
  assignmentId: string;
  examType: ExamKind;
  status: AttemptStatus;
  phase: SessionPhase;
  // Her cevapla aynen geri gönderilir; tekrar gönderilen cevabın iki kez sayılmasını engeller
  step: number;
  deadlineAt: string | null;
  serverNow: string;
  paused: boolean;
  // null = süre yok
  remainingSec: number | null;
  timeLimitSec: number | null;
  currentDraft: string;
  progress: SessionProgress;
  currentItem: SessionItem | null;
  section: SectionProgress | null;
  productiveSubmitted: boolean;
  // Sadece phase = done (Aşama 6'da tiplenecek)
  result: Record<string, unknown> | null;
  guard: SessionGuard;
}

export type ExamEventType = 'monitored' | 'tabSwitch' | 'inactivityWarn' | 'inactivityEnd' | 'pasteBlocked';

export type EventVerdictKind = 'none' | 'warn' | 'final' | 'terminate';

export interface EventVerdict {
  verdict: EventVerdictKind;
  count: number;
  limit: number;
  endedBy: string;
  // terminate'te phase = done olan state
  state: SessionState | null;
}

export interface AudioPlay {
  // 15 dk geçerli imzalı adres; saklanmaz
  url: string;
  playsLeft: number;
}

// --- Sahte sunucu tipleri (writing / speaking bileşenleri ve rapor; Aşama 5–6'da kaldırılacak) ------------

// --- Sınav oturumu -------------------------------------------------------------------------------

export interface Passage {
  id: string;
  title: string;
  paragraphs: { n: string; text: string }[];
}

export interface AudioClip {
  id: string;
  title: string; // "Recording 1"
  subtitle: string; // "Two-person dialogue"
  maxPlays: number;
  // Sunucuda sayılan dinleme sayısı (aynı kayda bağlı ardışık sorularda paylaşılır)
  playsUsed: number;
  // TODO: Gerçek ses dosyası. Şimdilik süre simüle ediliyor.
  url: string | null;
  durationSeconds: number;
}

export interface ChoiceOption {
  key: string; // "A"
  text: string;
}

export interface ChoiceItem {
  kind: 'choice';
  id: string;
  skill: string; // "Language use" | "Reading" | "Listening"
  instruction: string;
  stem: string;
  // TODO: Gerçek görsel URL'si; şimdilik prototipteki gibi açıklama metni
  imageLabel: string | null;
  passage: Passage | null;
  audio: AudioClip | null;
  options: ChoiceOption[];
}

export interface WritingTask {
  kind: 'writing';
  id: string;
  skill: 'Writing';
  title: string;
  prompt: string;
  minWords: number;
  maxWords: number;
  // Daha önce otomatik kaydedilmiş taslak (devam edilirse)
  draft: string;
}

export interface SpeakingTask {
  kind: 'speaking';
  id: string;
  skill: 'Speaking';
  title: string;
  prompt: string;
  imageLabel: string | null;
  maxSeconds: number;
}

export type ExamItem = ChoiceItem | WritingTask | SpeakingTask;

export type SectionKey = 'choice' | 'writing' | 'speaking';

export interface SectionInfo {
  key: SectionKey;
  label: string; // "Multiple choice"
  // Bölüm sayacındaki ağırlık (prototipte 4 / 1 / 1)
  weight: number;
}

export type SessionStatus = 'active' | 'paused' | 'finished';

// Sunucunun her işlemden sonra döndürdüğü oturum görüntüsü. İstemci süreyi kendisi tutmaz: remainingSeconds
// sunucudan gelir, aradaki geri sayım yalnızca gösterim içindir.
export interface SessionSnapshot {
  sessionId: string;
  examId: string;
  examTitle: string;
  status: SessionStatus;
  remainingSeconds: number;
  sections: SectionInfo[];
  currentSection: SectionKey;
  // Bölüm içindeki sıra (1'den başlar)
  itemNumber: number;
  item: ExamItem | null;
  answeredCount: number;
  // Güvenlik olaylarının sayısı (çıkışlar vb.)
  exitCount: number;
}

export type SecurityEventType =
  | 'app_background' // başka uygulamaya geçti
  | 'app_inactive' // kontrol merkezi, bildirimler, uygulama değiştirici
  | 'window_resized' // iPad split view / slide over
  | 'paste_blocked'
  | 'screen_capture'; // TODO: expo-screen-capture ile

export interface SecurityEvent {
  type: SecurityEventType;
  detail?: string;
}

// --- Sonuç ve rapor ------------------------------------------------------------------------------

export type LevelStatus = 'Provisional' | 'Confirmed';

export interface ExamResult {
  examId: string;
  typeLabel: string;
  level: CefrLevel;
  status: LevelStatus;
  summary: string; // "You give reasons and follow longer texts."
  note: string | null; // Yazma/konuşma değerlendirmesi sürüyorsa açıklama
  scaleScore: number;
  answeredCount: number;
}

export interface SkillResult {
  skill: string;
  level: CefrLevel;
  meta: string; // "9 / 12 correct" | "Score 58"
}

export interface TaskFeedback {
  title: string; // "Writing"
  level: CefrLevel;
  score: string; // "58 / 100"
  strengths: string[];
  improvements: string[];
  sourceLabel: string; // "Your text"
  source: string;
}

export interface ExamReport {
  examId: string;
  typeLabel: string; // "Progress"
  title: string;
  dateLabel: string;
  level: CefrLevel;
  status: LevelStatus;
  summary: string;
  scaleScore: number;
  nextLevel: string; // "B2 · 70"
  skills: SkillResult[];
  hardestAreas: string | null;
  feedback: TaskFeedback[];
  // Zaman içindeki ilerleme görünümü yalnızca progress serisi varsa
  hasProgress: boolean;
}

export interface ProgressPoint {
  id: string;
  short: string;
  dateLabel: string; // tamamlandıysa tarih, değilse "Open now" / "Opens …"
  level: CefrLevel | null;
  isOpen: boolean;
  change: string; // "↑ 2 steps from A2+" | "Baseline" | ""
}

export interface ProgressReport {
  title: string; // "Progress over time · 2026–27"
  note: string;
  baseline: { level: CefrLevel; short: string } | null;
  latest: { level: CefrLevel; short: string } | null;
  steps: number;
  points: ProgressPoint[];
}
