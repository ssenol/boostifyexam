import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useResponsive from '../hooks/useResponsive';
import { theme } from '../theme';
import Button from './Button';
import Logo from './Logo';

const { colors, fonts } = theme;

interface ScreenHeaderProps {
  // "← Assignments" gibi geri butonu
  backLabel?: string;
  onBack?: () => void;
  // Geri butonu yoksa solda başlık; verilmezse logo
  title?: string;
  right?: ReactNode;
}

// Prototipteki üst çubuk: alt kenarda 2px çizgi, safe area üst boşluğu
export default function ScreenHeader({ backLabel, onBack, title, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;

  return (
    <View style={[styles.header, { paddingTop: Math.max(10, insets.top), paddingHorizontal: padX }]}>
      {backLabel && onBack ? (
        <Button label={`← ${backLabel}`} variant="ghost" size="compact" onPress={onBack} />
      ) : (
        title ? <Text style={styles.title}>{title}</Text> : <View style={styles.logo}><Logo /></View>
      )}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
    backgroundColor: colors.bg,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.text,
    paddingVertical: 10,
  },
  // Başlık yazısıyla aynı yükseklik (paddingVertical 10 + satır)
  logo: {
    paddingVertical: 11,
  },
  right: {
    marginLeft: 'auto',
  },
});
