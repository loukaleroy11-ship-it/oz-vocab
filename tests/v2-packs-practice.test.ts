import { describe, expect, it } from 'vitest';
import { CORE_ENTRIES } from '../src/data/core';
import { NATURAL, QUICK, REPHRASE, RIGHT_WORD, SENTENCE_TASKS, SITUATIONS, STORIES } from '../src/data/exercises';
import { PACK_ENTRIES, PACK_META, packWord } from '../src/data/packs';
import { PRON_TIPS } from '../src/data/pronunciation';
import { groupKey, groupLabel } from '../src/data/themes';
import { checkTyped } from '../src/domain/answerCheck';
import { applyFilter, EMPTY_FILTER } from '../src/domain/filters';
import { normalizeWord } from '../src/domain/normalize';
import { buildPlacement, placementBands } from '../src/domain/placement';
import { addPractice, cleanPractice, currentStage, pickItems, stageProgress, PRACTICE_LEVELS, type PracticeEntry } from '../src/domain/practice';
import { planNextSession } from '../src/domain/selection';
import { newSrsState, schedule } from '../src/domain/srs';
import { normalizeSettings, type Word } from '../src/domain/types';
import { NOW, allCore } from './helpers';

const all = (): Word[] => [...allCore(), ...PACK_ENTRIES.map((e) => packWord(e, NOW))];

describe('paquets de vocabulaire', () => {
  it('B1, B2, C1, phrasal verbs, expressions, australien et travail sont présents, sans doublon avec les 500', () => {
    expect(PACK_META.counts.b1).toBeGreaterThan(600);
    expect(PACK_META.counts.b2).toBeGreaterThan(450);
    expect(PACK_META.counts.c1).toBeGreaterThan(350);
    expect(PACK_META.counts.phrasal).toBe(150);
    expect(PACK_META.counts.idioms).toBeGreaterThan(80);
    expect(PACK_META.counts.aussie).toBeGreaterThan(80);
    expect(PACK_META.counts.work).toBeGreaterThan(100);
    const core = new Set(CORE_ENTRIES.map((e) => e.en.toLowerCase()));
    const seen = new Set<string>();
    for (const e of PACK_ENTRIES) {
      const k = e.en.toLowerCase();
      expect(core.has(k), e.en).toBe(false);
      expect(seen.has(k), e.en).toBe(false);
      seen.add(k);
      expect(e.fr.trim().length, e.en).toBeGreaterThan(0);
    }
    expect(new Set(PACK_ENTRIES.map((e) => e.id)).size).toBe(PACK_ENTRIES.length);
  });

  it('les paquets thématiques ont un exemple traduit pour chaque entrée', () => {
    for (const e of PACK_ENTRIES.filter((x) => ['phrasal', 'idioms', 'aussie', 'work'].includes(x.pack))) {
      expect(e.exampleEn, e.en).toMatch(/[.!?»"]$/);
      expect(e.exampleFr.length, e.en).toBeGreaterThan(3);
    }
  });

  it('ordre d’apprentissage : après les 500, B1 puis B2 puis C1, phrasal verbs intercalés par petits groupes', () => {
    const ranks = PACK_ENTRIES.map((e) => e.rank);
    expect(ranks[0]).toBe(501);
    expect(ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1)).toBe(true);
    const firstB2 = PACK_ENTRIES.findIndex((e) => e.pack === 'b2');
    const lastB1 = PACK_ENTRIES.map((e) => e.pack).lastIndexOf('b1');
    expect(lastB1).toBeLessThan(firstB2);
    expect(PACK_ENTRIES.slice(0, 60).some((e) => e.pack === 'phrasal')).toBe(true);
    expect(groupLabel(PACK_ENTRIES[0].group)).toContain('phrasal verbs');
  });

  it('les nouvelles listes enchaînent sur les paquets quand les 500 sont commencés, et respectent les paquets désactivés', () => {
    const words = all().map((w) => (w.pack ? w : { ...w, srs: { ...schedule(newSrsState(), 'good', NOW - 5 * 86_400_000), due: NOW + 9 * 86_400_000 } }));
    // tout est révisé et produit : la séance propose les paquets
    const ready = words.map((w) => (w.pack ? w : { ...w, prod: { ...schedule(newSrsState(), 'good', NOW - 2 * 86_400_000), due: NOW + 5 * 86_400_000 } }));
    const plan = planNextSession(ready, NOW, { size: 10, newPerDay: 0 });
    expect(plan.kind).toBe('new');
    expect(plan.ids.every((id) => id.startsWith('phrasal-') || id.startsWith('b1-'))).toBe(true);
    const off = planNextSession(ready, NOW, { size: 10, newPerDay: 0, disabledPacks: ['phrasal', 'b1'] });
    expect(off.ids.some((id) => id.startsWith('phrasal-') || id.startsWith('b1-'))).toBe(false);
  });

  it('thème de liste et filtre par paquet', () => {
    const w = packWord(PACK_ENTRIES.find((e) => e.pack === 'aussie')!, NOW);
    expect(groupKey(w)).toMatch(/^t:australien/);
    const words = all();
    const aussie = applyFilter(words, { ...EMPTY_FILTER, source: 'aussie' }, NOW);
    expect(aussie.length).toBe(PACK_META.counts.aussie);
    const core = applyFilter(words, { ...EMPTY_FILTER, source: 'core' }, NOW);
    expect(core.length).toBe(500);
  });

  it('orthographe australienne affichée, variante américaine acceptée à l’écrit', () => {
    const fav = packWord(PACK_ENTRIES.find((e) => e.en === 'favourite')!, NOW);
    expect(fav.spellingAlt).toContain('favorite');
    expect(checkTyped('favorite', fav, [fav]).verdict).toBe('exact');
  });

  it('un mot de paquet reçu sans ses métadonnées les retrouve', () => {
    const e = PACK_ENTRIES[0];
    const raw = { ...packWord(e, NOW) } as Partial<Word>;
    delete raw.pack;
    delete raw.group;
    const n = normalizeWord(raw as Word);
    expect(n.pack).toBe(e.pack);
    expect(n.group).toBe(e.group);
  });

  it('test de placement étendu aux niveaux B1 à C1 (tranches de 100), sans les paquets thématiques', () => {
    const words = all();
    const bands = placementBands(words);
    expect(bands.get(words.find((w) => w.pack === 'phrasal')!.id)).toBeUndefined();
    expect(bands.get(words.find((w) => w.pack === 'b1')!.id)).toBe(100);
    expect(bands.get(words.find((w) => w.pack === 'c1')!.id)).toBe(300);
    const q = buildPlacement(words, () => 0.42);
    expect(new Set(q.map((x) => x.band)).has(200)).toBe(true);
  });
});

describe('exercices « S’exprimer »', () => {
  it('chaque niveau a du contenu pour chaque exercice', () => {
    for (const l of PRACTICE_LEVELS) {
      expect(SENTENCE_TASKS[l].length).toBeGreaterThanOrEqual(4);
      expect(RIGHT_WORD.filter((x) => x.level === l).length, `mot juste ${l}`).toBeGreaterThanOrEqual(6);
      expect(NATURAL.filter((x) => x.level === l).length, `naturel ${l}`).toBeGreaterThanOrEqual(6);
      expect(REPHRASE.filter((x) => x.level === l).length, `reformuler ${l}`).toBeGreaterThanOrEqual(5);
      expect(SITUATIONS.filter((x) => x.level === l).length, `situations ${l}`).toBeGreaterThanOrEqual(5);
      expect(QUICK.filter((x) => x.level === l).length, `rapide ${l}`).toBeGreaterThanOrEqual(10);
      expect(STORIES.filter((x) => x.level === l).length, `histoire ${l}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('le mot juste : réponse valide, E parfois juste ; situations : modèle et version au-dessus', () => {
    for (const x of RIGHT_WORD) {
      expect(x.sentence).toContain('___');
      expect(x.correct === null || x.correct < x.options.length).toBe(true);
      expect(new Set(x.options).size).toBe(x.options.length);
    }
    expect(RIGHT_WORD.some((x) => x.correct === null)).toBe(true);
    for (const s of SITUATIONS) {
      expect(s.modelUp.length).toBeGreaterThan(s.model.length * 0.8);
      expect(s.phrases.length).toBeGreaterThanOrEqual(2);
    }
    const ids = [...RIGHT_WORD, ...NATURAL, ...REPHRASE, ...SITUATIONS, ...QUICK, ...STORIES].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tirage d’une série : le niveau choisi d’abord, complété par les niveaux voisins', () => {
    const b2 = pickItems(SITUATIONS, 'B2', 3, () => 0.3);
    expect(b2.every((x) => x.level === 'B2')).toBe(true);
    const many = pickItems(SITUATIONS, 'A2', 9, () => 0.3);
    expect(many.length).toBe(9);
    expect(many.filter((x) => x.level === 'A2').length).toBe(SITUATIONS.filter((x) => x.level === 'A2').length);
    expect(many.some((x) => x.level === 'B1')).toBe(true);
    expect(many.some((x) => x.level === 'C1')).toBe(false);
  });

  it('prononciation : 12 fiches avec des éléments à répéter (aucun exercice d’écoute ou de dictée)', () => {
    expect(PRON_TIPS.length).toBe(12);
    expect(PRON_TIPS.every((t) => t.practice.length >= 4)).toBe(true);
  });
});

describe('progression A2 → C1', () => {
  const entry = (over: Partial<PracticeEntry>): PracticeEntry => ({ id: Math.random().toString(36), kind: 'situation', itemId: 's1', level: 'A2', at: NOW, success: true, ...over });

  it('un niveau se valide avec 80 % de mots productibles ET 5 situations réussies (différentes)', () => {
    const words = all().map((w) => (w.cefr === 'A1' || w.cefr === 'A2' ? { ...w, prod: schedule(newSrsState(), 'good', NOW - 86_400_000) } : w));
    const few = [1, 2, 3, 4].map((n) => entry({ itemId: `s${n}` }));
    expect(stageProgress(words, few)[0].passed).toBe(false);
    expect(currentStage(stageProgress(words, few))).toBe('A2');
    const same = [1, 2, 3, 4, 5].map(() => entry({ itemId: 's1' }));
    expect(stageProgress(words, same)[0].situations).toBe(1);
    const five = [1, 2, 3, 4, 5].map((n) => entry({ itemId: `s${n}` }));
    const st = stageProgress(words, five);
    expect(st[0].passed).toBe(true);
    expect(currentStage(st)).toBe('B1');
  });

  it('journal : fusion sans doublon, nettoyage à l’import, plafond', () => {
    const a = entry({ id: 'a' });
    const merged = addPractice([a], [a, entry({ id: 'b' })]);
    expect(merged.map((e) => e.id)).toEqual(['a', 'b']);
    expect(cleanPractice([a, { id: 1 }, null, { ...a, kind: 'dictée' }])).toEqual([a]);
  });

  it('réglage du niveau des exercices : B1 par défaut', () => {
    expect(normalizeSettings({}).practiceLevel).toBe('B1');
    expect(normalizeSettings({ practiceLevel: 'X' as never }).practiceLevel).toBe('B1');
  });
});
