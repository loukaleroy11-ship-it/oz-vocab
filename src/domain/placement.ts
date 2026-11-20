/**
 * Test de placement (≈ 5 minutes). Fonctions pures.
 *
 * Le but : ne pas te faire « apprendre » des mots que tu connais déjà.
 * - Les 500 mots sont découpés en tranches de 50 par fréquence, puis les paquets
 *   B1, B2 et C1 en tranches de 100. Dans chaque tranche, on tire 4 mots que tu
 *   n'as pas encore commencés.
 * - Question : un mot anglais, 4 traductions (A–D) et E « Aucune des propositions
 *   ci-dessus n'est exacte. » (la bonne réponse est E dans environ 1 cas sur 5),
 *   plus « Je ne sais pas » pour ne pas deviner.
 * - Le test s'arrête tout seul après deux tranches de suite sous 50 %.
 * - Tranche réussie (≥ 75 %) : ses mots non commencés sont marqués « jugés connus » ;
 *   ils ne seront pas présentés comme nouveaux, mais reviendront en révision
 *   d'ici 1 à 4 semaines pour vérification, et passent au suivi « produire ».
 *   Un mot raté pendant le test reste toujours à apprendre.
 */
import { DAY_MS, isStarted, newSrsState } from './srs';
import type { Cefr, Word } from './types';

export const BAND_SIZE = 50;
export const PACK_BAND_SIZE = 100;
const LEVEL_PACKS = { b1: 100, b2: 200, c1: 300 } as const;
export const PER_BAND = 4;
export const PASS_RATIO = 0.75;
export const NONE_OPTION = 'Aucune des propositions ci-dessus n’est exacte.';
export const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export interface PlacementQuestion {
  wordId: string;
  band: number;
  /** 4 traductions, affichées A à D ; E est toujours « Aucune des propositions… ». */
  options: string[];
  /** Indice de la bonne réponse : 0 à 3, ou 4 pour E. */
  correct: number;
}

/** Réponse : indice choisi (0 à 4) ou null pour « Je ne sais pas ». */
export type PlacementAnswer = number | null;

const key = (s: string) => s.toLowerCase().replace(/^\(|\)$/g, '').trim();
const meaningSet = (w: Word) => new Set([w.fr, ...w.frAlt].map(key));

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tranches : 0 à 9 pour les 500 mots (50 par tranche) ; 100+, 200+, 300+ pour
 * les paquets B1, B2, C1 (100 mots par tranche, dans l'ordre d'apprentissage).
 * Les paquets thématiques (phrasal verbs, expressions…) ne sont pas testés.
 */
export function placementBands(words: Word[]): Map<string, number> {
  const out = new Map<string, number>();
  const byPack: Record<string, Word[]> = {};
  for (const w of words) {
    if (w.deleted || w.source !== 'core' || w.rank == null) continue;
    if (!w.pack) out.set(w.id, Math.floor((w.rank - 1) / BAND_SIZE));
    else if (w.pack in LEVEL_PACKS) (byPack[w.pack] ??= []).push(w);
  }
  for (const [pack, list] of Object.entries(byPack)) {
    list.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    list.forEach((w, i) => out.set(w.id, LEVEL_PACKS[pack as keyof typeof LEVEL_PACKS] + Math.floor(i / PACK_BAND_SIZE)));
  }
  return out;
}

export function bandLabel(band: number): string {
  if (band < 100) return `mots ${band * BAND_SIZE + 1} à ${(band + 1) * BAND_SIZE}`;
  const level = band < 200 ? 'B1' : band < 300 ? 'B2' : 'C1';
  const i = band % 100;
  return `${level} · mots ${i * PACK_BAND_SIZE + 1} à ${(i + 1) * PACK_BAND_SIZE}`;
}

export function buildPlacement(words: Word[], rng: () => number = Math.random): PlacementQuestion[] {
  const bandMap = placementBands(words);
  const core = words.filter((w) => bandMap.has(w.id));
  const bands = new Map<number, Word[]>();
  for (const w of core) {
    if (isStarted(w.srs)) continue;
    const b = bandMap.get(w.id)!;
    bands.set(b, [...(bands.get(b) ?? []), w]);
  }
  const questions: PlacementQuestion[] = [];
  for (const b of [...bands.keys()].sort((x, y) => x - y)) {
    const pool = bands.get(b)!;
    if (pool.length < 2) continue; // tranche presque entièrement commencée : rien à placer
    for (const target of shuffle(pool, rng).slice(0, PER_BAND)) {
      const mine = meaningSet(target);
      const distract = (sameKind: boolean) =>
        core.filter(
          (w) =>
            w.id !== target.id &&
            (!sameKind || w.pos === target.pos) &&
            ![...meaningSet(w)].some((m) => mine.has(m)) &&
            key(w.fr) !== key(target.fr),
        );
      let candidates = distract(true);
      if (candidates.length < 6) candidates = distract(false);
      const noneIsRight = rng() < 0.2;
      const picked: string[] = [];
      for (const w of shuffle(candidates, rng)) {
        if (picked.length >= (noneIsRight ? 4 : 3)) break;
        if (!picked.some((p) => key(p) === key(w.fr))) picked.push(w.fr);
      }
      if (noneIsRight) {
        questions.push({ wordId: target.id, band: b, options: picked, correct: 4 });
      } else {
        const at = Math.floor(rng() * 4);
        const options = [...picked];
        options.splice(at, 0, target.fr);
        questions.push({ wordId: target.id, band: b, options, correct: at });
      }
    }
  }
  return questions;
}

export interface BandResult {
  band: number;
  label: string;
  asked: number;
  correct: number;
  passed: boolean;
}

export function bandResults(questions: PlacementQuestion[], answers: PlacementAnswer[]): BandResult[] {
  const rows = new Map<number, BandResult>();
  questions.forEach((q, i) => {
    if (i >= answers.length) return;
    const r = rows.get(q.band) ?? { band: q.band, label: bandLabel(q.band), asked: 0, correct: 0, passed: false };
    r.asked++;
    if (answers[i] === q.correct) r.correct++;
    rows.set(q.band, r);
  });
  for (const r of rows.values()) r.passed = r.asked > 0 && r.correct / r.asked >= PASS_RATIO;
  return [...rows.values()].sort((a, b) => a.band - b.band);
}

/** Arrêt anticipé : les deux dernières tranches terminées sont sous 50 %. */
export function shouldStop(questions: PlacementQuestion[], answers: PlacementAnswer[]): boolean {
  const n = answers.length;
  if (n === 0 || n >= questions.length) return n >= questions.length;
  // une tranche est terminée quand la question suivante appartient à une autre tranche
  if (questions[n].band === questions[n - 1].band) return false;
  const done = bandResults(questions, answers);
  if (done.length < 2) return false;
  const last2 = done.slice(-2);
  return last2.every((r) => r.correct / r.asked < 0.5);
}

export interface PlacementOutcome {
  bands: BandResult[];
  /** Mots mis à jour (jugés connus). */
  placed: Word[];
  /** Estimation : mots des 500 déjà connus (y compris ceux déjà appris avant le test). */
  knownEstimate: number;
  /** Taux de bonnes réponses par niveau CECRL, parmi les mots testés. */
  byLevel: { level: Cefr; asked: number; correct: number }[];
}

export function scorePlacement(
  words: Word[],
  questions: PlacementQuestion[],
  answers: PlacementAnswer[],
  now: number,
): PlacementOutcome {
  const bands = bandResults(questions, answers);
  const passed = new Set(bands.filter((b) => b.passed).map((b) => b.band));
  const answeredRight = new Set<string>();
  const answeredWrong = new Set<string>();
  questions.forEach((q, i) => {
    if (i >= answers.length) return;
    (answers[i] === q.correct ? answeredRight : answeredWrong).add(q.wordId);
  });

  const bandMap = placementBands(words);
  const placed: Word[] = [];
  let knownEstimate = 0;
  const ratio = new Map(bands.map((b) => [b.band, b.correct / b.asked]));
  for (const w of words) {
    const b = bandMap.get(w.id);
    if (b == null || w.rank == null) continue;
    if (isStarted(w.srs)) {
      if (w.srs.phase === 'review') knownEstimate++;
      continue;
    }
    knownEstimate += answeredRight.has(w.id) ? 1 : answeredWrong.has(w.id) ? 0 : (ratio.get(b) ?? 0);
    const known = answeredRight.has(w.id) || (passed.has(b) && !answeredWrong.has(w.id));
    if (!known) continue;
    // 1 à 4 semaines, réparties pour éviter une avalanche de révisions le même jour
    const interval = 7 + ((w.rank * 7919) % 17) + (b <= 2 ? 5 : 0);
    placed.push({
      ...w,
      updatedAt: now,
      srs: {
        ...newSrsState(),
        phase: 'review',
        interval,
        due: now + interval * DAY_MS,
        firstSeen: now,
        origin: 'placement',
      },
    });
  }

  const levels = new Map<Cefr, { level: Cefr; asked: number; correct: number }>();
  const byId = new Map(words.map((w) => [w.id, w]));
  questions.forEach((q, i) => {
    if (i >= answers.length) return;
    const lvl = byId.get(q.wordId)?.cefr;
    if (!lvl) return;
    const row = levels.get(lvl) ?? { level: lvl, asked: 0, correct: 0 };
    row.asked++;
    if (answers[i] === q.correct) row.correct++;
    levels.set(lvl, row);
  });

  return {
    bands,
    placed,
    knownEstimate: Math.round(knownEstimate),
    byLevel: [...levels.values()].sort((a, b) => a.level.localeCompare(b.level)),
  };
}
