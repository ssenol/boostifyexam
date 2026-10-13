# Mimari ve Güvenlik Kararı (2026-10-13)

## Karar

- **React Native + Expo** ile devam (tamamen native değil). Güvenlik için gereken yerlerde
  Expo Modules API ile küçük native modüller (Swift/Kotlin) ve config plugin'ler yazılacak.
- Proje yapısı **BoostifySpeak** ile aynı: Expo Router (dosya tabanlı), Redux Toolkit + redux-persist,
  token'lar SecureStore'da, tek axios instance + interceptor'larla token yenileme.
- Sınavlar **öğrencinin kendi cihazında** yapılacak (okulun yönettiği / MDM'li cihaz değil).

## Neden native değil

Güvenlikteki sınırlar framework'ten değil işletim sisteminden geliyor. Native yazmak yeni bir yetenek
kazandırmıyor, ama iki kod tabanı (Swift + Kotlin) demek. Ayrıca Speak/Write'ta canlıda test edilmiş
auth/token kodu kaybedilirdi. Prototip de React ile yazılmış.

## Kendi cihaz olmasının sonucu

Kişisel cihazda uygulamayı **kilitleyemeyiz**, sadece **fark edip raporlayabiliriz**:

- iOS Guided Access / Autonomous Single App Mode yalnızca MDM ile yönetilen cihazda zorlanabilir.
  Kişisel cihazda sadece açık olup olmadığı okunabilir.
- Android `startLockTask` (screen pinning) kullanıcıya onay sorar, kullanıcı çıkabilir.

Bu yüzden "Secure mode" = **caydırma + tespit + sunucuya olay kaydı**. Öğretmen raporunda görünür.

## İstemci tarafı önlemler (plan)

| Önlem | iOS | Android | Nasıl |
|---|---|---|---|
| Ekran görüntüsü / kayıt | Engellenemez; tespit + içeriği gizleme | `FLAG_SECURE` ile engellenir | `expo-screen-capture` |
| Arka plana geçme, çağrı, uygulama değiştirme | AppState ile tespit | Aynı | Sunucuya olay + prototipteki "left" overlay'i |
| Kopyala / yapıştır / otomatik düzeltme | `contextMenuHidden`, `autoCorrect={false}` | Aynı + paste kontrolü | Yazma görevinde |
| 3. parti klavye | AppDelegate'te kapatılabilir | Kısmen | Config plugin |
| Root / jailbreak | Var | Var | freeRASP veya jail-monkey |
| Uygulama bütünlüğü | App Attest | Play Integrity | Native modül / hazır paket |
| SSL pinning | Var | Var | Kütüphane veya config plugin |
| Kulaklık / ses çıkışı | AVAudioSession | AudioManager | Küçük native modül (cihaz kontrolü ekranı) |

## Sunucu tarafı ilkeler ("istemciye güvenme")

- Süre sunucuda tutulur (başlangıç/bitiş); uygulamadaki sayaç sadece gösterim.
- Dinleme hakları ("Plays are counted on the server") ve deneme sayısı ("Single attempt") sunucuda sayılır.
- Sorular parça parça gelir; tüm sınav cihaza inmez, cevap anahtarı hiç gelmez.
- Cevaplar anında kaydedilir; bağlantı koparsa cihazda kuyruğa alınır, kopma sunucuya bildirilir.
- Olay kaydı: arka plana geçme, ekran kaydı tespiti, uygulamayı yeniden açma vb.
- Sınav sırasında kısa ömürlü, sınava özel token; tek cihaz / tek oturum.

Bunlar backend (quizmaker-api) ekibiyle konuşulacak.

## Prototip

- Kaynak: `BoostifyExams Sinav Arayuzu 1.html` (bundle'lanmış tek dosya).
- Çözülmüş hali: `_calismalar/prototip/design-system.css` (token'lar) ve `ekranlar.dc.html`
  (tüm ekranların şablonu + mantığı). `_calismalar/` git'e girmez.
- Ekranlar: login, assign, assign-done, intro (cihaz kontrolü), q-grammar, q-image, q-reading(-q),
  q-listening, low-time, writing, skip, speaking, exit, left, resume, result, report, report-cumul.
- Arayüz dili İngilizce. Font Archivo (400/600/800), accent `#3f51f0`, köşe yarıçapı 0.

## İlk adım olarak yapılanlar

- Speak'ten uyarlanan iskelet: `src/config/api.ts`, `src/store/*`, `src/services/auth.ts`,
  `src/hooks/useResponsive.ts`, `app/_layout.tsx`.
- Tema token'ları `src/theme/index.ts`.
- Login ekranı prototipe göre (telefon: dikey; tablet: yarı mavi panel + CEFR merdiveni).
- Assignments ekranı şimdilik yer tutucu (sadece çıkış butonu).
- Biyometrik giriş Speak'ten **alınmadı**; istenirse sonra eklenir.

## Kesinleşenler

- Uygulama adı **BoostifyExam** (tekil; prototipteki "BoostifyExams" yazımı kullanılmaz).
- Bundle ID: `com.uesturkey.boostifyexam` (dev: `.dev` ekli).
- EAS projesi: @selcuksenol/boostifyexam (projectId `f1038a0c-ba86-488a-9d29-e1284ed38ebe`, app.config.js içinde).

## Açık konular

- Icon, splash ve adaptive icon görselleri.
- SSO akışı (login'deki "School account (SSO)" butonu şimdilik bilgi mesajı gösteriyor).
- Sınav endpoint'leri.
