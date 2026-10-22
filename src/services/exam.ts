import { API_ENDPOINTS, apiGet, apiPost } from "../config/api";
import * as mock from "../mocks/examServer";
import type {
  AssignedExam,
  AudioPlay,
  EventVerdict,
  ExamEventType,
  ExamList,
  ResultSummary,
  SessionState,
} from "../types/exam";

interface AnswerBody {
  itemId: string;
  answerKey: string;
  // state.step aynen
  step: number;
  // Soru ekranda kaç saniye kaldı (raporlar için)
  timeSec: number;
}

interface EventBody {
  type: ExamEventType;
  // tabSwitch: uzakta kalınan süre
  seconds?: number;
  itemId?: string;
  draftText?: string;
}

const unwrapState = async (request: Promise<{ state: SessionState }>) => (await request).state;

// Sınav servisi (rehber: …/mobile/exam). Sınavın mantığı sunucudadır: her çağrı güncel state'i döner, ekran onu çizer.
// Writing / speaking teslimi (Aşama 5), sonuç ve rapor (Aşama 6) henüz sahte sunucuda.
class ExamService {
  // Sınav listesi: kartlardaki düğmeyi her sınavın action alanı belirler
  getExams(): Promise<ExamList> {
    return apiGet<ExamList>(API_ENDPOINTS.exams);
  }

  // Tek sınav kartı (derin bağlantı vb.). Atanmamışsa 404 not_found.
  async getExam(assignmentId: string): Promise<AssignedExam> {
    const data = await apiGet<{ exam: AssignedExam }>(API_ENDPOINTS.exam(assignmentId));
    return data.exam;
  }

  // Biten sınavlar, en yeni en üstte
  async getResults(): Promise<ResultSummary[]> {
    const data = await apiGet<{ results: ResultSummary[] }>(API_ENDPOINTS.results);
    return data.results;
  }

  // --- Oturum -------------------------------------------------------------------------------------

  // İlk çağrıda deneme oluşturulur, yarım kalmış deneme varsa kaldığı yerden açılır ("Başla" ve "Devam et" aynı).
  // Hatalar: 403 not_assigned, 409 not_started, 409 closed.
  start(assignmentId: string): Promise<SessionState> {
    return unwrapState(apiPost(API_ENDPOINTS.start(assignmentId)));
  }

  // Ekranı tazeler; saati başlatmaz (duraklatılmış deneme bir cevap gönderilince devam eder)
  getSession(sessionId: string): Promise<SessionState> {
    return unwrapState(apiGet(API_ENDPOINTS.session(sessionId)));
  }

  // Tekrar göndermek güvenli: cevap zaten kaydedildiyse step uyuşmaz ve sunucu sadece güncel state'i döner
  answer(sessionId: string, body: AnswerBody): Promise<SessionState> {
    return unwrapState(apiPost(API_ENDPOINTS.answer(sessionId), body));
  }

  // Her çağrı bir dinleme hakkı düşer. Hatalar: 409 no_plays_left, no_audio, wrong_audio.
  playAudio(sessionId: string, key: string): Promise<AudioPlay> {
    return apiPost<AudioPlay>(API_ENDPOINTS.audioPlay(sessionId), { key });
  }

  // 15 sn'de bir "buradayım"; writing'de taslak da gider
  heartbeat(sessionId: string, itemId: string, draftText?: string): Promise<SessionState> {
    return unwrapState(apiPost(API_ENDPOINTS.heartbeat(sessionId), { itemId, draftText }));
  }

  // "Sınavdan çık": saat durur, taslak kaydedilir. Kural ihlali sayılmaz.
  pause(sessionId: string, itemId: string, draftText?: string): Promise<SessionState> {
    return unwrapState(apiPost(API_ENDPOINTS.pause(sessionId), { itemId, draftText }));
  }

  // Sınav olayları; uyarı ya da bitirme kararını sunucu verir
  sendEvent(sessionId: string, body: EventBody): Promise<EventVerdict> {
    return apiPost<EventVerdict>(API_ENDPOINTS.events(sessionId), body);
  }

  // --- Sonuç ve raporlar (Aşama 6'ya kadar sahte sunucu) --------------------------------------------
  getResult = mock.getResult;
  getReport = mock.getReport;
  getProgressReport = mock.getProgressReport;
}

export default new ExamService();
