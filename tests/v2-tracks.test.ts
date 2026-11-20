import { describe, expect, it } from 'vitest';
import { CORE_ENTRIES } from '../src/data/core';
import { AU_SPELLING, COGNATE_GROUPS, FALSE_FRIENDS } from '../src/data/cognates';
import { TENSES, TENSE_QUIZ } from '../src/data/tenses';
import { checkTyped, levenshtein, normalizeAnswer } from '../src/domain/answerCheck';
import { normalizeWord } from '../src/domain/normalize';
import { BAND_SIZE, PER_BAND, buildPlacement, scorePlacement, shouldStop, type PlacementAnswer } from '../src/domain/placement';
import { dueCards, planNextSession } from '../src/domain/selection';
import { DAY_MS, MINUTE_MS, newSrsState, schedule } from '../src/domain/srs';
import { computeOverview, levelBreakdown } from '../src/domain/stats';
import { applyAnswer, cardKey, parseCard, readyToProduce } from '../src/domain/tracks';
import { DEFAULT_SETTINGS, normalizeSettings, type Word } from '../src/domain/types';
import { analyzeImport, buildExport } from '../src/storage/importExport';
import { NOW, allCore, makeWord } from './helpers';

const OPTS = { size: 10, newPerDay: 0 };

/** Mot appris (reconnu) il y a `daysAgo` jours, à revoir dans `dueInDays` jours. */
function learned(w: Word, daysAgo: number, dueInDays: number): Word {
  const t = NOW - daysAgo * DAY_MS;
  const srs = schedule(newSrsState(), 'good', t);
  return { ...w, srs: { ...srs, due: NOW + dueInDays * DAY_MS, interval: Math.max(1, daysAgo) } };
}

function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

describe('deux suivis : migration et cartes', () => {
  it('un mot d’une ancienne version reçoit un suivi « produire » vierge et son niveau, sans perdre sa progression', () => {
    const w = allCore()[0];
    const old = { ...w, srs: schedule(w.srs, 'good', NOW) } as Partial<Word> as Word;
    delete (old as Partial<Word>).prod;
    delete (old as Partial<Word>).cefr;
    const n = normalizeWord(old);
    expect(n.prod).toEqual(newSrsState());
    expect(n.cefr).toBe('A1');
    expect(n.srs).toEqual(old.srs);
    expect(normalizeWord(n)).toBe(n); // rien à refaire
  });

  it('clés de carte : les anciennes sessions (identifiants simples) restent des cartes « reconnaître »', () => {
    expect(parseCard('core-001')).toEqual({ wordId: 'core-001', track: 'rec' });
    expect(parseCard(cardKey('u-x', 'prod'))).toEqual({ wordId: 'u-x', track: 'prod' });
  });

  it('réussir « produire » valide aussi la reconnaissance à revoir ; rater ne la touche pas', () => {
    const w = learned(makeWord('a'), 5, 0);
    const p = { ...w, prod: { ...schedule(newSrsState(), 'good', NOW - 3 * DAY_MS), due: NOW - 1 } };
    const ok = applyAnswer(p, 'prod', 'good', NOW);
    expect(ok.prod.interval).toBeGreaterThan(1);
    expect(ok.srs.lastReviewed).toBe(NOW);
    const ko = applyAnswer(p, 'prod', 'again', NOW);
    expect(ko.srs).toEqual(p.srs);
    expect(ko.prod.phase).toBe('relearning');
  });

  it('un mot « jugé connu » au placement puis raté repart comme un mot nouveau, sans compter un oubli', () => {
    const w = makeWord('p', { srs: { ...newSrsState(), phase: 'review', interval: 10, due: NOW, firstSeen: NOW - DAY_MS, origin: 'placement' } });
    const r = applyAnswer(w, 'rec', 'again', NOW);
    expect(r.srs.phase).toBe('learning');
    expect(r.srs.lapses).toBe(0);
    expect(r.srs.origin).toBeUndefined();
  });

  it('la première carte « produire » attend le lendemain de l’apprentissage', () => {
    expect(readyToProduce(learned(makeWord('t'), 0, 1), NOW)).toBe(false);
    expect(readyToProduce(learned(makeWord('y'), 1, 1), NOW)).toBe(true);
    const placed = makeWord('pl', { srs: { ...newSrsState(), phase: 'review', interval: 9, due: NOW + 9 * DAY_MS, firstSeen: NOW, origin: 'placement' } });
    expect(readyToProduce(placed, NOW)).toBe(true);
  });
});

describe('séance du jour : ordre de priorité', () => {
  it('oubliés → « produire » à revoir → « reconnaître » à revoir', () => {
    const rec = learned(makeWord('rec'), 10, 0);
    const prodWord = learned(makeWord('prod'), 10, 5);
    prodWord.prod = { ...schedule(newSrsState(), 'good', NOW - 4 * DAY_MS), due: NOW - 1 };
    const forgotten = learned(makeWord('oubli'), 20, 0);
    forgotten.srs = schedule({ ...forgotten.srs, interval: 12, phase: 'review' }, 'again', NOW - 20 * MINUTE_MS);
    const cards = dueCards([rec, prodWord, forgotten], NOW);
    expect(cards.map((c) => c.key)).toEqual(['oubli', 'prod@p', 'rec']);
    const plan = planNextSession([rec, prodWord, forgotten], NOW, OPTS);
    expect(plan.kind).toBe('review');
    expect(plan.ids[0]).toBe('oubli');
    expect(plan.forgotten).toBe(1);
    expect(plan.prodDue).toBe(1);
    expect(plan.recDue).toBe(1);
  });

  it('un mot à revoir dans les deux suivis ne donne qu’une carte, « produire »', () => {
    const w = learned(makeWord('both'), 10, 0);
    w.prod = { ...schedule(newSrsState(), 'good', NOW - 4 * DAY_MS), due: NOW - 1 };
    expect(dueCards([w], NOW).map((c) => c.key)).toEqual(['both@p']);
  });

  it('après la première nouvelle liste du jour, les mots des jours précédents passent à l’oral, en alternance', () => {
    const core = allCore();
    // 12 mots appris avant-hier (prêts à être dits), révisions à jour
    const ready = core.slice(0, 12).map((w) => learned(w, 2, 3));
    const words = [...ready, ...core.slice(12)];
    // aucun nouveau mot aujourd'hui → d'abord une nouvelle liste
    expect(planNextSession(words, NOW, OPTS).kind).toBe('new');
    // 10 nouveaux mots commencés aujourd'hui → la liste suivante est « à dire en anglais »
    const startedToday = words.map((w, i) => (i >= 12 && i < 22 ? { ...w, srs: schedule(w.srs, 'good', NOW - 60_000) } : w));
    const next = planNextSession(startedToday, NOW, OPTS);
    expect(next.kind).toBe('produce');
    expect(next.ids).toHaveLength(10);
    expect(next.ids.every((id) => id.endsWith('@p'))).toBe(true);
    expect(next.produceAvailable).toBe(12);
  });

  it('les mots jugés connus au placement ne sont pas proposés comme nouveaux', () => {
    const core = allCore();
    core[0] = { ...core[0], srs: { ...newSrsState(), phase: 'review', interval: 9, due: NOW + 9 * DAY_MS, firstSeen: NOW, origin: 'placement' } };
    const plan = planNextSession(core, NOW, OPTS);
    expect(plan.newAvailable).toBe(499);
    expect(plan.kind).toBe('new');
    expect(plan.ids).not.toContain(core[0].id);
    expect(plan.newStartedToday).toBe(0);
  });
});

describe('réponse tapée (français → anglais)', () => {
  const words = allCore();
  const byEn = (en: string) => words.find((w) => w.en === en)!;

  it('normalise : majuscules, « to », apostrophes, ponctuation', () => {
    expect(normalizeAnswer('  To Go! ')).toBe('go');
    expect(normalizeAnswer('Don’t')).toBe("don't");
  });

  it('distance d’édition avec inversion de lettres', () => {
    expect(levenshtein('freind', 'friend')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('exact, faute de frappe, forme conjuguée, autre mot, vide', () => {
    expect(checkTyped('think', byEn('think'), words).verdict).toBe('exact');
    expect(checkTyped('thnik', byEn('think'), words).verdict).toBe('typo');
    expect(checkTyped('went', byEn('go'), words).verdict).toBe('form');
    // « thing » existe : ce n'est pas une faute de frappe de « think »
    const thing = checkTyped('thing', byEn('think'), words);
    expect(thing.verdict).toBe('wrong');
    expect(thing.matched?.en).toBe('thing');
    expect(checkTyped('   ', byEn('think'), words).verdict).toBe('empty');
    // mot court : aucune faute tolérée
    expect(checkTyped('bes', byEn('be'), words).suggested).toBe('again');
  });

  it('un synonyme qui partage la traduction est signalé, la note est laissée à l’utilisateur', () => {
    const big = makeWord('big', { en: 'big', fr: 'grand' });
    const large = makeWord('large', { en: 'large', fr: 'grand' });
    const r = checkTyped('large', big, [big, large]);
    expect(r.verdict).toBe('other-word');
    expect(r.suggested).toBeNull();
  });
});

describe('test de placement', () => {
  it('4 mots par tranche de 50, 4 traductions distinctes, E juste environ 1 fois sur 5', () => {
    const words = allCore();
    const q = buildPlacement(words, rng(7));
    expect(q).toHaveLength((500 / BAND_SIZE) * PER_BAND);
    const byId = new Map(words.map((w) => [w.id, w]));
    let none = 0;
    for (const item of q) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options.map((o) => o.toLowerCase())).size).toBe(4);
      const target = byId.get(item.wordId)!;
      if (item.correct === 4) {
        none++;
        expect(item.options).not.toContain(target.fr);
      } else {
        expect(item.options[item.correct]).toBe(target.fr);
      }
    }
    expect(none).toBeGreaterThan(0);
    expect(none).toBeLessThan(q.length / 2);
  });

  it('ne teste jamais un mot déjà commencé', () => {
    const words = allCore().map((w, i) => (i < 60 ? { ...w, srs: schedule(w.srs, 'good', NOW) } : w));
    const q = buildPlacement(words, rng(3));
    const started = new Set(words.slice(0, 60).map((w) => w.id));
    expect(q.some((x) => started.has(x.wordId))).toBe(false);
  });

  it('tranche réussie → mots jugés connus (révision dans 1 à 4 semaines) ; mot raté → reste à apprendre', () => {
    const words = allCore();
    const q = buildPlacement(words, rng(11));
    // tout juste sur les 2 premières tranches sauf une erreur, puis « je ne sais pas »
    const answers: PlacementAnswer[] = q.map((x, i) => (x.band < 2 ? (i === 1 ? (x.correct + 1) % 5 : x.correct) : null));
    const out = scorePlacement(words, q, answers, NOW);
    expect(out.bands[0].passed).toBe(true);
    expect(out.bands[1].passed).toBe(true);
    expect(out.bands[2].passed).toBe(false);
    const placedIds = new Set(out.placed.map((w) => w.id));
    expect(placedIds.has(q[1].wordId)).toBe(false); // raté pendant le test
    expect(out.placed.length).toBe(99); // 100 mots des tranches 1-2, moins le mot raté
    for (const w of out.placed) {
      expect(w.srs.origin).toBe('placement');
      expect(w.srs.reps).toBe(0); // aucune révision inventée
      expect(w.srs.interval).toBeGreaterThanOrEqual(7);
      expect(w.srs.interval).toBeLessThanOrEqual(28);
      expect(w.rank!).toBeLessThanOrEqual(100);
    }
    // les échéances sont réparties
    expect(new Set(out.placed.map((w) => w.srs.interval)).size).toBeGreaterThan(10);
    // estimation statistique : 3 + 46 × 0,75 (tranche 1) + 50 (tranche 2)
    expect(out.knownEstimate).toBe(88);
  });

  it('s’arrête après deux tranches de suite sous 50 %', () => {
    const words = allCore();
    const q = buildPlacement(words, rng(5));
    const wrong = (i: number) => (q[i].correct + 1) % 5;
    const answers: PlacementAnswer[] = [];
    for (let i = 0; i < PER_BAND * 2; i++) answers.push(i < PER_BAND ? q[i].correct : null);
    expect(shouldStop(q, answers)).toBe(false); // 1re réussie, 2e ratée
    for (let i = PER_BAND * 2; i < PER_BAND * 3; i++) answers.push(wrong(i));
    expect(shouldStop(q, answers)).toBe(true);
  });
});

describe('progrès par niveau', () => {
  it('compte reconnus et productibles par niveau CECRL', () => {
    const words = allCore();
    words[0] = learned(words[0], 3, 2);
    words[0].prod = schedule(newSrsState(), 'good', NOW - DAY_MS);
    const rows = levelBreakdown(words);
    const a1 = rows.find((r) => r.level === 'A1')!;
    expect(a1.recognized).toBe(1);
    expect(a1.producible).toBe(1);
    expect(rows.reduce((n, r) => n + r.total, 0)).toBe(500);
    const o = computeOverview(words, [], NOW);
    expect(o.recognized).toBe(1);
    expect(o.producible).toBe(1);
  });

  it('tous les mots de référence ont un niveau', () => {
    expect(CORE_ENTRIES.every((e) => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(e.cefr))).toBe(true);
    expect(CORE_ENTRIES.find((e) => e.en === 'be')!.cefr).toBe('A1');
  });
});

describe('import et réglages v3', () => {
  it('un export d’avant la v2 (sans suivi « produire ») s’importe avec un suivi vierge', () => {
    const words = allCore();
    const file = buildExport({ words, sessions: [], daily: [], settings: { ...DEFAULT_SETTINGS } }, NOW) as unknown as { words: Partial<Word>[] };
    file.words.forEach((w) => {
      delete w.prod;
      delete w.cefr;
    });
    const a = analyzeImport(JSON.stringify(file), { words, sessions: [], daily: [], settings: { ...DEFAULT_SETTINGS } });
    expect(a.ok).toBe(true);
    expect(a.words.every((w) => w.prod && w.prod.reps === 0 && w.cefr)).toBe(true);
  });

  it('réglages v2 → v3 : réponse à l’oral par défaut, test de placement à faire', () => {
    const s = normalizeSettings({ schema: 2, newPerDay: 0 } as never);
    expect(s.prodMode).toBe('oral');
    expect(s.placementDone).toBe(false);
    expect(s.schema).toBe(3);
  });
});

describe('fiches : temps et mots apparentés', () => {
  it('5 temps complets', () => {
    expect(TENSES).toHaveLength(5);
    for (const t of TENSES) {
      expect(t.uses.length).toBeGreaterThanOrEqual(3);
      expect(t.forms.map((f) => f.label)).toEqual(['Affirmation', 'Négation', 'Question']);
      expect(t.traps.length).toBeGreaterThanOrEqual(2);
      expect(t.speak.length).toBeGreaterThanOrEqual(2);
      expect(t.signals.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('quiz : 4 propositions distinctes, réponse valide, E juste au moins une fois, chaque temps couvert', () => {
    for (const q of TENSE_QUIZ) {
      expect(new Set(q.options).size).toBe(4);
      expect(q.correct === null || (q.correct >= 0 && q.correct <= 3)).toBe(true);
      expect(q.explain.length).toBeGreaterThan(10);
    }
    expect(TENSE_QUIZ.some((q) => q.correct === null)).toBe(true);
    expect(new Set(TENSE_QUIZ.map((q) => q.tense)).size).toBe(5);
    expect(new Set(TENSE_QUIZ.map((q) => q.id)).size).toBe(TENSE_QUIZ.length);
  });

  it('règles des mots apparentés avec au moins 2 exemples, faux amis et orthographe australienne', () => {
    const rules = COGNATE_GROUPS.flatMap((g) => g.rules);
    expect(rules.length).toBeGreaterThanOrEqual(20);
    expect(rules.every((r) => r.examples.length >= 2 || r.fr === '-ment')).toBe(true);
    expect(FALSE_FRIENDS.find((f) => f.en === 'actually')?.trap).toContain('currently');
    expect(AU_SPELLING.some((a) => a.examples.includes('colour'))).toBe(true);
  });
});
