/** Export JSON / CSV et import JSON vérifié, avec gestion des doublons. */
import { normalizeWord } from '../domain/normalize';
import { newSrsState } from '../domain/srs';
import { englishKey } from '../domain/text';
import {
  CEFR_LEVELS,
  PACK_LABEL,
  normalizeSettings,
  POS_LIST,
  type Cefr,
  type DailySnapshot,
  type Grade,
  type Pos,
  type ReviewSession,
  type Settings,
  type SrsState,
  type Word,
} from '../domain/types';
import { statusTags, STATUS_LABEL, POS_LABEL } from '../domain/status';
import type { AppData, Changes } from './repo';

export const EXPORT_APP = 'oz-vocab';
export const EXPORT_SCHEMA = 1;

export interface ExportFile {
  app: string;
  schema: number;
  exportedAt: string;
  counts: { words: number; userWords: number; sessions: number };
  words: Word[];
  sessions: ReviewSession[];
  daily: DailySnapshot[];
  settings: Settings;
}

export function buildExport(data: AppData, now: number): ExportFile {
  return {
    app: EXPORT_APP,
    schema: EXPORT_SCHEMA,
    exportedAt: new Date(now).toISOString(),
    counts: {
      words: data.words.filter((w) => !w.deleted).length,
      userWords: data.words.filter((w) => !w.deleted && w.source === 'user').length,
      sessions: data.sessions.filter((s) => !s.deleted).length,
    },
    words: data.words,
    sessions: data.sessions,
    daily: data.daily,
    settings: data.settings,
  };
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** CSV (séparateur « ; », UTF-8 avec BOM) : s'ouvre directement dans Excel en français. */
export function buildCsv(words: Word[], now: number): string {
  const header = [
    'anglais', 'francais', 'autres_traductions', 'categorie', 'ipa_australien', 'exemple_en', 'exemple_fr',
    'rang', 'source', 'etat', 'revisions', 'correctes', 'incorrectes', 'intervalle_jours', 'prochaine_revision',
    'derniere_revision', 'niveau', 'produire_etat', 'produire_revisions', 'produire_intervalle_jours',
    'produire_prochaine_revision',
  ];
  const iso = (t: number | null) => (t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') : '');
  const lines = words
    .filter((w) => !w.deleted)
    .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.addedAt - b.addedAt)
    .map((w) =>
      [
        w.en, w.fr, w.frAlt.join(' ; '), POS_LABEL[w.pos], w.ipa ?? '', w.exampleEn, w.exampleFr,
        w.rank ?? '', w.source === 'user' ? 'ajouté' : w.pack ? PACK_LABEL[w.pack] : '500 mots de base', STATUS_LABEL[statusTags(w, now)[0]],
        w.srs.reps, w.srs.correct, w.srs.incorrect, w.srs.interval, iso(w.srs.due), iso(w.srs.lastReviewed),
        w.cefr ?? '', w.prod.reps === 0 ? 'Pas commencé' : w.prod.phase === 'review' ? 'Productible' : 'En cours',
        w.prod.reps, w.prod.interval, iso(w.prod.due),
      ]
        .map(csvCell)
        .join(';'),
    );
  return '﻿' + [header.join(';'), ...lines].join('\r\n');
}

// ---------- validation ----------

const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const strArr = (x: unknown): string[] => (Array.isArray(x) ? x.filter(isStr) : []);
const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

function cleanSrs(x: unknown): SrsState | null {
  const base = newSrsState();
  if (x == null) return base;
  if (typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const phase = o.phase;
  if (phase !== undefined && !['new', 'learning', 'review', 'relearning'].includes(phase as string)) return null;
  const num = (k: keyof SrsState, d: number) => (isNum(o[k]) ? (o[k] as number) : d);
  const numOrNull = (k: keyof SrsState) => (isNum(o[k]) ? (o[k] as number) : null);
  return {
    phase: (phase as SrsState['phase']) ?? 'new',
    ease: Math.min(3, Math.max(1.3, num('ease', base.ease))),
    interval: Math.max(0, num('interval', 0)),
    lapsedFrom: Math.max(0, num('lapsedFrom', 0)),
    due: numOrNull('due'),
    reps: Math.max(0, num('reps', 0)),
    correct: Math.max(0, num('correct', 0)),
    incorrect: Math.max(0, num('incorrect', 0)),
    lapses: Math.max(0, num('lapses', 0)),
    streak: Math.max(0, num('streak', 0)),
    lastGrade: GRADES.includes(o.lastGrade as Grade) ? (o.lastGrade as Grade) : null,
    lastReviewed: numOrNull('lastReviewed'),
    firstSeen: numOrNull('firstSeen'),
    ...(o.origin === 'placement' ? { origin: 'placement' as const } : {}),
  };
}

function cleanWord(x: unknown): Word | string {
  if (!x || typeof x !== 'object') return 'entrée non valide';
  const o = x as Record<string, unknown>;
  if (!isStr(o.id) || !o.id) return 'identifiant manquant';
  if (!isStr(o.en) || !o.en.trim()) return `mot anglais manquant (${o.id})`;
  if (!isStr(o.fr)) return `traduction manquante (${o.en})`;
  if (!POS_LIST.includes(o.pos as Pos)) return `catégorie inconnue pour « ${o.en} »`;
  const srs = cleanSrs(o.srs);
  if (!srs) return `progression illisible pour « ${o.en} »`;
  const prod = cleanSrs(o.prod);
  if (!prod) return `progression (français → anglais) illisible pour « ${o.en} »`;
  return normalizeWord({
    id: o.id,
    source: o.source === 'core' ? 'core' : 'user',
    rank: isNum(o.rank) ? o.rank : null,
    sourceRank: isNum(o.sourceRank) ? o.sourceRank : null,
    freqPerMillion: isNum(o.freqPerMillion) ? o.freqPerMillion : null,
    audioUrl: isStr(o.audioUrl) ? o.audioUrl : null,
    audioAccent: isStr(o.audioAccent) ? o.audioAccent : null,
    addedAt: isNum(o.addedAt) ? o.addedAt : Date.now(),
    updatedAt: isNum(o.updatedAt) ? o.updatedAt : 0,
    edited: o.edited === true,
    deleted: o.deleted === true,
    en: o.en.trim(),
    fr: o.fr.trim(),
    frAlt: strArr(o.frAlt),
    pos: o.pos as Pos,
    posAlt: strArr(o.posAlt).filter((p): p is Pos => POS_LIST.includes(p as Pos)),
    ipa: isStr(o.ipa) ? o.ipa : null,
    ipaAlt: strArr(o.ipaAlt),
    ipaSource: isStr(o.ipaSource) ? (o.ipaSource as Word['ipaSource']) : null,
    exampleEn: isStr(o.exampleEn) ? o.exampleEn : '',
    exampleFr: isStr(o.exampleFr) ? o.exampleFr : '',
    forms: strArr(o.forms),
    spellingAlt: strArr(o.spellingAlt),
    cefr: CEFR_LEVELS.includes(o.cefr as Cefr) ? (o.cefr as Cefr) : null,
    srs,
    prod,
  });
}

function cleanSession(x: unknown): ReviewSession | string {
  if (!x || typeof x !== 'object') return 'session non valide';
  const o = x as Record<string, unknown>;
  if (!isStr(o.id) || !isNum(o.createdAt)) return 'session sans identifiant ou date';
  const answers = Array.isArray(o.answers) ? o.answers : [];
  const cleanAnswers = answers
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .filter((a) => isStr(a.wordId) && GRADES.includes(a.grade as Grade) && isNum(a.at))
    .map((a) => ({
      wordId: a.wordId as string,
      grade: a.grade as Grade,
      at: a.at as number,
      attempt: isNum(a.attempt) ? a.attempt : 1,
      intervalAfter: isNum(a.intervalAfter) ? a.intervalAfter : 0,
    }));
  const status = ['active', 'completed', 'abandoned'].includes(o.status as string)
    ? (o.status as ReviewSession['status'])
    : 'completed';
  return {
    id: o.id,
    createdAt: o.createdAt,
    updatedAt: isNum(o.updatedAt) ? o.updatedAt : o.createdAt,
    endedAt: isNum(o.endedAt) ? o.endedAt : null,
    status,
    label: isStr(o.label) ? o.label : 'Session importée',
    wordIds: strArr(o.wordIds),
    queue: strArr(o.queue),
    answers: cleanAnswers,
    activeMs: isNum(o.activeMs) ? o.activeMs : 0,
    lastActivityAt: isNum(o.lastActivityAt) ? o.lastActivityAt : o.createdAt,
    selection: null,
    deleted: o.deleted === true,
  };
}

function cleanDaily(x: unknown): DailySnapshot | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (!isStr(o.id) || !/^\d{4}-\d{2}-\d{2}$/.test(o.id) || !isNum(o.mastered)) return null;
  return {
    id: o.id,
    updatedAt: isNum(o.updatedAt) ? o.updatedAt : 0,
    mastered: o.mastered,
    seen: isNum(o.seen) ? o.seen : 0,
    total: isNum(o.total) ? o.total : 0,
    deleted: o.deleted === true,
  };
}

export type DuplicateStrategy = 'newest' | 'keep-local' | 'replace';

export interface ImportAnalysis {
  ok: boolean;
  fatal: string | null;
  errors: string[];
  words: Word[];
  sessions: ReviewSession[];
  daily: DailySnapshot[];
  settings: Settings | null;
  newWords: number;
  /** Même identifiant déjà présent. */
  sameId: number;
  /** Mot personnel différent mais même mot anglais qu'un mot existant. */
  sameEnglish: number;
  newSessions: number;
}

export function analyzeImport(text: string, current: AppData): ImportAnalysis {
  const empty: ImportAnalysis = {
    ok: false, fatal: null, errors: [], words: [], sessions: [], daily: [], settings: null,
    newWords: 0, sameId: 0, sameEnglish: 0, newSessions: 0,
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ...empty, fatal: 'Ce fichier n’est pas un JSON valide.' };
  }
  if (!parsed || typeof parsed !== 'object') return { ...empty, fatal: 'Contenu inattendu.' };
  const o = parsed as Record<string, unknown>;
  if (o.app !== EXPORT_APP) return { ...empty, fatal: 'Ce fichier ne provient pas d’une sauvegarde Oz Vocab.' };
  if (!isNum(o.schema) || o.schema > EXPORT_SCHEMA)
    return { ...empty, fatal: 'Version de sauvegarde non prise en charge. Mets à jour le site.' };
  if (!Array.isArray(o.words)) return { ...empty, fatal: 'La sauvegarde ne contient pas de liste de mots.' };

  const errors: string[] = [];
  const words: Word[] = [];
  const seenIds = new Set<string>();
  for (const raw of o.words) {
    const w = cleanWord(raw);
    if (typeof w === 'string') errors.push(w);
    else if (seenIds.has(w.id)) errors.push(`identifiant en double dans le fichier : ${w.id}`);
    else {
      seenIds.add(w.id);
      words.push(w);
    }
  }
  const sessions: ReviewSession[] = [];
  for (const raw of Array.isArray(o.sessions) ? o.sessions : []) {
    const s = cleanSession(raw);
    if (typeof s === 'string') errors.push(s);
    else sessions.push(s);
  }
  const daily = (Array.isArray(o.daily) ? o.daily : []).map(cleanDaily).filter((d): d is DailySnapshot => !!d);
  const settings =
    o.settings && typeof o.settings === 'object' ? normalizeSettings(o.settings as Partial<Settings>) : null;

  const localById = new Map(current.words.map((w) => [w.id, w]));
  const localEnglish = new Map(
    current.words.filter((w) => !w.deleted).map((w) => [englishKey(w.en), w]),
  );
  let newWords = 0;
  let sameId = 0;
  let sameEnglish = 0;
  for (const w of words) {
    if (localById.has(w.id)) sameId++;
    else if (!w.deleted && localEnglish.has(englishKey(w.en))) sameEnglish++;
    else if (!w.deleted) newWords++;
  }
  const localSessions = new Set(current.sessions.map((s) => s.id));
  const newSessions = sessions.filter((s) => !localSessions.has(s.id)).length;
  return {
    ok: true, fatal: null, errors, words, sessions, daily, settings,
    newWords, sameId, sameEnglish, newSessions,
  };
}

/** Calcule les écritures à faire selon la stratégie choisie pour les doublons. */
export function planImport(a: ImportAnalysis, current: AppData, strategy: DuplicateStrategy, now: number): Changes {
  const localById = new Map(current.words.map((w) => [w.id, w]));
  const localEnglish = new Map(
    current.words.filter((w) => !w.deleted).map((w) => [englishKey(w.en), w]),
  );
  const words: Word[] = [];
  for (const w of a.words) {
    const local = localById.get(w.id);
    if (local) {
      const take =
        strategy === 'replace' || (strategy === 'newest' && w.updatedAt > local.updatedAt);
      if (take) words.push({ ...w, updatedAt: Math.max(now, w.updatedAt) });
      continue;
    }
    const twin = w.deleted ? undefined : localEnglish.get(englishKey(w.en));
    if (twin) {
      if (strategy === 'replace' && twin.source === 'user') {
        words.push({ ...twin, deleted: true, updatedAt: now });
        words.push({ ...w, updatedAt: now });
      } else if (strategy === 'replace' && twin.source === 'core' && w.source === 'user') {
        // on garde le mot de référence ; seule sa progression est reprise
        words.push({ ...twin, srs: w.srs, prod: w.prod, updatedAt: now });
      }
      // sinon : mot ignoré (doublon)
      continue;
    }
    words.push({ ...w, updatedAt: Math.max(w.updatedAt, now) });
  }

  const localSessions = new Map(current.sessions.map((s) => [s.id, s]));
  const sessions = a.sessions.filter((s) => {
    const local = localSessions.get(s.id);
    if (!local) return true;
    return strategy === 'replace' || (strategy === 'newest' && s.updatedAt > local.updatedAt);
  });
  // une session importée « active » est close : on ne reprend pas une session d'un autre appareil
  const closedSessions = sessions.map((s) =>
    s.status === 'active' ? { ...s, status: 'completed' as const, endedAt: s.updatedAt } : s,
  );
  const localDaily = new Map(current.daily.map((d) => [d.id, d]));
  const daily = a.daily.filter((d) => {
    const local = localDaily.get(d.id);
    return !local || strategy === 'replace' || (strategy === 'newest' && d.updatedAt > local.updatedAt);
  });
  const settings =
    a.settings &&
    (strategy === 'replace' || (strategy === 'newest' && a.settings.updatedAt > current.settings.updatedAt))
      ? { ...a.settings, updatedAt: now }
      : undefined;
  return { words, sessions: closedSessions, daily, settings };
}
