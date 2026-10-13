import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useResponsive from '../hooks/useResponsive';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/slices/authSlice';
import { theme } from '../theme';
import { performLogout } from '../utils/logoutHelper';

const { colors, fonts } = theme;

// TODO: Sınav endpoint'leri gelince prototipteki "Assignments" ekranı (Open / Done sekmeleri,
// sınav kartı, Progress tests serisi) burada kurulacak. Şimdilik giriş akışını doğrulamak için yer tutucu.
export default function AssignmentsScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const fullName = [user?.name, user?.surname ?? user?.lastName].filter(Boolean).join(' ');

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}>
        <Text style={styles.headerBrand}>Boostify</Text>
        <Pressable accessibilityRole="button" onPress={() => performLogout({ dispatch })} hitSlop={8}>
          <Text style={styles.headerLink}>Sign out</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(32, insets.bottom) }]}>
        <Text style={styles.title}>Assignments</Text>
        {!!fullName && <Text style={styles.subtitle}>{fullName}</Text>}
      </ScrollView>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: padX,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
    },
    headerBrand: {
      fontFamily: fonts.extraBold,
      fontSize: 18,
      color: colors.text,
    },
    headerLink: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.accent,
    },
    content: {
      paddingHorizontal: padX,
      paddingTop: 24,
      gap: 12,
    },
    title: {
      fontFamily: fonts.extraBold,
      fontSize: 28,
      lineHeight: 32,
      color: colors.text,
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.neutral700,
    },
  });
};
