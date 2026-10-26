import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../components/Logo';
import { toUpperCaseEn } from '../components/Kicker';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import { theme } from '../theme';

const { colors, fonts } = theme;

// Bu süre sonunda kendiliğinden girişe geçer (BW ile aynı); dokununca beklemeden geçer
const AUTO_NAV_MS = 2200;

const LEVELS = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];
// Placement ortadan (B1) başlar; progress öğrencinin son seviyesinden
const START_LEVEL_INDEX = 4;

const FACTS: [string, string][] = [
  ['≤ 40', 'Questions'],
  ['4', 'Skills + grammar'],
  ['10', 'CEFR levels'],
];

// Oturum yokken açılan karşılama ekranı. Zemini splash ile aynı mavi, geçiş dikişsiz görünür.
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);

  const [progress] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/login'), AUTO_NAV_MS);
    Animated.timing(progress, { toValue: 1, duration: AUTO_NAV_MS, useNativeDriver: false }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [router, progress, pulse]);

  const barStep = isTablet ? 16 : 10;

  return (
    <Pressable
      style={[styles.root, { paddingTop: isTablet ? insets.top + 40 : Math.max(24, insets.top + 8), paddingBottom: bottom(24) }]}
      onPress={() => router.replace('/login')}
      accessibilityRole="button"
      accessibilityLabel="Continue to sign in"
    >
      <StatusBar style="light" />

      <View style={styles.content}>
        <Logo variant="white" height={isTablet ? 32 : 26} />

        <View style={styles.hero}>
          <Text style={styles.kicker}>{toUpperCaseEn('Placement · Progress')}</Text>
          <Text style={styles.heroTitle}>
            Find your <Text style={styles.heroAccent}>level</Text>.
          </Text>
          <Text style={styles.heroText}>Adaptive English tests on the CEFR scale.</Text>
        </View>

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
                  { height: barStep * (i + 1), backgroundColor: i === START_LEVEL_INDEX ? colors.success : colors.accent300 },
                ]}
              />
            ))}
          </View>
          <View style={styles.ladderLabels}>
            {LEVELS.map((name, i) => (
              <Text
                key={name}
                style={[styles.ladderLabel, i === START_LEVEL_INDEX && styles.ladderLabelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {name}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.facts}>
          {FACTS.map(([value, label], i) => (
            <View key={label} style={[styles.fact, i > 0 && styles.factDivided]}>
              <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
              <Text style={styles.factLabel} numberOfLines={1}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.track}>
          <Animated.View
            style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
          />
        </View>
        <Animated.Text style={[styles.tapLabel, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]}>
          {toUpperCaseEn('Tap to sign in')}  →
        </Animated.Text>
      </View>
    </Pressable>
  );
}

const createStyles = (isTablet: boolean) => {
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingHorizontal: padX,
    },
    content: {
      flex: 1,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
    hero: {
      marginTop: 'auto',
      gap: 12,
    },
    kicker: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      letterSpacing: 1.3,
      color: colors.bg,
    },
    heroTitle: {
      fontFamily: fonts.extraBold,
      fontSize: isTablet ? 64 : 44,
      lineHeight: isTablet ? 66 : 46,
      letterSpacing: isTablet ? -1.3 : -0.9,
      color: colors.bg,
    },
    // Logodaki "exam" gibi tek kelime turuncu
    heroAccent: {
      color: colors.primary,
    },
    heroText: {
      fontFamily: fonts.regular,
      fontSize: isTablet ? 18 : 16,
      lineHeight: isTablet ? 26 : 24,
      color: colors.bg,
    },
    ladderWrap: {
      marginTop: isTablet ? 56 : 40,
      gap: 12,
    },
    ladderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
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
      height: isTablet ? 160 : 100,
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
      marginBottom: 'auto',
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
    footer: {
      alignItems: 'center',
      gap: 16,
      paddingTop: 24,
    },
    track: {
      width: 120,
      height: 4,
      backgroundColor: colors.accent700,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    tapLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      letterSpacing: 2.5,
      color: colors.bg,
    },
  });
};
