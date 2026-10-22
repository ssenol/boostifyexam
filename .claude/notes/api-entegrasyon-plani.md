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

## Yeni native paketler (prebuild + iki Mac'te yeniden build)

`expo-audio` (dinleme ve kayıt), `react-native-webview` (yönerge HTML'i ve sertifika), `expo-print` + `expo-sharing`
(PDF), `expo-screen-capture`, `expo-image` (soru ve şık görselleri). Bunlar tek seferde, Aşama 4'ün başında eklenir.

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

**Aşama 3: Sınav girişi (Intro).**
- `instructionsHtml` (WebView), `timeLimitMinutes`, kurallar, "3 kez çıkarsan sınavın biter" uyarısı.
- `parts`'a göre ses testi (sunucuya gitmez) ve mikrofon izni (`parts.speaking`).
- Start ya da Resume → `POST /exams/:id/start`.

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

**Aşama 5: Writing ve speaking.**
- Writing: `currentDraft` ile açılır, taslak heartbeat'teki `draftText` ile gider, kelime sayacı yalnızca uyarı verir.
  Yapıştırma engellenir ve `pasteBlocked` olayı gönderilir. Teslim ve boş geçiş (`skipped`) onay ister.
- Speaking: tek kayıt (en fazla `maxResponseSeconds`), durdurmadan önce onay, `transcribe`, metin düzeltme,
  multipart teslim (`durationSec`, `transcriptEdited`). İzin yoksa "teknik sorun" yolu (`technical: true`).

**Aşama 6: Bitiş, rapor, sertifika.**
- Bitiş ekranı `state.result`'ı gösterir. `awaiting_evaluation` ise not düşülür. Kurallarla biten sınav için ayrı metin.
- Rapor (`GET /results/:id`): genel seviye + ölçek puanı, beceriler, writing ve speaking ayrıntısı, focusAreas,
  proctoring. `certificate.reason = evaluating` iken 30 sn'de bir yenilenir.
- Sertifika: WebView'da `html`, `expo-print` ile A4 yatay PDF, `fileName` ile `expo-sharing`.

**Aşama 7: Temizlik ve yayın öncesi.**
- `src/mocks/examServer.ts` ve kullanılmayan tipler kaldırılır. Notlar ve CLAUDE.md güncellenir.
- Rehberin "Yayın öncesi kontrol listesi" gerçek iPhone ve Android'de tamamlanır.

## Test hesabı kuralları

- Her başlatılan deneme gerçek bir sonuçtur ve geri alınamaz. Sınav başlatmadan önce kullanıcıya sorulur.
- Hangi hesabın hangi aşamada "harcanacağı" (başlatma, yarıda bırakma, bitirme) önceden kararlaştırılır.
- Rapor ve sertifika ekranları, sınavı zaten bitirmiş bir hesapla denenir.

## Kararlar (2026-10-22)

1. **Arayüz dili İngilizce kalıyor.** Rehberdeki Türkçe hata ve bilgi metinleri İngilizceye çevrilerek kullanılır.
2. **Progress serisi ve "progress over time" görünümü kaldırılıyor** (Aşama 2 ve 6). API'de karşılığı yok.
3. **Profil ekranını mevcut temaya göre Claude tasarlıyor** (Aşama 1): ad, okul, kampüs, sınıf, seviye, çıkış.
