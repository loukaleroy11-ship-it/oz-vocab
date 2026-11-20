/**
 * Moteur de répétition espacée — adaptation de SM-2 (Wozniak, 1987) proche
 * de celle d'Anki. Fonctions pures, sans dépendance à l'interface.
 *
 * Deux mécanismes distincts coexistent dans l'application :
 *   1. La répétition IMMÉDIATE (queue.ts) : un mot inconnu revient à la fin de
 *      la file de la session en cours.
 *   2. La répétition ESPACÉE (ce fichier) : après chaque réponse, on calcule
 *      quand le mot doit revenir lors des sessions futures.
 *
 * Règles (intervalle I en jours, facilité E entre 1,3 et 3,0, départ 2,5) :
 *
 *  « Je ne connais pas » (again)
 *    - mot appris (phase review) → oubli : lapses+1, E −0,20, phase relearning,
 *      on mémorise l'ancien intervalle (lapsedFrom).
 *    - mot nouveau → phase learning, E inchangée (ne pas le connaître est normal).
 *    - mot déjà en (ré)apprentissage → E −0,05 par échec supplémentaire.
 *    Dans tous les cas : I = 0 et prochaine révision dans 10 minutes (court terme).
 *
 *  « Je connais » (good)
 *    - nouveau ou en apprentissage → I = 1 jour (mot « diplômé »).
 *    - en réapprentissage → I = max(1, arrondi(lapsedFrom × 0,4)) : un mot oublié
 *      ne repart pas de zéro, l'historique compte.
 *    - appris → I = max(I + 1, arrondi(I × E)). Révisé en avance : on se base
 *      sur le temps réellement écoulé, sans jamais réduire I.
 *
 *  Mode avancé à trois niveaux :
 *    - Difficile (hard) : E −0,15 ; appris → max(I + 1, arrondi(I × 1,2)) ;
 *      sinon même intervalle que good.
 *    - Facile (easy) : E +0,15 ; nouveau → 4 jours ; appris → arrondi(I × E × 1,3).
 *
 *  Un mot est « maîtrisé » quand I ≥ 21 jours (seuil « mature » d'Anki).
 *  L'intervalle est plafonné à 365 jours.
 */
import type { Grade, SrsState } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

export const SRS = {
  startEase: 2.5,
  minEase: 1.3,
  maxEase: 3.0,
  learningStepMinutes: 10,
  lapseEasePenalty: 0.2,
  repeatFailPenalty: 0.05,
  hardEasePenalty: 0.15,
  easyEaseBonus: 0.15,
  lapseIntervalFactor: 0.4,
  hardFactor: 1.2,
  easyBonus: 1.3,
  easyFirstInterval: 4,
  masteredInterval: 21,
  maxInterval: 365,
} as const;

export function newSrsState(): SrsState {
  return {
    phase: 'new',
    ease: SRS.startEase,
    interval: 0,
    lapsedFrom: 0,
    due: null,
    reps: 0,
    correct: 0,
    incorrect: 0,
    lapses: 0,
    streak: 0,
    lastGrade: null,
    lastReviewed: null,
    firstSeen: null,
  };
}

const clampEase = (e: number) => Math.min(SRS.maxEase, Math.max(SRS.minEase, Math.round(e * 100) / 100));
const clampInterval = (d: number) => Math.min(SRS.maxInterval, Math.max(1, Math.round(d)));

/** Calcule le nouvel état d'un mot après une réponse. Ne modifie pas l'entrée. */
export function schedule(prev: SrsState, grade: Grade, now: number): SrsState {
  const s: SrsState = {
    ...prev,
    reps: prev.reps + 1,
    lastGrade: grade,
    lastReviewed: now,
    firstSeen: prev.firstSeen ?? now,
  };

  if (grade === 'again') {
    s.incorrect = prev.incorrect + 1;
    s.streak = 0;
    if (prev.phase === 'review') {
      s.phase = 'relearning';
      s.lapses = prev.lapses + 1;
      s.lapsedFrom = prev.interval;
      s.ease = clampEase(prev.ease - SRS.lapseEasePenalty);
    } else if (prev.phase === 'new') {
      s.phase = 'learning';
    } else {
      s.ease = clampEase(prev.ease - SRS.repeatFailPenalty);
    }
    s.interval = 0;
    s.due = now + SRS.learningStepMinutes * MINUTE_MS;
    return s;
  }

  s.correct = prev.correct + 1;
  s.streak = prev.streak + 1;

  let ease = prev.ease;
  if (grade === 'hard') ease -= SRS.hardEasePenalty;
  if (grade === 'easy') ease += SRS.easyEaseBonus;
  s.ease = clampEase(ease);

  let interval: number;
  if (prev.phase === 'new' || prev.phase === 'learning') {
    interval = grade === 'easy' ? SRS.easyFirstInterval : 1;
  } else if (prev.phase === 'relearning') {
    const base = Math.max(1, prev.lapsedFrom * SRS.lapseIntervalFactor);
    interval = grade === 'easy' ? Math.max(2, base * 1.5) : base;
  } else {
    // phase review : prise en compte d'une révision anticipée
    const elapsedDays = prev.lastReviewed == null ? prev.interval : (now - prev.lastReviewed) / DAY_MS;
    const early = elapsedDays < prev.interval;
    const basis = early ? Math.max(0, elapsedDays) : prev.interval;
    if (grade === 'hard') {
      interval = early ? prev.interval : Math.max(prev.interval + 1, prev.interval * SRS.hardFactor);
    } else if (grade === 'easy') {
      interval = Math.max(prev.interval + (early ? 0 : 1), basis * s.ease * SRS.easyBonus);
    } else {
      interval = early
        ? Math.max(prev.interval, basis * s.ease)
        : Math.max(prev.interval + 1, prev.interval * s.ease);
    }
  }

  s.phase = 'review';
  s.interval = clampInterval(interval);
  s.due = now + s.interval * DAY_MS;
  return s;
}

/** Le suivi a-t-il commencé (au moins une réponse, ou mot jugé connu au test de placement) ? */
export function isStarted(s: SrsState): boolean {
  return s.reps > 0 || s.origin === 'placement';
}

/** Facteur de difficulté lisible (0 = très facile, 100 = très difficile). */
export function difficultyScore(srs: SrsState): number {
  if (srs.reps === 0) return 0;
  const easePart = (SRS.maxEase - srs.ease) / (SRS.maxEase - SRS.minEase); // 0..1
  const failRatio = srs.incorrect / srs.reps; // 0..1
  return Math.round(Math.min(1, easePart * 0.6 + failRatio * 0.4) * 100);
}

/** Maîtrisé : intervalle d'au moins 21 jours, gagné en révision (pas seulement estimé au test de placement). */
export function isMastered(srs: SrsState): boolean {
  return srs.phase === 'review' && srs.interval >= SRS.masteredInterval && srs.origin !== 'placement';
}

export function isDifficult(srs: SrsState): boolean {
  if (srs.reps === 0) return false;
  return (
    srs.lapses >= 2 ||
    srs.ease <= 2.0 ||
    (srs.incorrect >= 3 && srs.incorrect / srs.reps >= 0.4)
  );
}
