import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

const { colors, fonts } = theme;

const COUNT = 48;

// Sınav ekranının üzerinde çok soluk, eğik öğrenci kimliği. Ekran görüntüsü / fotoğraf paylaşılırsa kimin olduğu
// anlaşılır (caydırıcı). Dokunmaları engellemez, ekran okuyucuya görünmez.
function Watermark({ text }: { text: string }) {
  return (
    <View pointerEvents="none" style={styles.layer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.grid}>
        {Array.from({ length: COUNT }, (_, i) => (
          <Text key={i} style={styles.text} numberOfLines={1}>
            {text}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default memo(Watermark);

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 10,
  },
  grid: {
    position: 'absolute',
    top: '-25%',
    left: '-25%',
    width: '150%',
    height: '150%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    rowGap: 90,
    columnGap: 40,
    transform: [{ rotate: '-24deg' }],
    opacity: 0.05,
  },
  text: {
    width: 220,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    color: colors.text,
  },
});
