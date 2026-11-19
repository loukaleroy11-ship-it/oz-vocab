/**
 * Consigne envoyée au modèle de traduction et validation de sa réponse.
 * Partagée entre le navigateur (Claude dans claude.ai) et la fonction
 * serveur (/api/lookup). Aucun accès au DOM ici.
 */

export const POS_VALUES = [
  'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'determiner',
  'conjunction', 'auxiliary', 'interjection', 'number', 'other',
] as const;
export type PosValue = (typeof POS_VALUES)[number];

export interface LookupCandidate {
  en: string;
  fr: string;
  frAlt: string[];
  pos: PosValue;
  ipa: string | null;
  exampleEn: string;
  exampleFr: string;
  sense: string;
}

export interface LookupPayload {
  inputLanguage: 'fr' | 'en' | 'other';
  ambiguous: boolean;
  candidates: LookupCandidate[];
}

export function buildLookupPrompt(input: string, hint: 'fr' | 'en' | null): string {
  const clean = input.replace(/\s+/g, ' ').trim().slice(0, 120);
  const hintText = hint === 'fr' ? 'français' : hint === 'en' ? 'anglais' : 'inconnue (à déterminer)';
  return `Tu es un lexicographe bilingue anglais–français spécialisé dans l'anglais australien courant.

Entrée saisie par l'utilisateur (mot ou courte expression) : ${JSON.stringify(clean)}
Langue supposée : ${hintText}

Tâche : produire la ou les fiches de vocabulaire correspondantes pour un francophone qui apprend l'anglais en Australie.
- Entrée en français : donne les équivalents anglais les plus courants (3 au maximum), du plus courant au moins courant.
- Entrée en anglais : donne sa traduction française. Si le mot a plusieurs sens courants nettement différents, fais une fiche par sens (3 au maximum).
- Entrée qui n'est ni de l'anglais ni du français, ou dénuée de sens : renvoie "candidates": [].
- Ne devine pas : si un champ est incertain, mets null (pour ipa) ou une chaîne vide.

Pour chaque fiche :
- "en" : forme de base anglaise, orthographe australienne (colour, organise). Garde « to » seulement si l'utilisateur l'a écrit.
- "fr" : traduction principale courte.
- "frAlt" : 0 à 3 autres traductions utiles.
- "pos" : une valeur parmi ${POS_VALUES.join(', ')}.
- "ipa" : transcription phonémique en anglais australien général, notation de Cox & Palethorpe (voyelles iː ɪ e æ ɐː ɐ ɔ oː ʊ ʉː ɜː ə æɪ ɑe oɪ æɔ əʉ ɪə eː ʊə), entre barres obliques, ˈ devant la syllabe accentuée (pas d'accent sur un monosyllabe) ; null si tu n'es pas sûr.
- "exampleEn" : une phrase naturelle de moins de 12 mots, tirée de la vie quotidienne en Australie.
- "exampleFr" : sa traduction française naturelle.
- "sense" : quelques mots en français pour distinguer ce sens des autres (chaîne vide s'il n'y a qu'une fiche).

Réponds uniquement avec ce JSON, sans texte autour :
{"inputLanguage":"fr" ou "en" ou "other","ambiguous":true ou false,"candidates":[{"en":"","fr":"","frAlt":[],"pos":"","ipa":null,"exampleEn":"","exampleFr":"","sense":""}]}`;
}

const str = (x: unknown, max = 200) => (typeof x === 'string' ? x.trim().slice(0, max) : '');

/** Vérifie et nettoie la réponse du modèle. Lève une erreur si elle est inutilisable. */
export function validateLookupPayload(raw: unknown): LookupPayload {
  if (!raw || typeof raw !== 'object') throw new Error('Réponse vide ou illisible.');
  const o = raw as Record<string, unknown>;
  const lang = o.inputLanguage === 'fr' || o.inputLanguage === 'en' ? o.inputLanguage : 'other';
  const list = Array.isArray(o.candidates) ? o.candidates : [];
  const candidates: LookupCandidate[] = [];
  for (const c of list.slice(0, 4)) {
    if (!c || typeof c !== 'object') continue;
    const x = c as Record<string, unknown>;
    const en = str(x.en, 80);
    const fr = str(x.fr, 120);
    if (!en || !fr) continue;
    const pos = (POS_VALUES as readonly string[]).includes(x.pos as string) ? (x.pos as PosValue) : 'other';
    let ipa = str(x.ipa, 80) || null;
    if (ipa && !ipa.startsWith('/')) ipa = `/${ipa.replace(/^\[|\]$/g, '')}/`;
    candidates.push({
      en,
      fr,
      frAlt: Array.isArray(x.frAlt) ? x.frAlt.map((f) => str(f, 80)).filter(Boolean).slice(0, 4) : [],
      pos,
      ipa,
      exampleEn: str(x.exampleEn, 200),
      exampleFr: str(x.exampleFr, 200),
      sense: str(x.sense, 80),
    });
  }
  return { inputLanguage: lang, ambiguous: o.ambiguous === true || candidates.length > 1, candidates };
}
