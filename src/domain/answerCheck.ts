/**
 * Vérification d'une réponse tapée sur une carte « produire » (français → anglais).
 * Tolère les fautes de frappe, mais jamais quand la réponse est un autre mot anglais
 * existant (« thing » n'est pas une faute de frappe de « think »).
 */
import type { Grade, Word } from './types';

export type TypedVerdict = 'exact' | 'typo' | 'form' | 'other-word' | 'wrong' | 'empty';

export interface TypedCheck {
  verdict: TypedVerdict;
  /** Réponse proposée pour la note : null quand c'est à l'utilisateur de juger. */
  suggested: Grade | null;
  /** Mot reconnu dans la réponse (synonyme) le cas échéant. */
  matched?: Word;
}

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[.!?,;:"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(to|a|an|the) (?=\S)/, '');
}

/** Distance d'édition (insertion, suppression, substitution, inversion de deux lettres voisines). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Nombre de fautes tolérées selon la longueur du mot attendu. */
export function typoAllowance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

const meanings = (w: Word) => [w.fr, ...w.frAlt].map((x) => x.toLowerCase().trim()).filter(Boolean);

export function checkTyped(input: string, target: Word, all: Word[]): TypedCheck {
  const a = normalizeAnswer(input);
  if (!a) return { verdict: 'empty', suggested: 'again' };
  const accepted = [target.en, ...target.spellingAlt].map(normalizeAnswer);
  if (accepted.includes(a)) return { verdict: 'exact', suggested: 'good' };

  const forms = target.forms.map(normalizeAnswer);
  if (forms.includes(a)) return { verdict: 'form', suggested: 'good' };

  // un autre mot anglais connu de l'application ?
  const other = all.find((w) => !w.deleted && w.id !== target.id && [w.en, ...w.spellingAlt].map(normalizeAnswer).includes(a));
  if (other) {
    const mine = new Set(meanings(target));
    const shared = meanings(other).some((m) => mine.has(m));
    return shared ? { verdict: 'other-word', suggested: null, matched: other } : { verdict: 'wrong', suggested: 'again', matched: other };
  }

  const best = Math.min(...accepted.map((x) => levenshtein(a, x)));
  if (best <= typoAllowance(normalizeAnswer(target.en).length)) return { verdict: 'typo', suggested: 'good' };
  return { verdict: 'wrong', suggested: 'again' };
}
