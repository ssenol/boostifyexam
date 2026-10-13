import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import Button from './Button';

const { colors, fonts, typography } = theme;

export interface DialogConfig {
  kicker: string;
  title: string;
  body: string;
  // Üst kenardaki renkli çizgi: uyarılarda turuncu
  tone?: 'default' | 'warn';
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  busy?: boolean;
}

// Ekranın üstünde, kapatılamayan (arka plana dokununca kapanmayan) onay penceresi. Prototipteki .dialog.
// RN Modal yerine absolute view: sınav ekranı tek parça kalır, AppState olayları Modal'la çakışmaz.
export default function Dialog({ kicker, title, body, tone = 'default', primaryLabel, onPrimary, secondaryLabel, onSecondary, busy }: DialogConfig) {
  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <View style={[styles.dialog, { borderTopColor: tone === 'warn' ? colors.warn : colors.text }]}>
        <Text style={typography.kickerAccent}>{kicker}</Text>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.actions}>
          <Button label={primaryLabel} onPress={onPrimary} loading={busy} />
          {secondaryLabel && onSecondary && (
            <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} disabled={busy} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.backdrop,
  },
  dialog: {
    width: '100%',
    maxWidth: 460,
    gap: 12,
    padding: 16,
    borderTopWidth: 4,
    backgroundColor: colors.surface,
    shadowColor: colors.neutral900,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    lineHeight: 26,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    opacity: 0.85,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
});
