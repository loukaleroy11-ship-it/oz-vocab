/**
 * Traduction gratuite, sans compte ni clé, pour la version publique du site :
 *   - MyMemory (api.mymemory.translated.net) pour la traduction FR ↔ EN ;
 *   - dictionaryapi.dev (Wiktionary) pour la catégorie, l'IPA et un exemple.
 * Les propositions sont marquées « à vérifier ». Si le service ne trouve rien,
 * on le dit : aucune traduction n'est inventée.
 */
import type { Lang } from '../../domain/lang';
import { englishKey, normalize } from '../../domain/text';
import { parseDictionary, type DictionaryEntry } from '../dictionaryParse';
import type { LookupCandidate, LookupPayload, PosValue } from './prompt';

const MYMEMORY = 'https://api.mymemory.translated.net/get';
const DICT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

export interface MyMemoryResponse {
  responseData?: { translatedText?: string; match?: number };
  responseStatus?: number | string;
  quotaFinished?: boolean;
  matches?: Array<{ segment?: string; translation?: string; match?: number | string }>;
}

const DICT_POS: Record<string, PosValue> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  adverb: 'adverb',
  preposition: 'preposition',
  pronoun: 'pronoun',
  conjunction: 'conjunction',
  interjection: 'interjection',
  determiner: 'determiner',
  article: 'determiner',
  numeral: 'number',
};

/** « to improve » → « improve » ; « a car » → « car ». */
export function bareEnglish(s: string): string {
  return s.trim().replace(/^(to|a|an|the)\s+/i, '').trim();
}

function tidy(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ').replace(/[.!?;:]+$/, '');
  // minuscule initiale, sauf sigle ou « I »
  if (t.length > 1 && t[0] === t[0].toUpperCase() && t.slice(1) === t.slice(1).toLowerCase()) return t[0].toLowerCase() + t.slice(1);
  return t;
}

/**
 * Traductions distinctes et fiables d'une réponse MyMemory (3 au maximum).
 * `dir` = sens de la traduction ; on nettoie les articles et les « pour » parasites.
 */
export function pickTranslations(
  input: string,
  res: MyMemoryResponse,
  dir: 'fr-en' | 'en-fr',
  opts: { verb?: boolean } = {},
): string[] {
  const src = normalize(input);
  const out: string[] = [];
  const keys = new Set<string>();
  const add = (raw: string | undefined) => {
    if (!raw) return;
    let t = tidy(raw);
    if (dir === 'fr-en') t = bareEnglish(t);
    // verbe anglais : « pour améliorer », « afin d'améliorer » → « améliorer »
    else if (opts.verb) t = t.replace(/^(pour|afin de|à)\s+/i, '').replace(/^afin d['’]/i, '');
    if (!t || t.length > 60) return;
    // verbe anglais : on ne garde que des infinitifs français (pas « s'améliorent »)
    if (dir === 'en-fr' && opts.verb && !/(er|ir|re|oir)$/i.test(t.split(' ').pop() ?? '')) return;
    const k = dir === 'fr-en' ? englishKey(t) : normalize(t);
    if (!k || k === src || k === englishKey(input) || keys.has(k)) return;
    keys.add(k);
    out.push(t);
  };
  const main = res.responseData;
  if (main && Number(main.match ?? 0) >= 0.5) add(main.translatedText);
  for (const m of res.matches ?? []) {
    if (Number(m.match ?? 0) < 0.85) continue;
    const seg = normalize(m.segment ?? '').replace(/[.!?]+$/, '');
    if (seg !== src && bareEnglish(seg) !== bareEnglish(src)) continue;
    add(m.translation);
  }
  return out.slice(0, 3);
}

/** Catégorie probable : indices tirés du français, sinon le sens le plus fourni du dictionnaire. */
export function pickPos(dict: DictionaryEntry | null, english: string, french: string): PosValue {
  const avail = (dict?.meanings ?? []).map((m) => m.pos);
  const has = (p: string) => avail.includes(p);
  const fr = normalize(french);
  if (/^to\s/i.test(english)) return 'verb';
  if (/^(se |s'|s’)/.test(fr) && (has('verb') || !avail.length)) return 'verb';
  if (/^(le|la|les|un|une|des|du|l')\b/.test(fr) && (has('noun') || !avail.length)) return 'noun';
  if (/(eux|euse|if|ive|able|ible|ique|al|ale|el|elle|ant|ante|ent|ente)$/.test(fr) && has('adjective')) return 'adjective';
  if (/(er|ir|re|oir)$/.test(fr) && fr.split(' ').length === 1 && has('verb')) return 'verb';
  if (/ment$/.test(fr) && has('adverb')) return 'adverb';
  const best = [...(dict?.meanings ?? [])].sort((a, b) => b.count - a.count)[0];
  return best ? (DICT_POS[best.pos] ?? 'other') : 'other';
}

/**
 * Exemple court contenant le mot, pris uniquement dans la catégorie choisie
 * (un exemple d'un autre sens induirait en erreur : mieux vaut aucun exemple).
 */
export function pickExample(dict: DictionaryEntry | null, english: string, pos: PosValue): string {
  if (!dict) return '';
  const stem = bareEnglish(english).toLowerCase().slice(0, Math.max(3, bareEnglish(english).length - 2));
  for (const m of dict.meanings.filter((x) => DICT_POS[x.pos] === pos)) {
    for (const ex of m.examples) {
      const words = ex.trim().split(/\s+/).length;
      if (words >= 4 && ex.length <= 110 && ex.toLowerCase().includes(stem)) return ex.trim();
    }
  }
  return '';
}

function definitionFor(dict: DictionaryEntry | null, pos: PosValue): string {
  const m = dict?.meanings.find((x) => DICT_POS[x.pos] === pos) ?? dict?.meanings[0];
  const d = m?.definition ?? '';
  return d.length > 90 ? d.slice(0, 87) + '…' : d;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  const onAbort = () => ctl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    if (signal?.aborted) throw new DOMException('Recherche arrêtée', 'AbortError');
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function translate(text: string, dir: 'fr-en' | 'en-fr', signal?: AbortSignal): Promise<MyMemoryResponse> {
  const pair = dir === 'fr-en' ? 'fr|en' : 'en|fr';
  const res = await getJson<MyMemoryResponse>(`${MYMEMORY}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`, signal);
  if (!res) throw new Error('Le service de traduction gratuit ne répond pas. Vérifie ta connexion ou remplis la fiche à la main.');
  if (res.quotaFinished) throw new Error('Limite quotidienne du service de traduction gratuit atteinte. Réessaie demain ou remplis la fiche à la main.');
  return res;
}

async function dictionary(word: string, signal?: AbortSignal): Promise<DictionaryEntry | null> {
  const w = bareEnglish(word).toLowerCase();
  if (!/^[a-z' -]{1,40}$/.test(w)) return null;
  return parseDictionary(await getJson<unknown>(DICT + encodeURIComponent(w), signal));
}

async function exampleFr(example: string, signal?: AbortSignal): Promise<string> {
  if (!example) return '';
  try {
    const r = await translate(example, 'en-fr', signal);
    const t = r.responseData?.translatedText?.trim() ?? '';
    return t && normalize(t) !== normalize(example) ? t : '';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return '';
  }
}

async function buildCandidate(en: string, fr: string, frAlt: string[], signal?: AbortSignal, withSense = false): Promise<LookupCandidate> {
  const dict = await dictionary(en, signal);
  const pos = pickPos(dict, en, fr);
  const example = pickExample(dict, en, pos);
  return {
    en,
    fr,
    frAlt,
    pos,
    ipa: dict?.ipa ?? null,
    exampleEn: example,
    exampleFr: await exampleFr(example, signal),
    sense: withSense ? definitionFor(dict, pos) : '',
  };
}

/** Langue de la saisie quand la détection locale hésite : un mot connu du dictionnaire anglais est anglais. */
async function guessLang(input: string, signal?: AbortSignal): Promise<Lang> {
  return (await dictionary(input, signal)) ? 'en' : 'fr';
}

export async function lookupFree(input: string, hint: Lang | null, signal?: AbortSignal): Promise<LookupPayload> {
  const text = input.trim();
  const lang = hint ?? (await guessLang(text, signal));
  if (lang === 'fr') {
    const res = await translate(text, 'fr-en', signal);
    const ens = pickTranslations(text, res, 'fr-en');
    const candidates = await Promise.all(ens.map((en) => buildCandidate(en, tidy(text), [], signal, ens.length > 1)));
    return { inputLanguage: 'fr', ambiguous: candidates.length > 1, candidates };
  }
  // anglais : on traduit la forme de base (« to improve » → « improve »)
  const isVerb = /^to\s/i.test(text);
  const res = await translate(isVerb ? bareEnglish(text) : text, 'en-fr', signal);
  const frs = pickTranslations(isVerb ? bareEnglish(text) : text, res, 'en-fr', { verb: isVerb });
  if (!frs.length) return { inputLanguage: 'en', ambiguous: false, candidates: [] };
  const base = await buildCandidate(tidy(text), frs[0], frs.slice(1), signal);
  // un choix par traduction possible : l'utilisateur garde celle qui correspond au sens voulu
  const candidates = frs.map((fr, i) => ({ ...base, fr, frAlt: frs.filter((_, j) => j !== i) }));
  return { inputLanguage: 'en', ambiguous: candidates.length > 1, candidates };
}
