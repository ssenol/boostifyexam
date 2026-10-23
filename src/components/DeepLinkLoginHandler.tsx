import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import authService from '../services/auth';
import biometricAuth from '../services/biometricAuth';
import { subscribeDeepLinkToken } from '../services/deepLinkToken';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { theme } from '../theme';
import { getErrorMessage, isApiError } from '../utils/errors';
import { useDialog } from './DialogProvider';

// Web'den SSO token'ıyla gelindiğinde girişi yapar. PersistGate ve DialogProvider içinde render edilmeli:
// rehydrate sonradan gelirse eski oturum yeni oturumun üzerine yazılırdı.
// Açık bir oturum varsa yalnızca giriş başarılı olunca linkle gelen öğrenciye geçilir; hata olursa
// mevcut oturum olduğu gibi kalır.
export default function DeepLinkLoginHandler() {
  const dispatch = useAppDispatch();
  const dialog = useDialog();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    return subscribeDeepLinkToken(async (ssoToken) => {
      setIsLoggingIn(true);
      try {
        const session = await authService.loginWithSsoToken(ssoToken);
        dispatch(setCredentials({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        }));
        // Başka öğrenciye geçildiyse önceki öğrencinin biyometrik kaydı kalmasın
        await biometricAuth.clearCredentialsIfOtherUser(session.user.username).catch(() => {});
      } catch (e) {
        dialog.alert({
          kicker: 'Sign in',
          title: 'Sign in failed',
          body: isApiError(e, 'students_only')
            ? getErrorMessage(e)
            : 'Automatic sign-in failed. Please open the app again from your school platform or sign in manually.',
        });
      } finally {
        setIsLoggingIn(false);
      }
    });
  }, [dispatch, dialog]);

  if (!isLoggingIn) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="auto">
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
});
