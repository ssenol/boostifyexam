import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Kicker from '../components/Kicker';
import ScreenHeader from '../components/ScreenHeader';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import authService from '../services/auth';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentUser, setUser } from '../store/slices/authSlice';
import { theme } from '../theme';
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

        <Button label="Sign out" variant="secondary" onPress={() => setConfirmingLogout(true)} />
      </ScrollView>

      {confirmingLogout && (
        <Dialog
          kicker="Sign out"
          title="Sign out of BoostifyExam?"
          body="You will need your username and password to sign in again."
          primaryLabel="Sign out"
          onPrimary={() => performLogout({ dispatch })}
          secondaryLabel="Cancel"
          onSecondary={() => setConfirmingLogout(false)}
        />
      )}
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
    detailValue: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
  });
};
