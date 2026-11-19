import { describe, expect, it } from 'vitest';
import { DAY_MS, MINUTE_MS, SRS, difficultyScore, isDifficult, isMastered, newSrsState, schedule } from '../src/domain/srs';
import type { Grade, SrsState } from '../src/domain/types';
import { NOW } from './helpers';

function run(grades: Array<[Grade, number]>, start: SrsState = newSrsState()): SrsState {
  // [note, jours écoulés depuis la réponse précédente]
  let s = start;
  let t = NOW;
  for (const [g, days] of grades) {
    t += days * DAY_MS;
    s = schedule(s, g, t);
  }
  return s;
}

describe('répétition espacée (SM-2 adapté)', () => {
  it('nouveau mot connu → révision le lendemain', () => {
    const s = schedule(newSrsState(), 'good', NOW);
    expect(s.phase).toBe('review');
    expect(s.interval).toBe(1);
    expect(s.due).toBe(NOW + DAY_MS);
    expect(s.reps).toBe(1);
    expect(s.correct).toBe(1);
    expect(s.firstSeen).toBe(NOW);
  });

  it('nouveau mot inconnu → court terme (10 min), sans pénalité de facilité', () => {
    const s = schedule(newSrsState(), 'again', NOW);
    expect(s.phase).toBe('learning');
    expect(s.interval).toBe(0);
    expect(s.due).toBe(NOW + 10 * MINUTE_MS);
    expect(s.ease).toBe(SRS.startEase);
    expect(s.incorrect).toBe(1);
  });

  it('l’intervalle augmente progressivement tant que les réponses restent bonnes', () => {
    const intervals: number[] = [];
    let s = newSrsState();
    let t = NOW;
    for (let i = 0; i < 6; i++) {
      s = schedule(s, 'good', t);
      intervals.push(s.interval);
      t = s.due!;
    }
    expect(intervals).toEqual([1, 3, 8, 20, 50, 125]);
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
  });

  it('un mot maîtrisé (≥ 21 j) puis oublié repart en réapprentissage sans revenir à zéro', () => {
    let s = run([['good', 0], ['good', 1], ['good', 3], ['good', 8], ['good', 20]]);
    expect(isMastered(s)).toBe(true);
    const before = s.interval;
    s = schedule(s, 'again', s.due!);
    expect(s.phase).toBe('relearning');
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeCloseTo(SRS.startEase - 0.2);
    expect(s.due! - s.lastReviewed!).toBe(10 * MINUTE_MS);
    const t = s.lastReviewed! + 11 * MINUTE_MS;
    s = schedule(s, 'good', t);
    expect(s.interval).toBe(Math.round(before * 0.4));
    expect(s.interval).toBeGreaterThan(1); // l'historique compte : pas systématiquement « demain »
  });

  it('un mot jamais appris et raté plusieurs fois devient difficile', () => {
    let s = newSrsState();
    let t = NOW;
    for (let i = 0; i < 4; i++) {
      s = schedule(s, 'again', t);
      t += MINUTE_MS;
    }
    expect(s.ease).toBeCloseTo(SRS.startEase - 3 * 0.05);
    s = schedule(s, 'good', t);
    expect(s.interval).toBe(1);
    expect(isDifficult(s)).toBe(true);
    expect(difficultyScore(s)).toBeGreaterThan(30);
  });

  it('les mots difficiles reviennent plus souvent que les mots faciles', () => {
    const easy = run([['good', 0], ['good', 1], ['good', 3]]);
    const hard = run([['again', 0], ['good', 0], ['again', 1], ['good', 0], ['good', 1]]);
    expect(hard.interval).toBeLessThan(easy.interval);
    expect(hard.ease).toBeLessThan(easy.ease);
  });

  it('révision anticipée : l’intervalle ne gonfle pas artificiellement', () => {
    let s = run([['good', 0], ['good', 1], ['good', 3]]); // intervalle 8
    const before = s.interval;
    s = schedule(s, 'good', s.lastReviewed! + DAY_MS); // revu au bout d'un jour seulement
    expect(s.interval).toBe(before);
  });

  it('mode trois niveaux : difficile < normal < facile', () => {
    const base = run([['good', 0], ['good', 1]]);
    const hard = schedule(base, 'hard', base.due!);
    const good = schedule(base, 'good', base.due!);
    const easy = schedule(base, 'easy', base.due!);
    expect(hard.interval).toBeLessThan(good.interval);
    expect(good.interval).toBeLessThan(easy.interval);
    expect(schedule(newSrsState(), 'easy', NOW).interval).toBe(4);
  });

  it('reste dans les bornes (facilité 1,3–3,0 ; intervalle ≤ 365 j)', () => {
    let s = newSrsState();
    let t = NOW;
    for (let i = 0; i < 30; i++) {
      s = schedule(s, 'again', t);
      t += MINUTE_MS;
    }
    expect(s.ease).toBe(SRS.minEase);
    let e = newSrsState();
    t = NOW;
    for (let i = 0; i < 30; i++) {
      e = schedule(e, 'easy', t);
      t = e.due!;
    }
    expect(e.ease).toBe(SRS.maxEase);
    expect(e.interval).toBe(365);
  });

  it('ne modifie pas l’état d’entrée', () => {
    const s = newSrsState();
    const copy = JSON.stringify(s);
    schedule(s, 'good', NOW);
    expect(JSON.stringify(s)).toBe(copy);
  });
});
