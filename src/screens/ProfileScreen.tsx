import { router, useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Kicker from '../components/Kicker';
import ScreenHeader from '../components/ScreenHeader';
import TextField from '../components/TextField';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useMicPermission from '../hooks/useMicPermission';
import useResponsive from '../hooks/useResponsive';
import authService from '../services/auth';
import biometricAuth, { type BiometricAvailability } from '../services/biometricAuth';
import { store } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentUser, setCredentials, setUser } from '../store/slices/authSlice';
import { theme } from '../theme';
import { getErrorMessage, isApiError } from '../utils/errors';
import { formatDate } from '../utils/format';
import { performLogout } from '../utils/logoutHelper';

const { colors, fonts, typography } = theme;

// Profil: GET /me ile güncellenir, çıkış buradan yapılır
export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const mic = useMicPermission();
  const [biometric, setBiometric] = useState<{ availability: BiometricAvailability; enabled: boolean } | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  // Biyometrik açılırken telefonda şifre yoksa (ör. özellikten önce açılmış oturum) şifre bir kez sorulur
  const [passwordPrompt, setPasswordPrompt] = useState<{ value: string; error: string | null; busy: boolean } | null>(null);

  const loadBiometric = useCallback(async () => {
    const [availability, enabled] = await Promise.all([biometricAuth.getAvailability(), biometricAuth.isEnabled()]);
    setBiometric({ availability, enabled });
  }, []);

  // Ayarlar'dan yüz / parmak izi eklenip dönülmüş olabilir
  useFocusEffect(
    useCallback(() => {
      loadBiometric().catch(() => {});
    }, [loadBiometric]),
  );

  // Face ID ile doğrulatıp açar
  const enableBiometric = async (label: string) => {
    if (!(await biometricAuth.authenticate(`Turn on ${label}`))) return;
    await biometricAuth.markPromptShown();
    await biometricAuth.setEnabled(true);
  };

  const toggleBiometric = async (next: boolean) => {
    if (!biometric) return;
    const { label } = biometric.availability;
    setBiometricBusy(true);
    try {
      if (!next) {
        await biometricAuth.setEnabled(false);
      } else if (!(await biometricAuth.getCredentials())) {
        setPasswordPrompt({ value: '', error: null, busy: false });
        return;
      } else {
        await enableBiometric(label);
      }
      await loadBiometric();
    } catch {
      Alert.alert(label, 'This setting could not be changed. Try again.');
    } finally {
      setBiometricBusy(false);
    }
  };

  // Şifre sunucuda doğrulanır (/auth/login yeni oturum açar: telefonda ona geçilir, eskisi sunucuda kapatılır)
  const confirmPassword = async () => {
    if (!biometric || !user || !passwordPrompt) return;
    const password = passwordPrompt.value;
    if (!password) {
      setPasswordPrompt({ ...passwordPrompt, error: 'Enter your password.' });
      return;
    }
    setPasswordPrompt({ ...passwordPrompt, busy: true, error: null });
    try {
      const session = await authService.login(user.username, password);
      const oldRefreshToken = store.getState().auth.refreshToken;
      dispatch(setCredentials({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user }));
      if (oldRefreshToken) authService.logout(oldRefreshToken).catch(() => {});
      await biometricAuth.saveCredentials({ username: user.username, password });
      setPasswordPrompt(null);
      await enableBiometric(biometric.availability.label);
      await loadBiometric();
    } catch (e) {
      const error = isApiError(e, 'invalid_credentials') ? 'The password is not correct.' : getErrorMessage(e);
      setPasswordPrompt((p) => (p ? { ...p, busy: false, error } : p));
    }
  };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      dispatch(setUser(await authService.me()));
    } catch {
      // Önbellekteki profil gösterilmeye devam eder
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  if (!user) return null;

  const fullName = [user.name, user.lastName].filter(Boolean).join(' ');
  const level = user.englishLevel;
  const details: [string, string][] = [
    ['School', user.schoolName],
    ['Campus', user.campusName],
    ['Class', user.className],
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader backLabel="Assignments" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom(16) + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      >
        <View style={styles.titleBlock}>
          <Kicker>Profile</Kicker>
          <Text style={styles.name} accessibilityRole="header">{fullName}</Text>
          <Text style={typography.muted}>{user.username}</Text>
        </View>

        <View style={styles.levelCard}>
          <Kicker>English level</Kicker>
          {level ? (
            <>
              <Text style={styles.level}>{level.cefrLevel}</Text>
              <Text style={typography.muted}>{`Measured ${formatDate(level.measuredAt)}`}</Text>
            </>
          ) : (
            <>
              <Text style={styles.levelEmpty}>Not measured yet</Text>
              <Text style={typography.muted}>Your placement test sets your level.</Text>
            </>
          )}
        </View>

        <View style={styles.details}>
          {details.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Kicker>{label}</Kicker>
              <Text style={styles.detailValue}>{value || '—'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Kicker>Security</Kicker>
          <View style={styles.settings}>
            {biometric?.availability.supported && (
              <SettingRow
                title={`Sign in with ${biometric.availability.label}`}
                detail={
                  biometric.availability.enrolled
                    ? 'Sign in without your password after you sign out.'
                    : `Set up ${biometric.availability.label} in your device settings first.`
                }
              >
                <Switch
                  value={biometric.enabled && biometric.availability.enrolled}
                  onValueChange={toggleBiometric}
                  disabled={biometricBusy || !biometric.availability.enrolled}
                  trackColor={{ true: colors.accent, false: colors.neutral300 }}
                  accessibilityLabel={`Sign in with ${biometric.availability.label}`}
                />
              </SettingRow>
            )}
            <SettingRow
              title="Microphone"
              detail={
                mic.status === 'granted'
                  ? 'Allowed. Used for the speaking task.'
                  : mic.status === 'denied'
                    ? 'Not allowed. Turn it on in Settings for the speaking task.'
                    : 'Needed for the speaking task.'
              }
            >
              {mic.status === 'granted' ? (
                <Text style={styles.settingState}>Allowed</Text>
              ) : mic.status === 'denied' ? (
                <Button label="Settings" variant="secondary" size="compact" onPress={mic.openSettings} />
              ) : (
                <Button label="Allow" variant="secondary" size="compact" onPress={mic.request} />
              )}
            </SettingRow>
          </View>
        </View>

        <Button label="Sign out" variant="secondary" onPress={() => setConfirmingLogout(true)} />
      </ScrollView>

      {passwordPrompt && biometric && (
        <Dialog
          kicker={`Sign in with ${biometric.availability.label}`}
          title="Enter your password"
          body={`Enter your password once to turn on ${biometric.availability.label}.`}
          primaryLabel="Continue"
          onPrimary={confirmPassword}
          secondaryLabel="Cancel"
          onSecondary={() => setPasswordPrompt(null)}
          busy={passwordPrompt.busy}
        >
          <TextField
            label="Password"
            value={passwordPrompt.value}
            onChangeText={(value) => setPasswordPrompt((p) => (p ? { ...p, value, error: null } : p))}
            secureTextEntry
            autoFocus
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={confirmPassword}
          />
          {!!passwordPrompt.error && <Text style={styles.fieldError}>{passwordPrompt.error}</Text>}
        </Dialog>
      )}

      {confirmingLogout && (
        <Dialog
          kicker="Sign out"
          title="Sign out of BoostifyExam?"
          body={
            biometric?.enabled
              ? `You can sign in again with ${biometric.availability.label}.`
              : 'You will need your username and password to sign in again.'
          }
          primaryLabel="Sign out"
          onPrimary={() => performLogout({ dispatch })}
          secondaryLabel="Cancel"
          onSecondary={() => setConfirmingLogout(false)}
        />
      )}
    </View>
  );
}

function SettingRow({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.text}>
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={typography.muted}>{detail}</Text>
      </View>
      {children}
    </View>
  );
}

const createStyles = (isTablet: boolean) => {
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: padX,
      paddingTop: 24,
      gap: 24,
      width: '100%',
      maxWidth: 560 + padX * 2,
    },
    titleBlock: {
      gap: 6,
    },
    name: {
      fontFamily: fonts.extraBold,
      fontSize: 28,
      lineHeight: 32,
      color: colors.text,
    },
    levelCard: {
      backgroundColor: colors.surface,
      padding: 16,
      gap: 6,
    },
    level: {
      fontFamily: fonts.extraBold,
      fontSize: 40,
      lineHeight: 44,
      color: colors.accent,
    },
    levelEmpty: {
      fontFamily: fonts.extraBold,
      fontSize: 20,
      lineHeight: 26,
      color: colors.text,
    },
    details: {
      borderTopWidth: 2,
      borderTopColor: colors.divider,
    },
    detailRow: {
      paddingVertical: 12,
      gap: 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    section: {
      gap: 10,
    },
    fieldError: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.warn700,
    },
    settings: {
      borderTopWidth: 2,
      borderTopColor: colors.divider,
    },
    settingState: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.text,
    },
    detailValue: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
  });
};

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
});
