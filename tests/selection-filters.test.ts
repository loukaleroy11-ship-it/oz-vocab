import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, applyFilter, matchesQuery } from '../src/domain/filters';
import { dailyPlan, pickDailySession, pickFromSelection } from '../src/domain/selection';
import { DAY_MS, schedule } from '../src/domain/srs';
import { statusTags } from '../src/domain/status';
import type { Word } from '../src/domain/types';
import { NOW, allCore, makeWord } from './helpers';

const byEn = (ws: Word[], en: string) => ws.find((w) => w.en === en)!;

describe('filtres de l’explorateur', () => {
  const words = allCore();

  it('fréquence : top 100 / 250 / 500 selon le rang réel', () => {
    expect(applyFilter(words, { ...EMPTY_FILTER, freq: 'top100' }, NOW)).toHaveLength(100);
    expect(applyFilter(words, { ...EMPTY_FILTER, freq: 'top250' }, NOW)).toHaveLength(250);
    expect(applyFilter(words, { ...EMPTY_FILTER, freq: 'top500' }, NOW)).toHaveLength(500);
    const range = applyFilter(words, { ...EMPTY_FILTER, freq: 'range', rangeFrom: 120, rangeTo: 130 }, NOW);
    expect(range.map((w) => w.rank)).toEqual([120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130]);
  });

  it('tri par fréquence décroissante et croissante', () => {
    const desc = applyFilter(words, { ...EMPTY_FILTER, sort: 'rank-asc' }, NOW);
    expect(desc[0].en).toBe('be');
    const asc = applyFilter(words, { ...EMPTY_FILTER, sort: 'rank-desc' }, NOW);
    expect(asc[0].rank).toBe(500);
  });

  it('catégorie : verbes parmi le top 100 (catégorie principale ou secondaire)', () => {
    const verbs = applyFilter(words, { ...EMPTY_FILTER, freq: 'top100', pos: ['verb'] }, NOW);
    expect(verbs.length).toBeGreaterThan(20);
    expect(verbs.every((w) => w.rank! <= 100)).toBe(true);
    expect(verbs.every((w) => w.pos === 'verb' || w.posAlt.includes('verb'))).toBe(true);
    expect(verbs.map((w) => w.en)).toEqual(expect.arrayContaining(['know', 'get', 'go', 'think', 'like']));
  });

  it('filtres combinés : verbes du top 100 non maîtrisés', () => {
    const ws = allCore();
    const know = byEn(ws, 'know');
    let s = know.srs;
    let t = NOW - 60 * DAY_MS;
    for (let i = 0; i < 5; i++) {
      s = schedule(s, 'good', t);
      t = s.due!;
    }
    know.srs = s;
    expect(statusTags(know, NOW)).toContain('mastered');
    const res = applyFilter(ws, { ...EMPTY_FILTER, freq: 'top100', pos: ['verb'], status: ['new', 'learning'] }, NOW);
    expect(res.find((w) => w.en === 'know')).toBeUndefined();
    expect(res.find((w) => w.en === 'get')).toBeDefined();
  });

  it('recherche en anglais, en français, partielle et sans accents', () => {
    expect(applyFilter(words, { ...EMPTY_FILTER, query: 'house' }, NOW)[0].en).toBe('house');
    expect(applyFilter(words, { ...EMPTY_FILTER, query: 'maison' }, NOW).map((w) => w.en)).toEqual(
      expect.arrayContaining(['house', 'home']),
    );
    expect(applyFilter(words, { ...EMPTY_FILTER, query: 'ecole' }, NOW)[0].en).toBe('school');
    expect(applyFilter(words, { ...EMPTY_FILTER, query: 'scho' }, NOW).map((w) => w.en)).toContain('school');
    expect(matchesQuery(byEn(words, 'go'), 'went')).toBe(true); // formes fléchies
  });

  it('recherche dans les mots personnels', () => {
    const ws = [...allCore(), makeWord('u1', { en: 'brave', fr: 'courageux' })];
    const res = applyFilter(ws, { ...EMPTY_FILTER, query: 'courag', source: 'user' }, NOW);
    expect(res.map((w) => w.en)).toEqual(['brave']);
  });
});

describe('sélection des mots d’une session', () => {
  it('nouvel utilisateur : les 10 mots les plus fréquents', () => {
    const ids = pickDailySession(allCore(), NOW, { size: 10, newPerDay: 20 });
    expect(ids).toEqual(allCore().slice(0, 10).map((w) => w.id));
  });

  it('les mots à revoir passent avant les nouveaux, les plus en retard d’abord', () => {
    const ws = allCore();
    const a = ws[300];
    const b = ws[200];
    a.srs = { ...schedule(a.srs, 'good', NOW - 5 * DAY_MS) }; // dû il y a 4 jours
    b.srs = { ...schedule(b.srs, 'good', NOW - 2 * DAY_MS) }; // dû hier
    const ids = pickDailySession(ws, NOW, { size: 10, newPerDay: 20 });
    expect(ids.slice(0, 2)).toEqual([a.id, b.id]);
    expect(ids).toHaveLength(10);
  });

  it('limite quotidienne de nouveaux mots', () => {
    const ws = allCore();
    for (const w of ws.slice(0, 18)) w.srs = schedule(w.srs, 'good', NOW - 3600_000); // vus aujourd'hui, dus demain
    const plan = dailyPlan(ws, NOW, 20);
    expect(plan.newStartedToday).toBe(18);
    expect(plan.newAllowance).toBe(2);
    expect(pickDailySession(ws, NOW, { size: 10, newPerDay: 20 })).toHaveLength(2);
    expect(pickDailySession(ws, NOW, { size: 10, newPerDay: 20, ignoreNewLimit: true })).toHaveLength(10);
  });

  it('les mots ajoutés par l’utilisateur passent en premier parmi les nouveaux', () => {
    const ws = [...allCore(), makeWord('u1', { en: 'brave' })];
    expect(pickDailySession(ws, NOW, { size: 3, newPerDay: 20 })[0]).toBe('u1');
  });

  it('sélection de moins de 10 mots : session plus courte', () => {
    const ws = allCore().slice(0, 4);
    const { ids, remaining } = pickFromSelection(ws, NOW, 10);
    expect(ids).toHaveLength(4);
    expect(remaining).toHaveLength(0);
  });

  it('sélection de plus de 10 mots : 10 maintenant, la suite pour la session suivante', () => {
    const { ids, remaining } = pickFromSelection(allCore().slice(0, 25), NOW, 10);
    expect(ids).toHaveLength(10);
    expect(remaining).toHaveLength(15);
    expect(new Set([...ids, ...remaining]).size).toBe(25);
  });
});
