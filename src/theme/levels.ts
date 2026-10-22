// CEFR seviyesine göre renk (web raporundaki gibi, 2026-10-22 doğrulandı): A1 kırmızı, A2 turuncu, B1 yeşil,
// B2 mavi, C1–C2 mor. bg: açık zemin (etiket), fg: yazı / büyük seviye.
const LEVEL_COLORS = {
  A1: { bg: '#fde7e7', fg: '#c53030' },
  A2: { bg: '#fdf0dc', fg: '#b45f06' },
  B1: { bg: '#e2f4e6', fg: '#217a3c' },
  B2: { bg: '#e1ecfb', fg: '#1f5fbf' },
  C: { bg: '#f0e6fb', fg: '#7a33bf' },
} as const;

const NONE = { bg: '#eae7e7', fg: '#605d5d' };

export function levelColors(level: string | null | undefined): { bg: string; fg: string } {
  if (!level) return NONE;
  if (level.startsWith('C')) return LEVEL_COLORS.C;
  const band = level.slice(0, 2) as keyof typeof LEVEL_COLORS;
  return LEVEL_COLORS[band] ?? NONE;
}
