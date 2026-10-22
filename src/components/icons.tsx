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
