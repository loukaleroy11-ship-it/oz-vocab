/**
 * Choix des mots d'une session. Fonctions pures.
 *
 * Bouton « Réviser » :
 *   1. d'abord les mots déjà vus qui sont à revoir (listes des jours précédents,
 *      mots ratés il y a plus de 10 minutes) ;
 *   2. quand il n'y a plus rien à revoir, une nouvelle liste de mots jamais vus,
 *      en suivant à peu près l'ordre de fréquence mais en regroupant les mots
 *      d'un même thème (« I » avec « you, he, she… »).
 */
import { groupKey } from '../data/themes';
import { startOfDay } from './dates';
import { isDueNow, isDueToday } from './status';
import type { Word } from './types';

/** Distance maximale (en mots) jusqu'à laquelle on va chercher des mots du même thème. */
export const THEME_WINDOW = 40;

const byDue = (a: Word, b: Word) => (a.srs.due ?? 0) - (b.srs.due ?? 0);
/** Nouveaux mots : d'abord ceux ajoutés par l'utilisateur, puis les 500 par fréquence. */
const newOrder = (a: Word, b: Word) => {
  if (a.source !== b.source) return a.source === 'user' ? -1 : 1;
  if (a.source === 'user') return a.addedAt - b.addedAt;
  return (a.rank ?? 1e9) - (b.rank ?? 1e9);
};

export interface CoherentPick {
  ids: string[];
  /** Thèmes de la liste, dans l'ordre (pour son titre). */
  groups: string[];
}

/**
 * Compose une liste cohérente à partir d'une file ordonnée par priorité.
 * - Le premier mot de la file est toujours pris (le plus fréquent ne recule jamais).
 * - On ajoute les mots de son thème situés dans les `window` mots suivants.
 * - S'il reste de la place, on continue avec le thème le mieux représenté
 *   parmi les 3 mots suivants, et ainsi de suite.
 * - Pour ne pas couper une famille de mots (I, you, he, she…), la liste peut
 *   dépasser la taille prévue de 2 mots au plus.
 * Les mots d'un même thème se suivent dans la liste.
 */
export const MAX_OVERFLOW = 2;

export function coherentPick(pool: Word[], size: number, window = THEME_WINDOW): CoherentPick {
  const taken = new Set<string>();
  const blocks: { key: string; words: Word[] }[] = [];
  let count = 0;
  const membersOf = (key: string, from: number) =>
    pool.slice(from, from + window).filter((w) => !taken.has(w.id) && groupKey(w) === key);

  while (count < size) {
    const first = pool.findIndex((w) => !taken.has(w.id));
    if (first < 0) break;
    let key = groupKey(pool[first]);
    if (blocks.length > 0) {
      // parmi les 3 prochains mots, le thème qui permet le bloc le plus fourni
      const options: string[] = [];
      for (let i = first; i < pool.length && options.length < 3; i++) {
        if (taken.has(pool[i].id)) continue;
        const k = groupKey(pool[i]);
        if (!options.includes(k)) options.push(k);
      }
      key = options.reduce((best, k) => (membersOf(k, first).length > membersOf(best, first).length ? k : best), options[0]);
    }
    const members = membersOf(key, first);
    const room = size - count;
    const finishTheme = blocks.length > 0 && members.length > room && members.length - room <= MAX_OVERFLOW;
    const chosen = finishTheme ? members : members.slice(0, room);
    chosen.forEach((w) => taken.add(w.id));
    count += chosen.length;
    const existing = blocks.find((b) => b.key === key);
    if (existing) existing.words.push(...chosen);
    else blocks.push({ key, words: chosen });
  }
  return { ids: blocks.flatMap((b) => b.words.map((w) => w.id)), groups: blocks.map((b) => b.key) };
}

export interface SessionPlan {
  kind: 'review' | 'new' | 'done';
  ids: string[];
  groups: string[];
  /** Mots à revoir maintenant. */
  dueNow: number;
  /** Mots ratés récemment qui reviendront plus tard aujourd'hui. */
  laterToday: number;
  /** Échéance la plus proche parmi ceux-là. */
  nextDueAt: number | null;
  newAvailable: number;
  newStartedToday: number;
  /** Objectif quotidien de nouveaux mots atteint (seulement si une limite est réglée). */
  newLimitReached: boolean;
}

/** Prochaine session du bouton « Réviser ». `newPerDay` = 0 : pas de limite. */
export function planNextSession(
  words: Word[],
  now: number,
  opts: { size: number; newPerDay: number; ignoreNewLimit?: boolean },
): SessionPlan {
  const active = words.filter((w) => !w.deleted);
  const due = active.filter((w) => isDueNow(w, now)).sort(byDue);
  const later = active.filter((w) => isDueToday(w, now) && !isDueNow(w, now));
  const fresh = active.filter((w) => w.srs.reps === 0).sort(newOrder);
  const today = startOfDay(now);
  const newStartedToday = active.filter((w) => w.srs.firstSeen != null && w.srs.firstSeen >= today).length;
  const limit = opts.newPerDay > 0 ? opts.newPerDay : Infinity;
  const newLimitReached = newStartedToday >= limit;
  const base = {
    dueNow: due.length,
    laterToday: later.length,
    nextDueAt: later.length ? Math.min(...later.map((w) => w.srs.due ?? Infinity)) : null,
    newAvailable: fresh.length,
    newStartedToday,
    newLimitReached,
  };
  if (due.length) {
    // révision : thèmes regroupés, sans contrainte de fréquence
    const pick = coherentPick(due, opts.size, due.length);
    return { ...base, kind: 'review', ...pick };
  }
  if (fresh.length && (!newLimitReached || opts.ignoreNewLimit)) {
    const size = opts.ignoreNewLimit || limit === Infinity ? opts.size : Math.min(opts.size, limit - newStartedToday);
    return { ...base, kind: 'new', ...coherentPick(fresh, size) };
  }
  return { ...base, kind: 'done', ids: [], groups: [] };
}

/** Révision anticipée : les mots appris dont l'échéance est la plus proche. */
export function pickAhead(words: Word[], now: number, size: number): string[] {
  return words
    .filter((w) => !w.deleted && w.srs.reps > 0 && !isDueNow(w, now))
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
