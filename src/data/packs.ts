import raw from './packWords.json';
import { newSrsState } from '../domain/srs';
import type { Cefr, PackId, Pos, Word, WordContent } from '../domain/types';

/** Mot d'un paquet intégré (scripts/build_packs.py). */
export interface PackEntry {
  id: string;
  rank: number;
  en: string;
  pos: Pos;
  fr: string;
  frAlt: string[];
  ipa: string | null;
  exampleEn: string;
  exampleFr: string;
  spellingAlt: string[];
  cefr: Cefr;
  pack: PackId;
  group: string;
  note?: string;
}

export const PACK_META = raw.meta as { sources: Record<string, string>; counts: Record<PackId, number>; count: number };
export const PACK_ENTRIES = raw.words as PackEntry[];
export const PACK_BY_ID = new Map(PACK_ENTRIES.map((e) => [e.id, e]));

/** Version des paquets : à incrémenter quand packWords.json change. */
export const PACK_VERSION = 1;

export function packContent(e: PackEntry): WordContent {
  return {
    en: e.en,
    fr: e.fr,
    frAlt: e.frAlt,
    pos: e.pos,
    posAlt: [],
    ipa: e.ipa,
    ipaAlt: [],
    ipaSource: e.ipa ? 'britfone-au' : null,
    exampleEn: e.exampleEn,
    exampleFr: e.exampleFr,
    forms: [],
    spellingAlt: e.spellingAlt,
  };
}

export function packMeta(e: PackEntry): Pick<Word, 'rank' | 'cefr' | 'pack' | 'group' | 'note'> {
  return { rank: e.rank, cefr: e.cefr, pack: e.pack, group: e.group, ...(e.note ? { note: e.note } : { note: undefined }) };
}

export function packWord(e: PackEntry, now: number): Word {
  return {
    id: e.id,
    source: 'core',
    sourceRank: null,
    freqPerMillion: null,
    audioUrl: null,
    audioAccent: null,
    addedAt: now,
    updatedAt: 0,
    edited: false,
    deleted: false,
    srs: newSrsState(),
    prod: newSrsState(),
    ...packMeta(e),
    ...packContent(e),
  };
}
