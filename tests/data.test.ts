import { describe, expect, it } from 'vitest';
import { CORE_ENTRIES, CORE_META } from '../src/data/core';
import { POS_LIST } from '../src/domain/types';

const COGNATES = [
  'point', 'question', 'long', 'six', 'minute', 'important', 'couple', 'service', 'parent', 'moment', 'train',
  'situation', 'local', 'public', 'discussion', 'page', 'dollar', 'base', 'table', 'position', 'possible',
];

describe('base des 500 mots', () => {
  it('contient exactement 500 mots, rangs 1 à 500 sans trou', () => {
    expect(CORE_ENTRIES).toHaveLength(500);
    expect(CORE_META.count).toBe(500);
    expect(CORE_ENTRIES.map((e) => e.rank)).toEqual(Array.from({ length: 500 }, (_, i) => i + 1));
  });

  it('respecte l’ordre de fréquence de la source (rang source croissant)', () => {
    for (let i = 1; i < CORE_ENTRIES.length; i++) {
      expect(CORE_ENTRIES[i].sourceRank).toBeGreaterThan(CORE_ENTRIES[i - 1].sourceRank);
    }
  });

  it('n’a aucun doublon (identifiant ni mot anglais)', () => {
    expect(new Set(CORE_ENTRIES.map((e) => e.id)).size).toBe(500);
    expect(new Set(CORE_ENTRIES.map((e) => e.en.toLowerCase())).size).toBe(500);
    expect(new Set(CORE_ENTRIES.map((e) => e.exampleEn.toLowerCase())).size).toBe(500);
  });

  it('a tous les champs remplis et cohérents', () => {
    for (const e of CORE_ENTRIES) {
      expect(e.fr.trim(), e.en).not.toBe('');
      expect(e.exampleEn.trim(), e.en).not.toBe('');
      expect(e.exampleFr.trim(), e.en).not.toBe('');
      expect(POS_LIST).toContain(e.pos);
      e.posAlt.forEach((p) => expect(POS_LIST).toContain(p));
      expect(e.ipa, e.en).toMatch(/^\/[^/]+\/$/);
      expect(e.freqPerMillion).toBeGreaterThan(0);
      // une traduction identique au mot anglais n'est admise que pour les vrais amis
      if (e.fr.toLowerCase() === e.en.toLowerCase()) expect(COGNATES, e.en).toContain(e.en);
    }
  });

  it('exclut les balises de transcription du corpus oral', () => {
    const en = new Set(CORE_ENTRIES.map((e) => e.en));
    for (const tag of ['pause', 'unclear', 'laughter', 'breath', 'cough']) expect(en.has(tag)).toBe(false);
    expect(en.has('true')).toBe(true); // entrée corrigée de la source
  });

  it('utilise l’IPA australienne (Cox & Palethorpe) : quelques contrôles', () => {
    const ipa = Object.fromEntries(CORE_ENTRIES.map((e) => [e.en, e.ipa]));
    expect(ipa.day).toBe('/dæɪ/');
    expect(ipa.go).toBe('/ɡəʉ/');
    expect(ipa.time).toBe('/tɑem/');
    expect(ipa.about).toBe('/əˈbæɔt/');
    expect(ipa.school).toBe('/skʉːl/');
    expect(ipa.colour).toBe('/ˈkɐlə/');
  });

  it('traite les mots polysémiques avec des traductions secondaires', () => {
    const byEn = Object.fromEntries(CORE_ENTRIES.map((e) => [e.en, e]));
    for (const w of ['get', 'right', 'mean', 'still', 'since']) {
      expect(byEn[w].frAlt.length, w).toBeGreaterThan(0);
    }
    expect(byEn.actually.fr).toBe('en fait');
  });

  it('regroupe les formes d’un même verbe sous un seul mot', () => {
    const byEn = Object.fromEntries(CORE_ENTRIES.map((e) => [e.en, e]));
    expect(byEn.go.forms).toEqual(expect.arrayContaining(['went', 'gone', 'going']));
    const en = new Set(CORE_ENTRIES.map((e) => e.en));
    expect(en.has('went')).toBe(false);
    expect(en.has('is')).toBe(false);
  });
});
