// Mobil sınav API'sinin (…/mobile/exam) ortak tipleri.
// Kaynak: _calismalar/BoostifyExam Mobil Uygulama Geliştirici Rehberi.docx

// Başarılı yanıt: ekranın ihtiyacı olan her şey data içindedir
export interface ApiSuccess<T> {
  success: true;
  status_code: number;
  data: T;
}

// Hatalı yanıt: uygulama ne yapacağına error.code ile karar verir; message öğrenciye gösterilmez
export interface ApiErrorBody {
  success: false;
  status_code: number;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Öğrencinin ölçülmüş seviyesi; hiç sınava girmediyse null
export interface EnglishLevel {
  cefrLevel: string;
  measuredAt: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  name: string;
  lastName: string;
  role: string;
  schoolId: string;
  schoolName: string;
  campusId: string;
  campusName: string;
  className: string;
  avatarUrl: string;
  englishLevel: EnglishLevel | null;
}

// POST /auth/login ve POST /auth/refresh aynı yanıtı döner
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
}
