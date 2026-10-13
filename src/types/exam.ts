// Sınav akışının tipleri. Backend API'si henüz yok; bu tipler src/mocks/examServer.ts'in döndürdüğü şekli ve
// API'den beklediğimiz sözleşmeyi tanımlar. API gelince alan adları ona göre güncellenir.

export const CEFR_LEVELS = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type ExamKind = 'placement' | 'progress';

// --- Assignments ---------------------------------------------------------------------------------

// Öğrencinin oturum durumu; "paused" ise kartta Start yerine Continue gösterilir
export type SessionState = 'none' | 'active' | 'paused';

export interface OpenExam {
  id: string;
  kind: ExamKind;
  typeLabel: string; // "Progress test"
  title: string;
  closesLabel: string; // "14 Feb 2027, 23:59"
  durationMinutes: number;
  singleAttempt: boolean;
  sessionState: SessionState;
}

export type SeriesState = 'done' | 'open' | 'upcoming';

export interface SeriesItem {
  id: string;
  short: string; // "Start of term 2"
  state: SeriesState;
  meta: string; // "Level B1" | "Closes 14 Feb" | "Opens 7 Jun 2027"
}

export interface ProgressSeries {
  title: string; // "Progress tests · 2026–27"
  items: SeriesItem[];
}

export type LevelStatus = 'Provisional' | 'Confirmed';

export interface CompletedExam {
  id: string;
  typeLabel: string;
  title: string;
  completedLabel: string; // "Completed 20 Jan 2027"
  level: CefrLevel;
  status: LevelStatus;
  // Önceki teste göre değişim; ilk testte null (Baseline)
  change: string | null;
}

export interface AssignmentsData {
  open: OpenExam[];
  series: ProgressSeries | null;
  completed: CompletedExam[];
}

// --- Intro ---------------------------------------------------------------------------------------

export interface ExamRule {
  title: string;
  detail: string;
}

export interface ExamDetail {
  id: string;
  kind: ExamKind;
  typeLabel: string;
  kicker: string; // "Progress test · 3 of 4"
  title: string;
  description: string;
  teacherNote: string | null;
  rules: ExamRule[];
  durationMinutes: number;
  needsHeadphones: boolean;
  needsMicrophone: boolean;
  sessionState: SessionState;
}

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
