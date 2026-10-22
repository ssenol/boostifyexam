import { API_ENDPOINTS, apiGet, apiPost } from "../config/api";
import type {
  AssignedExam,
  AudioPlay,
  Certificate,
  CertificateStatus,
  EventVerdict,
  ExamEventType,
  ExamList,
  ResultReport,
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

// Writing teslimi (düz JSON) ya da kayıt olmadan speaking: öğrenci bilerek geçti (skipped, 0 puan) ya da mikrofon
// çalışmadı (technical, puanlamadan çıkarılır)
interface ProductiveBody {
  itemId: string;
  step: number;
  text?: string;
  skipped?: boolean;
  technical?: boolean;
}

export interface SpeakingRecording {
  itemId: string;
  step: number;
  // Kayıt dosyası (file://…m4a)
  fileUri: string;
  durationSec: number;
  // Öğrencinin onayladığı metin; metne çevrilemediyse boş
  transcript: string;
  transcriptEdited: boolean;
}

export interface Transcription {
  transcript: string;
  failed: boolean;
}

// Ses yüklemesi zayıf bağlantıda uzun sürebilir
const UPLOAD_TIMEOUT_MS = 90000;

// Dosya adının uzantısı doğru olmalı: bazı Android cihazlar türü application/octet-stream gönderir, sunucu o zaman
// uzantıya bakar. Content-Type'ı (boundary) HTTP kütüphanesi koyar.
function audioFile(uri: string) {
  const name = uri.split("/").pop() || "recording.m4a";
  return { uri, name: name.includes(".") ? name : `${name}.m4a`, type: "audio/mp4" } as unknown as Blob;
}

const multipart = { headers: { "Content-Type": "multipart/form-data" }, timeout: UPLOAD_TIMEOUT_MS };

const unwrapState = async (request: Promise<{ state: SessionState }>) => (await request).state;

// Sınav servisi (rehber: …/mobile/exam). Sınavın mantığı sunucudadır: her çağrı güncel state'i döner, ekran onu çizer.
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

  // --- Writing / speaking --------------------------------------------------------------------------

  // Writing teslimi (JSON, en fazla 20.000 karakter) ya da kayıtsız teslim (skipped / technical)
  submitProductive(sessionId: string, body: ProductiveBody): Promise<SessionState> {
    return unwrapState(apiPost(API_ENDPOINTS.productive(sessionId), body));
  }

  // Kaydı metne çevirir (dakikada 6). Sadece ekrandaki, henüz teslim edilmemiş speaking görevi için (aksi halde
  // 409 not_open).
  transcribe(sessionId: string, itemId: string, fileUri: string): Promise<Transcription> {
    const form = new FormData();
    form.append("itemId", itemId);
    form.append("file", audioFile(fileUri));
    return apiPost<Transcription>(API_ENDPOINTS.transcribe(sessionId), form, multipart);
  }

  // Speaking teslimi (multipart). Hatalar: 400 bad_upload, 413 audio_too_large, 415 unsupported_audio, 409 not_open.
  submitRecording(sessionId: string, recording: SpeakingRecording): Promise<SessionState> {
    const form = new FormData();
    form.append("itemId", recording.itemId);
    form.append("step", String(recording.step));
    form.append("file", audioFile(recording.fileUri));
    form.append("durationSec", String(recording.durationSec));
    if (recording.transcript) form.append("transcript", recording.transcript);
    form.append("transcriptEdited", String(recording.transcriptEdited));
    return unwrapState(apiPost(API_ENDPOINTS.productive(sessionId), form, multipart));
  }

  // --- Rapor ve sertifika ------------------------------------------------------------------------

  // Hatalar: 409 not_finished (deneme bitmemiş), 404 result_not_found. Soruların kendisi ve doğru cevaplar yoktur.
  getReport(sessionId: string): Promise<{ report: ResultReport; certificate: CertificateStatus }> {
    return apiGet(API_ENDPOINTS.result(sessionId));
  }

  // Hazır değilken 409 certificate_not_ready (details.reason: evaluating | no_level)
  getCertificate(sessionId: string): Promise<Certificate> {
    return apiGet<Certificate>(API_ENDPOINTS.certificate(sessionId));
  }
}

export default new ExamService();
