/** Statistiques calculées à partir des données réellement enregistrées. */
import { addDays, dayKey, startOfDay } from './dates';
import { isMastered, isStarted } from './srs';
import { dueCards } from './selection';
import { isProducible, isRecognized } from './tracks';
import { isDueToday, statusTags } from './status';
import { CEFR_LEVELS, type Cefr, type DailySnapshot, type Pos, type ReviewSession, type Word } from './types';

export interface Overview {
  total: number;
  newCount: number;
  learning: number;
  mastered: number;
  difficult: number;
  dueToday: number;
  /** À revoir maintenant (les mots ratés récemment reviennent 10 min plus tard). */
  dueNow: number;
  /** Mots déjà présentés au moins une fois. */
  seen: number;
  /** Mots reconnus (anglais → français acquis, dernière révision réussie). */
  recognized: number;
  /** Mots productibles (je sais les dire en anglais à partir du français). */
  producible: number;
  reviewedToday: number;
  answersToday: number;
  correctToday: number;
  answersTotal: number;
  correctTotal: number;
  accuracyToday: number | null;
  accuracyTotal: number | null;
  streak: number;
  /** La série est-elle déjà prolongée aujourd'hui ? */
  streakIncludesToday: boolean;
  masteredPct: number;
  seenPct: number;
}

export function liveSessions(sessions: ReviewSession[]): ReviewSession[] {
  return sessions.filter((s) => !s.deleted);
}

export function computeOverview(words: Word[], sessions: ReviewSession[], now: number): Overview {
  const active = words.filter((w) => !w.deleted);
  let newCount = 0;
  let learning = 0;
  let mastered = 0;
  let difficult = 0;
  let dueToday = 0;
  let recognized = 0;
  let producible = 0;
  for (const w of active) {
    const tags = statusTags(w, now);
    if (tags.includes('new')) newCount++;
    if (tags.includes('learning')) learning++;
    if (tags.includes('mastered')) mastered++;
    if (tags.includes('difficult')) difficult++;
    if (isDueToday(w, now)) dueToday++;
    if (isRecognized(w)) recognized++;
    if (isProducible(w)) producible++;
  }
  const dueNow = dueCards(active, now).length;
  const today = startOfDay(now);
  const answers = liveSessions(sessions).flatMap((s) => s.answers);
  const todays = answers.filter((a) => a.at >= today);
  const correctToday = todays.filter((a) => a.grade !== 'again').length;
  const correctTotal = answers.filter((a) => a.grade !== 'again').length;
  const { streak, includesToday } = studyStreak(answers.map((a) => a.at), now);
  const total = active.length;
  const seen = total - newCount;
  return {
    total,
    newCount,
    learning,
    mastered,
    difficult,
    dueToday,
    dueNow,
    seen,
    recognized,
    producible,
    reviewedToday: new Set(todays.map((a) => a.wordId)).size,
    answersToday: todays.length,
    correctToday,
    answersTotal: answers.length,
    correctTotal,
    accuracyToday: todays.length ? correctToday / todays.length : null,
    accuracyTotal: answers.length ? correctTotal / answers.length : null,
    streak,
    streakIncludesToday: includesToday,
    masteredPct: total ? mastered / total : 0,
    seenPct: total ? seen / total : 0,
  };
}

/**
 * Jours consécutifs avec au moins une réponse. Si rien n'a encore été fait
 * aujourd'hui, la série d'hier reste valable (elle n'est pas encore perdue).
 */
export function studyStreak(timestamps: number[], now: number): { streak: number; includesToday: boolean } {
  const days = new Set(timestamps.map(dayKey));
  const todayKey = dayKey(now);
  const includesToday = days.has(todayKey);
  let cursor = includesToday ? now : addDays(now, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { streak, includesToday };
}

export interface LevelRow {
  /** Niveau CECRL, ou null pour les mots ajoutés sans niveau connu. */
  level: Cefr | null;
  total: number;
  recognized: number;
  producible: number;
}

/** Reconnus / productibles par niveau (seulement les niveaux présents). */
export function levelBreakdown(words: Word[]): LevelRow[] {
  const rows = new Map<Cefr | null, LevelRow>();
  for (const w of words) {
    if (w.deleted) continue;
    const row = rows.get(w.cefr) ?? { level: w.cefr, total: 0, recognized: 0, producible: 0 };
    row.total++;
    if (isRecognized(w)) row.recognized++;
    if (isProducible(w)) row.producible++;
    rows.set(w.cefr, row);
  }
  const order = (l: Cefr | null) => (l == null ? 99 : CEFR_LEVELS.indexOf(l));
  return [...rows.values()].sort((a, b) => order(a.level) - order(b.level));
}

export interface PosRow {
  pos: Pos;
  total: number;
  mastered: number;
  learning: number;
}

export function posBreakdown(words: Word[], now: number): PosRow[] {
  const map = new Map<Pos, PosRow>();
  for (const w of words) {
    if (w.deleted) continue;
    const row = map.get(w.pos) ?? { pos: w.pos, total: 0, mastered: 0, learning: 0 };
    row.total++;
    const tags = statusTags(w, now);
    if (tags.includes('mastered')) row.mastered++;
    else if (tags.includes('learning')) row.learning++;
    map.set(w.pos, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export interface SessionSummary {
  id: string;
  label: string;
  start: number;
  durationMs: number;
  distinct: number;
  repetitions: number;
  correct: number;
  incorrect: number;
  successRate: number | null;
  status: ReviewSession['status'];
}

export function summarizeSession(s: ReviewSession): SessionSummary {
  const seen = new Set(s.answers.map((a) => a.wordId)).size;
  const correct = s.answers.filter((a) => a.grade !== 'again').length;
  const incorrect = s.answers.length - correct;
  return {
    id: s.id,
    label: s.label,
    start: s.createdAt,
    durationMs: s.activeMs,
    distinct: seen,
    repetitions: s.answers.length - seen,
    correct,
    incorrect,
    successRate: s.answers.length ? correct / s.answers.length : null,
    status: s.status,
  };
}

/** Sessions passées ayant au moins une réponse, de la plus récente à la plus ancienne. */
export function sessionHistory(sessions: ReviewSession[]): SessionSummary[] {
  return liveSessions(sessions)
    .filter((s) => s.answers.length > 0)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(summarizeSession);
}

export interface DayRow {
  day: string;
  ts: number;
  sessions: number;
  words: number;
  answers: number;
  correct: number;
  activeMs: number;
  mastered: number | null;
}

/** Progression jour par jour sur les `days` derniers jours (jours sans activité inclus). */
export function dailyRows(
  sessions: ReviewSession[],
  snapshots: DailySnapshot[],
  now: number,
  days: number,
): DayRow[] {
  const snap = new Map(snapshots.filter((d) => !d.deleted).map((d) => [d.id, d]));
  const rows: DayRow[] = [];
  const live = liveSessions(sessions);
  let lastMastered: number | null = null;
  // valeur connue avant la fenêtre, pour prolonger la courbe
  const firstDay = startOfDay(addDays(now, -(days - 1)));
  const before = [...snap.values()].filter((d) => d.id < dayKey(firstDay)).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (before.length) lastMastered = before[before.length - 1].mastered;
  for (let i = days - 1; i >= 0; i--) {
    const ts = startOfDay(addDays(now, -i));
    const key = dayKey(ts);
    const end = addDays(ts, 1);
    const answers = live.flatMap((s) => s.answers).filter((a) => a.at >= ts && a.at < end);
    const sess = live.filter((s) => s.answers.some((a) => a.at >= ts && a.at < end));
    const s = snap.get(key);
    if (s) lastMastered = s.mastered;
    rows.push({
      day: key,
      ts,
      sessions: sess.length,
      words: new Set(answers.map((a) => a.wordId)).size,
      answers: answers.length,
      correct: answers.filter((a) => a.grade !== 'again').length,
      activeMs: sess.reduce((acc, x) => acc + x.activeMs, 0),
      mastered: lastMastered,
    });
  }
  return rows;
}

export function makeSnapshot(words: Word[], now: number): DailySnapshot {
  const active = words.filter((w) => !w.deleted);
  return {
    id: dayKey(now),
    updatedAt: now,
    mastered: active.filter((w) => isMastered(w.srs)).length,
    seen: active.filter((w) => isStarted(w.srs)).length,
    total: active.length,
    deleted: false,
  };
}
