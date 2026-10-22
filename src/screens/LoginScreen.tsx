import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import BrandMark from '../components/BrandMark';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import { toUpperCaseEn } from '../components/Kicker';
import TextField from '../components/TextField';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import authService from '../services/auth';
import biometricAuth from '../services/biometricAuth';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { theme } from '../theme';
import type { AuthSession } from '../types/api';
import { ApiError, getErrorMessage, isApiError } from '../utils/errors';

const { colors, fonts } = theme;

const LEVELS = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];
// Placement ortadan (B1) başlar; progress öğrencinin son seviyesinden
const START_LEVEL_INDEX = 4;

const FACTS: [string, string][] = [
  ['≤ 40', 'Questions'],
  ['4', 'Skills + grammar'],
  ['10', 'CEFR levels'],
];

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

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
      Alert.alert('Sign in failed', getErrorMessage(new ApiError('credentials_required', 400, '')));
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
      Alert.alert('Sign in failed', getErrorMessage(e));
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
        Alert.alert('Sign in with your password', `Your password has changed. Sign in with your password to use ${biometricLabel} again.`);
      } else {
        Alert.alert('Sign in failed', getErrorMessage(e));
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
    } catch {
      // Biyometrik açılamazsa giriş yine tamamlanır
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

  // TODO: SSO akışı backend ile netleşince bağlanacak
  const handleSso = () => {
    Alert.alert('School account', 'Signing in with your school account is not available yet.');
  };

  const panel = (
    <View style={[styles.panel, { paddingTop: Math.max(24, insets.top) }]}>
      <BrandMark color={colors.bg} />

      <View style={styles.hero}>
        <Text style={styles.kicker}>{toUpperCaseEn('Placement · Progress')}</Text>
        <Text style={styles.heroTitle}>Find your level.</Text>
        <Text style={styles.heroText}>Adaptive English tests on the CEFR scale.</Text>
      </View>

      {isTablet && (
        <View style={styles.ladderWrap}>
          <View style={styles.ladderHeader}>
            <Text style={styles.ladderKicker}>{toUpperCaseEn('CEFR scale')}</Text>
            <Text style={styles.ladderNote}>Placement starts in the middle</Text>
          </View>
          <View style={styles.ladderBars}>
            {LEVELS.map((name, i) => (
              <View
                key={name}
                style={[
                  styles.ladderBar,
                  { height: 16 + i * 16, backgroundColor: i === START_LEVEL_INDEX ? colors.success : colors.accent300 },
                ]}
              />
            ))}
          </View>
          <View style={styles.ladderLabels}>
            {LEVELS.map((name, i) => (
              <Text
                key={name}
                style={[styles.ladderLabel, i === START_LEVEL_INDEX && styles.ladderLabelActive]}
              >
                {name}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={styles.facts}>
        {FACTS.map(([value, label], i) => (
          <View key={label} style={[styles.fact, i > 0 && styles.factDivided]}>
            <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
            <Text style={styles.factLabel} numberOfLines={1}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

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
        <Button label="School account (SSO)" variant="secondary" onPress={handleSso} disabled={loading || biometricLoading} />
      </View>

      <View style={styles.secureNote}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.neutral700} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect width={18} height={11} x={3} y={11} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Svg>
        <Text style={styles.secureNoteText}>Secure mode · answers saved as you go</Text>
      </View>
    </View>
  );

  return (
    // Ekranın kökünde (y = 0) olduğu için "padding" iki platformda da doğru hesaplar. Android'in "height" modu ilk
    // yüksekliği sakladığından cihaz döndürülünce yanlış çalışıyordu.
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      {isTablet ? (
        <View style={styles.tabletRow}>
          {panel}
          <ScrollView
            contentContainerStyle={[styles.formScroll, { paddingBottom: bottom(24) }]}
            keyboardShouldPersistTaps="handled"
          >
            {form}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottom(24) }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {panel}
          <View style={styles.formScroll}>{form}</View>
        </ScrollView>
      )}
      {offer && (
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
      )}
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
    tabletRow: {
      flex: 1,
      flexDirection: 'row',
    },
    panel: {
      backgroundColor: colors.accent,
      paddingHorizontal: padX,
      paddingBottom: isTablet ? 40 : 24,
      ...(isTablet && { width: '50%' }),
    },
    hero: {
      marginTop: isTablet ? 72 : 32,
      gap: 12,
      maxWidth: 460,
    },
    kicker: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      letterSpacing: 1.3,
      color: colors.bg,
    },
    heroTitle: {
      fontFamily: fonts.extraBold,
      fontSize: isTablet ? 56 : 36,
      lineHeight: isTablet ? 57 : 37,
      letterSpacing: isTablet ? -1.1 : -0.7,
      color: colors.bg,
    },
    heroText: {
      fontFamily: fonts.regular,
      fontSize: 16,
      lineHeight: 24,
      color: colors.bg,
    },
    ladderWrap: {
      marginTop: 'auto',
      gap: 12,
    },
    ladderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    ladderKicker: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      letterSpacing: 1.4,
      color: colors.bg,
    },
    ladderNote: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.bg,
    },
    ladderBars: {
      height: 160,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
    },
    ladderBar: {
      flex: 1,
    },
    ladderLabels: {
      flexDirection: 'row',
      gap: 4,
    },
    ladderLabel: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.bg,
    },
    ladderLabelActive: {
      fontFamily: fonts.extraBold,
    },
    facts: {
      marginTop: isTablet ? 32 : 28,
      flexDirection: 'row',
      borderTopWidth: 2,
      borderTopColor: colors.bg,
    },
    fact: {
      flex: 1,
      paddingTop: 12,
      gap: 6,
    },
    factDivided: {
      paddingLeft: 12,
      borderLeftWidth: 1,
      borderLeftColor: colors.accent300,
    },
    factValue: {
      fontFamily: fonts.extraBold,
      fontSize: isTablet ? 28 : 22,
      color: colors.bg,
    },
    factLabel: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.bg,
    },
    formScroll: {
      flexGrow: 1,
      justifyContent: isTablet ? 'center' : 'flex-start',
      paddingHorizontal: padX,
      paddingTop: 32,
    },
    form: {
      width: '100%',
      maxWidth: 400,
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
    secureNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderTopWidth: 2,
      borderTopColor: colors.divider,
      paddingTop: 12,
      marginTop: 8,
    },
    secureNoteText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.neutral700,
    },
  });
};
