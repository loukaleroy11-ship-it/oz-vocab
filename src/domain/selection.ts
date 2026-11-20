/**
 * Choix des cartes d'une session. Fonctions pures.
 *
 * Bouton « Réviser » (séance du jour), dans cet ordre :
 *   1. les mots OUBLIÉS (appris puis ratés) et les mots pas encore terminés ;
 *   2. les cartes « produire » (français → anglais) à revoir ;
 *   3. les cartes « reconnaître » (anglais → français) à revoir ;
 *   4. puis, en alternance pour garder l'équilibre :
 *      - une nouvelle liste de mots jamais vus (ordre de fréquence, regroupés par thème),
 *      - une liste de mots des jours précédents à dire pour la première fois en anglais.
 *      La première liste nouvelle de la journée passe en premier.
 * Quand un mot est à revoir dans les deux suivis, on montre la carte « produire » :
 * la réussir valide aussi la reconnaissance (tracks.ts).
 */
import { groupKey } from '../data/themes';
import { startOfDay } from './dates';
import { isStarted } from './srs';
import { isDueToday } from './status';
import { cardKey, isForgotten, isStateDueNow, isStateLaterToday, readyToProduce } from './tracks';
import type { PackId, Track, Word } from './types';

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

/** Pour ne pas couper une famille de mots (I, you, he, she…), la liste peut dépasser la taille prévue de 2 au plus. */
export const MAX_OVERFLOW = 2;

interface Item {
  id: string;
  group: string;
}

/**
 * Compose une liste cohérente à partir d'une file ordonnée par priorité.
 * - Le premier élément de la file est toujours pris (le plus prioritaire ne recule jamais).
 * - On ajoute les éléments de son thème situés dans les `window` suivants.
 * - S'il reste de la place, on continue avec le thème le mieux représenté
 *   parmi les 3 éléments suivants, et ainsi de suite.
 * Les éléments d'un même thème se suivent dans la liste.
 */
function pickItems(pool: Item[], size: number, window: number): CoherentPick {
  const taken = new Set<string>();
  const blocks: { key: string; items: Item[] }[] = [];
  let count = 0;
  const membersOf = (key: string, from: number) =>
    pool.slice(from, from + window).filter((w) => !taken.has(w.id) && w.group === key);

  while (count < size) {
    const first = pool.findIndex((w) => !taken.has(w.id));
    if (first < 0) break;
    let key = pool[first].group;
    if (blocks.length > 0) {
      const options: string[] = [];
      for (let i = first; i < pool.length && options.length < 3; i++) {
        if (taken.has(pool[i].id)) continue;
        if (!options.includes(pool[i].group)) options.push(pool[i].group);
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
    if (existing) existing.items.push(...chosen);
    else blocks.push({ key, items: chosen });
  }
  return { ids: blocks.flatMap((b) => b.items.map((w) => w.id)), groups: blocks.map((b) => b.key) };
}

/** Liste cohérente de mots (cartes « reconnaître »). */
export function coherentPick(pool: Word[], size: number, window = THEME_WINDOW): CoherentPick {
  return pickItems(
    pool.map((w) => ({ id: w.id, group: groupKey(w) })),
    size,
    window,
  );
}

function coherentCards(pool: Word[], track: Track, size: number, window: number): CoherentPick {
  const pick = pickItems(
    pool.map((w) => ({ id: cardKey(w.id, track), group: groupKey(w) })),
    size,
    window,
  );
  return pick;
}

export interface DueCard {
  key: string;
  word: Word;
  track: Track;
  /** 0 oublié · 1 pas terminé · 2 produire à revoir · 3 reconnaître à revoir */
  tier: 0 | 1 | 2 | 3;
  due: number;
}

/** Cartes à revoir maintenant, une par mot, triées par priorité puis échéance. */
export function dueCards(words: Word[], now: number): DueCard[] {
  const out: DueCard[] = [];
  for (const w of words) {
    if (w.deleted) continue;
    const recDue = isStateDueNow(w.srs, now);
    const prodDue = isStateDueNow(w.prod, now);
    if (recDue && w.srs.interval === 0) {
      out.push({ key: cardKey(w.id, 'rec'), word: w, track: 'rec', tier: isForgotten(w.srs) ? 0 : 1, due: w.srs.due ?? 0 });
    } else if (prodDue) {
      const tier = isForgotten(w.prod) ? 0 : w.prod.interval === 0 ? 1 : 2;
      out.push({ key: cardKey(w.id, 'prod'), word: w, track: 'prod', tier, due: w.prod.due ?? 0 });
    } else if (recDue) {
      out.push({ key: cardKey(w.id, 'rec'), word: w, track: 'rec', tier: 3, due: w.srs.due ?? 0 });
    }
  }
  return out.sort((a, b) => a.tier - b.tier || a.due - b.due);
}

export type PlanKind = 'review' | 'new' | 'produce' | 'done';

export interface SessionPlan {
  kind: PlanKind;
  /** Clés de cartes (voir tracks.ts). */
  ids: string[];
  groups: string[];
  /** Cartes à revoir maintenant (tous suivis). */
  dueNow: number;
  /** Dont mots oubliés. */
  forgotten: number;
  /** Dont cartes « produire » (hors oubliés). */
  prodDue: number;
  /** Dont cartes « reconnaître » (hors oubliés). */
  recDue: number;
  /** Cartes ratées récemment qui reviendront plus tard aujourd'hui. */
  laterToday: number;
  /** Échéance la plus proche parmi celles-là. */
  nextDueAt: number | null;
  newAvailable: number;
  newStartedToday: number;
  /** Objectif quotidien de nouveaux mots atteint (seulement si une limite est réglée). */
  newLimitReached: boolean;
  /** Mots des jours précédents prêts à être dits en anglais pour la première fois. */
  produceAvailable: number;
  produceStartedToday: number;
}

/** Prochaine liste du bouton « Réviser ». `newPerDay` = 0 : pas de limite. */
export function planNextSession(
  words: Word[],
  now: number,
  opts: { size: number; newPerDay: number; ignoreNewLimit?: boolean; disabledPacks?: PackId[] },
): SessionPlan {
  const active = words.filter((w) => !w.deleted);
  const off = new Set(opts.disabledPacks ?? []);
  const due = dueCards(active, now);
  const laterStates = active.flatMap((w) => [w.srs, w.prod]).filter((s) => isStateLaterToday(s, now));
  const fresh = active.filter((w) => !isStarted(w.srs) && !(w.pack && off.has(w.pack))).sort(newOrder);
  const toProduce = active
    .filter((w) => readyToProduce(w, now))
    .sort((a, b) => (a.srs.firstSeen ?? 0) - (b.srs.firstSeen ?? 0) || newOrder(a, b));
  const today = startOfDay(now);
  const newStartedToday = active.filter(
    (w) => w.srs.firstSeen != null && w.srs.firstSeen >= today && w.srs.origin !== 'placement',
  ).length;
  const produceStartedToday = active.filter((w) => w.prod.firstSeen != null && w.prod.firstSeen >= today).length;
  const limit = opts.newPerDay > 0 ? opts.newPerDay : Infinity;
  const newLimitReached = newStartedToday >= limit;
  const base = {
    dueNow: due.length,
    forgotten: due.filter((c) => c.tier === 0).length,
    prodDue: due.filter((c) => c.track === 'prod' && c.tier > 0).length,
    recDue: due.filter((c) => c.track === 'rec' && c.tier > 0).length,
    laterToday: laterStates.length,
    nextDueAt: laterStates.length ? Math.min(...laterStates.map((s) => s.due ?? Infinity)) : null,
    newAvailable: fresh.length,
    newStartedToday,
    newLimitReached,
    produceAvailable: toProduce.length,
    produceStartedToday,
  };

  if (due.length) {
    // priorité : oubliés et non terminés, puis le reste ; thèmes regroupés à l'intérieur de chaque niveau
    const urgent = due.filter((c) => c.tier <= 1);
    const rest = due.filter((c) => c.tier > 1);
    const asItems = (cards: DueCard[]) => cards.map((c) => ({ id: c.key, group: groupKey(c.word) }));
    const first = pickItems(asItems(urgent), opts.size, urgent.length);
    const room = opts.size - first.ids.length;
    const second = room > 0 ? pickItems(asItems(rest), room, rest.length) : { ids: [], groups: [] };
    const groups = [...first.groups, ...second.groups.filter((g) => !first.groups.includes(g))];
    return { ...base, kind: 'review', ids: [...first.ids, ...second.ids], groups };
  }

  const newAllowed = fresh.length > 0 && (!newLimitReached || !!opts.ignoreNewLimit);
  const newSize = opts.ignoreNewLimit || limit === Infinity ? opts.size : Math.min(opts.size, limit - newStartedToday);
  const newList = () => ({ ...base, kind: 'new' as const, ...coherentPick(fresh, newSize) });
  const produceList = () => ({ ...base, kind: 'produce' as const, ...coherentCards(toProduce, 'prod', opts.size, THEME_WINDOW) });

  if (newAllowed && (toProduce.length === 0 || newStartedToday <= produceStartedToday)) return newList();
  if (toProduce.length) return produceList();
  if (newAllowed) return newList();
  return { ...base, kind: 'done', ids: [], groups: [] };
}

/** Révision anticipée : les cartes déjà commencées dont l'échéance est la plus proche (une par mot). */
export function pickAhead(words: Word[], now: number, size: number): string[] {
  const cards: { key: string; due: number }[] = [];
  for (const w of words) {
    if (w.deleted) continue;
    const rec = isStarted(w.srs) && !isStateDueNow(w.srs, now) ? (w.srs.due ?? Infinity) : Infinity;
    const prod = w.prod.reps > 0 && !isStateDueNow(w.prod, now) ? (w.prod.due ?? Infinity) : Infinity;
    if (rec === Infinity && prod === Infinity) continue;
    cards.push(prod <= rec ? { key: cardKey(w.id, 'prod'), due: prod } : { key: cardKey(w.id, 'rec'), due: rec });
  }
  return cards
    .sort((a, b) => a.due - b.due)
    .slice(0, size)
    .map((c) => c.key);
}

/**
 * Session depuis une sélection de l'explorateur : d'abord les mots à revoir,
 * puis les nouveaux (par fréquence), puis les autres (échéance la plus proche).
 * Si la sélection compte moins de mots que la taille demandée, la session est plus courte.
 */
export function orderSelection(words: Word[], now: number): Word[] {
  const due = words.filter((w) => isDueToday(w, now)).sort(byDue);
  const fresh = words.filter((w) => !isStarted(w.srs)).sort(newOrder);
  const others = words.filter((w) => isStarted(w.srs) && !isDueToday(w, now)).sort(byDue);
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
