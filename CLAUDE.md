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
npm run ios                            # iOS'ta çalıştır (iPhone 16 fiziksel cihaz)
npm run android
npm run typecheck                      # tsc --noEmit
npm run lint                           # expo lint
npx expo prebuild --clean              # Native projeleri (ios/android) yeniden üret
```

**Node sürümü:** Node 22 gerekli (sürüm `n` ile değiştiriliyor). Node 16 ile Expo CLI `Blob is not defined` hatası verir;
böyle bir hata görülürse önce `node -v` kontrol edin.

Proje Dropbox'ta: `node_modules` ve prebuild sonrası `ios`/`android` için `xattr -w com.dropbox.ignored 1 <klasör>`
uygulanmalı. Xcode 27 / Device Hub notları için Speak'in `CLAUDE.md`'sine bakın.

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
    └── index.tsx        # Assignments
```

`app/**` dosyaları ince sarmalayıcıdır; ekranın kendisi `src/screens/*.tsx`'te. Yeni ekran: önce `src/screens/`,
sonra `app/` altında route dosyası. `@/*` path alias'ı kök dizini gösterir. Tüm kod TypeScript (strict).

### Redux store

`src/store/index.ts`. Şu an yalnızca `auth` slice'ı var. `secureAuthStorage.ts` ile persist edilir:
`accessToken`/`refreshToken` SecureStore'da, kalan alanlar AsyncStorage'da. Yeni slice eklerken `persistConfig` +
`whitelist` açıkça yazılır. Hooks: `useAppSelector` / `useAppDispatch` (`src/store/hooks.ts`).

Çıkış her zaman `src/utils/logoutHelper.ts` → `performLogout` üzerinden yapılır. Kullanıcıya ait yeni cache'ler de
orada temizlenmeli.

### API katmanı

`src/config/api.ts`: tek axios instance + `API_ENDPOINTS`. Access token 24 saatten eskiyse istekten önce yenilenir.
401 alan istek bir kez refresh ile tekrar denenir, olmazsa `logout()`. Component'ler doğrudan axios çağırmaz;
çağrılar `src/services/` altındaki servis dosyalarından yapılır.

### Tema

`src/theme/index.ts`: prototipin token'ları (`colors`, `fonts`, `space`, `layout`). Dark mode yok. Köşe yarıçapı
tasarımda bilerek 0. Font: Archivo 400/600/800 (`fonts.regular/semiBold/extraBold`). Ortak bileşenler: `Button`
(primary/secondary), `TextField`, `BrandMark`.

### Responsive

`useResponsive()` (`src/hooks/useResponsive.ts`, eşik 744). `Dimensions.get('window')` modül seviyesinde
kullanılmaz. Stil tablete bağlıysa `createStyles(isTablet)` + `useMemo` kalıbı. Telefon portre kilitli, tablet her
yöne döner (Speak ile aynı). Prototipte telefon `padX` 20, tablet 40.

## Güvenlik ilkesi

Kişisel cihazda uygulama kilitlenemez; "Secure mode" = caydırma + tespit + sunucuya olay kaydı.
**İstemciye güvenme:** süre, dinleme hakkı ve deneme sayısı sunucuda tutulur. Ayrıntılar ve plan için nota bakın.

## Kod Kuralları

- Yorumlar Türkçe, arayüz metinleri İngilizce.
- Alt kenar boşlukları sabit sayı olmaz, `useSafeAreaInsets()` ile hesaplanır.
- Native bağımlılık veya config plugin eklenince prebuild gerekir (dev client).

## Notlar

- [.claude/notes/mimari-ve-guvenlik-karari.md](.claude/notes/mimari-ve-guvenlik-karari.md): RN/Expo kararı, kişisel
  cihaz varsayımı, istemci/sunucu güvenlik önlemleri planı, prototip ekran listesi, açık konular (SSO, görseller, endpoint'ler).
