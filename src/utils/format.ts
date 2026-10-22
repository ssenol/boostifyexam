// 125 → "02:05"
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ISO tarih (UTC) → telefonun saat diliminde "21 Oct 2026"
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
