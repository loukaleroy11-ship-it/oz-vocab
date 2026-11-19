/** Modèles de données partagés par toute l'application. */

export type Pos =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'pronoun'
  | 'determiner'
  | 'conjunction'
  | 'auxiliary'
  | 'interjection'
  | 'number'
  | 'other';

export const POS_LIST: Pos[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'pronoun',
  'determiner',
  'conjunction',
  'auxiliary',
  'interjection',
  'number',
  'other',
];

/** Réponses possibles. L'interface simple n'utilise que `again` et `good`. */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type Phase = 'new' | 'learning' | 'review' | 'relearning';

/** Paramètres de répétition espacée d'un mot (adaptation de SM-2, voir srs.ts). */
export interface SrsState {
  phase: Phase;
  /** Facteur de facilité SM-2 (1,3 à 3,0). Plus il est bas, plus le mot est difficile. */
  ease: number;
  /** Intervalle actuel en jours (0 pendant l'apprentissage). */
  interval: number;
  /** Intervalle avant le dernier oubli, utilisé pour le réapprentissage. */
  lapsedFrom: number;
  /** Date de prochaine révision (ms depuis epoch) ou null pour un mot jamais vu. */
  due: number | null;
  reps: number;
  correct: number;
  incorrect: number;
  /** Nombre d'oublis d'un mot qui avait déjà été appris. */
  lapses: number;
  /** Bonnes réponses consécutives. */
  streak: number;
  lastGrade: Grade | null;
  lastReviewed: number | null;
  firstSeen: number | null;
}

export type IpaSource = 'britfone-au' | 'claude' | 'server-ai' | 'dictionary' | 'manual';

export interface WordContent {
  en: string;
  fr: string;
  frAlt: string[];
  pos: Pos;
  posAlt: Pos[];
  ipa: string | null;
  ipaAlt: string[];
  ipaSource: IpaSource | null;
  exampleEn: string;
  exampleFr: string;
  forms: string[];
  spellingAlt: string[];
}

export interface Word extends WordContent {
  id: string;
  source: 'core' | 'user';
  /** Rang dans la liste des 500 (1 = le plus fréquent). null pour un mot ajouté. */
  rank: number | null;
  /** Rang d'origine dans NGSL-Spoken 1.2. */
  sourceRank: number | null;
  /** Fréquence estimée (occurrences par million de mots, indice U de NGSL-Spoken). */
  freqPerMillion: number | null;
  /** URL d'un enregistrement natif (mots ajoutés, si trouvé). */
  audioUrl: string | null;
  audioAccent: string | null;
  addedAt: number;
  updatedAt: number;
  /** Le contenu (traduction, exemple…) a été modifié à la main. */
  edited: boolean;
  deleted: boolean;
  srs: SrsState;
}

export interface SessionAnswer {
  wordId: string;
  grade: Grade;
  at: number;
  /** 1 pour la première présentation du mot dans la session, 2 pour la première répétition… */
  attempt: number;
  intervalAfter: number;
}

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface SessionFilterRef {
  label: string;
  /** Mots restants de la sélection d'origine, pour enchaîner « les 10 suivants ». */
  remainingIds: string[];
}

export interface ReviewSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  label: string;
  /** Mots distincts de la session, dans l'ordre initial. */
  wordIds: string[];
  /** File restante : l'élément 0 est le mot affiché. */
  queue: string[];
  answers: SessionAnswer[];
  /** Temps actif cumulé (les pauses longues ne sont pas comptées). */
  activeMs: number;
  lastActivityAt: number;
  selection: SessionFilterRef | null;
  deleted: boolean;
}

export interface DailySnapshot {
  /** Jour local AAAA-MM-JJ. */
  id: string;
  updatedAt: number;
  mastered: number;
  seen: number;
  total: number;
  deleted: boolean;
}

export type ThemeSetting = 'light' | 'dark' | 'system';
export type AnswerMode = 'two' | 'three';
export type AudioPreference = 'tts' | 'native-first';

export interface Settings {
  /** Version du format des réglages (migrations). */
  schema: number;
  sessionSize: number;
  /** Limite de nouveaux mots par jour ; 0 = sans limite. */
  newPerDay: number;
  answerMode: AnswerMode;
  theme: ThemeSetting;
  voiceURI: string | null;
  speechRate: number;
  autoPlay: boolean;
  audioPreference: AudioPreference;
  syncEnabled: boolean;
  /** Code d'accès facultatif pour la fonction serveur de traduction. */
  lookupAccessCode: string;
  updatedAt: number;
}

export const SETTINGS_SCHEMA = 2;

export const DEFAULT_SETTINGS: Settings = {
  schema: SETTINGS_SCHEMA,
  sessionSize: 10,
  newPerDay: 0,
  answerMode: 'two',
  theme: 'light',
  voiceURI: null,
  speechRate: 0.9,
  autoPlay: true,
  audioPreference: 'tts',
  syncEnabled: true,
  lookupAccessCode: '',
  updatedAt: 0,
};

/**
 * Complète et met à jour des réglages enregistrés.
 * Version 1 : limite de 20 nouveaux mots par jour par défaut → désormais sans limite
 * (le bouton « Réviser » enchaîne les nouvelles listes une fois les révisions faites).
 */
export function normalizeSettings(s: Partial<Settings> | null | undefined): Settings {
  const merged: Settings = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  if ((s?.schema ?? 1) < 2) {
    if (merged.newPerDay === 20) merged.newPerDay = 0;
    merged.schema = SETTINGS_SCHEMA;
  }
  return merged;
}

export type LearningStatus = 'new' | 'learning' | 'due' | 'difficult' | 'mastered';
