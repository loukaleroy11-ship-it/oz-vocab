/** Dates locales (fuseau de l'appareil). */

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Semaine ISO, ex. « 2026-W44 » (sert à regrouper les sessions pour la synchronisation). */
export function isoWeekKey(ts: number): string {
  const d = new Date(ts);
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDay = (ts: number) => dateFmt.format(ts);
export const formatDateTime = (ts: number) => dateTimeFmt.format(ts);

export function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec ? `${min} min ${String(sec).padStart(2, '0')}` : `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, '0')}`;
}

/** « dans 3 jours », « aujourd'hui », « en retard de 2 jours »… */
export function formatDue(due: number | null, now: number): string {
  if (due == null) return 'jamais révisé';
  const diffMin = Math.round((due - now) / 60000);
  if (diffMin <= 0) {
    const lateDays = Math.floor((startOfDay(now) - startOfDay(due)) / 86400000);
    if (lateDays <= 0) return 'maintenant';
    return lateDays === 1 ? 'en retard d’un jour' : `en retard de ${lateDays} jours`;
  }
  if (diffMin < 60) return `dans ${diffMin} min`;
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  if (days < 31) return `dans ${days} jours`;
  const months = Math.round(days / 30);
  return months <= 1 ? 'dans 1 mois' : `dans ${months} mois`;
}
