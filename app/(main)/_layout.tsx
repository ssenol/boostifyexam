import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import authService from '@/src/services/auth';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { selectIsAuthenticated, setUser } from '@/src/store/slices/authSlice';

// Oturum gerektiren tüm ekranlar bu grupta. Prototipte tab bar yok, ekranlar Stack ile ilerler.
export default function MainLayout() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Açılışta önbellekteki profili güncelle. Hata sessizce geçilir: oturum düşmüşse API katmanı çıkış yaptırır.
  useEffect(() => {
    if (!isAuthenticated) return;
    authService.me().then((user) => dispatch(setUser(user))).catch(() => {});
  }, [isAuthenticated, dispatch]);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
