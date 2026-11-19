/**
 * File de révision d'une session (répétition immédiate). Fonctions pures.
 *
 * - La session démarre avec N mots distincts (10 par défaut, moins si la
 *   sélection est plus petite).
 * - « Je ne connais pas » : le mot est replacé à la fin de la file actuelle.
 * - « Je connais » (ou Difficile / Facile) : le mot sort de la file.
 * - La session se termine quand la file est vide, ou quand l'utilisateur
 *   l'arrête : aucune boucle bloquante possible.
 */
import type { Grade, ReviewSession, SessionAnswer, SessionFilterRef } from './types';

/** Au-delà de cette durée sans réponse, le temps n'est plus compté comme actif. */
export const MAX_ACTIVE_GAP_MS = 3 * 60 * 1000;

export function createSession(
  wordIds: string[],
  opts: { id: string; now: number; label: string; selection?: SessionFilterRef | null },
): ReviewSession {
  const distinct = Array.from(new Set(wordIds));
  return {
    id: opts.id,
    createdAt: opts.now,
    updatedAt: opts.now,
    endedAt: null,
    status: distinct.length === 0 ? 'completed' : 'active',
    label: opts.label,
    wordIds: distinct,
    queue: [...distinct],
    answers: [],
    activeMs: 0,
    lastActivityAt: opts.now,
    selection: opts.selection ?? null,
    deleted: false,
  };
}

export function currentWordId(s: ReviewSession): string | null {
  return s.status === 'active' ? (s.queue[0] ?? null) : null;
}

export function attemptsFor(s: ReviewSession, wordId: string): number {
  return s.answers.filter((a) => a.wordId === wordId).length;
}

/**
 * Enregistre la réponse sur le mot courant et fait avancer la file.
 * `intervalAfter` est l'intervalle calculé par le moteur SRS (pour l'historique).
 */
export function answerCurrent(
  s: ReviewSession,
  grade: Grade,
  now: number,
  intervalAfter: number,
): ReviewSession {
  const wordId = currentWordId(s);
  if (!wordId) return s;
  const answer: SessionAnswer = {
    wordId,
    grade,
    at: now,
    attempt: attemptsFor(s, wordId) + 1,
    intervalAfter,
  };
  const rest = s.queue.slice(1);
  const queue = grade === 'again' ? [...rest, wordId] : rest;
  const gap = Math.max(0, now - s.lastActivityAt);
  const done = queue.length === 0;
  return {
    ...s,
    queue,
    answers: [...s.answers, answer],
    activeMs: s.activeMs + Math.min(gap, MAX_ACTIVE_GAP_MS),
    lastActivityAt: now,
    updatedAt: now,
    status: done ? 'completed' : 'active',
    endedAt: done ? now : null,
  };
}

/** Reprise après une interruption : le temps de pause n'est pas compté. */
export function resumeSession(s: ReviewSession, now: number): ReviewSession {
  return { ...s, lastActivityAt: now, updatedAt: now };
}

/** Arrêt volontaire : les mots non terminés gardent leur état et reviendront plus tard. */
export function endSession(s: ReviewSession, now: number): ReviewSession {
  if (s.status !== 'active') return s;
  return {
    ...s,
    status: s.answers.length > 0 ? 'completed' : 'abandoned',
    endedAt: now,
    updatedAt: now,
  };
}

export interface SessionProgress {
  /** Nombre de mots distincts dans la session. */
  total: number;
  /** Mots distincts déjà présentés au moins une fois. */
  seen: number;
  /** Mots distincts jamais encore présentés. */
  toDiscover: number;
  /** Mots sortis de la file (reconnus). */
  known: number;
  /** Présentations supplémentaires (au-delà de la première) d'un même mot. */
  repetitions: number;
  /** Mots déjà vus qui attendent encore dans la file. */
  pendingRetry: number;
  correct: number;
  incorrect: number;
  /** Mots reconnus dès la première présentation. */
  firstTry: number;
}

export function sessionProgress(s: ReviewSession): SessionProgress {
  const seenSet = new Set(s.answers.map((a) => a.wordId));
  const queueSet = new Set(s.queue);
  const knownSet = new Set(s.answers.filter((a) => a.grade !== 'again').map((a) => a.wordId));
  const firstTry = s.answers.filter((a) => a.attempt === 1 && a.grade !== 'again').length;
  const correct = s.answers.filter((a) => a.grade !== 'again').length;
  return {
    total: s.wordIds.length,
    seen: seenSet.size,
    toDiscover: s.wordIds.filter((id) => !seenSet.has(id)).length,
    known: knownSet.size,
    repetitions: s.answers.length - seenSet.size,
    pendingRetry: [...queueSet].filter((id) => seenSet.has(id)).length,
    correct,
    incorrect: s.answers.length - correct,
    firstTry,
  };
}

export type WordOutcome =
  | { kind: 'first-try' }
  | { kind: 'after-retries'; attempts: number }
  | { kind: 'unfinished'; attempts: number };

/** Résultat par mot, pour l'écran de fin de session. */
export function wordOutcome(s: ReviewSession, wordId: string): WordOutcome {
  const answers = s.answers.filter((a) => a.wordId === wordId);
  const last = answers[answers.length - 1];
  if (!last || last.grade === 'again') return { kind: 'unfinished', attempts: answers.length };
  if (answers.length === 1) return { kind: 'first-try' };
  return { kind: 'after-retries', attempts: answers.length };
}
