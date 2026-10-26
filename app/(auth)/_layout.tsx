import { Stack } from 'expo-router';

// Oturum yokken önce karşılama, birkaç saniye sonra giriş (BW ile aynı)
export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
    </Stack>
  );
}
