const IS_DEV = process.env.APP_VARIANT === 'development';

const BUNDLE_ID = 'com.uesturkey.boostifyexam';

module.exports = {
  expo: {
    scheme: "boostifyexam",
    name: IS_DEV ? "BoostifyExam DEV" : "BoostifyExam",
    slug: "boostifyexam",
    version: "1.0.0",
    orientation: "portrait",
    // TODO: icon, splash ve adaptive icon görselleri tasarımdan gelince eklenecek
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
      buildNumber: "1"
    },
    android: {
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
