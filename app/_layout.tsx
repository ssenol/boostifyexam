import { Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold, useFonts } from '@expo-google-fonts/archivo';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import DeepLinkLoginHandler from '@/src/components/DeepLinkLoginHandler';
import DialogProvider from '@/src/components/DialogProvider';
import { persistor, store } from '@/src/store';
import { theme } from '@/src/theme';

// Splash screen'i font yüklenene kadar göster
// Native splash o view controller için henüz kayıtlı değilse (dev client'ın kendi splash
// döngüsüyle çakışma) reddedebilir — bu zararsız, sadece unhandled rejection'ı önlüyoruz
SplashScreen.preventAutoHideAsync().catch(() => {});

// Android'de manifest portre kilitli (telefonlar açılışta yan dönmesin diye). Tablette kilit açılır:
// Android'in büyük ekran tanımı en kısa kenarın 600dp ve üzeri olması. Cihaz sınıfı sabit olduğu için
// pencere değil ekran boyutu kullanılır. iOS'ta gerek yok, iPad yönleri Info.plist'ten gelir.
const ANDROID_TABLET_MIN_WIDTH_DP = 600;
if (Platform.OS === 'android') {
  const { width, height } = Dimensions.get('screen');
  if (Math.min(width, height) >= ANDROID_TABLET_MIN_WIDTH_DP) {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => {});
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            {/* Uygulama genelinde pencere (Alert.alert yerine); bütün ekranların üstünde */}
            <DialogProvider>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
                <Stack.Screen name="(main)" />
                <Stack.Screen name="(auth)" />
              </Stack>
              {/* SSO deep link'iyle giriş; rehydrate sonrası çalışmalı, hata penceresi için DialogProvider içinde */}
              <DeepLinkLoginHandler />
            </DialogProvider>
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}
