const TZ = 'America/Argentina/Buenos_Aires';

export function initials(name: string | null, fallback: string) {
  const source = name?.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase();
}

// Clave de día en hora argentina (el servidor de Vercel corre en UTC).
export function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
}

export function formatTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return dayKey(d) === dayKey(new Date()) ? formatClock(iso) : formatShortDate(d);
}

// Para seguimientos: lo vencido se marca como tal, lo de hoy muestra la hora.
export function formatDue(iso: string | null) {
  if (!iso) return '';
  if (new Date(iso).getTime() <= Date.now()) return 'Vencido';
  return formatTime(iso);
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

export function formatDayLabel(iso: string) {
  const key = dayKey(new Date(iso));
  if (key === dayKey(new Date())) return 'Hoy';
  if (key === dayKey(new Date(Date.now() - 86_400_000))) return 'Ayer';
  return new Date(iso).toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
}

// Armado a mano: es-AR devuelve "22-oct" con guion.
export function formatShortDate(date: Date) {
  const parts = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: 'numeric', month: 'short' }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value.replace('.', '');
  return `${day} ${month}`;
}
