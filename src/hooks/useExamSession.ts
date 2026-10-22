import { useCallback, useEffect, useRef, useState } from 'react';
import examService from '../services/exam';
import type { AudioPlay, EventVerdict, ExamEventType, SessionState } from '../types/exam';
import { getErrorMessage, toApiError } from '../utils/errors';

export type SaveState = 'saved' | 'saving' | 'offline';

const HEARTBEAT_MS = 15_000;
// currentItem boş ama sınav bitmemişse durum bu kadar sonra yeniden istenir
const EMPTY_ITEM_RETRY_MS = 1_500;
// Ağ hatasında aynı istek bu kadar kez daha denenir (1 sn, 2 sn arayla)
const NETWORK_RETRIES = 2;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Aynı sınav için devam eden başlatma isteği. İlk start denemeyi oluşturur; ekran iki kez bağlanırsa (geliştirmede
// React bileşeni çift çalıştırabilir) iki istek yarışıp iki deneme oluşturmasın diye aynı istek paylaşılır.
const startsInFlight = new Map<string, Promise<SessionState>>();

function startOnce(assignmentId: string): Promise<SessionState> {
  let request = startsInFlight.get(assignmentId);
  if (!request) {
    request = examService.start(assignmentId).finally(() => startsInFlight.delete(assignmentId));
    startsInFlight.set(assignmentId, request);
  }
  return request;
}

// Cevap gelmezse aynı gövdeyle tekrar denemek güvenli: sunucu step uyuşmazsa ikinci kez kaydetmez
async function withRetry<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (e) {
      if (!toApiError(e).isNetworkError || attempt >= NETWORK_RETRIES) throw e;
      await delay(1000 * (attempt + 1));
    }
  }
}

// Sınav oturumu. Sınavın mantığı sunucudadır: hook sunucunun son state'ini tutar, öğrencinin yaptığını gönderir ve
// kalan süreyi yalnızca gösterim için geri sayar. Uygulama soru sırası, puan ya da bölüm geçişi hesaplamaz.
export default function useExamSession(assignmentId: string) {
  const [state, setState] = useState<SessionState | null>(null);
  // Gösterim için geri sayılan kalan süre; null = süre yok
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Cevap gönderiliyor; çift dokunma ikinci istek göndermesin
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const stateRef = useRef<SessionState | null>(null);
  const busyRef = useRef(false);
  // İstekler sırayla gider: cevap, pause, olay ve yenileme birbirini geçmez
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // Writing ekranındaki taslak (Aşama 5): heartbeat ve pause ile gider
  const draftRef = useRef<string | undefined>(undefined);

  const apply = useCallback((next: SessionState) => {
    stateRef.current = next;
    setState(next);
    setRemaining(next.remainingSec);
  }, []);

  // "Başla" ve "Devam et" aynı istek: deneme yoksa oluşturulur, varsa kaldığı yerden açılır
  const open = useCallback(
    () =>
      startOnce(assignmentId)
        .then((next) => {
          apply(next);
          setError(null);
        })
        .catch((e) => setError(getErrorMessage(e)))
        .finally(() => setLoading(false)),
    [apply, assignmentId],
  );

  useEffect(() => {
    open();
  }, [open]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    return open();
  }, [open]);

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const next = queue.current.catch(() => {}).then(task);
    queue.current = next;
    return next;
  }, []);

  // State döndüren istek: bağlantı durumunu günceller, dönen state'i uygular
  const run = useCallback(
    (request: (sessionId: string) => Promise<SessionState>) =>
      enqueue(async () => {
        const current = stateRef.current;
        if (!current) return null;
        setSaveState('saving');
        try {
          const next = await withRetry(() => request(current.sessionId));
          apply(next);
          setSaveState('saved');
          return next;
        } catch (e) {
          setSaveState(toApiError(e).isNetworkError ? 'offline' : 'saved');
          throw e;
        }
      }),
    [apply, enqueue],
  );

  const refresh = useCallback(() => run((id) => examService.getSession(id)), [run]);

  // Dönen state beklenenden farklı olabilir (ör. cevap zaten kaydedilmişti); her zaman dönen state çizilir
  const answer = useCallback(
    async (itemId: string, answerKey: string, timeSec: number) => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);
      try {
        return await run((id) =>
          examService.answer(id, { itemId, answerKey, step: stateRef.current?.step ?? 0, timeSec }),
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [run],
  );

  // "Sınavdan çık": saat durur, taslak kaydedilir
  const pause = useCallback(
    () => run((id) => examService.pause(id, stateRef.current?.currentItem?.id ?? '', draftRef.current)),
    [run],
  );

  // Dinleme hakkı sunucuda düşülür; hatayı (no_plays_left vb.) çağıran ele alır
  const playAudio = useCallback((key: string): Promise<AudioPlay> => {
    const current = stateRef.current;
    if (!current) return Promise.reject(new Error('No session'));
    return examService.playAudio(current.sessionId, key);
  }, []);

  // Sınav olayı; kararı sunucu verir. terminate'te dönen state (phase = done) uygulanır.
  const sendEvent = useCallback(
    (type: ExamEventType, seconds?: number) =>
      enqueue(async (): Promise<EventVerdict | null> => {
        const current = stateRef.current;
        if (!current) return null;
        const verdict = await withRetry(() =>
          examService.sendEvent(current.sessionId, {
            type,
            seconds,
            itemId: current.currentItem?.id,
            draftText: draftRef.current,
          }),
        );
        if (verdict.state) apply(verdict.state);
        return verdict;
      }),
    [apply, enqueue],
  );

  const setDraft = useCallback((text: string | undefined) => {
    draftRef.current = text;
  }, []);

  // Heartbeat: sınav ekranı açık ve deneme bitmemişken 15 sn'de bir. Yanıt yalnızca phase = done ise uygulanır:
  // yolda kalmış bir heartbeat ekranı az önce gönderilen cevabın gerisine döndürmemeli.
  const running = !!state && state.phase !== 'done';
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const current = stateRef.current;
      const itemId = current?.currentItem?.id;
      if (!current || !itemId || current.phase === 'done') return;
      examService
        .heartbeat(current.sessionId, itemId, draftRef.current)
        .then((next) => {
          setSaveState((s) => (s === 'offline' ? 'saved' : s));
          if (next.phase === 'done') apply(next);
        })
        .catch((e) => {
          if (toApiError(e).isNetworkError) setSaveState('offline');
        });
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [running, apply]);

  // Geri sayım yalnızca gösterim; paused iken durur. 0'a inince durum sunucuya sorulur: süresi biten denemeyi
  // sunucu kendisi kapatır (phase = done). Uygulama sınavı kendi başına bitirmez.
  const ticking = running && !state?.paused && remaining != null;
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setRemaining((r) => (r == null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  const expiring = useRef(false);
  useEffect(() => {
    if (!ticking || remaining !== 0 || expiring.current) return;
    expiring.current = true;
    refresh()
      .catch(() => {})
      .finally(() => {
        expiring.current = false;
      });
  }, [ticking, remaining, refresh]);

  // currentItem boş ama sınav bitmemiş: yükleniyor, kısa süre sonra yeniden sor
  useEffect(() => {
    if (!state || state.phase === 'done' || state.currentItem) return;
    const timer = setTimeout(() => refresh().catch(() => {}), EMPTY_ITEM_RETRY_MS);
    return () => clearTimeout(timer);
  }, [state, refresh]);

  return {
    state,
    remaining,
    loading,
    error,
    busy,
    saveState,
    reload,
    refresh,
    answer,
    pause,
    playAudio,
    sendEvent,
    setDraft,
  };
}
