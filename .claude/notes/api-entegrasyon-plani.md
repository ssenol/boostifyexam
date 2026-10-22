# API Entegrasyon Planı (2026-10-22)

Kaynaklar (`_calismalar/`, git dışı):
- **Placement ve Progress Sınavları Nasıl İşler.pdf**: ürün kuralları.
- **BoostifyExam Mobil Uygulama Geliştirici Rehberi.docx**: API'nin tek doğru kaynağı. 18 endpoint, state nesnesi,
  hata kodları, yayın öncesi kontrol listesi. Şüphede önce rehbere bakılır.
- **boostify-campus-accounts-1.xlsx**: kampüs hesapları. **Kullanılmaz, dokunulmaz.**

Test için yalnızca kullanıcının verdiği, içeriği tanımlı demo hesaplar kullanılır (şifreler kullanıcıda; repoya,
koda ve notlara yazılmaz):
- Öğrenci: `boostify1-uniprep-a-student1` (test boyunca bu hesap)
- Öğretmen: `boostify1-uniprep-teacher` (sadece `403 students_only` kontrolü için)

Geliştirmede login formu demo öğrenciyle dolu gelir: `.env.local` (git dışı, Dropbox ile iki Mac'e gelir) →
`EXPO_PUBLIC_DEV_USERNAME` / `EXPO_PUBLIC_DEV_PASSWORD`, `LoginScreen` yalnızca `__DEV__`'de okur. Değiştirince Metro
yeniden başlatılmalı.

## Ürün kuralları (PDF'ten özet)

- Placement ilk ölçümdür, ortadan (B1–B1+) başlar. Açık bir placement varsa önce o çözülür (`mustTakePlacement`).
  Progress, öğrencinin son seviyesinden başlar.
- Sıra sabittir: Language use (en fazla 16) → Reading → Listening → Writing → Speaking. En fazla 40 soru, adaptif.
- Varsayılan süre 75 dk. Son 20 dk writing ve speaking'e ayrılır, çoktan seçmeli kısım kendiliğinden biter.
- Geri dönüş yok. Atama başına tek deneme, yarıda kalırsa kaldığı yerden devam edilir.
- 3 kez uygulamadan çıkma ya da 10 dk hareketsizlik sınavı bitirir. O ana kadarki cevaplar puanlanır.
- 2 pilot soru puanlanmaz. Bu yüzden `progress.answered` ile `section.answered` farklı olabilir.
- Writing ve speaking'i yapay zekâ yaklaşık 1 dakikada puanlar, o sırada seviye "değerlendiriliyor" görünür.
  8'den az puanlanan cevap varsa seviye verilmez.
- Öğrenci raporunda sorular ve doğru cevaplar yer almaz.

## Mevcut uygulama ile rehber arasındaki farklar

| Konu | Şu an | Rehber |
|---|---|---|
| Adres | `/api/v0.0.1` | `/api/v0.0.1/mobile/exam` (ortam ayarı olarak tutulmalı) |
| Yanıt kalıbı | `status: "success"`, `data.token` | `success: true`, `data.accessToken`, hata için `error.code` |
| Token | 24 saatte bir proaktif yenileme, `refresh-mobile-app-access-token` | Access token 2 saat, refresh 60 gün. `401 token_expired` alınca `/auth/refresh`, iki token birden değişir, aynı anda tek yenileme |
| Çıkış | Sadece yerel | `POST /auth/logout`, ardından tokenlar her durumda silinir |
| Profil | Yok | `GET /me` (açılışta ve profil ekranında) |
| Hata metni | `error.response.data.message` | `error.code` sözlüğü; `message` öğrenciye gösterilmez |
| Sınav listesi | open + progress serisi + completed (mock) | `GET /exams` (`action`'a göre düğme) + `GET /results` |
| Oturum | `SessionSnapshot` (mock) | `state`: phase / step / section / currentItem / guard |
| Cevap | `answerChoice` | `{ itemId, answerKey, step, timeSec }`; tekrar göndermek güvenli |
| Süre | pause / resume | 15 sn'de bir heartbeat, pause; devam için tekrar `start` ya da cevap gönderilir |
| Güvenlik olayı | Kayıt (sayaç istemcide) | `events` → sunucudan `verdict` (none / warn / final / terminate) |
| Dinleme | Simüle | `audio/play` → 15 dk geçerli URL, hak sunucuda azalır |
| Speaking | Simüle | Kayıt → `transcribe` → öğrenci metni düzeltir → `productive` (multipart) |
| Rapor | Mock rapor + progress grafiği | `GET /results/:id` (puanlanırken 30 sn'de bir yenilenir) + sertifika HTML |

## Native paketler (Aşama 3'te eklendi)

`expo-audio` (dinleme, kayıt, ses testi), `react-native-webview` (yönerge HTML'i ve sertifika), `expo-print` +
`expo-sharing` (PDF), `expo-screen-capture`, `expo-image` (soru ve şık görselleri), `expo-local-authentication`
(biyometrik giriş). `expo-audio` arka planda çalma/kayıt kapalı (`app.config.js`).

## Aşamalar

Her aşama simülatörde denenip onaylanmadan sonrakine geçilmez. Doğrulama: `typecheck`, `lint` ve simülatör.

**Aşama 0: API'yi uygulamadan bağımsız doğrula (curl).** Bir test hesabıyla login, `/me`, `/exams`, `/results`,
token yenileme ve logout denenir. Gerçek yanıtlar `src/types/` için örnek olarak kaydedilir (tokensız).
Sınav **başlatılmaz**: her deneme gerçek ve geri alınamaz.

> **Aşama 0 tamamlandı (2026-10-22).** Hepsi rehberle aynı:
> - login 200; boş alan 400 `credentials_required`; yanlış şifre 401 `invalid_credentials`; öğretmen 403 `students_only`.
> - `/me` 200; tokensız 401 `token_missing`; bozuk token 401 `token_invalid`.
> - `/exams`, `/exams/:id` 200; bozuk id 400 `invalid_id`; olmayan yol 404 `route_not_found`.
> - refresh 200 (iki token birden yenilenir), eski refresh 60 sn içinde yine 200.
> - logout 200, sonrasında refresh 401 `refresh_revoked`. Access token çıkıştan sonra da geçerli kalıyor
>   (rehberde yazdığı gibi), bu yüzden telefondan silinmesi şart.
>
> Gözlemler:
> - Demo öğrencide tek atama var: "BoostifyExam Placement Demo" (`6ad8c06911a4eb0e15aa4288`), placement,
>   75 dk, listening/writing/speaking açık, `action: start`, `mustTakePlacement: true`. `/results` boş.
> - Oturum yokken `paused` / `remainingSec` alanları hiç gelmiyor (opsiyonel tiplenmeli). `sessionId`,
>   `sessionStatus`, `sessionPhase`, `cefrLevel` boş string geliyor.
> - Sunucunun `error.message` metinleri öğrenciye uygun İngilizce cümleler. Rehber gereği karar `error.code` ile
>   verilir; İngilizce sözlük bu metinlerden yola çıkarak yazılır.
> - Bu hesapta **tek bir sınav** var. Başlatıldığı an geri alınamaz; Aşama 4'e kadar başlatılmaz.

**Aşama 1: API katmanı ve giriş.**
- `api.ts`: yeni adres, `success` / `error.code` sarmalayıcısı, `ApiError` tipi.
- Yenileme `token_expired` ile tetiklenir, aynı anda tek yenileme yapılır, iki token birden değişir.
  `refresh_*` ya da `account_disabled` gelirse çıkış yapılır.
- Hata kodu → metin sözlüğü (`src/utils/errors.ts`).
- `auth.ts`: login / refresh / logout / me. `AuthUser` rehberdeki alanlara göre yeniden tanımlanır.
- `performLogout` → `POST /auth/logout`, ardından yerel temizlik.
- Açılışta `GET /me`. Profil + çıkış ekranı (rehberdeki 9 ekrandan biri).
- Simülatör testi: doğru/yanlış şifre, öğretmen hesabı mesajı, uygulama kapatılıp açılınca şifre sorulmaması.

> **Aşama 1 tamamlandı (2026-10-22).** Simülatörde boş form, yanlış şifre, öğretmen hesabı, giriş, profil,
> uygulama yeniden açılınca oturumun korunması ve çıkış denendi. Geçici geliştirme düğmeleriyle: bozuk access token +
> aynı anda 3 `/me` → tek refresh, üçü de başarılı; iki token da bozuk → `refresh_invalid`, çıkış.
> Login ekranındaki iki bilgi PDF'e göre düzeltildi ("≤ 40 questions", "Placement starts in the middle").
> SSO düğmesi yerinde duruyor (API'de karşılığı yok, "not available yet" diyor).

**Aşama 2: Sınav listesi ve sonuçlar listesi.**
- `GET /exams` → kartlar. Düğmeyi `action` belirler: start / resume / view_result / wait / closed / missed.
  `mustTakePlacement` ise placement kartı en üstte ve vurgulu gösterilir. Seviye kartı (`level`).
- İki sekme: Exams (`GET /exams`) ve Results (`GET /results`). Değerlendiriliyor ve seviye yok rozetleri.
- Aşağı çekip yenileme, sınavdan dönünce yenileme, boş durumlar.
- Progress serisi ızgarası ve ilgili mock/tipler kaldırılır.

> **Aşama 2 tamamlandı (2026-10-22).** Demo öğrenciyle telefonda denendi: seviye satırı, Tests / Results
> sekmeleri, placement notu, vurgulu kapak resimli kart, boş sonuç listesi, aşağı çekip yenileme. Diğer kart
> durumları "Bekleyen testler"de. Mock'taki `getAssignments` ve progress serisi kaldırıldı.

**Aşama 3: Sınav girişi (Intro).**
- `instructionsHtml` (WebView), `timeLimitMinutes`, kurallar, "3 kez çıkarsan sınavın biter" uyarısı.
- `parts`'a göre ses testi (sunucuya gitmez) ve mikrofon izni (`parts.speaking`).
- Start ya da Resume → `POST /exams/:id/start`.

> **Aşama 3 tamamlandı (2026-10-22).** Intro `GET /exams/:id`'den doluyor: yönerge (WebView, `HtmlBlock`),
> `parts` ve süreye göre kurallar, gömülü test sesiyle kulaklık kontrolü (sessiz modda da çalar), gerçek mikrofon
> izni (`useMicPermission`). Start bu aşamada sınavı başlatmaz, sadece sınav ekranını açar.
> Kullanıcı isteğiyle eklendi: girişten sonra bir kez biyometrik giriş teklifi, login'de "Sign in with Face ID",
> Profil'de Security bölümü (biyometrik aç/kapa, mikrofon izni). Telefonda şifre yoksa Profil şifreyi bir kez
> sorar. Geri dönünce liste yenilemesi sessiz yapıldı (iOS'ta RefreshControl boşluk / donmuş simge bırakıyordu).
> Native paketlerin hepsi bu aşamada eklendi (+ `expo-local-authentication`).

**Aşama 4: Sınav ekranı, çoktan seçmeli kısım.**
- `useExamSession` state'e göre yeniden yazılır: her yanıtta dönen state çizilir, istemci sıra tutmaz.
  Ekran seçimi: `phase` + `currentItem.itemType`. `currentItem` boşsa 1,5 sn sonra `GET /sessions/:id`.
- Soru: `stem` (`___`), şıklar geldiği sırayla, resimli soru ve resimli şık, `true_false`.
- Okuma: `stimulus.text` (`\n\n` paragraf). Aynı `stimulus.id`'de kaydırma yeri korunur.
- Bölüm geçiş ekranı (`section.skill` değişince), ilerleme çubuğu (`section.answered / max`).
- Geri sayım: her state'te `remainingSec` ile yeniden kurulur, `paused` iken durur, son 5 dk kırmızı,
  0'da `GET /sessions/:id`.
- Heartbeat 15 sn'de bir gider. Yanıtı yalnızca `phase = done` ise uygulanır.
- Pause ("Sınavdan çık") → listeye dönüş. Android geri tuşu sorar.
- Güvenlik: `monitored` (ilk açılış), `tabSwitch` (sadece `background`, 0,6 sn altı sayılmaz, izin pencereleri
  hariç), `inactivityWarn` / `inactivityEnd`. `verdict`'e göre uyarı ya da bitiş.
  `useExamGuard`'daki istemci sayacı kaldırılır, sayaç sunucuda.
- Dinleme: `audio/play` → çal (`expo-audio`). Hak düğmede görünür, ileri sarma yok, cevap gönderilince durur.
- Ağ hatasında aynı gövdeyle tekrar gönderilir, çift dokunma engellenir.

> **Aşama 4 tamamlandı (2026-10-22).** `useExamSession` sunucu state'ine göre yeniden yazıldı (sıralı istekler, ağ
> hatasında aynı gövdeyle tekrar, 15 sn heartbeat, `remainingSec` geri sayımı, boş `currentItem`'da 1,5 sn sonra
> yenileme, aynı sınav için tek `start` isteği). `useExamGuard`: sadece `background` sayılır (≥ 0,6 sn) → `tabSwitch`,
> kararı sunucu verir; hareketsizlik `inactivityWarn` / `inactivityEnd`; ekran bölme tespiti kaldırıldı (API'de olay
> türü yok). Soru (`ChoiceQuestion`, resimli soru/şık: `RemoteImage`), okuma (`ReadingPassage`, kaydırma yeri
> korunur), dinleme (`ListeningPlayer`, `expo-audio`, `audio/play`), bölüm geçişi (`SectionIntro`), üst çubuk / yan
> panel bölüm ilerlemesi. "Pause and leave" → `pause`; Continue doğrudan sınavı açar (`ResumeView` kaldırıldı).
> Writing / speaking bu aşamada yer tutucu.

**Aşama 5: Writing ve speaking.**
- Writing: `currentDraft` ile açılır, taslak heartbeat'teki `draftText` ile gider, kelime sayacı yalnızca uyarı verir.
  Yapıştırma engellenir ve `pasteBlocked` olayı gönderilir. Teslim ve boş geçiş (`skipped`) onay ister.
- Speaking: tek kayıt (en fazla `maxResponseSeconds`), durdurmadan önce onay, `transcribe`, metin düzeltme,
  multipart teslim (`durationSec`, `transcriptEdited`). İzin yoksa "teknik sorun" yolu (`technical: true`).

> **Aşama 5 tamamlandı (2026-10-22).** `WritingTaskView` (taslak heartbeat ve arka plana geçerken hemen, yapıştırma →
> `pasteBlocked`, sayaç sadece uyarı, teslim / boş geçme onayı), `SpeakingTaskView` (`expo-audio` kayıt, m4a, üst sınırda
> kendiliğinden durur, durdurma onayı, `transcribe`, kaydı dinleme, metni düzeltme, multipart teslim, teknik sorun /
> geçme). Ekran onayları tek `confirm` ile. Sınav sırasında Ayarlar'a gitme seçeneği yok (uygulamadan çıkış sayılır).

**Aşama 6: Bitiş, rapor, sertifika.**
- Bitiş ekranı `state.result`'ı gösterir. `awaiting_evaluation` ise not düşülür. Kurallarla biten sınav için ayrı metin.
- Rapor (`GET /results/:id`): genel seviye + ölçek puanı, beceriler, writing ve speaking ayrıntısı, focusAreas,
  proctoring. `certificate.reason = evaluating` iken 30 sn'de bir yenilenir.
- Sertifika: WebView'da `html`, `expo-print` ile A4 yatay PDF, `fileName` ile `expo-sharing`.

**Aşama 7: Temizlik ve yayın öncesi.**
- `src/mocks/examServer.ts` ve kullanılmayan tipler kaldırılır. Notlar ve CLAUDE.md güncellenir.
- Rehberin "Yayın öncesi kontrol listesi" gerçek iPhone ve Android'de tamamlanır.

## Bekleyen testler

Kodu yazılmış ama demo hesabın o anki durumu yüzünden henüz denenemeyen durumlar. Denendikçe işaretlenir.
"Nasıl oluşur" sütunundaki atamalar kullanıcı tarafından web panelinden yapılır.

### Aşama 1: giriş ve oturum

| ✓ | Durum | Beklenen | Nasıl oluşur |
|---|---|---|---|
| ☐ | Access token'ın doğal olarak dolması (2 saat) | Sessiz yenileme, kullanıcı bir şey görmez | Uygulamayı 2 saatten uzun açık bırakıp bir istek yapmak |
| ☐ | Yenileme sırasında ağ yok | Oturum korunur, çıkış olmaz | Token dolmuşken uçak modu |
| ☐ | `429 too_many_requests` | "Too many attempts. Wait a moment and try again." | 10 dk içinde 10'dan fazla hatalı giriş |
| ☐ | `401 account_disabled` | Çıkış, login'de "Your account is not active…" | Pasif/silinmiş bir test hesabı |

### Aşama 2: sınav ve sonuç listeleri

| ✓ | Durum | Beklenen | Nasıl oluşur |
|---|---|---|---|
| ☐ | `action: resume` (duraklatılmış) | "Paused" etiketi, "Time left" kalan dakika, "Continue" doğrudan sınavı açar | Sınavı başlatıp "Sınavdan çık" |
| ☐ | `action: resume` (duraklatılmamış) | "In progress" etiketi | Sınav açıkken uygulamayı öldürüp listeye dönmek |
| ✓ | `action: view_result` | Kartta seviye, "View result" → rapor | Bir sınavı bitirmek |
| ☐ | `action: wait` | Pasif "Opens 13 Oct" düğmesi, "Opens" tarihi | Başlangıcı ileri tarihli atama |
| ☐ | `action: closed` | Pasif "Test closed" | Başlanmış ama bitiş tarihi geçmiş atama |
| ☐ | `action: missed` | Pasif "Missed" | Başlanmadan bitiş tarihi geçmiş atama |
| ☐ | Progress sınavı kartı | "Progress test" etiketi | Progress ataması |
| ☐ | `mustTakePlacement` + birden çok sınav | Açık placement en üstte ve vurgulu, diğerleri altta | Placement + progress birlikte atanmış öğrenci |
| ✓ | `mustTakePlacement: false` | "Take your placement test first" notu yok, vurgu yok | Placement'ı bitirmek |
| ✓ | Ölçülmüş seviye (`level`) | Üstte "Your level: B1" vb., Profil'de seviye ve tarih | Placement'ı bitirmek |
| ☐ | Boş `coverImage` / yüklenemeyen resim | Gri yer tutucu | Kapaksız atama (kapak zorunlu, olmayabilir) |
| ☐ | Hiç atama yok | "No tests assigned to you" | Ataması olmayan öğrenci |
| ✓ | Results kartı | Tarih, seviye, "View report" | Bir sınavı bitirmek |
| ☐ | Results kartı, `evaluating: true` | "Evaluating" etiketi | Bitirdikten hemen sonra (~1 dk) |
| ☐ | Results kartı, `noLevel: true` | "Level not determined" | 8'den az puanlanan cevapla bitirmek |

### Aşama 3: Intro, biyometrik giriş, mikrofon

| ✓ | Durum | Beklenen | Nasıl oluşur |
|---|---|---|---|
| ☐ | Touch ID'li cihaz (iPad Air) | Düğme ve pencerelerde "Touch ID" | Fiziksel iPad |
| ☐ | Android parmak izi / yüz tanıma | "Fingerprint" / "Face unlock" / "Biometrics" | Fiziksel Android |
| ☐ | Şifre değiştikten sonra biyometrik giriş | Biyometrik kapanır, "Your password has changed…" | Web panelinden şifre değiştirmek |
| ☐ | Cihazda kayıtlı yüz / parmak izi yok | Teklif çıkmaz; Profil'de düğme pasif, "Set up … first" | Kayıtsız cihaz / simülatör |
| ☐ | Mikrofon izni reddedildi | Intro'da uyarı + Settings, Start yine açık; Profil'de "Settings" | İzni reddetmek |
| ☐ | Intro'da kulaklıkla ses testi | Ses kulaklıktan gelir, telefon sessizdeyken de çalar | Fiziksel cihaz, sessiz mod |
| ☐ | `parts` bölümleri kapalı sınav | Kapalı bölümün cihaz kontrolü ve kuralı görünmez | Listening / speaking'siz atama |
| ☐ | Intro'da linkli yönerge | Link tarayıcıda açılır | `instructionsHtml` içinde link |

### Aşama 4: sınav ekranı (çoktan seçmeli)

Demo öğrencinin placement denemesi başlatıldı (2026-10-22), iPhone simülatöründe writing'e kadar geldi ve orada
"Pause and leave" ile bırakıldı. Aşama 5 aynı denemeyle devam eder.

| ✓ | Durum | Beklenen | Nasıl oluşur |
|---|---|---|---|
| ✓ | Başlatma, bölüm geçişleri, cevap, süre, Pause / Continue, 1. çıkış uyarısı, reading, listening | — | iPhone simülatörü |
| ☐ | iPad: yan panel, yatayda yan okuma metni, dikeyde sekmeler | Tablet düzeni | `npm run ios:sim:ipad` |
| ☐ | Cihaz değiştirme | iPhone'da "Pause and leave" → iPad'de Continue aynı yerden | İki simülatör, aynı hesap |
| ☐ | Web'de başlayıp uygulamada bitirme | Aynı deneme açılır; `guard.tabSwitchCount` webdeki çıkışları da içerir | Web panelinden başlatılan sınav |
| ☐ | 2. çıkış | "Last warning" penceresi | Yeni atama |
| ☐ | 3. çıkış | Sınav kurallarla biter, bitiş ekranı | Yeni atama |
| ☐ | Hareketsizlik 5 dk / 10 dk | "Are you still there?" / sınav biter | Yeni atama, ekrana dokunmadan beklemek |
| ☐ | Süre biter | Sunucu kapatır, writing taslağı teslim edilir, bitiş ekranı | Kısa süreli atama |
| ☐ | Uçak modunda cevap | "Offline" göstergesi, otomatik tekrar; geri gelince aynı soru iki kez sayılmaz | Cevap gönderirken ağı kesmek |
| ☐ | Resimli soru / resimli şık / true_false | Görsel, yüklenemezse "Try again" | Bu tür soru gelirse |
| ☐ | Uygulama arka plandayken dinleme | Çalma durur, dönünce "Continue playing" (hak harcamaz) | Listening sırasında çıkmak (çıkış sayılır!) |
| ☐ | Uzun okuma metninde kaydırma yeri | Aynı metnin sonraki sorusunda yer korunur | Uzun metin |

### Aşama 5: writing ve speaking

İlk deneme 2026-10-22'de bitti: writing teslim edildi (A1+, 36), speaking "Report a technical problem" ile gönderildi
(`technical: true` → `status: failed, technical: true`, puanlamaya katılmadı). Sonuç A1, ölçek 21, sertifika hazır.

| ✓ | Durum | Beklenen | Nasıl oluşur |
|---|---|---|---|
| ✓ | Writing: görev, resim, yönerge, sayaç, teslim | — | İlk deneme |
| ✓ | Speaking: teknik sorun bildirimi | Görev puanlamadan çıkar | İlk deneme |
| ☐ | Writing taslağının geri gelmesi | Pause and leave → Continue sonrası metin yerinde | Yeni atama |
| ☐ | Writing boş geçme (`skipped`) | 0 puan | Yeni atama |
| ☐ | Yapıştırma denemesi | "Pasting is turned off", `pasteBlockedCount` artar | Yeni atama |
| ☐ | Speaking kaydı → transcribe → metni düzeltme → teslim (multipart) | Kayıt sunucuya gider, metin raporda | Yeni atama |
| ☐ | Kayıt üst sınırda (`maxResponseSeconds`) kendiliğinden durur | Metne çevirmeye geçer | Uzun kayıt |
| ☐ | Kayıt sırasında uygulamadan çıkma | Kayıt o ana kadar alınır, çıkış sayılır | Yeni atama |
| ☐ | Transcribe başarısız | "Couldn’t be turned into text", teslim yine açık | Sessiz / bozuk kayıt |
| ☐ | Mikrofon izni reddedilmiş | Kayıt düğmesi yerine uyarı + teknik sorun | İzni reddetmek |
| ☐ | Android'de kayıt dosyası türü | Sunucu `.m4a` uzantısıyla kabul eder | Fiziksel Android |

### Tablet görünümü

| ✓ | Durum | Beklenen | Nasıl oluşur |
|---|---|---|---|
| ☐ | Login, Profil, Assignments (Aşama 1–2) iPad'de | Tablet düzeni (padX 40, kart ızgarası, profil en fazla 560 genişlik) | `npm run ios:sim:ipad`, dikey ve yatay |
| ☐ | Telefon ↔ tablet eşiği (744) | Pencere boyutu değişince düzen geçişi bozulmadan değişir | Xcode 27 Device Hub'da simülatör penceresini boyutlandırmak |

### Bilinen geçici durumlar

- Aşama 3'e kadar "Start" → Intro hata verir (Intro hâlâ sahte sunucuda, gerçek id'yi tanımaz).
- Aşama 4'e kadar "Continue" → Session, Aşama 6'ya kadar "View result" / "View report" → Rapor sahte sunucuda.

## Test hesabı kuralları

- Her başlatılan deneme gerçek bir sonuçtur ve geri alınamaz. Sınav başlatmadan önce kullanıcıya sorulur.
- Hangi hesabın hangi aşamada "harcanacağı" (başlatma, yarıda bırakma, bitirme) önceden kararlaştırılır.
- Rapor ve sertifika ekranları, sınavı zaten bitirmiş bir hesapla denenir.

## Kararlar (2026-10-22)

1. **Arayüz dili İngilizce kalıyor.** Rehberdeki Türkçe hata ve bilgi metinleri İngilizceye çevrilerek kullanılır.
2. **Progress serisi ve "progress over time" görünümü kaldırılıyor** (Aşama 2 ve 6). API'de karşılığı yok.
3. **Profil ekranını mevcut temaya göre Claude tasarlıyor** (Aşama 1): ad, okul, kampüs, sınıf, seviye, çıkış.
