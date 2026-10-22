// 125 → "02:05"
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ISO tarih (UTC) → telefonun saat diliminde "21 Oct 2026"
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ISO tarih (UTC) → telefonun saat diliminde "31 Dec 2026, 23:59"
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${formatDate(iso)}, ${time}`;
}

// Başlama–bitiş: aynı gün "13 Oct 2026, 14:43–15:14", farklı gün iki tam tarih
export function formatDateRange(startIso: string, endIso: string): string {
  const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return formatDate(startIso) === formatDate(endIso)
    ? `${formatDate(startIso)}, ${time(startIso)}–${time(endIso)}`
    : `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Görev yönergesi bazen cümle sonlarından virgülle birleştirilmiş liste olarak gelir
// ("Say the name of the app.,Say why you like it.") → ["Say the name of the app.", "Say why you like it."]
export function instructionLines(text: string): string[] {
  return text
    .replace(/([.!?])\s*,\s*/g, '$1\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

// 918 → "16 min": web sitesindeki gibi dakikaya yukarı yuvarlanır
export function formatDuration(seconds: number): string {
  return `${Math.ceil(Math.max(0, seconds) / 60)} min`;
}
