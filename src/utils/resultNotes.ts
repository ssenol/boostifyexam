import type { ExamResultData } from '../types/exam';

// Rapor ve bitiş ekranındaki açıklamalar (webdeki kutuların öğrenciye uyarlanmış hali)
export function resultNotes(
  result: ExamResultData | null,
  opts: { timeUp: boolean; endedByRules: boolean },
): string[] {
  const notes: string[] = [];
  const noLevel = !result || result.noEvidence || result.insufficientEvidence || !result.cefrLevel;
  if (noLevel) {
    const answered = result?.itemsAnswered ?? 0;
    const needed = result?.minAnswersForLevel;
    notes.push(
      needed
        ? `Only ${answered} ${answered === 1 ? 'question was' : 'questions were'} answered (at least ${needed} are needed), so this test gave no level. Your previous level is unchanged.`
        : 'There weren’t enough answers to set a level. Your previous level is unchanged.',
    );
  }
  if (opts.endedByRules) {
    notes.push('Your test was ended because of the test rules. Your level is based on the answers you gave before that.');
  } else if (opts.timeUp) {
    notes.push('Time ran out. Your level is based on the answers you gave before that.');
  }
  return notes;
}
