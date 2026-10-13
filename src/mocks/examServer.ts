// Sahte sınav sunucusu. Backend API'si gelene kadar src/services/exam.ts bunu çağırır.
//
// Veriler prototipten (_calismalar/prototip/ekranlar.dc.html) alındı. Mantık bilerek "sunucu tarafında"
// tutuluyor: süre, soru sırası, dinleme hakları ve güvenlik olayları burada. İstemci bunlara karar vermez.
// API'den de aynı davranışı bekliyoruz (bkz. .claude/notes/sinav-akisi-ve-api-sozlesmesi.md).
//
// Durum bellekte tutulur; uygulama yeniden başlayınca sıfırlanır.

import {
  CEFR_LEVELS,
  type AssignmentsData,
  type AudioClip,
  type CefrLevel,
  type ChoiceItem,
  type CompletedExam,
  type ExamDetail,
  type ExamReport,
  type ExamResult,
  type Passage,
  type ProgressReport,
  type SecurityEvent,
  type SectionInfo,
  type SessionSnapshot,
  type SpeakingTask,
  type WritingTask,
} from '../types/exam';

// --- Sabit veri ----------------------------------------------------------------------------------

interface ExamDef {
  id: string;
  kind: 'placement' | 'progress';
  typeLabel: string;
  title: string;
  short: string;
  dateLabel: string; // tamamlanma ya da açılış tarihi
  closesLabel?: string;
}

const PLACEMENT: ExamDef = {
  id: 'pl', kind: 'placement', typeLabel: 'Placement test', title: 'Fall term placement 2026', short: 'Placement',
  dateLabel: '15 Sep 2026', closesLabel: '3 Oct 2026, 23:59',
};

const SERIES: ExamDef[] = [
  { id: 'p1', kind: 'progress', typeLabel: 'Progress test', title: 'Start of year progress', short: 'Start of year', dateLabel: '29 Sep 2026' },
  { id: 'p2', kind: 'progress', typeLabel: 'Progress test', title: 'End of term 1 progress', short: 'End of term 1', dateLabel: '20 Jan 2027' },
  { id: 'p3', kind: 'progress', typeLabel: 'Progress test', title: 'Start of term 2 progress', short: 'Start of term 2', dateLabel: '10 Feb 2027', closesLabel: '14 Feb 2027, 23:59' },
  { id: 'p4', kind: 'progress', typeLabel: 'Progress test', title: 'End of term 2 progress', short: 'End of term 2', dateLabel: '7 Jun 2027' },
];

const ALL_EXAMS = [PLACEMENT, ...SERIES];
// Prototipteki "both" planı: placement + progress serisi, şu an açık olan p3
const OPEN_EXAM_ID = 'p3';
const OPEN_EXAM_CLOSES_SHORT = 'Closes 14 Feb';
const PROVISIONAL_LEVEL: CefrLevel = 'B1+';

// Tamamlanmış testlerin seviyeleri (sunucudaki geçmiş)
const history: Record<string, CefrLevel> = { pl: 'A2+', p1: 'A2+', p2: 'B1' };

const SCALE_SCORE: Partial<Record<CefrLevel, number>> = { A2: 44, 'A2+': 52, B1: 58, 'B1+': 66 };
// Her seviyenin başladığı ölçek puanı
const THRESHOLDS = [0, 30, 40, 48, 55, 63, 70, 75, 80, 90];

const DURATION_SECONDS = 60 * 60;

const PASSAGE: Passage = {
  id: 'mill-street',
  title: 'The Garden on Mill Street',
  paragraphs: [
    { n: '1', text: 'Five years ago, the empty lot on Mill Street was full of rubbish. Then a retired teacher, Ana Ruiz, asked her neighbours a simple question: what if we grew something here?' },
    { n: '2', text: 'The first summer was hard. The soil was poor and only a few plants managed to thrive. But more people joined every week, bringing seeds, tools and advice.' },
    { n: '3', text: 'Today the garden feeds twenty families. Children from the nearby school visit every Friday, and the council has asked Ana to help start two more gardens in the city.' },
  ],
};

const RECORDING_1 = { id: 'rec-1', title: 'Recording 1', subtitle: 'Two-person dialogue', maxPlays: 2, url: null, durationSeconds: 17 };

type ItemDef = Omit<ChoiceItem, 'audio'> & { audio: Omit<AudioClip, 'playsUsed'> | null };

const KEYS = ['A', 'B', 'C', 'D'];
const options = (texts: string[]) => texts.map((text, i) => ({ key: KEYS[i], text }));

const CHOICE_ITEMS: ItemDef[] = [
  { kind: 'choice', id: 'i1', skill: 'Language use', instruction: 'Choose the option that fills the gap.', stem: 'If I ___ more time, I would learn to play the guitar.', imageLabel: null, passage: null, audio: null, options: options(['had', 'have', 'would have', 'having']) },
  { kind: 'choice', id: 'i2', skill: 'Language use', instruction: 'Choose the option that fills the gap.', stem: 'The museum was so ___ that we stayed there all day.', imageLabel: null, passage: null, audio: null, options: options(['boring', 'crowded', 'fascinating', 'tiring']) },
  { kind: 'choice', id: 'i3', skill: 'Language use', instruction: 'Look at the picture and choose the correct sentence.', stem: 'What is the man doing?', imageLabel: 'Image: man repairing a bicycle', passage: null, audio: null, options: options(["He's repairing a bicycle.", "He's riding a bicycle.", 'He repaired a car.', "He's buying a bicycle."]) },
  { kind: 'choice', id: 'i4', skill: 'Reading', instruction: 'Answer based on the text.', stem: 'What is the main purpose of the text?', imageLabel: null, passage: PASSAGE, audio: null, options: options(['To explain how a neighbourhood space started', 'To advertise a new shop', 'To complain about the council', 'To give tips for growing vegetables']) },
  { kind: 'choice', id: 'i5', skill: 'Reading', instruction: 'Answer based on the text.', stem: 'In paragraph 2, the word "thrive" is closest in meaning to…', imageLabel: null, passage: PASSAGE, audio: null, options: options(['grow well', 'disappear', 'be sold', 'stay small']) },
  { kind: 'choice', id: 'i6', skill: 'Listening', instruction: 'Listen to the recording and answer.', stem: 'Where are the two speakers?', imageLabel: null, passage: null, audio: RECORDING_1, options: options(['At a train station', 'In a library', 'At a cinema', 'In a café']) },
  { kind: 'choice', id: 'i7', skill: 'Listening', instruction: 'Listen to the recording and answer.', stem: 'What time will they meet?', imageLabel: null, passage: null, audio: RECORDING_1, options: options(['6:15', '6:50', '7:15', '7:50']) },
];

const WRITING_TASK: Omit<WritingTask, 'draft'> = {
  kind: 'writing', id: 'w1', skill: 'Writing', title: 'Your favourite place in town',
  prompt: 'Describe it and explain why you like it.', minWords: 80, maxWords: 120,
};

const SPEAKING_TASK: SpeakingTask = {
  kind: 'speaking', id: 's1', skill: 'Speaking', title: 'Describe the picture.',
  prompt: 'What are the people doing, and how do they feel?', imageLabel: 'Image: family having a picnic in the park',
  maxSeconds: 60,
};

const SECTIONS: SectionInfo[] = [
  { key: 'choice', label: 'Multiple choice', weight: 4 },
  { key: 'writing', label: 'Writing', weight: 1 },
  { key: 'speaking', label: 'Speaking', weight: 1 },
];

const SAMPLE_TEXT = 'My favourite place in my town is the old harbour. In the morning it is very quiet and I can hear the boats and the birds. There is a small café near the water where my grandfather and I drink tea on Sundays. I like it because it feels calm and I can think about my week.';

// --- Oturum durumu -------------------------------------------------------------------------------

interface Session {
  id: string;
  examId: string;
  status: 'active' | 'paused' | 'finished';
  // Kalan süre, son "active" başlangıcı anındaki değer
  remainingAtResume: number;
  activeSince: number | null;
  // 0..CHOICE_ITEMS.length-1 çoktan seçmeli, sonra writing, sonra speaking
  position: number;
  answers: Record<string, string>;
  plays: Record<string, number>;
  writingDraft: string;
  writingText: string | null;
  speakingRecorded: boolean | null;
  events: (SecurityEvent & { at: number })[];
}

const sessions = new Map<string, Session>();
let completedOpenExam = false;

const WRITING_POSITION = CHOICE_ITEMS.length;
const SPEAKING_POSITION = CHOICE_ITEMS.length + 1;

const delay = (ms = 250 + Math.random() * 200) => new Promise((resolve) => setTimeout(resolve, ms));

const examDef = (id: string) => {
  const def = ALL_EXAMS.find((e) => e.id === id);
  if (!def) throw new Error(`Exam not found: ${id}`);
  return def;
};

const levelOf = (id: string): CefrLevel | null => (id === OPEN_EXAM_ID && completedOpenExam ? PROVISIONAL_LEVEL : history[id] ?? null);

const isDone = (id: string) => levelOf(id) !== null;

const changeText = (level: CefrLevel, prev: CefrLevel) => {
  const d = CEFR_LEVELS.indexOf(level) - CEFR_LEVELS.indexOf(prev);
  if (d > 0) return `↑ ${d} ${d > 1 ? 'steps' : 'step'} from ${prev}`;
  if (d < 0) return `↓ from ${prev}`;
  return `Same as ${prev}`;
};

const activeSessionFor = (examId: string) =>
  [...sessions.values()].find((s) => s.examId === examId && s.status !== 'finished') ?? null;

const remainingOf = (s: Session) => {
  if (s.status !== 'active' || s.activeSince === null) return Math.max(0, Math.round(s.remainingAtResume));
  return Math.max(0, Math.round(s.remainingAtResume - (Date.now() - s.activeSince) / 1000));
};

const finish = (s: Session) => {
  s.remainingAtResume = remainingOf(s);
  s.status = 'finished';
  s.activeSince = null;
  if (s.examId === OPEN_EXAM_ID) completedOpenExam = true;
};

// Süre dolduysa oturumu kapatır; her istekte önce bu çalışır (sunucu otoritesi)
const expireIfNeeded = (s: Session) => {
  if (s.status === 'active' && remainingOf(s) <= 0) finish(s);
};

const getSession = (sessionId: string) => {
  const s = sessions.get(sessionId);
  if (!s) throw new Error(`Session not found: ${sessionId}`);
  expireIfNeeded(s);
  return s;
};

const snapshot = (s: Session): SessionSnapshot => {
  const def = examDef(s.examId);
  const base = {
    sessionId: s.id,
    examId: s.examId,
    examTitle: def.title,
    status: s.status,
    remainingSeconds: remainingOf(s),
    sections: SECTIONS,
    answeredCount: Object.keys(s.answers).length + (s.writingText !== null ? 1 : 0) + (s.speakingRecorded !== null ? 1 : 0),
    exitCount: s.events.filter((e) => e.type === 'app_background' || e.type === 'app_inactive' || e.type === 'window_resized').length,
  };

  if (s.status === 'finished') {
    return { ...base, currentSection: 'speaking', itemNumber: 1, item: null };
  }
  if (s.position < WRITING_POSITION) {
    const def = CHOICE_ITEMS[s.position];
    const audio = def.audio ? { ...def.audio, playsUsed: s.plays[def.audio.id] ?? 0 } : null;
    return { ...base, currentSection: 'choice', itemNumber: s.position + 1, item: { ...def, audio } };
  }
  if (s.position === WRITING_POSITION) {
    return { ...base, currentSection: 'writing', itemNumber: 1, item: { ...WRITING_TASK, draft: s.writingDraft } };
  }
  return { ...base, currentSection: 'speaking', itemNumber: 1, item: SPEAKING_TASK };
};

// --- Uç noktalar ---------------------------------------------------------------------------------

export async function getAssignments(): Promise<AssignmentsData> {
  await delay();
  const open = completedOpenExam ? [] : [examDef(OPEN_EXAM_ID)];
  const doneIds = ALL_EXAMS.map((e) => e.id).filter(isDone);

  const completed: CompletedExam[] = doneIds
    .map((id, i) => {
      const def = examDef(id);
      const level = levelOf(id)!;
      const prev = i > 0 ? levelOf(doneIds[i - 1]) : null;
      return {
        id,
        typeLabel: def.typeLabel,
        title: def.title,
        completedLabel: `Completed ${def.dateLabel}`,
        level,
        status: id === OPEN_EXAM_ID ? 'Provisional' : 'Confirmed',
        change: prev ? changeText(level, prev) : null,
      } satisfies CompletedExam;
    })
    .reverse();

  return {
    open: open.map((def) => {
      const active = activeSessionFor(def.id);
      return {
        id: def.id,
        kind: def.kind,
        typeLabel: def.typeLabel,
        title: def.title,
        closesLabel: def.closesLabel ?? '',
        durationMinutes: DURATION_SECONDS / 60,
        singleAttempt: true,
        sessionState: active ? active.status === 'paused' ? 'paused' : 'active' : 'none',
      };
    }),
    series: {
      title: 'Progress tests · 2026–27',
      items: SERIES.map((def) => {
        const level = levelOf(def.id);
        const state = level ? 'done' : def.id === OPEN_EXAM_ID ? 'open' : 'upcoming';
        return {
          id: def.id,
          short: def.short,
          state,
          meta: state === 'done' ? `Level ${level}` : state === 'open' ? OPEN_EXAM_CLOSES_SHORT : `Opens ${def.dateLabel}`,
        };
      }),
    },
    completed,
  };
}

export async function getExamDetail(examId: string): Promise<ExamDetail> {
  await delay();
  const def = examDef(examId);
  const active = activeSessionFor(examId);
  const isPlacement = def.kind === 'placement';
  const seriesIndex = SERIES.findIndex((e) => e.id === examId);
  const lastLevel = seriesIndex > 0 ? levelOf(SERIES[seriesIndex - 1].id) : null;

  return {
    id: def.id,
    kind: def.kind,
    typeLabel: def.typeLabel,
    kicker: isPlacement ? 'Placement test · Level check' : `Progress test · ${seriesIndex + 1} of ${SERIES.length}`,
    title: def.title,
    description: isPlacement
      ? 'Questions adapt to your answers. The test ends on its own once your level is clear, so the total number of questions is not shown.'
      : `Questions start near your last level${lastLevel ? ` (${lastLevel})` : ''} and adapt to your answers. You won’t see a question twice.`,
    teacherNote: 'Put on your headphones and take the test somewhere quiet.',
    rules: [
      { title: '60 minutes', detail: 'The timer starts when you tap Start.' },
      { title: 'No going back', detail: 'One question at a time. Answer to continue.' },
      { title: 'Recordings play twice', detail: 'Plays are counted on the server.' },
      { title: 'Writing and speaking last', detail: 'One task each. Empty tasks score 0.' },
      { title: 'Leaving pauses the timer', detail: 'Resume from the same question.' },
      { title: 'Secure mode', detail: 'No copy or paste. Exits are recorded.' },
    ],
    durationMinutes: DURATION_SECONDS / 60,
    needsHeadphones: true,
    needsMicrophone: true,
    sessionState: active ? active.status === 'paused' ? 'paused' : 'active' : 'none',
  };
}

// Açık bir oturum varsa onu döndürür (devam), yoksa yenisini başlatır. Tek deneme hakkı: bitmiş sınav başlatılamaz.
export async function startOrResumeSession(examId: string): Promise<SessionSnapshot> {
  await delay();
  if (isDone(examId)) throw new Error('This test has already been completed.');

  const existing = activeSessionFor(examId);
  if (existing) {
    expireIfNeeded(existing);
    return snapshot(existing);
  }

  const s: Session = {
    id: `sess-${Date.now()}`,
    examId,
    status: 'active',
    remainingAtResume: DURATION_SECONDS,
    activeSince: Date.now(),
    position: 0,
    answers: {},
    plays: {},
    writingDraft: '',
    writingText: null,
    speakingRecorded: null,
    events: [],
  };
  sessions.set(s.id, s);
  return snapshot(s);
}

export async function getSnapshot(sessionId: string): Promise<SessionSnapshot> {
  await delay(120);
  return snapshot(getSession(sessionId));
}

export async function pauseSession(sessionId: string): Promise<SessionSnapshot> {
  await delay(120);
  const s = getSession(sessionId);
  if (s.status === 'active') {
    s.remainingAtResume = remainingOf(s);
    s.status = 'paused';
    s.activeSince = null;
  }
  return snapshot(s);
}

export async function resumeSession(sessionId: string): Promise<SessionSnapshot> {
  await delay(120);
  const s = getSession(sessionId);
  if (s.status === 'paused') {
    s.status = 'active';
    s.activeSince = Date.now();
  }
  return snapshot(s);
}

const assertActive = (s: Session) => {
  if (s.status === 'finished') throw new Error('Time is up. The test has been submitted.');
  if (s.status === 'paused') throw new Error('The test is paused.');
};

export async function answerChoice(sessionId: string, itemId: string, key: string): Promise<SessionSnapshot> {
  await delay();
  const s = getSession(sessionId);
  if (s.status === 'finished') return snapshot(s);
  assertActive(s);
  const current = CHOICE_ITEMS[s.position];
  // Geri dönüş yok: yalnızca o anki soruya cevap kabul edilir
  if (!current || current.id !== itemId) throw new Error('This question is no longer available.');
  s.answers[itemId] = key;
  s.position += 1;
  return snapshot(s);
}

// Dinleme hakkını sunucuda düşer; hak kalmadıysa reddeder
export async function registerPlay(sessionId: string, audioId: string): Promise<{ playsUsed: number; maxPlays: number }> {
  await delay(150);
  const s = getSession(sessionId);
  assertActive(s);
  const used = s.plays[audioId] ?? 0;
  if (used >= RECORDING_1.maxPlays) throw new Error('No plays left for this recording.');
  s.plays[audioId] = used + 1;
  return { playsUsed: used + 1, maxPlays: RECORDING_1.maxPlays };
}

export async function saveWritingDraft(sessionId: string, taskId: string, text: string): Promise<void> {
  await delay(150);
  const s = getSession(sessionId);
  if (s.status === 'finished' || s.position !== WRITING_POSITION || taskId !== WRITING_TASK.id) return;
  s.writingDraft = text;
}

// text null ise görev boş geçildi (0 puan)
export async function submitWriting(sessionId: string, taskId: string, text: string | null): Promise<SessionSnapshot> {
  await delay();
  const s = getSession(sessionId);
  if (s.status === 'finished') return snapshot(s);
  assertActive(s);
  if (s.position !== WRITING_POSITION || taskId !== WRITING_TASK.id) throw new Error('This task is no longer available.');
  s.writingText = text ?? '';
  s.position = SPEAKING_POSITION;
  return snapshot(s);
}

// TODO: Gerçek kayıt dosyası (uri) yüklenecek. recorded false ise görev boş geçildi.
export async function submitSpeaking(sessionId: string, taskId: string, recorded: boolean): Promise<SessionSnapshot> {
  await delay();
  const s = getSession(sessionId);
  if (s.status === 'finished') return snapshot(s);
  assertActive(s);
  if (s.position !== SPEAKING_POSITION || taskId !== SPEAKING_TASK.id) throw new Error('This task is no longer available.');
  s.speakingRecorded = recorded;
  finish(s);
  return snapshot(s);
}

export async function logSecurityEvent(sessionId: string, event: SecurityEvent): Promise<void> {
  await delay(80);
  const s = sessions.get(sessionId);
  if (!s) return;
  s.events.push({ ...event, at: Date.now() });
  if (__DEV__) console.log('[mock exam] security event', event);
}

export async function getResult(examId: string): Promise<ExamResult> {
  await delay();
  const level = levelOf(examId);
  if (!level) throw new Error('This test has not been completed yet.');
  const session = [...sessions.values()].find((s) => s.examId === examId && s.status === 'finished');
  const provisional = examId === OPEN_EXAM_ID;
  return {
    examId,
    typeLabel: examDef(examId).typeLabel,
    level,
    status: provisional ? 'Provisional' : 'Confirmed',
    summary: 'You give reasons and follow longer texts.',
    note: provisional
      ? 'Writing and speaking are still being assessed. Your level will be confirmed automatically when they are done; you don’t need to do anything.'
      : null,
    scaleScore: SCALE_SCORE[level] ?? 60,
    answeredCount: session ? snapshot(session).answeredCount : 0,
  };
}

export async function getReport(examId: string): Promise<ExamReport> {
  await delay();
  const def = examDef(examId);
  const level = levelOf(examId);
  if (!level) throw new Error('This test has not been completed yet.');
  const li = CEFR_LEVELS.indexOf(level);
  const next = CEFR_LEVELS[li + 1];

  return {
    examId,
    typeLabel: def.typeLabel.replace(' test', ''),
    title: def.title,
    dateLabel: def.dateLabel,
    level,
    status: examId === OPEN_EXAM_ID ? 'Provisional' : 'Confirmed',
    summary: 'You give reasons and follow longer texts.',
    scaleScore: SCALE_SCORE[level] ?? 60,
    nextLevel: next ? `${next} · ${THRESHOLDS[li + 1]}` : '—',
    skills: [
      { skill: 'Language use', level: 'B1+', meta: '9 / 12 correct' },
      { skill: 'Reading', level: 'B2', meta: '7 / 8 correct' },
      { skill: 'Listening', level: 'B1', meta: '5 / 8 correct' },
      { skill: 'Writing', level: 'B1', meta: 'Score 58' },
      { skill: 'Speaking', level: 'B1+', meta: 'Score 64' },
    ],
    hardestAreas: 'conditionals, numbers and times.',
    feedback: [
      {
        title: 'Writing', level: 'B1', score: '58 / 100',
        strengths: ['Clear opening and conclusion.', 'Accurate everyday vocabulary.'],
        improvements: ['Link ideas with because, although.', 'Keep past tense consistent.'],
        sourceLabel: 'Your text', source: SAMPLE_TEXT,
      },
      {
        title: 'Speaking', level: 'B1+', score: '64 / 100',
        strengths: ['Detailed, well-ordered description.', 'Few long pauses for your level.'],
        improvements: ['Use more adjectives for feelings.', 'Practise the “th” sound.'],
        sourceLabel: 'Transcript of your recording',
        source: 'In the picture there is a family in the park. They are having a picnic and the children are playing with a ball. I think they feel happy because the weather is sunny…',
      },
    ],
    hasProgress: true,
  };
}

export async function getProgressReport(): Promise<ProgressReport> {
  await delay();
  const done = ALL_EXAMS.filter((e) => isDone(e.id));
  const base = done[0] ?? null;
  const last = done[done.length - 1] ?? null;
  const baseLevel = base ? levelOf(base.id)! : null;
  const lastLevel = last ? levelOf(last.id)! : null;
  const steps = baseLevel && lastLevel ? CEFR_LEVELS.indexOf(lastLevel) - CEFR_LEVELS.indexOf(baseLevel) : 0;

  return {
    title: 'Progress over time · 2026–27',
    note: done.length < 2
      ? 'One test so far. Your next progress test adds the first comparison.'
      : 'Measured from your placement test, on the same scale.',
    baseline: base && baseLevel ? { level: baseLevel, short: base.short } : null,
    latest: last && lastLevel ? { level: lastLevel, short: last.short } : null,
    steps,
    points: ALL_EXAMS.map((def) => {
      const level = levelOf(def.id);
      const prevDone = done[done.indexOf(def) - 1];
      const isOpen = !level && def.id === OPEN_EXAM_ID;
      return {
        id: def.id,
        short: def.short,
        dateLabel: level ? def.dateLabel : isOpen ? 'Open now' : `Opens ${def.dateLabel}`,
        level,
        isOpen,
        change: !level ? '' : prevDone ? changeText(level, levelOf(prevDone.id)!) : 'Baseline',
      };
    }),
  };
}
