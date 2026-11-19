import { describe, expect, it } from 'vitest';
import { buildLangIndex, detectLanguage } from '../src/domain/lang';
import { answerCurrent, createSession } from '../src/domain/queue';
import { DAY_MS, schedule } from '../src/domain/srs';
import { computeOverview, dailyRows, makeSnapshot, posBreakdown, sessionHistory, studyStreak } from '../src/domain/stats';
import { validateLookupPayload } from '../src/services/lookup/prompt';
import { findExisting } from '../src/services/lookup';
import { NOW, allCore, makeWord } from './helpers';

describe('statistiques', () => {
  it('série de jours consécutifs', () => {
    const d = (n: number) => NOW - n * DAY_MS;
    expect(studyStreak([d(0), d(1), d(2), d(4)], NOW)).toEqual({ streak: 3, includesToday: true });
    // rien aujourd'hui : la série d'hier compte encore
    expect(studyStreak([d(1), d(2)], NOW)).toEqual({ streak: 2, includesToday: false });
    expect(studyStreak([d(3)], NOW).streak).toBe(0);
    expect(studyStreak([], NOW).streak).toBe(0);
  });

  it('vue d’ensemble calculée à partir des réponses enregistrées', () => {
    const words = allCore();
    let s = createSession(words.slice(0, 3).map((w) => w.id), { id: 's', now: NOW - 1000, label: '' });
    const grades = ['good', 'again', 'good', 'good'] as const;
    grades.forEach((g, i) => {
      const id = s.queue[0];
      const w = words.find((x) => x.id === id)!;
      w.srs = schedule(w.srs, g, NOW + i);
      s = answerCurrent(s, g, NOW + i, w.srs.interval);
    });
    const o = computeOverview(words, [s], NOW + 10);
    expect(o.total).toBe(500);
    expect(o.newCount).toBe(497);
    expect(o.seen).toBe(3);
    expect(o.recognized).toBe(3);
    expect(o.mastered).toBe(0); // reconnu ≠ maîtrisé
    expect(o.reviewedToday).toBe(3);
    expect(o.answersToday).toBe(4);
    expect(o.correctToday).toBe(3);
    expect(o.accuracyToday).toBeCloseTo(0.75);
    expect(o.streak).toBe(1);
    const h = sessionHistory([s]);
    expect(h[0]).toMatchObject({ distinct: 3, repetitions: 1, correct: 3, incorrect: 1 });
    expect(h[0].successRate).toBeCloseTo(0.75);
  });

  it('répartition par catégorie grammaticale', () => {
    const rows = posBreakdown(allCore(), NOW);
    expect(rows.reduce((a, r) => a + r.total, 0)).toBe(500);
    expect(rows[0].pos).toBe('noun');
  });

  it('progression jour par jour avec les instantanés de maîtrise', () => {
    const words = allCore();
    const snap = makeSnapshot(words, NOW - 2 * DAY_MS);
    const rows = dailyRows([], [{ ...snap, mastered: 4 }], NOW, 7);
    expect(rows).toHaveLength(7);
    expect(rows[6].day).toBe(makeSnapshot(words, NOW).id);
    expect(rows[4].mastered).toBe(4);
    expect(rows[6].mastered).toBe(4); // valeur prolongée
    expect(rows[0].mastered).toBeNull();
  });
});

describe('détection de la langue et recherche de doublons', () => {
  const words = allCore();
  const index = buildLangIndex(words);
  it.each([
    ['courageux', 'fr'],
    ['to improve', 'en'],
    ['maison', 'fr'],
    ['house', 'en'],
    ['une voiture', 'fr'],
    ['écureuil', 'fr'],
    ['knowledge', 'en'],
  ])('%s → %s', (input, lang) => {
    expect(detectLanguage(input, index).lang).toBe(lang);
  });

  it('signale un mot déjà présent (anglais ou français)', () => {
    expect(findExisting(words, 'to go').map((w) => w.en)).toEqual(['go']);
    expect(findExisting(words, 'maison').map((w) => w.en)).toEqual(expect.arrayContaining(['house']));
    expect(findExisting([...words, makeWord('u', { en: 'brave', fr: 'courageux' })], 'Brave')).toHaveLength(1);
    expect(findExisting(words, 'courageux')).toHaveLength(0);
  });
});

describe('validation des réponses du service de traduction', () => {
  it('accepte une réponse correcte et signale l’ambiguïté', () => {
    const p = validateLookupPayload({
      inputLanguage: 'fr',
      ambiguous: false,
      candidates: [
        { en: 'brave', fr: 'courageux', frAlt: ['vaillant'], pos: 'adjective', ipa: 'bɹæɪv', exampleEn: 'She was very brave.', exampleFr: 'Elle a été très courageuse.', sense: '' },
        { en: 'courageous', fr: 'courageux', frAlt: [], pos: 'adjective', ipa: null, exampleEn: 'A courageous decision.', exampleFr: 'Une décision courageuse.', sense: 'plus soutenu' },
      ],
    });
    expect(p.candidates).toHaveLength(2);
    expect(p.ambiguous).toBe(true);
    expect(p.candidates[0].ipa).toBe('/bɹæɪv/');
  });

  it('écarte les fiches incomplètes et refuse une réponse vide', () => {
    expect(validateLookupPayload({ candidates: [{ en: 'x' }, { fr: 'y' }] }).candidates).toHaveLength(0);
    expect(() => validateLookupPayload(null)).toThrow();
    expect(validateLookupPayload({ candidates: [{ en: 'a', fr: 'b', pos: 'weird' }] }).candidates[0].pos).toBe('other');
  });
});
