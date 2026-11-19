import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, applyFilter, matchesQuery } from '../src/domain/filters';
import { MAX_OVERFLOW, THEME_WINDOW, coherentPick, pickFromSelection, planNextSession } from '../src/domain/selection';
import { groupKey, groupLabel } from '../src/data/themes';
import { normalizeSettings } from '../src/domain/types';
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

describe('bouton « Réviser » : révisions puis nouvelles listes cohérentes', () => {
  const plan = (ws: Word[], now = NOW, newPerDay = 0, ignoreNewLimit = false) =>
    planNextSession(ws, now, { size: 10, newPerDay, ignoreNewLimit });
  const ens = (ws: Word[], ids: string[]) => ids.map((id) => ws.find((w) => w.id === id)!.en);

  it('première liste : verbes essentiels puis la famille des pronoms au complet', () => {
    const ws = allCore();
    const p = plan(ws);
    expect(p.kind).toBe('new');
    expect(ens(ws, p.ids)).toEqual(['be', 'have', 'do', 'get', 'you', 'it', 'they', 'we', 'he', 'I', 'she']);
    expect(p.groups.map(groupLabel)).toEqual(['verbes essentiels', 'pronoms']);
  });

  it('les mots d’un même thème se suivent dans la liste', () => {
    const ws = allCore();
    const p = plan(ws);
    const keys = p.ids.map((id) => groupKey(ws.find((w) => w.id === id)!));
    const changes = keys.filter((k, i) => i > 0 && k !== keys[i - 1]).length;
    expect(changes).toBe(p.groups.length - 1);
  });

  it('les listes successives suivent à peu près la fréquence, sans perdre ni répéter de mot', () => {
    let pool = allCore();
    const seen = new Set<string>();
    let lists = 0;
    while (pool.length) {
      const p = coherentPick(pool, 10);
      expect(p.ids.length).toBeGreaterThan(0);
      expect(p.ids.length).toBeLessThanOrEqual(10 + MAX_OVERFLOW);
      const firstRank = pool[0].rank!;
      expect(p.ids[0]).toBe(pool[0].id); // le mot le plus fréquent restant est toujours pris
      for (const id of p.ids) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
        const w = pool.find((x) => x.id === id)!;
        expect(w.rank! - firstRank).toBeLessThan(THEME_WINDOW + 40);
      }
      const set = new Set(p.ids);
      pool = pool.filter((w) => !set.has(w.id));
      lists++;
    }
    expect(seen.size).toBe(500);
    expect(lists).toBeGreaterThanOrEqual(42);
    expect(lists).toBeLessThanOrEqual(50);
  });

  it('les mots à revoir passent avant les nouveaux, sans mélange', () => {
    const ws = allCore();
    const a = ws[300];
    const b = ws[200];
    a.srs = schedule(a.srs, 'good', NOW - 5 * DAY_MS); // dû il y a 4 jours
    b.srs = schedule(b.srs, 'good', NOW - 2 * DAY_MS); // dû hier
    const p = plan(ws);
    expect(p.kind).toBe('review');
    expect(p.ids.sort()).toEqual([a.id, b.id].sort());
  });

  it('tout est révisé : une nouvelle liste est proposée automatiquement (pas de limite par défaut)', () => {
    const ws = allCore();
    // 40 mots appris aujourd'hui, à revoir demain
    for (const w of ws.slice(0, 40)) w.srs = schedule(w.srs, 'good', NOW - 3600_000);
    const p = plan(ws);
    expect(p.kind).toBe('new');
    expect(p.ids.every((id) => ws.find((w) => w.id === id)!.srs.reps === 0)).toBe(true);
    expect(p.newStartedToday).toBe(40);
  });

  it('un mot raté revient 10 minutes plus tard, pas avant', () => {
    const ws = allCore();
    ws[0].srs = schedule(ws[0].srs, 'again', NOW);
    expect(plan(ws, NOW + 60_000).kind).toBe('new');
    expect(plan(ws, NOW + 60_000).laterToday).toBe(1);
    const later = plan(ws, NOW + 11 * 60_000);
    expect(later.kind).toBe('review');
    expect(later.ids).toEqual([ws[0].id]);
  });

  it('avec une limite réglée : on demande avant de la dépasser', () => {
    const ws = allCore();
    for (const w of ws.slice(0, 20)) w.srs = schedule(w.srs, 'good', NOW - 3600_000);
    expect(plan(ws, NOW, 20).kind).toBe('done');
    expect(plan(ws, NOW, 20).newLimitReached).toBe(true);
    expect(plan(ws, NOW, 20, true).kind).toBe('new');
    // limite presque atteinte : la liste est raccourcie
    const ws2 = allCore();
    for (const w of ws2.slice(0, 15)) w.srs = schedule(w.srs, 'good', NOW - 3600_000);
    expect(plan(ws2, NOW, 20).ids.length).toBeLessThanOrEqual(5 + MAX_OVERFLOW);
  });

  it('les mots ajoutés par l’utilisateur passent en premier parmi les nouveaux', () => {
    const ws = [...allCore(), makeWord('u1', { en: 'brave', pos: 'adjective' })];
    expect(plan(ws).ids[0]).toBe('u1');
  });

  it('migration des réglages : l’ancienne limite de 20 par défaut devient « sans limite »', () => {
    expect(normalizeSettings({ newPerDay: 20, updatedAt: 5 }).newPerDay).toBe(0);
    expect(normalizeSettings({ newPerDay: 30, updatedAt: 5 }).newPerDay).toBe(30);
    expect(normalizeSettings({ schema: 2, newPerDay: 20 }).newPerDay).toBe(20);
    expect(normalizeSettings(null).newPerDay).toBe(0);
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
