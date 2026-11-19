/** Détection de la langue saisie (anglais ou français), sans service externe. */
import { normalize } from './text';
import type { Word } from './types';

export type Lang = 'en' | 'fr';
export interface Detection {
  lang: Lang | null;
  confident: boolean;
  reason: string;
}

const FR_ACCENTS = /[àâäçéèêëîïôöùûüÿœæ]/i;
const FR_START = /^(le|la|les|l'|un|une|des|du|de|d'|se|s'|être|avoir|faire|je|tu|il|elle|on|nous|vous|ils|elles)\b/i;
const EN_START = /^(to|the|a|an|i|you|he|she|we|they|it's|i'm)\s/i;
const EN_ENDINGS = /(ing|ed|ly|tion|ness|ful|less|ship|ght|th|w|wh)$/i;
const FR_ENDINGS = /(eux|euse|ment|tion|ette|oire|ier|ière|aux|eau|eaux|ais|ait|ez|ons|ent|é|ée)$/i;

export interface LangIndex {
  en: Set<string>;
  fr: Set<string>;
}

export function buildLangIndex(words: Word[]): LangIndex {
  const en = new Set<string>();
  const fr = new Set<string>();
  for (const w of words) {
    if (w.deleted) continue;
    en.add(normalize(w.en));
    w.forms.forEach((f) => en.add(normalize(f)));
    for (const t of [w.fr, ...w.frAlt]) {
      t.split(/[,;()/]/)
        .map((x) => normalize(x.replace(/\(.*?\)/g, '')))
        .filter((x) => x && x.length > 1 && !x.includes(' ('))
        .forEach((x) => fr.add(x));
    }
  }
  return { en, fr };
}

export function detectLanguage(input: string, index: LangIndex): Detection {
  const raw = input.trim();
  if (!raw) return { lang: null, confident: false, reason: '' };
  const n = normalize(raw);
  if (FR_ACCENTS.test(raw)) return { lang: 'fr', confident: true, reason: 'accents français' };
  if (EN_START.test(raw + ' ')) return { lang: 'en', confident: true, reason: 'tournure anglaise' };
  if (FR_START.test(n)) return { lang: 'fr', confident: true, reason: 'article ou pronom français' };
  const inEn = index.en.has(n);
  const inFr = index.fr.has(n);
  if (inEn && !inFr) return { lang: 'en', confident: true, reason: 'mot anglais connu' };
  if (inFr && !inEn) return { lang: 'fr', confident: true, reason: 'traduction connue' };
  if (/['’]s\b|\bk|w|sh\b/i.test(raw) && !FR_ENDINGS.test(n)) return { lang: 'en', confident: false, reason: 'orthographe anglaise probable' };
  if (FR_ENDINGS.test(n) && !EN_ENDINGS.test(n)) return { lang: 'fr', confident: false, reason: 'terminaison française probable' };
  if (EN_ENDINGS.test(n)) return { lang: 'en', confident: false, reason: 'terminaison anglaise probable' };
  return { lang: null, confident: false, reason: 'langue incertaine' };
}
