import { StyleProp, Text, TextStyle } from 'react-native';
import { theme } from '../theme';

const { typography } = theme;

interface KickerProps {
  children: string;
  accent?: boolean;
  style?: StyleProp<TextStyle>;
}

// Küçük, büyük harfli üst başlık ("TIME LEFT"). Büyük harfe çevirme burada İngilizce kuralıyla yapılır:
// textTransform: 'uppercase' cihaz diline uyar ve Türkçe cihazda "i" → "İ" olur ("TİME LEFT").
// Arayüz metni İngilizce olduğu için büyük harf metinlerde textTransform kullanmayın; toUpperCaseEn veya bunu kullanın.
export default function Kicker({ children, accent, style }: KickerProps) {
  return <Text style={[accent ? typography.kickerAccent : typography.kicker, style]}>{toUpperCaseEn(children)}</Text>;
}

export function toUpperCaseEn(text: string): string {
  return text.toLocaleUpperCase('en-US');
}
