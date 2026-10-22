import Svg, { Line, Path, Polygon, Rect } from 'react-native-svg';
import { theme } from '../theme';

// Prototipte kullanılan Lucide ikonları (aynı path'ler)

interface IconProps {
  size?: number;
  color?: string;
}

const stroke = (color: string) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function ArrowRightIcon({ size = 20, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </Svg>
  );
}

export function LockIcon({ size = 14, color = theme.colors.neutral700 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Rect width={18} height={11} x={3} y={11} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </Svg>
  );
}

export function HeadphonesIcon({ size = 22, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </Svg>
  );
}

export function MicIcon({ size = 22, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <Line x1={12} x2={12} y1={19} y2={22} />
    </Svg>
  );
}

export function PlayIcon({ size = 18, color = theme.colors.bg }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Polygon points="6 3 20 12 6 21 6 3" />
    </Svg>
  );
}

export function StopIcon({ size = 26, color = theme.colors.bg }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect width={14} height={14} x={5} y={5} />
    </Svg>
  );
}

// Writing (lucide pen-line)
export function PenIcon({ size = 20, color = theme.colors.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M12 20h9" />
      <Path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </Svg>
  );
}

// Reading (lucide book-open)
export function BookIcon({ size = 20, color = theme.colors.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M12 7v14" />
      <Path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </Svg>
  );
}

// Language use (lucide spell-check)
export function SpellCheckIcon({ size = 20, color = theme.colors.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="m6 16 6-12 6 12" />
      <Path d="M8 12h8" />
      <Path d="m16 20 2 2 4-4" />
    </Svg>
  );
}

// Strengths (lucide check)
export function CheckIcon({ size = 18, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

// Açılır başlık (lucide chevron-down); kapalıyken döndürülür
export function ChevronDownIcon({ size = 20, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

// Boş liste (lucide inbox)
export function InboxIcon({ size = 24, color = theme.colors.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <Path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </Svg>
  );
}
