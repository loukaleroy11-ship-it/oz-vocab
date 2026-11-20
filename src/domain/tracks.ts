/**
 * Les deux suivis d'un mot et les cartes de session. Fonctions pures.
 *
 *  - Reconnaître (rec) : anglais → français. C'est la progression historique (`word.srs`).
 *  - Produire (prod)   : français → anglais (`word.prod`). Une carte « produire »
 *    n'apparaît qu'après une première reconnaissance réussie, un jour précédent
 *    (ou pour un mot jugé connu au test de placement).
 *
 * Dans une session, une carte est identifiée par une clé : l'identifiant du mot
 * pour « reconnaître » (comme avant : les anciennes sessions restent valides),
 * l'identifiant suivi de « @p » pour « produire ».
 */
import { startOfDay, endOfDay } from './dates';
import { isStarted, newSrsState, schedule } from './srs';
import type { Grade, SrsState, Track, Word } from './types';

export const PROD_SUFFIX = '@p';

export function cardKey(wordId: string, track: Track): string {
  return track === 'prod' ? wordId + PROD_SUFFIX : wordId;
}

export function parseCard(key: string): { wordId: string; track: Track } {
  return key.endsWith(PROD_SUFFIX)
    ? { wordId: key.slice(0, -PROD_SUFFIX.length), track: 'prod' }
    : { wordId: key, track: 'rec' };
}

export function stateOf(w: Word, track: Track): SrsState {
  return track === 'prod' ? w.prod : w.srs;
}

/** À revoir maintenant : un mot raté revient 10 min plus tard ; un mot appris, à tout moment de sa journée. */
export function isStateDueNow(s: SrsState, now: number): boolean {
  if (!isStarted(s) || s.due == null) return false;
  return s.interval === 0 ? s.due <= now : s.due <= endOfDay(now);
}

/** Raté récemment, reviendra plus tard dans la journée. */
export function isStateLaterToday(s: SrsState, now: number): boolean {
  return isStarted(s) && s.due != null && s.due <= endOfDay(now) && !isStateDueNow(s, now);
}

/** Oublié : le mot était appris, puis raté (il est en réapprentissage). */
export function isForgotten(s: SrsState): boolean {
  return s.phase === 'relearning';
}

/** Reconnu : le sens est acquis (la dernière révision du mot appris est réussie). */
export function isRecognized(w: Word): boolean {
  return w.srs.phase === 'review';
}

/** Productible : je sais dire le mot anglais à partir du français. */
export function isProducible(w: Word): boolean {
  return w.prod.phase === 'review';
}

/**
 * Prêt pour sa première carte « produire » : reconnu, et appris avant aujourd'hui
 * (pour qu'une nuit passe entre les deux) ou jugé connu au test de placement.
 */
export function readyToProduce(w: Word, now: number): boolean {
  if (w.deleted || w.prod.reps > 0 || !isRecognized(w)) return false;
  if (w.srs.origin === 'placement') return true;
  return w.srs.firstSeen != null && w.srs.firstSeen < startOfDay(now);
}

/**
 * Enregistre une réponse sur une carte.
 * Un mot jugé connu au placement puis raté repart comme un mot nouveau (pas compté comme oubli).
 * Produire un mot prouve qu'on le reconnaît : une carte « produire » réussie
 * valide aussi la reconnaissance si celle-ci était à revoir (mot appris uniquement).
 */
export function applyAnswer(w: Word, track: Track, grade: Grade, now: number): Word {
  if (track === 'rec') {
    // mot jugé connu au placement mais finalement pas connu : il repart comme un mot nouveau, sans « oubli »
    const from = w.srs.origin === 'placement' && grade === 'again' ? newSrsState() : w.srs;
    const srs = schedule(from, grade, now);
    delete srs.origin;
    return { ...w, srs, updatedAt: now };
  }
  const prod = schedule(w.prod, grade, now);
  let srs = w.srs;
  if (grade !== 'again' && w.srs.phase === 'review' && isStateDueNow(w.srs, now)) {
    srs = schedule(w.srs, 'good', now);
    delete srs.origin;
  }
  return { ...w, prod, srs, updatedAt: now };
}
