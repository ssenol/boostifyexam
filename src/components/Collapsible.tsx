import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { ChevronDownIcon } from './icons';

const { colors, fonts } = theme;

interface CollapsibleProps {
  title: string;
  // Başlığın sağında kısa not (ör. "41 s")
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

// Dokununca açılan bölüm: uzun içerik (görev metni, cevap, açıklama) varsayılan olarak kapalı
export default function Collapsible({ title, meta, defaultOpen = false, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <Text style={styles.title}>{title}</Text>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon />
        </View>
      </Pressable>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral700,
  },
  body: {
    gap: 12,
    paddingBottom: 14,
  },
});
