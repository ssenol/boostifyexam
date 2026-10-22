const IS_DEV = process.env.APP_VARIANT === 'development';

const BUNDLE_ID = 'com.uesturkey.boostifyexam';

module.exports = {
  expo: {
    scheme: "boostifyexam",
    name: IS_DEV ? "BoostifyExam DEV" : "BoostifyExam",
    slug: "boostifyexam",
    version: "1.0.0",
    orientation: "portrait",
    // iOS ikonu alpha kanalsız olmalı (App Store reddeder); kaynak: _calismalar/ios-icon.png
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      requireFullScreen: false,
      infoPlist: {
        // iPhone portre kalır; iPad her yöne döner (expo-screen-orientation varsayılan maskeyi buradan okur)
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationPortrait"
        ],
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ],
        ITSAppUsesNonExemptEncryption: false
      },
      bundleIdentifier: IS_DEV ? `${BUNDLE_ID}.dev` : BUNDLE_ID,
      // Ues Tech; ios/ senkronlanmadığından takım her prebuild'de buradan yazılır
      appleTeamId: "9L497LXNLQ",
      buildNumber: "1"
    },
    android: {
      // Ön plan %90 ölçekli: Android'in maskesi kenarları kırptığında logo kesilmez
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#303fe0"
      },
      package: IS_DEV ? `${BUNDLE_ID}.dev` : BUNDLE_ID,
      // Manifest portre: telefonlar açılışta hiç yan dönmez. Tabletlerde kilit app/_layout.tsx'te çalışma anında açılır.
      screenOrientation: "portrait"
    },
    owner: "selcuksenol",
    plugins: [
      "expo-secure-store",
      "expo-router",
      "expo-font",
      "expo-screen-orientation",
      "expo-status-bar",
      // Write'taki ayar (en düzgün görünen splash orada): tam ekran görsel, arka plan görselin mavisi
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash.png",
          resizeMode: "cover",
          backgroundColor: "#303fe0",
          enableFullScreenImage_legacy: true
        }
      ],
      [
        "expo-audio",
        {
          // Speaking görevinde konuşma kaydı için
          microphonePermission: "BoostifyExam records your voice for the speaking task of your test.",
          // Sınavda uygulamadan çıkılınca ses çalmaya ya da kayda devam edilmez
          enableBackgroundPlayback: false,
          enableBackgroundRecording: false
        }
      ],
      "expo-image",
      "expo-sharing",
      [
        "expo-local-authentication",
        {
          // Çıkıştan sonra şifre yazmadan giriş (Profil'den açılıp kapanır)
          faceIDPermission: "BoostifyExam uses Face ID to sign you in without your password."
        }
      ],
      "./plugins/withPodsDeploymentTarget",
      [
        "expo-build-properties",
        {
          ios: {
            // Xcode 27 / iOS 27 SDK UIScene yaşam döngüsünü zorunlu kılıyor (SDK 58'de varsayılan olacak)
            enableSceneSupport: true
          }
        }
      ]
    ],
    extra: {
      router: {},
      eas: {
        projectId: "f1038a0c-ba86-488a-9d29-e1284ed38ebe"
      }
    }
  }
};
