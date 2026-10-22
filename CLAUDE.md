# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Özeti

BoostifyExam, öğrencilerin seviye tespit (placement) ve ilerleme (progress) sınavlarına girdiği bir React Native +
Expo mobil uygulamasıdır. İngilizce, CEFR ölçeğinde, adaptif sınavlar. Sınavlar **öğrencinin kendi cihazında** yapılır.

- Kardeş uygulamalar: `../boostifyspeak` ve `../boostifywrite` (ikisi de canlıda). Aynı backend, aynı giriş/token mantığı.
  **Proje yapısı BoostifySpeak ile aynıdır**; bir kalıp belirsizse önce Speak'e bakın.
- **Expo SDK:** ~57 · **React Native:** 0.86.3 · **React:** 19.2.3
- **Backend:** `https://quizmaker-api.onrender.com/api/v0.0.1`
- **Tasarım:** `BoostifyExams Sinav Arayuzu 1.html` (çalışan prototip). Çözülmüş hali `_calismalar/prototip/`.
  Arayüz dili İngilizce. Uygulama adı **BoostifyExam** (tekil); prototipteki "Exams" yazımı kullanılmaz.
- **Bundle ID:** `com.uesturkey.boostifyexam` (dev: `.dev` ekli)

## Komutlar

```bash
npm start                              # Expo dev server (dev client gerekli, Expo Go DESTEKLENMİYOR)
npm run ios                            # iOS: "Selçuk iPhone" (iPhone 16, UDID ile)
npm run ios:ipad                       # iOS: "Selçuk iPad Air" (UDID ile)
npm run ios:sim                        # Simülatör: "iPhone 18 Pro" (adla; simülatör UDID'i her Mac'te farklı)
npm run ios:sim:ipad                   # Simülatör: "iPad Air 11-inch (M4)"
npm run android
npm run typecheck                      # tsc --noEmit
npm run lint                           # expo lint
npx expo prebuild --clean              # Native projeleri (ios/android) yeniden üret
```

**Node sürümü:** Node 22 gerekli (sürüm `n` ile değiştiriliyor). Node 16 ile Expo CLI `Blob is not defined` hatası verir;
böyle bir hata görülürse önce `node -v` kontrol edin.

**Java sürümü (Android):** JDK 17 gerekli. Android Studio'nun gömülü JBR'si (Java 25) ile build,
`configureCMakeDebug` adımında `WARNING: A restricted method in java.lang.System has been called` hatasıyla düşer.
Uyarıyı AGP'nin ayrı süreçte çalıştırdığı `prefab` basıyor, bu yüzden `org.gradle.jvmargs`'a
`--enable-native-access` eklemek işe yaramaz. İkinci bilgisayarda (Android Studio `~/Applications` altında) JDK 17
Homebrew'dan kurulu (`openjdk@17`) ve `~/.zshrc`'deki `JAVA_HOME` onu gösteriyor. Android Studio'dan build edilecekse
Settings → Build Tools → Gradle → Gradle JDK de JDK 17 seçilmeli.

**Cihaz hedefleme:** `ios` script'leri cihazı UDID ile seçer. Adla (`--device "iPhone 16"`) seçmek, runtime'ı olmayan
aynı adlı bir simülatöre denk gelip `Unable to boot device because we cannot determine the runtime bundle` hatası
veriyordu. Cihaz listesi: `xcrun devicectl list devices`. Simülatör script'leri ise adla seçer, çünkü simülatör
UDID'i her Mac'te farklıdır; ad iki Mac'te de tek ve runtime'ı olan bir simülatöre denk gelmeli
(`xcrun simctl list devices available`). Metro zaten açıksa `-- --no-bundler` eklenir.

Proje Dropbox'ta: `node_modules` ve prebuild sonrası `ios`/`android` için `xattr -w com.dropbox.ignored 1 <klasör>`
uygulanmalı. Prebuild klasörü silip yeniden oluşturduğu için işaret kalkar; prebuild'den **sonra** tekrar uygulayın.
Bu klasörler senkronlanmadığından her bilgisayarda ayrıca `npm ci` + `npx expo prebuild` gerekir. Xcode 27 / Device Hub notları için Speak'in `CLAUDE.md`'sine bakın.

Test altyapısı yok; doğrulama `npm run typecheck` + `npm run lint` + fiziksel cihaz.

## Mimari

### Routing: Expo Router (dosya tabanlı)

```
app/
├── _layout.tsx          # Fontlar (Archivo), Redux Provider, PersistGate, Stack((main)|(auth))
├── (auth)/
│   ├── _layout.tsx
│   └── login.tsx        # Giriş yapılmışsa "/"'a Redirect
└── (main)/
    ├── _layout.tsx      # Auth koruması: giriş yoksa "/login"'e Redirect. Tab bar YOK, Stack.
    ├── index.tsx        # Assignments: Tests (GET /exams, view_result hariç; düğmeyi action belirler) / Results (GET /results)
    ├── profile.tsx      # Profil (GET /me), Security (biyometrik, mikrofon), çıkış
    ├── exam/[id]/
    │   ├── index.tsx    # Intro (GET /exams/:id): yönerge, kurallar, ses testi + mikrofon izni
    │   ├── session.tsx  # Sınav (gestureEnabled: false). Intro'dan replace ile açılır
    │   └── result.tsx   # Bitiş (?sessionId). Session'dan replace ile açılır
    ├── report/[id].tsx  # Rapor, id = sessionId (?from=assign|result)
    └── certificate/[id].tsx # Sertifika (WebView + PDF paylaşma), id = sessionId
```

`app/**` dosyaları ince sarmalayıcıdır; ekranın kendisi `src/screens/*.tsx`'te. Yeni ekran: önce `src/screens/`,
sonra `app/` altında route dosyası. `@/*` path alias'ı kök dizini gösterir. Tüm kod TypeScript (strict).

### Redux store

`src/store/index.ts`. Şu an yalnızca `auth` slice'ı var. `secureAuthStorage.ts` ile persist edilir:
`accessToken`/`refreshToken` SecureStore'da, kalan alanlar AsyncStorage'da. Yeni slice eklerken `persistConfig` +
`whitelist` açıkça yazılır. Hooks: `useAppSelector` / `useAppDispatch` (`src/store/hooks.ts`).

Çıkış her zaman `src/utils/logoutHelper.ts` → `performLogout` üzerinden yapılır: sunucuya `POST /auth/logout`
gönderilir (beklenmez) ve tokenlar her durumda silinir. Kullanıcıya ait yeni cache'ler de orada temizlenmeli.

### Sınav akışı

- **Sunucu otoritesi:** Sınavın mantığı tamamen sunucuda (rehber). Ekranın tek veri kaynağı `SessionState`
  (`src/types/exam.ts`): her istek güncel state'i döner, ekran onu çizer. Uygulama soru sırası, bölüm geçişi, puan
  ya da süre hesaplamaz; kalan süreyi yalnızca gösterim için sayar.
- **`useExamSession`:** `start` (aynı sınav için tek istek), sıralı istek kuyruğu, ağ hatasında aynı gövdeyle tekrar
  (`step` ikinci kaydı engeller), 15 sn heartbeat (yanıtı yalnızca `phase = done` ise uygulanır), `pause`,
  `playAudio`, `sendEvent`, bağlantı durumu (`saveState`).
- **`useExamGuard`:** Sadece `background` → dönüşte `tabSwitch` (≥ 0,6 sn); kararı (`warn` / `final` / `terminate`)
  sunucu verir. Hareketsizlik `inactivityWarn` / `inactivityEnd` (dinleme çalarken ve pencere açıkken işlemez).
  Android geri tuşu "Pause" penceresini açar.
- **Ekran:** `ExamSessionScreen` + `src/components/exam/*`: `phase` + `currentItem.itemType` ekranı seçer. Telefonda
  `ExamTopBar`, tablette 300px `ExamSidePanel`. Okuma metni yatay tablette yan sütunda, telefonda / dikey tablette
  Text / Question sekmeleriyle. `SectionIntro` bölüm geçişi, `ListeningPlayer` (`expo-audio`), `Watermark`.
- **Writing / speaking:** `WritingTaskView` (taslak heartbeat'le gider), `SpeakingTaskView` (kayıt → transcribe →
  düzelt → multipart teslim; teknik sorun / geçme). Onaylar ekranın `confirm`'ü ile (birincil true, ikincil false).
- **Bitiş, rapor, sertifika:** `ExamResultScreen` (`state.result`), `ReportScreen` + `ReportView` (`GET /results/:id`),
  `CertificateScreen` (HTML → WebView, `expo-print` ile PDF, `fileName` ile paylaşma). Puanlama sürerken 30 sn'de bir
  yenilenir.

### API katmanı

Kaynak: `_calismalar/BoostifyExam Mobil Uygulama Geliştirici Rehberi.docx` (plan: `.claude/notes/api-entegrasyon-plani.md`).

- `src/config/api.ts`: tek axios instance (`baseURL` = `…/mobile/exam`, `EXPO_PUBLIC_API_BASE_URL` ile değişir) +
  `API_ENDPOINTS` (yollar göreli). `apiGet` / `apiPost` yanıtın `data` alanını döner; boş gövdeli POST `{}` gönderir.
- Bütün hatalar `ApiError`'a (`src/utils/errors.ts`) çevrilir: `code` (sunucunun `error.code`'u, ağda
  `network_error`), `status`, `details`. Karar her zaman `code` ile verilir; sunucunun `message`'ı gösterilmez.
  Öğrenciye gösterilecek İngilizce metin `getErrorMessage()` sözlüğünden gelir.
- Token: access 2 saat, refresh 60 gün. `401 token_expired | token_invalid` → tek bir `/auth/refresh` (aynı anda
  gelen 401'ler aynı yenilemeyi bekler), iki token birden değişir, istek bir kez tekrarlanır. Yenileme 401 alırsa
  çıkış; ağ/sunucu hatasında oturum korunur. `/auth/*` istekleri token taşımaz ve 401'de çıkış tetiklemez.
- Açılışta `(main)/_layout.tsx` `GET /me` ile profili günceller.
- Component'ler doğrudan axios çağırmaz; çağrılar `src/services/` altındaki servis dosyalarından yapılır.

### Tema

`src/theme/index.ts`: prototipin token'ları (`colors`, `fonts`, `space`, `layout`). Marka renkleri prototipten farklı:
mavi `accent` #303FE0, turuncu `primary` / `warn` #F05A25 (logo ve splash ile aynı); birincil düğme turuncu. Logo:
`<Logo variant="color|white" />` (`assets/images/logo*.png`); `ScreenHeader` başlık verilmezse logoyu gösterir.
İkon / splash: `assets/images/` (`app.config.js`; iOS ikonu alpha'sız). Dark mode yok. Köşe yarıçapı
tasarımda bilerek 0. Font: Archivo 400/600/800 (`fonts.regular/semiBold/extraBold`). Tekrarlanan metin stilleri `typography`
(`kicker`, `kickerAccent`, `body`, `muted`). Ortak bileşenler (`src/components/`):
- `Button`: `primary` (turuncu ana eylem) / `dark` (siyah, belirgin ama ana eylem değil: Sign out) / `secondary` / `ghost` varyantları; `large` / `medium` / `compact` boyutları; `trailing` true ise ok ikonu.
- `Tag`, `ScreenHeader`, `Dialog` (ek içerik için `children`; klavye açılınca yukarı kayar), `Toast` + `useToast`,
  `StateView` (yükleniyor / hata), `ImagePlaceholder`, `CoverImage` (URL boşsa ya da yüklenemezse yer tutucu),
  `HtmlBlock` (sunucudan gelen HTML, WebView, içeriğe göre yükseklik, linkler tarayıcıda).
- `icons.tsx`: prototipteki Lucide path'leri.

Veri yükleme: `useAsyncData(load)`; `load` `useCallback` ile verilmeli. Ekrana geri dönünce yenileme için `reload` değil
`reloadQuietly` kullanın: iOS'ta `RefreshControl`'ü programla açıp kapatmak ekran geçişinde boşluk / donmuş simge bırakıyor.

### Biyometrik giriş ve izinler

- `src/services/biometricAuth.ts` (Speak'teki kalıp): uygulama kilidi değil, çıkıştan sonra şifresiz giriş. Son
  başarılı girişin bilgileri yalnızca SecureStore'da; biyometrik kapalıyken çıkışta silinir. Teklif girişten sonra
  bir kez; Profil > Security'den aç/kapa (telefonda şifre yoksa bir kez sorar). Etiket cihazdan okunur
  (Face ID / Touch ID / Fingerprint). `invalid_credentials` → biyometrik kapanır.
- Mikrofon izni: `useMicPermission()` (Intro + Profil). Reddedilse de sınav başlar; speaking'de "teknik sorun" yolu var.

### Responsive

`useResponsive()` (`src/hooks/useResponsive.ts`, eşik 744). `Dimensions.get('window')` modül seviyesinde
kullanılmaz. Stil tablete bağlıysa `createStyles(isTablet)` + `useMemo` kalıbı. Telefon portre kilitli, tablet her
yöne döner (Speak ile aynı). Prototipte telefon `padX` 20, tablet 40.

## Güvenlik ilkesi

Kişisel cihazda uygulama kilitlenemez; "Secure mode" = caydırma + tespit + sunucuya olay kaydı.
**İstemciye güvenme:** süre, dinleme hakkı ve deneme sayısı sunucuda tutulur. Ayrıntılar ve plan için nota bakın.

## Git

- Commit'i kullanıcı istediğinde Claude atar; mesaj Türkçe, tek satır özet. **Co-Authored-By veya Claude'a dair
  ifade eklenmez**, commit kullanıcının git kimliğiyle atılır. Push yapılmaz.

## Kod Kuralları

- Yorumlar Türkçe, arayüz metinleri İngilizce.
- Alt kenar boşlukları sabit sayı olmaz: `useBottomSpacing()` (`src/hooks/useBottomSpacing.ts`) → `bottom(min)` =
  safe area + Android tablette dock payı (`theme.layout.androidTabletDockOffset`, 14). Doğrudan `insets.bottom` kullanmayın.
- **Klavye:** Android edge-to-edge çizildiği için pencere klavyeyle küçülmez; klavye payı elle verilir.
  - Sınav ekranı (`ExamSessionScreen`) `KeyboardAvoidingView` kullanmaz. `useKeyboardInset()` kutuyu pencere
    koordinatında ölçer ve klavyenin üst kenarıyla karşılaştırır. Klavye açılınca yalnızca alt çubuk `translateY` ile
    kaldırılır; içeriğe alttan boşluk eklenir.
  - **ScrollView'ın boyunu değiştirmeyin.** Boyu küçülürse Android odaktaki alanı görünür tutmak için sayfayı kendiliğinden
    kaydırır (`onSizeChanged`), `scrollsChildToFocus={false}` bunu durdurmaz. Alt çubuğun boyu da sabit kalmalı.
  - `KeyboardAvoidingView`'ın Android `height` modunu kullanmayın. İlk yüksekliği sakladığı için cihaz döndürülünce titrer,
    `flex: 0` verdiği için yatay satırda genişliği çöker. Ekranın kökündeyse (`y = 0`) `padding` modu iki platformda da
    doğru çalışır (Login).
- **Büyük harf metin:** `textTransform: 'uppercase'` kullanmayın. Cihaz diline uyuyor ve Türkçe cihazda "TİME LEFT"
  çıkıyor. Bunun yerine `<Kicker>` ya da `toUpperCaseEn()` (`src/components/Kicker.tsx`) kullanın.
- Native bağımlılık veya config plugin eklenince prebuild gerekir (dev client).

## Notlar

- [.claude/notes/sinav-akisi-ve-api-sozlesmesi.md](.claude/notes/sinav-akisi-ve-api-sozlesmesi.md): **tarihsel**
  (API öncesi sahte sunucu dönemi); güvenlik önlemi fikirleri ve açık ürün soruları için.
- [.claude/notes/mimari-ve-guvenlik-karari.md](.claude/notes/mimari-ve-guvenlik-karari.md): RN/Expo kararı, kişisel
  cihaz varsayımı, istemci/sunucu güvenlik önlemleri planı, prototip ekran listesi, açık konular (SSO, görseller, endpoint'ler).
- [.claude/notes/api-entegrasyon-plani.md](.claude/notes/api-entegrasyon-plani.md): gerçek API'ye geçiş planı
  (aşama 0–7), rehber ile mevcut kod arasındaki farklar, test hesabı kuralları, açık sorular. API'nin asıl kaynağı
  `_calismalar/BoostifyExam Mobil Uygulama Geliştirici Rehberi.docx`.
- [.claude/notes/iki-bilgisayar-kurulumu.md](.claude/notes/iki-bilgisayar-kurulumu.md): ikinci Mac'i hazırlama adımları,
  Ues Tech imzalama, karşılaşılan iOS kurulum hataları ve çözümleri, güncel durum.
