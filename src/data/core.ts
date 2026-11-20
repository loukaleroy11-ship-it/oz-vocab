import raw from './coreWords.json';
import { newSrsState } from '../domain/srs';
import type { Cefr, Pos, Word, WordContent } from '../domain/types';

export interface CoreEntry {
  id: string;
  rank: number;
  sourceRank: number;
  en: string;
  lemma: string;
  spellingAlt: string[];
  forms: string[];
  pos: Pos;
  posAlt: Pos[];
  fr: string;
  frAlt: string[];
  ipa: string;
  ipaAlt: string[];
  exampleEn: string;
  exampleFr: string;
  freqPerMillion: number;
  freqEstimated?: boolean;
  cefr: Cefr;
}

export const CORE_META = raw.meta as {
  source: string;
  sourceUrl: string;
  ipaSource: string;
  removedTags: string[];
  cefrSource: string;
  count: number;
};

export const CORE_ENTRIES = raw.words as CoreEntry[];
export const CORE_BY_ID = new Map(CORE_ENTRIES.map((e) => [e.id, e]));

/** Version du jeu de données : à incrémenter quand coreWords.json change (2 : niveaux CECRL). */
export const CORE_VERSION = 2;

export function coreContent(e: CoreEntry): WordContent {
  return {
    en: e.en,
    fr: e.fr,
    frAlt: e.frAlt,
    pos: e.pos,
    posAlt: e.posAlt,
    ipa: e.ipa,
    ipaAlt: e.ipaAlt,
    ipaSource: 'britfone-au',
    exampleEn: e.exampleEn,
    exampleFr: e.exampleFr,
    forms: e.forms,
    spellingAlt: e.spellingAlt,
  };
}

export function coreWord(e: CoreEntry, now: number): Word {
  return {
    id: e.id,
    source: 'core',
    rank: e.rank,
    sourceRank: e.sourceRank,
    freqPerMillion: e.freqPerMillion,
    audioUrl: null,
    audioAccent: null,
    addedAt: now,
    // 0 = jamais modifié : toute progression venue d'un autre appareil sera plus récente
    updatedAt: 0,
    edited: false,
    deleted: false,
    cefr: e.cefr,
    srs: newSrsState(),
    prod: newSrsState(),
    ...coreContent(e),
  };
}

const freqs = CORE_ENTRIES.map((e) => e.freqPerMillion);
export const FREQ_MAX = Math.max(...freqs);
export const FREQ_MIN = Math.min(...freqs);

/** Position (0 à 1) sur une échelle logarithmique, pour la jauge de fréquence. */
export function freqLevel(perMillion: number): number {
  const lo = Math.log10(FREQ_MIN);
  const hi = Math.log10(FREQ_MAX);
  return Math.min(1, Math.max(0, (Math.log10(perMillion) - lo) / (hi - lo)));
}
