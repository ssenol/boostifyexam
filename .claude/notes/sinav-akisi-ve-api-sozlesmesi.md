# Sınav Akışı ve API Sözleşmesi (2026-10-13)

API henüz yok. Ekranlar sahte sunucuyla (`src/mocks/examServer.ts`) çalışıyor. Ekranlar yalnızca
`src/services/exam.ts`'i çağırır; API gelince sadece o dosya değişir. Tipler `src/types/exam.ts`.

Sahte sunucu bilerek "sunucu otoritesi" ilkesiyle yazıldı; aşağıdaki davranışları API'den de bekliyoruz.

## Ekran akışı

```
Assignments (app/(main)/index)
  ├─ Open sekmesi: açık sınav kartı (Start / Continue) + progress serisi ızgarası
  ├─ Completed sekmesi: tamamlanan sınav kartları → View report
  └─ Start → Intro (exam/[id]) → "Start test" → Session (exam/[id]/session, replace)
                                                 ├─ choice soruları (dil, görselli, okuma, dinleme)
                                                 ├─ writing görevi
                                                 ├─ speaking görevi
                                                 └─ bitince → Result (exam/[id]/result, replace)
                                                               └─ View report → Report (report/[id])
```

- Session'dan geri kaydırma kapalı (`gestureEnabled: false`), Android geri tuşu Pause penceresini açar.
- "Pause and leave" → Assignments; kart "Continue" olur → Session "Welcome back" ekranıyla açılır.
- Result ve Session `router.replace` ile açılır: geri tuşu bitmiş sınava dönmez.

## Sunucudan beklenen davranış

| Kural | Ayrıntı |
|---|---|
| Süre sunucuda | `remainingSeconds` her yanıtta gelir. İstemci yalnızca gösterim için geri sayar, 0'da durumu sunucuya sorar. |
| Süre dolunca | Sunucu oturumu kendisi kapatır (`status: finished`). **Yazma taslağı varsa otomatik gönderilmeli.** |
| Tek soru | Sunucu sadece sıradaki soruyu verir. Tüm sınav cihaza inmez, cevap anahtarı hiç gelmez. |
| Geri dönüş yok | Yalnızca o anki soruya cevap kabul edilir. Eski soru id'siyle gelen cevap reddedilir. |
| Dinleme hakkı | `registerPlay` sunucuda sayar, hak bitince reddeder. Aynı kayda bağlı ardışık sorular hakkı paylaşır. |
| Duraklatma | `pause` süreyi durdurur, `resume` başlatır. Duraklatılmışken cevap reddedilir. |
| Devam | `startOrResume` açık oturum varsa onu döndürür (aynı soru, aynı süre). |
| Tek deneme | Bitmiş sınav yeniden başlatılamaz. |
| Güvenlik olayları | `logSecurityEvent` kaydeder. Öğretmen raporunda görünmeli. Hata verse bile sınav akışı durmaz. |

### Gerekli endpoint'ler (öneri)

| Servis metodu | Öneri | Not |
|---|---|---|
| `getAssignments` | `GET /student/exams` | open + series + completed |
| `getExamDetail` | `GET /student/exams/:id` | kurallar, öğretmen notu, `sessionState` |
| `startOrResumeSession` | `POST /student/exams/:id/session` | idempotent |
| `getSnapshot` | `GET /student/sessions/:sid` | |
| `pauseSession` / `resumeSession` | `POST /student/sessions/:sid/pause` · `/resume` | |
| `answerChoice` | `POST /student/sessions/:sid/answers` `{ itemId, key }` | yanıt: sıradaki soru (snapshot) |
| `registerPlay` | `POST /student/sessions/:sid/plays` `{ audioId }` | yanıt: `{ playsUsed, maxPlays }` + ses URL'si (kısa ömürlü) |
| `saveWritingDraft` | `PUT /student/sessions/:sid/writing-draft` | yazmayı bırakınca 800 ms sonra |
| `submitWriting` | `POST /student/sessions/:sid/writing` `{ taskId, text \| null }` | null = boş geçildi |
| `submitSpeaking` | `POST /student/sessions/:sid/speaking` (multipart, ses dosyası) | |
| `logSecurityEvent` | `POST /student/sessions/:sid/events` `{ type, detail }` | |
| `getResult` | `GET /student/exams/:id/result` | |
| `getReport` | `GET /student/exams/:id/report` | soru/cevap içermez |
| `getProgressReport` | `GET /student/progress` | |

Sınav sırasında kısa ömürlü, o oturuma özel token kullanılması önerilir (Speak'teki "exercise token" gibi).
Axios'ta `skipAuthInterceptor` bunun için hazır.

## İstemci tarafında yapılanlar (secure mode)

- **Uygulamadan ayrılma** (`useExamGuard`):
  - Ayrılınca süre hemen durur ve olay kaydedilir. Dönüşte "You left the test screen" uyarısı çıkar, sayaç artar.
  - iOS'ta `inactive` (kontrol merkezi, bildirim, uygulama değiştirici, gelen arama) ile `background` ayrı raporlanır.
  - Android'de bildirim paneli `blur` ile yakalanır.
- **Ekran bölme:** iPad Split View / Slide Over, Android çoklu pencere. Pencere ekranın %85'inden darsa olay kaydedilir.
- **Ekran açık kalır:** Sınav boyunca `expo-keep-awake` ile ekran kararmaz; kararırsa uygulama arka plana düşer ve çıkış sayılırdı.
- **Yazma görevinde yardımlar kapalı:**
  - Otomatik düzeltme, yazım denetimi, otomatik doldurma kapalı; kopyala/yapıştır menüsü gizli (`contextMenuHidden`).
  - Tek seferde 20 karakterden fazla ekleme "yapıştırma" sayılıp reddedilir. Bu, dikteyi de engeller.
- **Seçilemeyen metin:** Okuma metni ve sorular seçilemez (RN `Text` varsayılan davranışı).
- **Filigran:** Sınav ekranında öğrenci adı ve kullanıcı adı çok soluk, eğik filigran olarak durur. Ekran fotoğrafı paylaşılırsa kimin olduğu anlaşılır.

## Şimdilik simüle edilenler (native paket gerektirir → yeniden build)

- Dinleme: ses çalınmıyor, süre simüle (`ListeningPlayer`). → `expo-audio`
- Konuşma kaydı: kayıt yapılmıyor, sayaç simüle (`useRecorder`). → `expo-audio`, mikrofon izni
- Intro cihaz kontrolü: "Sound test" / "Allow" dokununca onaylanıyor. → test sesi + mikrofon izni + kulaklık tespiti
- Ekran görüntüsü / kayıt: henüz yok. → `expo-screen-capture` (Android engeller, iOS tespit eder)
- Görseller: gri yer tutucu (`ImagePlaceholder`). → API'den URL gelince `expo-image`
- Fotoğraf yükleme (yazma): sadece bilgi mesajı.

## Prototipten bilinçli farklar

- **Intro'da cihaz kontrolü zorunlu.** Kulaklık ve mikrofon kontrolü bitmeden "Start" pasif. Mikrofonsuz konuşma görevi yapılamaz.
- **"Welcome back" ekranında "Back to assignments" var.** Prototipte yoktu.
- **Submit / Skip pencereleri süreyi durdurmaz.** Prototipte tüm pencereler durduruyordu; o zaman pencereyi açık tutup düşünmek mümkün olurdu. Pause ve güvenlik uyarısı süreyi durdurur.
- **Result'taki "Answered" gerçek cevap sayısı.** Prototipte sabit 28 yazıyordu.

## Açık ürün soruları

1. **Duraklatma sınırı:** Öğrenci istediği kadar duraklatabiliyor ("Leaving pauses the timer"). Bu sınava bakıp
   cevap aramaya açık. Toplam duraklatma süresi ya da sayısı sınırlanmalı mı, yoksa sadece raporlansın mı?
2. **Bölünmüş ekranda başlama:** Bölünmüş ekranda sınava başlamak şu an engellenmiyor, yalnızca sonradan bölmek tespit ediliyor.
3. **Uygulama kapatılırsa:** Arka planda öldürülen uygulamada pause isteği gitmeyebilir. Sunucunun heartbeat ile
   (ör. 30 sn) bağlantı kopunca oturumu otomatik duraklatması gerekiyor.
4. **Çevrimdışı:** Cevap gönderilemezse şu an hata mesajı çıkıyor ve öğrenci tekrar deniyor. Cihazda kuyruğa alma yapılsın mı?
