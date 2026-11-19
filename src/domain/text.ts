/** Outils de texte : normalisation pour la recherche et les doublons. */

/** Minuscules, sans accents, espaces normalisés, apostrophes unifiées. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clé de doublon pour un mot anglais : sans « to » initial ni article. */
export function englishKey(s: string): string {
  return normalize(s)
    .replace(/^(to|a|an|the)\s+/, '')
    .replace(/[.!?]+$/, '');
}

/** Découpe une liste saisie à la main (« a; b, c ») en éléments propres. */
export function splitList(s: string): string[] {
  return s
    .split(/[;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + rnd;
}
