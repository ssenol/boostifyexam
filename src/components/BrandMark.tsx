import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

const { colors, fonts } = theme;

interface BrandMarkProps {
  // Yazının rengi; mavi panelde açık, açık zeminde koyu
  color?: string;
}

// Dört renkli kare logo + "BoostifyExams" yazısı
export default function BrandMark({ color = colors.text }: BrandMarkProps) {
  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        {colors.brand.map((c) => (
          <View key={c} style={[styles.cell, { backgroundColor: c }]} />
        ))}
      </View>
      <Text style={[styles.title, { color }]}>
        Boostify<Text style={styles.titleLight}>Exams</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 32,
  },
  logo: {
    width: 30,
    height: 30,
    padding: 4,
    gap: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.bg,
  },
  cell: {
    width: 10,
    height: 10,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
  titleLight: {
    fontFamily: fonts.regular,
  },
});
