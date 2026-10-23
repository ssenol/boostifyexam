# İki bilgisayarda geliştirme kurulumu

Proje Dropbox ile iki Mac arasında senkronlanıyor. `node_modules`, `ios`, `android` senkronlanmaz
(`com.dropbox.ignored`); her makinede ayrıca kurulur. Claude oturum geçmişi ve hafızası da makineye özel
(`~/.claude`), aktarılması gereken bilgi bu klasördeki notlara yazılır.

## Yeni/ikinci bir Mac'i hazırlama

1. `n 22.14.0` (Node 22), `npm ci`, ardından `xattr -w com.dropbox.ignored 1 node_modules`.
2. `CI=1 npm run prebuild:dev -- --platform ios --clean` → bittiği an `xattr -w com.dropbox.ignored 1 ios`.
   Prebuild klasörü silip yeniden oluşturduğu için işaret kalkar; Pods kurulurken Dropbox yüklemeye
   başlamasın diye ikinci terminalde şu beklenebilir:
   `until [ -f ios/Podfile ]; do sleep 0.2; done; xattr -w com.dropbox.ignored 1 ios`
3. Xcode → Settings → Apple Accounts: **kendi Apple ID'n** (şirket ana hesabı değil). Takım **Ues Tech**
   (`9L497LXNLQ`, `app.config.js` → `ios.appleTeamId`). Signing ekranında Ues Tech için Apple Development
   sertifikasını Xcode kendisi oluşturur. "Revoke Certificate" uyarısı çıkarsa basmadan önce düşün: başka
   Mac'teki sertifikayı geçersiz kılar; tercihen `.p12` olarak taşınır.
4. Cihaz o Mac'le hiç eşleşmediyse bir kez kabloyla bağlanıp "Güven" denir (Xcode 27'de Device Hub).
5. `npm run ios` / `npm run ios:ipad`.
6. Android: JDK 17 (bkz. CLAUDE.md "Java sürümü"), `npm run prebuild:dev -- --platform android` → `xattr ... android`.

## Karşılaşılan hatalar

- `No code signing certificates are available` → 3. adım yapılmamış.
- `needs to be unlocked to enable development services` → cihazın kilidi açılmalı.
- `Provisioning profile ... doesn't include the currently selected device` → cihaz Ues Tech'e kayıtlı değil:
  `xcodebuild -workspace ios/BoostifyExamDEV.xcworkspace -scheme BoostifyExamDEV -configuration Debug -destination id=<UDID> -allowProvisioningUpdates -allowProvisioningDeviceRegistration build`
- `MismatchedApplicationIdentifierEntitlement` → cihazdaki uygulama başka takımla imzalı; uygulama silinip
  tekrar kurulur.
- `cannot find type '__ObjC::expo' in scope` / `failed to build module 'ExpoModulesCore'; this SDK is not supported
  by the compiler` → `node_modules/expo-modules-jsi/apple/Products` altındaki xcframework makinede (pod install
  sırasında) derleniyor ve eski kalmış. DerivedData silmek veya precompiled modülleri kapatmak çözmez:
  `bash node_modules/expo-modules-jsi/apple/scripts/clear-caches.sh && (cd ios && pod install)`, sonra build.
  (Mac B'de 13 Ekim'den kalma `node_modules` ile yaşandı.)
- Cihaz Ues Tech'e kayıtlı olduğu halde "doesn't include the currently selected device" → o Mac'teki profil eski;
  yukarıdaki `-allowProvisioningUpdates` komutu profili yeniler.
- Metro açıkken ikinci cihaza kurmak için `npm run ios:ipad` yerine:
  `xcrun devicectl device install app --device <UDID> <DerivedData>/Debug-iphoneos/BoostifyExam.app` +
  `xcrun devicectl device process launch --device <UDID> com.uesturkey.boostifyexam`

## Native paket eklendiğinde

Bir Mac'te native paket eklenince (`package.json` + `app.config.js` değişir) diğer Mac'te bir kez:
`npm ci` → `CI=1 npm run prebuild:dev -- --clean` → `xattr -w com.dropbox.ignored 1 ios android` → yeniden build.
`npm ci` sonrası `node_modules` işareti korunur (klasör silinmez), ama emin olmak için `xattr -p` ile bakılabilir.

- 2026-10-22: `expo-audio`, `react-native-webview`, `expo-print`, `expo-sharing`, `expo-screen-capture`,
  `expo-image`, `expo-local-authentication` eklendi (Mac B). Mac A'da yukarıdaki adımlar gerekli.

## Durum (2026-10-22)

- Mac A (Android Studio `~/Applications` altında): iOS iPhone + iPad'de çalıştı, Android debug build alındı.
- iPhone (`00008140-000D54510C41801C`) ve iPad (`00008122-000428AC2EBB801C`) Ues Tech'e kayıtlı, üzerlerindeki
  BoostifyExam Ues Tech imzalı. Diğer Mac'te cihaz kaydı / uygulama silme gerekmez.
- Mac B: `ios` prebuild'i Ues Tech ile yeniden alınıyor; ardından `npm run ios`.
- Sıradaki iş: simülatörde API servislerini test etmek (sınav servisleri hâlâ `src/mocks/examServer.ts`).
