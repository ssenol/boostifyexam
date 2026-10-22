import { API_ENDPOINTS, apiGet } from "../config/api";
import * as mock from "../mocks/examServer";
import type { AssignedExam, ExamList, ResultSummary } from "../types/exam";

// Sınav servisi. Listeler mobil sınav API'sine bağlı; Intro, oturum ve rapor metotları henüz sahte sunucuyu
// (src/mocks/examServer.ts) çağırıyor ve aşama aşama API'ye geçecek (.claude/notes/api-entegrasyon-plani.md).
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

  getExamDetail = mock.getExamDetail;

  // Oturum
  startOrResumeSession = mock.startOrResumeSession;
  getSnapshot = mock.getSnapshot;
  pauseSession = mock.pauseSession;
  resumeSession = mock.resumeSession;

  // Cevaplar
  answerChoice = mock.answerChoice;
  registerPlay = mock.registerPlay;
  saveWritingDraft = mock.saveWritingDraft;
  submitWriting = mock.submitWriting;
  submitSpeaking = mock.submitSpeaking;

  // Güvenlik olayları (arka plana geçme vb.); hata verse bile sınav akışını durdurmaz
  logSecurityEvent = mock.logSecurityEvent;

  // Sonuç ve raporlar
  getResult = mock.getResult;
  getReport = mock.getReport;
  getProgressReport = mock.getProgressReport;
}

export default new ExamService();
