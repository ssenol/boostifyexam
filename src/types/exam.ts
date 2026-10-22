import type { EnglishLevel } from './api';

// Sınav akışının tipleri. Liste tipleri mobil sınav API'sine göre (rehber); Intro, oturum ve rapor tipleri henüz
// src/mocks/examServer.ts'in şekli ve sırasıyla API'ye geçirilecek (.claude/notes/api-entegrasyon-plani.md).

export const CEFR_LEVELS = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type ExamKind = 'placement' | 'progress';

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

// Mock'taki oturum durumu (Intro). Aşama 3'te kaldırılacak.
export type SessionState = 'none' | 'active' | 'paused';

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
