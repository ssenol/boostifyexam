import * as mock from "../mocks/examServer";

// Sınav servisi. Backend API'si gelene kadar sahte sunucuyu (src/mocks/examServer.ts) çağırır.
// API gelince her metot `api` (src/config/api.ts) üzerinden ilgili endpoint'e bağlanır; ekranlar değişmez.
// Beklenen davranış: .claude/notes/sinav-akisi-ve-api-sozlesmesi.md
class ExamService {
  getAssignments = mock.getAssignments;
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
