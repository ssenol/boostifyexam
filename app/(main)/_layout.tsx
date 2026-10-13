import { Redirect, Stack } from 'expo-router';
import { useAppSelector } from '@/src/store/hooks';
import { selectIsAuthenticated } from '@/src/store/slices/authSlice';

// Oturum gerektiren tüm ekranlar bu grupta. Prototipte tab bar yok, ekranlar Stack ile ilerler.
export default function MainLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
