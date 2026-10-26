import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import { useDialog } from '../components/DialogProvider';
import TextField from '../components/TextField';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import authService from '../services/auth';
import biometricAuth, { BiometricError } from '../services/biometricAuth';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { theme } from '../theme';
import type { AuthSession } from '../types/api';
import { ApiError, getErrorMessage, isApiError } from '../utils/errors';

const { colors, fonts } = theme;

// Geliştirmede form demo hesapla dolu gelir. Değerler git dışı .env.local'dan okunur (repoda şifre yok);
// yayın build'inde __DEV__ false olduğu için boştur.
const DEV_USERNAME = __DEV__ ? (process.env.EXPO_PUBLIC_DEV_USERNAME ?? '') : '';
const DEV_PASSWORD = __DEV__ ? (process.env.EXPO_PUBLIC_DEV_PASSWORD ?? '') : '';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const [username, setUsername] = useState(DEV_USERNAME);
  const [password, setPassword] = useState(DEV_PASSWORD);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const dialog = useDialog();

  // Biyometrik giriş düğmesinin etiketi ("Face ID"); kapalıysa ya da bilgi yoksa null
  const [biometricLabel, setBiometricLabel] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  // Şifreyle girişten sonra biyometrik teklifi gösterilirken oturum burada bekler
  const [offer, setOffer] = useState<{ session: AuthSession; label: string } | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);

  // Yönlendirme yok: isAuthenticated değişince (auth)/login.tsx Redirect ile ana ekrana geçer
  const enterApp = (session: AuthSession) => {
    dispatch(setCredentials({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    }));
  };

  const refreshBiometric = useCallback(async () => {
    const [enabled, credentials, availability] = await Promise.all([
      biometricAuth.isEnabled(),
      biometricAuth.getCredentials(),
      biometricAuth.getAvailability(),
    ]);
    setBiometricLabel(enabled && credentials && availability.enrolled ? availability.label : null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshBiometric().catch(() => setBiometricLabel(null));
    }, [refreshBiometric]),
  );

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      dialog.alert({ kicker: 'Sign in', title: 'Sign in failed', body: getErrorMessage(new ApiError('credentials_required', 400, '')) });
      return;
    }

    try {
      setLoading(true);
      const credentials = { username: username.trim(), password };
      const session = await authService.login(credentials.username, credentials.password);
      // Son başarılı giriş; biyometrik sonradan Profil'den açılırsa bu kullanılır
      await biometricAuth.saveCredentials(credentials).catch(() => {});

      // Biyometrik giriş bir kez teklif edilir (cihazda kayıtlı yüz / parmak izi varsa)
      const [enabled, shown, availability] = await Promise.all([
        biometricAuth.isEnabled(),
        biometricAuth.wasPromptShown(),
        biometricAuth.getAvailability(),
      ]);
      if (!enabled && !shown && availability.enrolled) {
        setOffer({ session, label: availability.label });
        return;
      }
      enterApp(session);
    } catch (e) {
      dialog.alert({ kicker: 'Sign in', title: 'Sign in failed', body: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricLabel) return;
    setBiometricLoading(true);
    try {
      const credentials = await biometricAuth.getCredentials();
      if (!credentials) {
        setBiometricLabel(null);
        return;
      }
      if (!(await biometricAuth.authenticate(`Sign in with ${biometricLabel}`))) return;
      enterApp(await authService.login(credentials.username, credentials.password));
    } catch (e) {
      // Şifre değiştiyse saklanan bilgi geçersiz: biyometrik kapanır, şifreyle girilir
      if (isApiError(e, 'invalid_credentials')) {
        await biometricAuth.disable().catch(() => {});
        setBiometricLabel(null);
        dialog.alert({
          kicker: biometricLabel,
          title: 'Sign in with your password',
          body: `Your password has changed. Sign in with your password to use ${biometricLabel} again.`,
        });
      } else {
        dialog.alert({ kicker: 'Sign in', title: 'Sign in failed', body: getErrorMessage(e) });
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const acceptOffer = async () => {
    if (!offer) return;
    setOfferBusy(true);
    try {
      // Önce doğrulat: hem çalıştığı görülür hem iOS'un Face ID izni burada sorulur
      if (await biometricAuth.authenticate(`Turn on ${offer.label}`)) {
        await biometricAuth.setEnabled(true);
      }
    } catch (e) {
      // Biyometrik açılamazsa giriş yine tamamlanır; izin kapalı / tanınmadı gibi durumlarda nedeni gösterilir
      if (e instanceof BiometricError) {
        dialog.alert({ kicker: offer.label, title: `Could not turn on ${offer.label}`, body: `${e.message} You can turn it on later in your profile.` });
      }
    } finally {
      await biometricAuth.markPromptShown().catch(() => {});
      setOfferBusy(false);
      enterApp(offer.session);
    }
  };

  const declineOffer = async () => {
    if (!offer) return;
    await biometricAuth.markPromptShown().catch(() => {});
    enterApp(offer.session);
  };

  const form = (
    <View style={styles.form}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Sign in</Text>
        <Text style={styles.formSubtitle}>Use the account your school gave you.</Text>
      </View>

      <TextField
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <View style={styles.actions}>
        <Button
          label="Sign in"
          onPress={handleLogin}
          loading={loading}
          trailing={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12h14" />
              <Path d="m12 5 7 7-7 7" />
            </Svg>
          }
        />
        {biometricLabel && (
          <Button
            label={`Sign in with ${biometricLabel}`}
            variant="secondary"
            onPress={handleBiometricLogin}
            loading={biometricLoading}
            disabled={loading}
          />
        )}
      </View>
    </View>
  );

  const offerDialog = offer && (
    <Dialog
      kicker="Faster sign-in"
      title={`Use ${offer.label} next time?`}
      body={`Sign in with ${offer.label} instead of your password. You can change this in your profile.`}
      primaryLabel={`Use ${offer.label}`}
      onPrimary={acceptOffer}
      secondaryLabel="Not now"
      onSecondary={declineOffer}
      busy={offerBusy}
    />
  );

  return (
    // Ekranın kökünde (y = 0) olduğu için "padding" iki platformda da doğru hesaplar. Android'in "height" modu ilk
    // yüksekliği sakladığından cihaz döndürülünce yanlış çalışıyordu.
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      {/* Welcome'ın açık durum çubuğu replace sonrası kalıyordu */}
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: bottom(24) }]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.column}>
          <Logo height={isTablet ? 30 : 24} />
          {form}
        </View>
        {/* Welcome kendini replace ile login'e çevirdiği için burada da replace: stack'te tek ekran kalır */}
        <Pressable
          style={styles.backLink}
          onPress={() => router.replace('/welcome')}
          disabled={loading || biometricLoading}
          hitSlop={12}
          accessibilityRole="link"
        >
          <Text style={styles.backLinkText}>← Back to welcome</Text>
        </Pressable>
      </ScrollView>
      {offerDialog}
    </KeyboardAvoidingView>
  );
}

const createStyles = (isTablet: boolean) => {
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: padX,
    },
    // Logo + form kalan alanın ortasında, bağlantı en altta; klavye açılınca alan küçülür ve birlikte yukarı çıkar
    column: {
      marginVertical: 'auto',
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      gap: isTablet ? 48 : 40,
    },
    form: {
      width: '100%',
      gap: 16,
    },
    formHeader: {
      gap: 6,
      marginBottom: 8,
    },
    formTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 28,
      lineHeight: 32,
      color: colors.text,
    },
    formSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.neutral700,
    },
    actions: {
      gap: 8,
      marginTop: 8,
    },
    backLink: {
      alignSelf: 'center',
      marginTop: 32,
    },
    backLinkText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.neutral700,
    },
  });
};
