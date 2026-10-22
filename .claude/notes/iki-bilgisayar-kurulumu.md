# İki bilgisayarda geliştirme kurulumu

Proje Dropbox ile iki Mac arasında senkronlanıyor. `node_modules`, `ios`, `android` senkronlanmaz
(`com.dropbox.ignored`); her makinede ayrıca kurulur. Claude oturum geçmişi ve hafızası da makineye özel
(`~/.claude`), aktarılması gereken bilgi bu klasördeki notlara yazılır.

## Yeni/ikinci bir Mac'i hazırlama

1. `n 22.14.0` (Node 22), `npm ci`, ardından `xattr -w com.dropbox.ignored 1 node_modules`.
2. `npx expo prebuild --platform ios --clean` → bittiği an `xattr -w com.dropbox.ignored 1 ios`.
   Prebuild klasörü silip yeniden oluşturduğu için işaret kalkar; Pods kurulurken Dropbox yüklemeye
   başlamasın diye ikinci terminalde şu beklenebilir:
   `until [ -f ios/Podfile ]; do sleep 0.2; done; xattr -w com.dropbox.ignored 1 ios`
3. Xcode → Settings → Apple Accounts: **kendi Apple ID'n** (şirket ana hesabı değil). Takım **Ues Tech**
   (`9L497LXNLQ`, `app.config.js` → `ios.appleTeamId`). Signing ekranında Ues Tech için Apple Development
   sertifikasını Xcode kendisi oluşturur. "Revoke Certificate" uyarısı çıkarsa basmadan önce düşün: başka
   Mac'teki sertifikayı geçersiz kılar; tercihen `.p12` olarak taşınır.
4. Cihaz o Mac'le hiç eşleşmediyse bir kez kabloyla bağlanıp "Güven" denir (Xcode 27'de Device Hub).
5. `npm run ios` / `npm run ios:ipad`.
6. Android: JDK 17 (bkz. CLAUDE.md "Java sürümü"), `npx expo prebuild --platform android` → `xattr ... android`.

## Karşılaşılan hatalar

- `No code signing certificates are available` → 3. adım yapılmamış.
- `needs to be unlocked to enable development services` → cihazın kilidi açılmalı.
- `Provisioning profile ... doesn't include the currently selected device` → cihaz Ues Tech'e kayıtlı değil:
  `xcodebuild -workspace ios/BoostifyExam.xcworkspace -scheme BoostifyExam -configuration Debug -destination id=<UDID> -allowProvisioningUpdates -allowProvisioningDeviceRegistration build`
- `MismatchedApplicationIdentifierEntitlement` → cihazdaki uygulama başka takımla imzalı; uygulama silinip
  tekrar kurulur.
- Metro açıkken ikinci cihaza kurmak için `npm run ios:ipad` yerine:
  `xcrun devicectl device install app --device <UDID> <DerivedData>/Debug-iphoneos/BoostifyExam.app` +
  `xcrun devicectl device process launch --device <UDID> com.uesturkey.boostifyexam`

## Durum (2026-10-22)

- Mac A (Android Studio `~/Applications` altında): iOS iPhone + iPad'de çalıştı, Android debug build alındı.
- iPhone (`00008140-000D54510C41801C`) ve iPad (`00008122-000428AC2EBB801C`) Ues Tech'e kayıtlı, üzerlerindeki
  BoostifyExam Ues Tech imzalı. Diğer Mac'te cihaz kaydı / uygulama silme gerekmez.
- Mac B: `ios` prebuild'i Ues Tech ile yeniden alınıyor; ardından `npm run ios`.
- Sıradaki iş: simülatörde API servislerini test etmek (sınav servisleri hâlâ `src/mocks/examServer.ts`).
