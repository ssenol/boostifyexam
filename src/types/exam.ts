import type { EnglishLevel } from './api';

// Sınav akışının tipleri: mobil sınav API'si (_calismalar/BoostifyExam Mobil Uygulama Geliştirici Rehberi.docx).

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

// awaiting_evaluation: writing / speaking puanlanıyor · expired: süre doldu (stopReason: time_up)
export type AttemptStatus = 'in_progress' | 'awaiting_evaluation' | 'completed' | 'expired';

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
  // Sadece phase = done: seviye ve beceri sonuçları
  result: ExamResultData | null;
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

// --- Sonuç, rapor ve sertifika (rehber: "Sonuçlar, rapor ve sertifika") --------------------------------

export interface SkillScore {
  cefrLevel: string;
  correct: number;
  total: number;
}

// Writing / speaking özeti. status: done | pending | failed …; technical: mikrofon çalışmadı (puanlamaya katılmaz)
export interface ProductiveScore {
  status: string;
  score?: number | null;
  cefrLevel?: string;
  weight?: number | null;
  technical?: boolean;
}

// state.result (phase = done) ve rapordaki result
export interface ExamResultData {
  cefrLevel: string;
  // Seviye verilmedi ("yeterli cevap yok")
  noEvidence: boolean;
  insufficientEvidence: boolean;
  // 0–100 ölçek puanı
  scaleScore: number | null;
  confidence: string;
  skills: Partial<Record<Skill, SkillScore>>;
  productive: Partial<Record<'writing' | 'speaking', ProductiveScore>>;
  // Puanlaması süren writing / speaking sayısı
  productivePending: number;
  // Geliştirilecek alanlar
  focusAreas: string[];
  itemsAnswered: number;
}

export interface ProductiveFeedback {
  evidence?: string;
  strengths?: string[];
  improvements?: string[];
}

// Rapordaki writing / speaking ayrıntısı
export interface ProductiveReport {
  itemId: string;
  skill: 'writing' | 'speaking';
  status: string;
  prompt: string;
  instructions: string;
  imageUrl: string;
  targetLevel: string;
  cefrLevel?: string;
  score: number | null;
  // Writing metni
  text: string;
  // Speaking: öğrencinin onayladığı metin
  transcript: string;
  // Speaking kaydı: kısa süreli imzalı adres (dinletmek için rapor yeniden çekilir)
  audioUrl: string;
  durationSec: number | null;
  // Kriter puanları (task, grammar, vocabulary, organisation…)
  criteria: Record<string, number>;
  feedback: ProductiveFeedback;
  technical: boolean;
  teacherFeedback: string;
}

export interface Proctoring {
  monitored: boolean;
  tabSwitchCount: number;
  inactivityWarnCount: number;
  pasteBlockedCount: number;
  // Kurallarla bittiyse sebep
  endedBy: string;
  endedAt: string | null;
  flagged: boolean;
}

export interface ResultReport {
  sessionId: string;
  examType: ExamKind;
  status: AttemptStatus;
  assignmentTitle: string;
  schoolName: string;
  startedAt: string;
  finishedAt: string;
  durationSec: number;
  stopReason: string;
  result: ExamResultData;
  productive: ProductiveReport[];
  proctoring: Proctoring;
}

// reason: '' (hazır) | evaluating | no_level
export interface CertificateStatus {
  available: boolean;
  reason: string;
}

export interface Certificate {
  model: {
    kind: ExamKind;
    title: string;
    studentName: string;
    level: string;
    levelName: string;
    scaleScore: number;
  };
  // "Certificate-Gamze-Coşkun-C1.pdf"
  fileName: string;
  page: { width: number; height: number; orientation: string; format: string };
  // Webdeki sertifikanın birebir aynısı; tek başına eksiksiz sayfa (logo gömülü). Resmî belge olarak bu kullanılır.
  html: string;
}
