import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import Button from './Button';

const { colors, fonts } = theme;

interface StateViewProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Veri yüklenirken ya da hata olduğunda ekranın ortasında gösterilir
export default function StateView({ loading, error, onRetry }: StateViewProps) {
  return (
    <View style={styles.root}>
      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" />
      ) : (
        <View style={styles.error}>
          <Text style={styles.title}>Something went wrong</Text>
          {!!error && <Text style={styles.message}>{error}</Text>}
          {onRetry && <Button label="Try again" variant="secondary" size="compact" onPress={onRetry} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },
  error: {
    width: '100%',
    maxWidth: 400,
    gap: 8,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 14,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.text,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.neutral700,
    marginBottom: 8,
  },
});
