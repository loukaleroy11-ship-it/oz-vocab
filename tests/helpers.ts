import { CORE_ENTRIES, coreWord } from '../src/data/core';
import { newSrsState } from '../src/domain/srs';
import type { Word } from '../src/domain/types';

export const NOW = new Date(2026, 9, 27, 10, 0, 0).getTime(); // 27 oct. 2026, 10 h locale

export function allCore(now = NOW): Word[] {
  return CORE_ENTRIES.map((e) => coreWord(e, now));
}

export function makeWord(id: string, over: Partial<Word> = {}): Word {
  return {
    id,
    source: 'user',
    rank: null,
    sourceRank: null,
    freqPerMillion: null,
    audioUrl: null,
    audioAccent: null,
    addedAt: NOW,
    updatedAt: NOW,
    edited: false,
    deleted: false,
    en: id,
    fr: `fr-${id}`,
    frAlt: [],
    pos: 'noun',
    posAlt: [],
    ipa: null,
    ipaAlt: [],
    ipaSource: null,
    exampleEn: '',
    exampleFr: '',
    forms: [],
    spellingAlt: [],
    cefr: null,
    srs: newSrsState(),
    prod: newSrsState(),
    ...over,
  };
}
