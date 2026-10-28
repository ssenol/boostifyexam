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
CI=1 npm run prebuild:dev -- --clean   # Native projeleri (ios/android) dev varyantıyla yeniden üret
npm run icons:dev                      # Normal ikonlardan DEV etiketli ikonları üret
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
Xcode açıkken (özellikle prebuild'in sildiği eski workspace açık kalmışsa) `npm run ios` build alıp kurar ama telefonda
başlatma adımında (`devicectl process launch`) takılır; uygulama elle açılınca da splash'te kalır, süreç hiç başlamaz.
Çözüm: Xcode'u kapatıp uygulamayı yeniden açmak.

Proje Dropbox'ta: `node_modules` ve prebuild sonrası `ios`/`android` için `xattr -w com.dropbox.ignored 1 <klasör>`
uygulanmalı. Prebuild klasörü silip yeniden oluşturduğu için işaret kalkar; prebuild'den **sonra** tekrar uygulayın.
Bu klasörler senkronlanmadığından her bilgisayarda ayrıca `npm ci` + `npm run prebuild:dev` gerekir. Xcode 27 / Device Hub notları için Speak'in `CLAUDE.md`'sine bakın.

### Build varyantları ve ikonlar

BS / BW ile birebir aynı standart: `~/.claude/notes/expo-dev-varyant.md`.
- Yerel script'ler (`start`, `ios*`, `android`, `prebuild:dev`) `APP_VARIANT=development` ile çalışır: uygulama
  "BoostifyExam DEV" adıyla, `com.uesturkey.boostifyexam.dev` bundle id'siyle ve `boostifyexam-dev` scheme'iyle store
  sürümünün yanına kurulur. iOS projesi `ios/BoostifyExamDEV.xcworkspace`. Store build'i yalnızca EAS `production`.
- **Çıplak `npx expo prebuild` çalıştırmayın**: prod varyantı üretir. Xcode'un "Update to recommended settings"
  önerisini kabul etmeyin (Pods deployment target bozulur; olduysa `cd ios && pod install`).
- Görseller `assets/images/`: `icon.png` / `icon-dark.png` (iOS açık/koyu), `adaptive-icon.png` (Android), `splash.png`
  (iki varyantta aynı). Figma çıktıları `_calismalar/` (`ios-icon-light/dark.png`, `android-icon.png`). Dev ikonları
  elle düzenlenmez: normal ikon değişince `npm run icons:dev` (`dev-badge.png` bindirilir) → `npm run prebuild:dev`.
- Dev araçları `__DEV__` yerine `IS_DEV_MODE` (`src/config/env.ts`) ile sarılır.
- **TestFlight:** `npx eas-cli build -p ios --profile production --auto-submit` (etkileşimli, kullanıcı çalıştırır).
  Build numarası EAS'te artar (`appVersionSource: remote`); sürüm `app.config.js` → `version`. App Store Connect
  ID 6827877844 (`eas.json` → `submit`), Ues Tech takımı, Speak/Write ile aynı sertifika ve ASC API anahtarı.
  "Team (Expo)" TestFlight grubu yeni build'i kendiliğinden alır. İlk yükleme 28.10.2026.
- `react-native-worklets` / `react-native-reanimated` `package.json`'da **açıkça ve SDK sürümünde** durmalı
  (`npx expo install`; şu an 0.10.1 / 4.5.1, BS/BW ile aynı). Yoksa expo-router üzerinden daha yeni bir worklets (0.13)
  gelir, `expo-modules-core` onu desteklemez ve uygulama açılışta splash'te çöker
  (`Assertion failed: (isObject()), function getObject, file jsi.h`, iz `WorkletsModule start`).

Test altyapısı yok; doğrulama `npm run typecheck` + `npm run lint` + fiziksel cihaz.

## Mimari

### Routing: Expo Router (dosya tabanlı)

```
app/
├── _layout.tsx          # Fontlar (Archivo), Redux Provider, PersistGate, Stack((main)|(auth))
├── (auth)/
│   ├── _layout.tsx      # initialRouteName: welcome
│   ├── welcome.tsx      # Karşılama (splash mavisi, CEFR merdiveni), 2,2 sn sonra ya da dokununca login'e replace
│   └── login.tsx        # Giriş yapılmışsa "/"'a Redirect (welcome da öyle)
└── (main)/
    ├── _layout.tsx      # Auth koruması: giriş yoksa "/welcome"'a Redirect. Tab bar YOK, Stack.
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

### Deep link ile SSO girişi

BS / BW ile aynı akış. Okul platformundan gelen öğrenci service.ueslms üzerinden `boostifyexam://login?token=<şifreli SSO
token>` ile app'e düşer (dev sürümünde scheme `boostifyexam-dev`).
- `app/+native-intent.tsx` `token` taşıyan her linki `/`'e çevirir, token'ı `src/services/deepLinkToken.ts` kuyruğuna koyar.
- `src/components/DeepLinkLoginHandler.tsx` (PersistGate + DialogProvider içinde) `authService.loginWithSsoToken()` →
  `POST /auth/sso-mobile` `{ token }` (yanıt `/auth/login` ile aynı `AuthSession`, `students_only` dahil).
  **Bu uç `/mobile/exam` altında sunucuda henüz yok (404).** BS/BW'daki genel `/auth/sso-mobile` kullanılamaz: genel
  access token sınav uçlarında geçiyor ama refresh token'ı `/mobile/exam/auth/refresh` `refresh_invalid` ile reddediyor
  (23.10.2026'da denendi), yani öğrenci access token'ın süresi dolunca (sınav ortasında da) çıkışa düşer. Backend'den
  istenen: token çözme / 5 dk / öğrenci kontrolü genel uçla aynı, yanıt `/mobile/exam/auth/login` ile aynı. İstemci hazır.
- Açık oturum yalnızca giriş başarılıysa değişir; `/auth/*` istekleri access token göndermez, 401'de yenilemez.
  Yenileme sürerken oturum değişirse (`refresh_revoked`) yeni oturum kapatılmaz. Öğrenci değişince `(main)` Stack'i
  `key={userId}` ile yeniden kurulur (önceki öğrencinin açık sınavı kalmaz).
- Kayıtlı biyometrik bilgiler başka öğrenciye aitse `biometricAuth.clearCredentialsIfOtherUser()` siler ve kapatır.
- Web tarafı: service-ueslms `#/boostifyexam?sso=...` (`BoostifyApp.vue`, `app: 'exam'`; `&dev=1` dev sürümünü,
  `&debug=1` adımları gösterir), token'ı ueslms `BoostifyEduController` üretir (`MOBILE_APPS`'te `exam`).
  Ayrıntı: `ues/ueslms/.claude/notes/boostifyedu-mobil-sso.md`.
  23.10.2026'da test edildi: öğrenci linki DEV'i açıp sunucu ucu olmadığı için "Automatic sign-in failed" gösterdi,
  öğretmen reddedildi, debug modu adımları gösterdi.
- Test: cihazda Safari/Notlar'dan `boostifyexam-dev://login?token=<token>`. Geçersiz token → "Automatic sign-in failed".

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
İkon / splash: `assets/images/` (bkz. "Build varyantları ve ikonlar"). Dark mode yok. Köşe yarıçapı
tasarımda bilerek 0. Font: Archivo 400/600/800 (`fonts.regular/semiBold/extraBold`). Tekrarlanan metin stilleri `typography`
(`kicker`, `kickerAccent`, `body`, `muted`). Ortak bileşenler (`src/components/`):
- `Button`: `primary` (turuncu ana eylem) / `dark` (siyah, belirgin ama ana eylem değil: Sign out) / `secondary` / `ghost` varyantları; `large` / `medium` / `compact` boyutları; `trailing` true ise ok ikonu.
- **Pencereler:** `Alert.alert` kullanılmaz. Uygulama genelinde `useDialog()` (`src/components/DialogProvider.tsx`,
  kökte): `alert({ title, body })` tek düğmeli, `confirm({...})` onay (birincil true). Sınav ekranının kendi pencereleri
  (Pause, çıkış uyarıları, görev onayları) yerel `Dialog`. Ana düğme varsayılan turuncu; çıkış gibi eylemlerde
  `primaryVariant: 'dark'`.
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
