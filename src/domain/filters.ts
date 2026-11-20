/** Filtres, tri et recherche de la page « Explorer ». Fonctions pures. */
import { statusTags } from './status';
import { normalize } from './text';
import type { LearningStatus, Pos, Word } from './types';

export type FreqPreset = 'all' | 'top100' | 'top250' | 'top500' | 'range';
export type SortKey = 'rank-asc' | 'rank-desc' | 'alpha' | 'recent' | 'due';
import { PACK_LABEL, type PackId } from './types';
/** 'core' = les 500 mots de base ; un identifiant de paquet ; 'user' = mots ajoutés. */
export type SourceFilter = 'all' | 'core' | 'user' | PackId;

export interface WordFilter {
  query: string;
  freq: FreqPreset;
  rangeFrom: number;
  rangeTo: number;
  pos: Pos[];
  status: LearningStatus[];
  source: SourceFilter;
  sort: SortKey;
}

export const EMPTY_FILTER: WordFilter = {
  query: '',
  freq: 'all',
  rangeFrom: 1,
  rangeTo: 500,
  pos: [],
  status: [],
  source: 'all',
  sort: 'rank-asc',
};

function rankLimit(f: WordFilter): [number, number] | null {
  switch (f.freq) {
    case 'top100':
      return [1, 100];
    case 'top250':
      return [1, 250];
    case 'top500':
      return [1, 500];
    case 'range': {
      const a = Math.max(1, Math.min(f.rangeFrom, f.rangeTo));
      const b = Math.max(f.rangeFrom, f.rangeTo);
      return [a, b];
    }
    default:
      return null;
  }
}

/** Recherche en anglais et en français, sur une partie du mot, sans tenir compte des accents. */
export function matchesQuery(w: Word, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const fields = [w.en, w.fr, ...w.frAlt, ...w.forms, ...w.spellingAlt];
  return fields.some((f) => normalize(f).includes(q));
}

/** Score de pertinence : correspondance exacte, puis début de mot, puis inclusion. */
function queryScore(w: Word, query: string): number {
  const q = normalize(query);
  const en = normalize(w.en);
  if (en === q) return 0;
  const fr = [w.fr, ...w.frAlt].map(normalize);
  if (fr.some((f) => f.split(/[,;()]/).some((p) => p.trim() === q))) return 1;
  if (en.startsWith(q)) return 2;
  if (fr.some((f) => f.startsWith(q))) return 3;
  return 4;
}

export function applyFilter(words: Word[], f: WordFilter, now: number): Word[] {
  const limit = rankLimit(f);
  const out = words.filter((w) => {
    if (w.deleted) return false;
    if (f.source === 'user' && w.source !== 'user') return false;
    if (f.source === 'core' && (w.source !== 'core' || w.pack)) return false;
    if (f.source !== 'all' && f.source !== 'user' && f.source !== 'core' && w.pack !== f.source) return false;
    if (limit) {
      if (w.rank == null || w.rank < limit[0] || w.rank > limit[1]) return false;
    }
    if (f.pos.length && !f.pos.includes(w.pos) && !w.posAlt.some((p) => f.pos.includes(p))) return false;
    if (f.status.length) {
      const tags = statusTags(w, now);
      if (!f.status.some((s) => tags.includes(s))) return false;
    }
    return matchesQuery(w, f.query);
  });
  return sortWords(out, f.sort, f.query);
}

export function sortWords(words: Word[], sort: SortKey, query = ''): Word[] {
  const byRank = (a: Word, b: Word) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.addedAt - b.addedAt;
  const arr = [...words];
  if (query.trim()) {
    arr.sort((a, b) => queryScore(a, query) - queryScore(b, query) || byRank(a, b));
    return arr;
  }
  switch (sort) {
    case 'rank-asc':
      return arr.sort(byRank);
    case 'rank-desc':
      return arr.sort((a, b) => (b.rank ?? -1) - (a.rank ?? -1) || b.addedAt - a.addedAt);
    case 'alpha':
      return arr.sort((a, b) => a.en.localeCompare(b.en, 'en', { sensitivity: 'base' }));
    case 'recent':
      return arr.sort((a, b) => b.addedAt - a.addedAt || byRank(a, b));
    case 'due':
      return arr.sort((a, b) => (a.srs.due ?? Infinity) - (b.srs.due ?? Infinity) || byRank(a, b));
  }
}

/** Libellé court d'un filtre, réutilisé comme titre de session. */
export function describeFilter(f: WordFilter, posLabel: (p: Pos) => string, statusLabel: (s: LearningStatus) => string): string {
  const parts: string[] = [];
  if (f.freq === 'top100') parts.push('Top 100');
  if (f.freq === 'top250') parts.push('Top 250');
  if (f.freq === 'top500') parts.push('Top 500');
  if (f.freq === 'range') parts.push(`Rangs ${Math.min(f.rangeFrom, f.rangeTo)}–${Math.max(f.rangeFrom, f.rangeTo)}`);
  if (f.pos.length) parts.push(f.pos.map(posLabel).join(', '));
  if (f.status.length) parts.push(f.status.map(statusLabel).join(', '));
  if (f.source === 'user') parts.push('Mes mots');
  if (f.source === 'core') parts.push('500 mots de base');
  if (f.source !== 'all' && f.source !== 'user' && f.source !== 'core') parts.push(PACK_LABEL[f.source]);
  if (f.query.trim()) parts.push(`« ${f.query.trim()} »`);
  return parts.length ? parts.join(' · ') : 'Tous les mots';
}
