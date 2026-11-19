/** Choix des mots d'une session. Fonctions pures. */
import { startOfDay } from './dates';
import { isDueToday } from './status';
import type { Word } from './types';

const byDue = (a: Word, b: Word) => (a.srs.due ?? 0) - (b.srs.due ?? 0);
/** Nouveaux mots : d'abord ceux ajoutés par l'utilisateur, puis les 500 par fréquence. */
const newOrder = (a: Word, b: Word) => {
  if (a.source !== b.source) return a.source === 'user' ? -1 : 1;
  if (a.source === 'user') return a.addedAt - b.addedAt;
  return (a.rank ?? 1e9) - (b.rank ?? 1e9);
};

export interface DailyPlan {
  due: Word[];
  newAvailable: Word[];
  /** Nouveaux mots déjà commencés aujourd'hui. */
  newStartedToday: number;
  newAllowance: number;
}

export function dailyPlan(words: Word[], now: number, newPerDay: number): DailyPlan {
  const active = words.filter((w) => !w.deleted);
  const today = startOfDay(now);
  const due = active.filter((w) => isDueToday(w, now)).sort(byDue);
  const newWords = active.filter((w) => w.srs.reps === 0).sort(newOrder);
  const newStartedToday = active.filter((w) => w.srs.firstSeen != null && w.srs.firstSeen >= today).length;
  return {
    due,
    newAvailable: newWords,
    newStartedToday,
    newAllowance: Math.max(0, newPerDay - newStartedToday),
  };
}

/**
 * Session du jour : mots à réviser en priorité (les plus en retard d'abord),
 * complétés par des nouveaux mots dans la limite quotidienne.
 */
export function pickDailySession(
  words: Word[],
  now: number,
  opts: { size: number; newPerDay: number; ignoreNewLimit?: boolean },
): string[] {
  const plan = dailyPlan(words, now, opts.newPerDay);
  const picked = plan.due.slice(0, opts.size);
  const room = opts.size - picked.length;
  if (room > 0) {
    const allowance = opts.ignoreNewLimit ? room : Math.min(room, plan.newAllowance);
    picked.push(...plan.newAvailable.slice(0, allowance));
  }
  return picked.map((w) => w.id);
}

/** Révision anticipée : les mots appris dont l'échéance est la plus proche. */
export function pickAhead(words: Word[], now: number, size: number): string[] {
  return words
    .filter((w) => !w.deleted && w.srs.reps > 0 && !isDueToday(w, now))
    .sort(byDue)
    .slice(0, size)
    .map((w) => w.id);
}

/**
 * Session depuis une sélection de l'explorateur : d'abord les mots à revoir,
 * puis les nouveaux (par fréquence), puis les autres (échéance la plus proche).
 * Si la sélection compte moins de mots que la taille demandée, la session est plus courte.
 */
export function orderSelection(words: Word[], now: number): Word[] {
  const due = words.filter((w) => isDueToday(w, now)).sort(byDue);
  const fresh = words.filter((w) => w.srs.reps === 0).sort(newOrder);
  const others = words.filter((w) => w.srs.reps > 0 && !isDueToday(w, now)).sort(byDue);
  return [...due, ...fresh, ...others];
}

export function pickFromSelection(
  words: Word[],
  now: number,
  size: number,
): { ids: string[]; remaining: string[] } {
  const ordered = orderSelection(
    words.filter((w) => !w.deleted),
    now,
  );
  return {
    ids: ordered.slice(0, size).map((w) => w.id),
    remaining: ordered.slice(size).map((w) => w.id),
  };
}
