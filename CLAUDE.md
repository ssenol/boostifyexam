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
    ├── index.tsx        # Assignments (Open / Completed)
    ├── exam/[id]/
    │   ├── index.tsx    # Intro: kurallar + cihaz kontrolü
    │   ├── session.tsx  # Sınav (gestureEnabled: false). Intro'dan replace ile açılır
    │   └── result.tsx   # Sonuç. Session'dan replace ile açılır
    └── report/[id].tsx  # Rapor (?from=assign|result)
```

`app/**` dosyaları ince sarmalayıcıdır; ekranın kendisi `src/screens/*.tsx`'te. Yeni ekran: önce `src/screens/`,
sonra `app/` altında route dosyası. `@/*` path alias'ı kök dizini gösterir. Tüm kod TypeScript (strict).

### Redux store

`src/store/index.ts`. Şu an yalnızca `auth` slice'ı var. `secureAuthStorage.ts` ile persist edilir:
`accessToken`/`refreshToken` SecureStore'da, kalan alanlar AsyncStorage'da. Yeni slice eklerken `persistConfig` +
`whitelist` açıkça yazılır. Hooks: `useAppSelector` / `useAppDispatch` (`src/store/hooks.ts`).

Çıkış her zaman `src/utils/logoutHelper.ts` → `performLogout` üzerinden yapılır. Kullanıcıya ait yeni cache'ler de
orada temizlenmeli.

### Sınav akışı

- **Sahte sunucu:** API henüz yok. `src/services/exam.ts` → `src/mocks/examServer.ts`. Ekranlar sadece servisi çağırır; API gelince yalnızca servis değişir. Tipler `src/types/exam.ts`.
- **Sunucu otoritesi:** Süre, soru sırası, dinleme hakkı ve olaylar sunucuda. İstemci kalan süreyi sadece gösterim için sayar. Sözleşme: `.claude/notes/sinav-akisi-ve-api-sozlesmesi.md`.
- **`useExamSession`:** Sunucunun son görüntüsünü (snapshot) tutar. İstekleri sırayla gönderir, kalan süreyi sayar, bağlantı durumunu (`saveState`) tutar.
- **`useExamGuard`:** Ayrılma (AppState, Android blur), ekran bölme ve Android geri tuşu tespiti. Ayrılınca pause + olay kaydı; dönünce güvenlik uyarısı.
- **Ekran bileşenleri:** `ExamSessionScreen` + `src/components/exam/*`. Telefonda `ExamTopBar`, tablette 300px `ExamSidePanel`. Okuma metni tablette yan panelde, telefonda Text/Question sekmeleriyle. Diğer parçalar: overlay'ler (`Dialog`), `Watermark`, `ResumeView`.
- **Simüle edilenler:** Ses çalma, kayıt, cihaz kontrolü, ekran görüntüsü engeli ve görseller henüz simüle; native paket gerekiyor (bkz. not).

### API katmanı

`src/config/api.ts`: tek axios instance + `API_ENDPOINTS`. Access token 24 saatten eskiyse istekten önce yenilenir.
401 alan istek bir kez refresh ile tekrar denenir, olmazsa `logout()`. Component'ler doğrudan axios çağırmaz;
çağrılar `src/services/` altındaki servis dosyalarından yapılır.

### Tema

`src/theme/index.ts`: prototipin token'ları (`colors`, `fonts`, `space`, `layout`). Dark mode yok. Köşe yarıçapı
tasarımda bilerek 0. Font: Archivo 400/600/800 (`fonts.regular/semiBold/extraBold`). Tekrarlanan metin stilleri `typography`
(`kicker`, `kickerAccent`, `body`, `muted`). Ortak bileşenler (`src/components/`):
- `Button`: `primary` / `secondary` / `ghost` varyantları; `large` / `medium` / `compact` boyutları; `trailing` true ise ok ikonu.
- `Tag`, `ScreenHeader`, `Dialog`, `Toast` + `useToast`, `StateView` (yükleniyor / hata), `ImagePlaceholder`.
- `icons.tsx`: prototipteki Lucide path'leri.

Veri yükleme: `useAsyncData(load)`; `load` `useCallback` ile verilmeli.

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

- [.claude/notes/sinav-akisi-ve-api-sozlesmesi.md](.claude/notes/sinav-akisi-ve-api-sozlesmesi.md): ekran akışı,
  sunucudan beklenen davranış ve önerilen endpoint'ler, istemcideki secure mode önlemleri, simüle edilenler,
  prototipten bilinçli farklar, açık ürün soruları.
- [.claude/notes/mimari-ve-guvenlik-karari.md](.claude/notes/mimari-ve-guvenlik-karari.md): RN/Expo kararı, kişisel
  cihaz varsayımı, istemci/sunucu güvenlik önlemleri planı, prototip ekran listesi, açık konular (SSO, görseller, endpoint'ler).
- [.claude/notes/api-entegrasyon-plani.md](.claude/notes/api-entegrasyon-plani.md): gerçek API'ye geçiş planı
  (aşama 0–7), rehber ile mevcut kod arasındaki farklar, test hesabı kuralları, açık sorular. API'nin asıl kaynağı
  `_calismalar/BoostifyExam Mobil Uygulama Geliştirici Rehberi.docx`.
- [.claude/notes/iki-bilgisayar-kurulumu.md](.claude/notes/iki-bilgisayar-kurulumu.md): ikinci Mac'i hazırlama adımları,
  Ues Tech imzalama, karşılaşılan iOS kurulum hataları ve çözümleri, güncel durum.
