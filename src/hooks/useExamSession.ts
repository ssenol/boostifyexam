import { useCallback, useEffect, useRef, useState } from 'react';
import examService from '../services/exam';
import type { SecurityEvent, SessionSnapshot } from '../types/exam';
import { getErrorMessage } from '../utils/errors';

export type SaveState = 'saved' | 'saving' | 'offline';

const DRAFT_SAVE_DELAY_MS = 800;

// Sınav oturumunun sunucu tarafıyla konuşan kısmı. Süreye, soru sırasına ve dinleme haklarına sunucu karar verir;
// bu hook yalnızca sunucunun son görüntüsünü (snapshot) tutar ve kalan süreyi gösterim için yerelde geri sayar.
export default function useExamSession(examId: string) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Cevap gönderiliyor; bu sırada ikinci gönderim engellenir
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const snapshotRef = useRef<SessionSnapshot | null>(null);
  // İstekler sırayla gider: "pause" ile hemen ardından gelen "resume" birbirini geçmemeli
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiring = useRef(false);

  const apply = useCallback((next: SessionSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    setRemaining(next.remainingSeconds);
  }, []);

  // State yalnızca await'ten sonra değişir; ilk yüklemede effect'ten güvenle çağrılabilir
  const fetchSession = useCallback(async () => {
    try {
      apply(await examService.startOrResumeSession(examId));
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [apply, examId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Sunucuya giden her işlem: bağlantı durumunu günceller, sunucunun yeni görüntüsünü uygular
  const run = useCallback(
    (request: (sessionId: string) => Promise<SessionSnapshot>) => {
      const task = queue.current.catch(() => {}).then(async () => {
        const current = snapshotRef.current;
        if (!current) return null;
        setSaveState('saving');
        try {
          const next = await request(current.sessionId);
          apply(next);
          setSaveState('saved');
          return next;
        } catch (e) {
          setSaveState('offline');
          throw e;
        }
      });
      queue.current = task;
      return task;
    },
    [apply],
  );

  const submit = useCallback(
    async (request: (sessionId: string) => Promise<SessionSnapshot>) => {
      if (busy) return null;
      setBusy(true);
      try {
        return await run(request);
      } finally {
        setBusy(false);
      }
    },
    [busy, run],
  );

  // Geri sayım yalnızca gösterim; 0'a inince oturumun durumu sunucudan alınır (süre dolunca sunucu kapatır)
  const isActive = snapshot?.status === 'active';
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || remaining > 0 || expiring.current) return;
    expiring.current = true;
    run((id) => examService.getSnapshot(id))
      .catch(() => {})
      .finally(() => {
        expiring.current = false;
      });
  }, [isActive, remaining, run]);

  const answerChoice = useCallback(
    (itemId: string, key: string) => submit((id) => examService.answerChoice(id, itemId, key)),
    [submit],
  );

  const submitWriting = useCallback(
    (taskId: string, text: string | null) => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
      return submit((id) => examService.submitWriting(id, taskId, text));
    },
    [submit],
  );

  const submitSpeaking = useCallback(
    (taskId: string, recorded: boolean) => submit((id) => examService.submitSpeaking(id, taskId, recorded)),
    [submit],
  );

  const pause = useCallback(() => run((id) => examService.pauseSession(id)), [run]);
  const resume = useCallback(() => run((id) => examService.resumeSession(id)), [run]);

  // Dinleme hakkı sunucuda düşülür; true dönerse çalmaya başlanabilir
  const registerPlay = useCallback(async (audioId: string) => {
    const current = snapshotRef.current;
    if (!current) return null;
    try {
      return await examService.registerPlay(current.sessionId, audioId);
    } catch {
      return null;
    }
  }, []);

  // Yazma taslağı yazmayı bıraktıktan kısa süre sonra kaydedilir ("saved automatically")
  const saveDraft = useCallback((taskId: string, text: string) => {
    const current = snapshotRef.current;
    if (!current) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    setSaveState('saving');
    draftTimer.current = setTimeout(() => {
      examService
        .saveWritingDraft(current.sessionId, taskId, text)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('offline'));
    }, DRAFT_SAVE_DELAY_MS);
  }, []);

  useEffect(() => () => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
  }, []);

  // Güvenlik olayları sınavı durdurmamalı; gönderilemezse sessizce geçilir
  const logEvent = useCallback((event: SecurityEvent) => {
    const current = snapshotRef.current;
    if (!current) return;
    examService.logSecurityEvent(current.sessionId, event).catch(() => {});
  }, []);

  return {
    snapshot,
    remaining,
    loading,
    error,
    busy,
    saveState,
    reload: load,
    answerChoice,
    submitWriting,
    submitSpeaking,
    pause,
    resume,
    registerPlay,
    saveDraft,
    logEvent,
  };
}
