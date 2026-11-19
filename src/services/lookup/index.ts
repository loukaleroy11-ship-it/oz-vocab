/**
 * Recherche d'un mot à ajouter. Les fournisseurs sont interchangeables :
 *   1. Claude (quand le site est ouvert dans claude.ai) — aucune clé à gérer.
 *   2. Fonction serveur /api/lookup (Vercel / Netlify) — clé API côté serveur.
 *   3. Service gratuit sans compte (MyMemory + dictionaryapi.dev) — version publique du site.
 *   Le dictionnaire libre complète aussi l'IPA et l'enregistrement audio des mots anglais.
 * Si aucun service de traduction ne répond, on le dit et on propose la saisie manuelle :
 * aucune traduction n'est inventée.
 */
import { detectLanguage, type Detection, type Lang, type LangIndex } from '../../domain/lang';
import { englishKey, normalize } from '../../domain/text';
import type { Word } from '../../domain/types';
import { capability, capabilityErrorCode, inClaudeViewer } from '../claudeRuntime';
import { lookupDictionary, type NativeAudio } from '../speech';
import { bareEnglish, lookupFree } from './free';
import { buildLookupPrompt, validateLookupPayload, type LookupCandidate, type LookupPayload } from './prompt';

export type { LookupCandidate } from './prompt';

export type ProviderId = 'claude' | 'server' | 'free' | 'none';

export interface LookupResult {
  input: string;
  detection: Detection;
  lang: Lang | null;
  provider: ProviderId;
  providerLabel: string;
  candidates: LookupCandidate[];
  ambiguous: boolean;
  /** Message honnête quand la traduction automatique n'a pas abouti. */
  error: string | null;
  /** Mots de la collection qui correspondent déjà à la saisie. */
  existing: Word[];
  dictionary: { ipa: string | null; audio: NativeAudio | null; pos: string[]; definition: string | null } | null;
}

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  detail: string;
}

let serverProbe: Promise<boolean> | null = null;

/** La fonction serveur est-elle déployée et configurée ? */
export function serverAvailable(): Promise<boolean> {
  if (inClaudeViewer()) return Promise.resolve(false);
  if (!serverProbe) {
    serverProbe = (async () => {
      try {
        const res = await fetch('/api/lookup', { method: 'GET', headers: { accept: 'application/json' } });
        if (!res.ok) return false;
        const body = (await res.json()) as { ok?: boolean; configured?: boolean };
        return !!body.ok && !!body.configured;
      } catch {
        return false;
      }
    })();
    serverProbe.then((ok) => {
      if (!ok) serverProbe = null;
    });
  }
  return serverProbe;
}

export async function providerStatus(): Promise<ProviderStatus> {
  if (inClaudeViewer()) {
    const sample = await capability('sample');
    if (sample) {
      return {
        id: 'claude',
        label: 'Claude (intégré à claude.ai)',
        detail: 'La traduction utilise ton compte Claude. Une autorisation est demandée à la première recherche.',
      };
    }
    return {
      id: 'none',
      label: 'Traduction automatique indisponible',
      detail: 'Claude n’est pas accessible depuis cette vue. Tu peux remplir la fiche à la main.',
    };
  }
  if (await serverAvailable()) {
    return { id: 'server', label: 'Service de traduction du site', detail: 'Fonction serveur /api/lookup configurée.' };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      id: 'none',
      label: 'Traduction automatique indisponible hors ligne',
      detail: 'Reconnecte-toi pour la traduction automatique. En attendant, la saisie manuelle fonctionne.',
    };
  }
  return {
    id: 'free',
    label: 'Traduction gratuite (MyMemory + Wiktionary)',
    detail: 'Service libre, sans compte : vérifie les propositions avant d’enregistrer. Nécessite Internet.',
  };
}

const SAMPLE_ERRORS: Record<string, string> = {
  not_granted: 'Tu n’as pas autorisé cette page à utiliser Claude. Remplis la fiche à la main ou recharge la page pour autoriser.',
  sampling_disabled: 'Claude n’est pas disponible pour ce compte.',
  rate_limited: 'Trop de demandes à la suite. Réessaie dans un moment.',
  session_expired: 'Ta session claude.ai a expiré. Reconnecte-toi puis réessaie.',
  invalid_json: 'La réponse reçue était incomplète. Réessaie.',
  refused: 'Cette demande a été refusée. Essaie une autre formulation.',
  upstream_error: 'Le service ne répond pas pour le moment. Réessaie.',
};

async function viaClaude(input: string, hint: Lang | null, signal?: AbortSignal): Promise<LookupPayload> {
  const sample = await capability('sample');
  if (!sample) throw new Error('Claude n’est pas accessible depuis cette vue.');
  try {
    const raw = await sample.json(buildLookupPrompt(input, hint), { modelTier: 'quick', signal });
    return validateLookupPayload(raw);
  } catch (e) {
    const code = capabilityErrorCode(e);
    if (code === 'cancelled') throw e;
    throw new Error(code ? (SAMPLE_ERRORS[code] ?? 'La traduction a échoué. Réessaie.') : e instanceof Error ? e.message : 'La traduction a échoué.');
  }
}

async function viaServer(input: string, hint: Lang | null, signal?: AbortSignal, accessCode = ''): Promise<LookupPayload> {
  const res = await fetch('/api/lookup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(accessCode ? { 'x-access-code': accessCode } : {}) },
    body: JSON.stringify({ text: input, lang: hint }),
    signal,
  });
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(body?.error ?? `Le service de traduction a répondu ${res.status}.`);
  return validateLookupPayload(body);
}

export function findExisting(words: Word[], input: string): Word[] {
  const key = englishKey(input);
  const n = normalize(input);
  if (!n) return [];
  return words.filter((w) => {
    if (w.deleted) return false;
    if (englishKey(w.en) === key) return true;
    return [w.fr, ...w.frAlt].some((f) =>
      f
        .replace(/\(.*?\)/g, '')
        .split(/[,;/]/)
        .map(normalize)
        .some((p) => p === n),
    );
  });
}

export async function lookupWord(
  input: string,
  opts: { words: Word[]; index: LangIndex; forcedLang: Lang | null; signal?: AbortSignal; accessCode?: string },
): Promise<LookupResult> {
  const detection = detectLanguage(input, opts.index);
  const lang = opts.forcedLang ?? detection.lang;
  const existing = findExisting(opts.words, input);
  const status = await providerStatus();
  const base: LookupResult = {
    input,
    detection,
    lang,
    provider: status.id,
    providerLabel: status.label,
    candidates: [],
    ambiguous: false,
    error: null,
    existing,
    dictionary: null,
  };

  let payload: LookupPayload | null = null;
  if (status.id !== 'none') {
    try {
      payload =
        status.id === 'claude'
          ? await viaClaude(input, lang, opts.signal)
          : status.id === 'server'
            ? await viaServer(input, lang, opts.signal, opts.accessCode)
            : await lookupFree(input, lang, opts.signal);
    } catch (e) {
      if (capabilityErrorCode(e) === 'cancelled' || (e instanceof DOMException && e.name === 'AbortError')) throw e;
      base.error = e instanceof Error ? e.message : 'La traduction a échoué.';
    }
  } else {
    base.error = status.detail;
  }

  if (payload) {
    base.candidates = payload.candidates;
    base.ambiguous = payload.ambiguous;
    if (!opts.forcedLang && payload.inputLanguage !== 'other') base.lang = payload.inputLanguage;
    if (!payload.candidates.length) base.error = 'Aucune traduction trouvée pour cette saisie. Vérifie l’orthographe ou remplis la fiche à la main.';
  }

  // Enrichissement anglais (hors claude.ai) : IPA et enregistrement natif du dictionnaire libre
  const englishWord = base.candidates[0]?.en ?? (base.lang === 'en' ? input : null);
  if (englishWord) {
    const dict = await lookupDictionary(bareEnglish(englishWord));
    if (dict) {
      base.dictionary = {
        ipa: dict.ipa,
        audio: dict.audios.find((a) => a.accent === 'au') ?? dict.audios[0] ?? null,
        pos: dict.pos,
        definition: dict.definition,
      };
    }
  }
  return base;
}
