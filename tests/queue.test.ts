import { describe, expect, it } from 'vitest';
import {
  MAX_ACTIVE_GAP_MS,
  answerCurrent,
  createSession,
  currentWordId,
  endSession,
  resumeSession,
  sessionProgress,
  wordOutcome,
} from '../src/domain/queue';
import type { Grade, ReviewSession } from '../src/domain/types';
import { NOW } from './helpers';

const LETTERS = 'ABCDEFGHIJ'.split('');
const mk = (ids = LETTERS) => createSession(ids, { id: 's1', now: NOW, label: 'test' });

/** Répond selon une fonction (mot, n° de présentation) → note ; renvoie l'ordre d'affichage. */
function play(s: ReviewSession, decide: (id: string, attempt: number) => Grade, max = 500) {
  const order: string[] = [];
  let t = NOW;
  while (currentWordId(s) && order.length < max) {
    const id = currentWordId(s)!;
    order.push(id);
    const attempt = order.filter((x) => x === id).length;
    t += 5000;
    s = answerCurrent(s, decide(id, attempt), t, 1);
  }
  return { s, order };
}

describe('file de révision (répétition immédiate)', () => {
  it('exemple du cahier des charges : C inconnu revient après J', () => {
    const { order } = play(mk(), (id, n) => (id === 'C' && n === 1 ? 'again' : 'good'));
    expect(order.join('')).toBe('ABCDEFGHIJC');
  });

  it('un mot inconnu plusieurs fois revient à chaque fois en fin de file', () => {
    const { order, s } = play(mk(), (id, n) => (id === 'C' && n <= 2 ? 'again' : 'good'));
    expect(order.join('')).toBe('ABCDEFGHIJCC');
    expect(s.status).toBe('completed');
    expect(wordOutcome(s, 'C')).toEqual({ kind: 'after-retries', attempts: 3 });
    expect(wordOutcome(s, 'A')).toEqual({ kind: 'first-try' });
  });

  it('plusieurs mots inconnus à plusieurs reprises : aucun mot perdu, pas de boucle', () => {
    const misses: Record<string, number> = { B: 3, E: 1, F: 2, J: 4 };
    const { order, s } = play(mk(), (id, n) => (n <= (misses[id] ?? 0) ? 'again' : 'good'));
    // chaque mot apparaît (1 + nombre d'échecs) fois
    for (const id of LETTERS) {
      expect(order.filter((x) => x === id).length, id).toBe(1 + (misses[id] ?? 0));
    }
    expect(s.status).toBe('completed');
    expect(s.queue).toHaveLength(0);
    // l'ordre respecte « retour en fin de file »
    expect(order.slice(0, 10).join('')).toBe('ABCDEFGHIJ');
    expect(order.slice(10, 14).join('')).toBe('BEFJ');
    expect(order.slice(14).join('')).toBe('BFJBJJ');
    const p = sessionProgress(s);
    expect(p.total).toBe(10);
    expect(p.seen).toBe(10);
    expect(p.repetitions).toBe(10);
    expect(p.incorrect).toBe(10);
    expect(p.correct).toBe(10);
  });

  it('un mot connu sort de la file et ne revient pas', () => {
    let s = mk();
    s = answerCurrent(s, 'good', NOW + 1, 1);
    expect(s.queue).not.toContain('A');
    expect(s.queue).toHaveLength(9);
  });

  it('compteur : mots distincts et répétitions sont séparés', () => {
    let s = mk();
    const plan: Grade[] = ['good', 'good', 'again', 'good', 'again', 'good', 'good'];
    plan.forEach((g, i) => (s = answerCurrent(s, g, NOW + i * 1000, 1)));
    let p = sessionProgress(s);
    expect(p.seen).toBe(7);
    expect(p.toDiscover).toBe(3);
    expect(p.repetitions).toBe(0);
    expect(p.pendingRetry).toBe(2);
    // H, I, J puis la première répétition (C)
    for (let i = 0; i < 4; i++) s = answerCurrent(s, 'good', NOW + 10000 + i, 1);
    p = sessionProgress(s);
    expect(p.seen).toBe(10);
    expect(p.toDiscover).toBe(0);
    expect(p.repetitions).toBe(1);
    expect(p.pendingRetry).toBe(1);
  });

  it('session plus courte quand moins de 10 mots sont disponibles', () => {
    const s = createSession(['X', 'Y', 'Y', 'Z'], { id: 's', now: NOW, label: '' });
    expect(s.wordIds).toEqual(['X', 'Y', 'Z']);
    const { order } = play(s, () => 'good');
    expect(order).toEqual(['X', 'Y', 'Z']);
  });

  it('session vide : terminée immédiatement', () => {
    const s = createSession([], { id: 's', now: NOW, label: '' });
    expect(s.status).toBe('completed');
    expect(currentWordId(s)).toBeNull();
  });

  it('on peut terminer la session même si des mots restent difficiles', () => {
    let s = mk(['A', 'B']);
    s = answerCurrent(s, 'again', NOW + 1, 0);
    s = answerCurrent(s, 'again', NOW + 2, 0);
    s = answerCurrent(s, 'again', NOW + 3, 0);
    s = endSession(s, NOW + 4);
    expect(s.status).toBe('completed');
    expect(currentWordId(s)).toBeNull();
    expect(wordOutcome(s, 'A')).toEqual({ kind: 'unfinished', attempts: 2 });
  });

  it('interruption et reprise : la file est intacte et la pause n’est pas comptée', () => {
    let s = mk();
    s = answerCurrent(s, 'good', NOW + 10_000, 1);
    s = answerCurrent(s, 'again', NOW + 20_000, 0);
    const saved = JSON.parse(JSON.stringify(s)) as ReviewSession; // comme après rechargement
    let r = resumeSession(saved, NOW + 3 * 3600_000);
    expect(currentWordId(r)).toBe('C');
    expect(r.queue).toEqual(['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'B']);
    r = answerCurrent(r, 'good', NOW + 3 * 3600_000 + 4000, 1);
    expect(r.activeMs).toBe(20_000 + 4000);
  });

  it('les longues pauses sans reprise explicite sont plafonnées', () => {
    let s = mk();
    s = answerCurrent(s, 'good', NOW + 60 * 60_000, 1);
    expect(s.activeMs).toBe(MAX_ACTIVE_GAP_MS);
  });

  it('tous connus du premier coup : fin normale', () => {
    const { s, order } = play(mk(), () => 'good');
    expect(order).toHaveLength(10);
    expect(s.status).toBe('completed');
    expect(sessionProgress(s).firstTry).toBe(10);
  });
});
