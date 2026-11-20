/**
 * Journal des exercices « S'exprimer » et progression par niveau. Fonctions pures.
 *
 * Passer un niveau (A2 → B1 → B2 → C1) demande les deux :
 *  - environ 80 % des mots du niveau « productibles » (dits en anglais à partir du français) ;
 *  - au moins 5 mises en situation de ce niveau réussies (auto-évaluation).
 */
import { isProducible, isRecognized } from './tracks';
import type { Word } from './types';

export type PracticeLevel = 'A2' | 'B1' | 'B2' | 'C1';
export const PRACTICE_LEVELS: PracticeLevel[] = ['A2', 'B1', 'B2', 'C1'];

export type PracticeKind = 'phrase' | 'motjuste' | 'naturel' | 'reformuler' | 'situation' | 'rapide' | 'histoire' | 'prononciation';

export interface PracticeEntry {
  id: string;
  kind: PracticeKind;
  itemId: string;
  level: PracticeLevel;
  at: number;
  success: boolean;
}

export const PRODUCIBLE_TARGET = 0.8;
export const SITUATIONS_TARGET = 5;
/** Le journal est plafonné pour rester léger. */
export const PRACTICE_MAX = 3000;

export function stageOf(w: Word): PracticeLevel | null {
  switch (w.cefr) {
    case 'A1':
    case 'A2':
      return 'A2';
    case 'B1':
      return 'B1';
    case 'B2':
      return 'B2';
    case 'C1':
    case 'C2':
      return 'C1';
    default:
      return null;
  }
}

export interface StageProgress {
  level: PracticeLevel;
  total: number;
  recognized: number;
  producible: number;
  /** Part des mots productibles (0 à 1). */
  ratio: number;
  situations: number;
  passed: boolean;
}

export function stageProgress(words: Word[], practice: PracticeEntry[]): StageProgress[] {
  return PRACTICE_LEVELS.map((level) => {
    const list = words.filter((w) => !w.deleted && w.source === 'core' && stageOf(w) === level);
    const producible = list.filter(isProducible).length;
    const situations = new Set(practice.filter((p) => p.kind === 'situation' && p.success && p.level === level).map((p) => p.itemId)).size;
    const ratio = list.length ? producible / list.length : 0;
    return {
      level,
      total: list.length,
      recognized: list.filter(isRecognized).length,
      producible,
      ratio,
      situations,
      passed: ratio >= PRODUCIBLE_TARGET && situations >= SITUATIONS_TARGET,
    };
  });
}

/** Niveau en cours : le premier qui n'est pas encore validé (C1 si tout est validé). */
export function currentStage(stages: StageProgress[]): PracticeLevel {
  return stages.find((s) => !s.passed)?.level ?? 'C1';
}

export function addPractice(log: PracticeEntry[], entries: PracticeEntry[]): PracticeEntry[] {
  const ids = new Set(log.map((e) => e.id));
  const merged = [...log, ...entries.filter((e) => !ids.has(e.id))].sort((a, b) => a.at - b.at);
  return merged.slice(-PRACTICE_MAX);
}

export function cleanPractice(x: unknown): PracticeEntry[] {
  if (!Array.isArray(x)) return [];
  const kinds: PracticeKind[] = ['phrase', 'motjuste', 'naturel', 'reformuler', 'situation', 'rapide', 'histoire', 'prononciation'];
  return x.filter(
    (e): e is PracticeEntry =>
      !!e &&
      typeof e.id === 'string' &&
      kinds.includes(e.kind) &&
      typeof e.itemId === 'string' &&
      PRACTICE_LEVELS.includes(e.level) &&
      typeof e.at === 'number' &&
      typeof e.success === 'boolean',
  );
}

/** Choisit `n` éléments au hasard d'un niveau, en complétant avec les niveaux voisins si besoin. */
export function pickItems<T extends { level: PracticeLevel; id: string }>(items: T[], level: PracticeLevel, n: number, rng = Math.random): T[] {
  const order = [level, ...PRACTICE_LEVELS.filter((l) => l !== level).sort((a, b) => Math.abs(PRACTICE_LEVELS.indexOf(a) - PRACTICE_LEVELS.indexOf(level)) - Math.abs(PRACTICE_LEVELS.indexOf(b) - PRACTICE_LEVELS.indexOf(level)))];
  const out: T[] = [];
  for (const l of order) {
    const pool = items.filter((i) => i.level === l && !out.includes(i));
    for (let k = pool.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    out.push(...pool.slice(0, n - out.length));
    if (out.length >= n) break;
  }
  return out;
}
