import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseDictionary } from '../src/services/dictionaryParse';
import { bareEnglish, lookupFree, pickExample, pickPos, pickTranslations, type MyMemoryResponse } from '../src/services/lookup/free';

// réponses réelles de MyMemory et dictionaryapi.dev, enregistrées le 19/11/2026
const fx = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));

describe('traduction gratuite : lecture des réponses', () => {
  it('FR → EN : plusieurs traductions distinctes, en minuscules', () => {
    expect(pickTranslations('courageux', fx('mm_courageux_fren.json') as MyMemoryResponse, 'fr-en')).toEqual(['brave', 'courageous']);
  });

  it('FR → EN : l’article anglais est retiré', () => {
    expect(pickTranslations('une voiture', fx('mm_une_voiture_fren.json'), 'fr-en')[0]).toBe('car');
  });

  it('EN → FR : mot polysémique', () => {
    const t = pickTranslations('right', fx('mm_right_enfr.json'), 'en-fr');
    expect(t[0]).toBe('droite');
    expect(t).toContain('droit');
  });

  it('un mot non traduit (renvoyé tel quel) ne compte pas comme une traduction', () => {
    expect(pickTranslations('arvo', fx('mm_arvo_enfr.json'), 'en-fr')).toEqual([]);
  });

  it('verbe anglais : « pour améliorer » devient « améliorer »', () => {
    const res: MyMemoryResponse = {
      responseData: { translatedText: 'pour améliorer', match: 0.99 },
      matches: [{ segment: 'to improve', translation: "Afin d'améliorer", match: 0.97 }],
    };
    expect(pickTranslations('to improve', res, 'en-fr', { verb: true })).toEqual(['améliorer']);
    // formes conjuguées écartées
    expect(pickTranslations('improve', fx('mm_improve_enfr.json'), 'en-fr', { verb: true })).toEqual(['améliorer']);
    // sans indication de verbe, rien n'est retiré (« à cause de » reste intact)
    const other: MyMemoryResponse = { responseData: { translatedText: 'à cause de', match: 1 } };
    expect(pickTranslations('because of', other, 'en-fr')).toEqual(['à cause de']);
  });

  it('catégorie : indices du français, sinon le sens le plus fourni', () => {
    const brave = parseDictionary(fx('dict_brave.json'));
    expect(pickPos(brave, 'brave', 'courageux')).toBe('adjective');
    expect(pickPos(parseDictionary(fx('dict_improve.json')), 'improve', 'améliorer')).toBe('verb');
    expect(pickPos(parseDictionary(fx('dict_car.json')), 'car', 'une voiture')).toBe('noun');
    expect(pickPos(null, 'to go', 'aller')).toBe('verb');
  });

  it('exemple : phrase contenant le mot, dans la bonne catégorie', () => {
    const ex = pickExample(parseDictionary(fx('dict_improve.json')), 'improve', 'verb');
    expect(ex.toLowerCase()).toContain('improv');
    // aucun exemple pour l'adjectif « brave » : pas d'emprunt à un autre sens (le verbe)
    expect(pickExample(parseDictionary(fx('dict_brave.json')), 'brave', 'adjective')).toBe('');
    expect(pickExample(parseDictionary(fx('dict_brave.json')), 'brave', 'verb')).toMatch(/brav/i);
    expect(pickExample(null, 'brave', 'adjective')).toBe('');
  });

  it('IPA et enregistrement australien repérés', () => {
    const right = parseDictionary(fx('dict_right.json'))!;
    expect(right.audios.some((a) => a.accent === 'au')).toBe(true);
    expect(bareEnglish('to improve')).toBe('improve');
  });
});

describe('traduction gratuite : parcours complet (réseau simulé)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(map: Record<string, unknown>) {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      const hit = Object.entries(map).find(([k]) => decodeURIComponent(url).includes(k));
      if (!hit) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify(hit[1]), { status: 200 });
    });
    return calls;
  }

  it('« courageux » → deux fiches complètes, ambiguë', async () => {
    stubFetch({
      'q=courageux': fx('mm_courageux_fren.json'),
      'entries/en/brave': fx('dict_brave.json'),
      'entries/en/courageous': fx('dict_courageous.json'),
      'langpair=en|fr': { responseData: { translatedText: 'Phrase traduite.', match: 0.9 } },
    });
    const p = await lookupFree('courageux', 'fr');
    expect(p.inputLanguage).toBe('fr');
    expect(p.ambiguous).toBe(true);
    expect(p.candidates.map((c) => c.en)).toEqual(['brave', 'courageous']);
    expect(p.candidates[0]).toMatchObject({ fr: 'courageux', pos: 'adjective', ipa: '/bɹeɪv/' });
    expect(p.candidates[0].sense).not.toBe('');
  });

  it('« to improve » → « améliorer », verbe, exemple traduit', async () => {
    stubFetch({
      'q=improve&langpair=en|fr': fx('mm_improve_enfr.json'),
      'entries/en/improve': fx('dict_improve.json'),
      'langpair=en|fr': { responseData: { translatedText: 'Acheter plus de serveurs améliorerait les performances.', match: 0.9 } },
    });
    const p = await lookupFree('to improve', 'en');
    expect(p.candidates[0]).toMatchObject({ en: 'to improve', fr: 'améliorer', pos: 'verb', ipa: '/ɪmˈpɹuːv/' });
    expect(p.candidates[0].exampleEn).toMatch(/improve/i);
    expect(p.candidates[0].exampleFr).toMatch(/améliorer/);
  });

  it('service injoignable : erreur claire, aucune traduction inventée', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(lookupFree('maison', 'fr')).rejects.toThrow(/ne répond pas/);
  });

  it('quota atteint : message clair', async () => {
    stubFetch({ 'q=maison': { quotaFinished: true, responseData: { translatedText: 'MYMEMORY WARNING', match: 0 } } });
    await expect(lookupFree('maison', 'fr')).rejects.toThrow(/Limite quotidienne/);
  });

  it('mot inconnu : aucune fiche', async () => {
    stubFetch({ 'q=arvo': fx('mm_arvo_enfr.json') });
    const p = await lookupFree('arvo', 'en');
    expect(p.candidates).toEqual([]);
  });
});
