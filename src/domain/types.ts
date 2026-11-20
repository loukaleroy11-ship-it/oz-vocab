/** Modèles de données partagés par toute l'application. */
import type { PracticeLevel } from './practice';

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
  | 'expression'
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
  'expression',
  'other',
];

/** Paquets de vocabulaire intégrés (en plus des 500 mots de base). */
export type PackId = 'b1' | 'b2' | 'c1' | 'phrasal' | 'idioms' | 'aussie' | 'work';
export const PACK_IDS: PackId[] = ['b1', 'b2', 'c1', 'phrasal', 'idioms', 'aussie', 'work'];
export const PACK_LABEL: Record<PackId, string> = {
  b1: 'Mots B1',
  b2: 'Mots B2',
  c1: 'Mots C1',
  phrasal: 'Phrasal verbs',
  idioms: 'Expressions',
  aussie: 'Anglais australien',
  work: 'Travail et mines',
};

/** Réponses possibles. L'interface simple n'utilise que `again` et `good`. */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type Phase = 'new' | 'learning' | 'review' | 'relearning';

/**
 * Deux suivis indépendants par mot :
 *  - rec  (reconnaître) : je vois l'anglais, je retrouve le sens en français ;
 *  - prod (produire)    : je vois le français, je dis ou j'écris le mot anglais.
 */
export type Track = 'rec' | 'prod';

export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const CEFR_LEVELS: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

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
  /** « placement » : mot jugé connu au test de placement (pas encore révisé dans une liste). */
  origin?: 'placement';
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
  /** Niveau CECRL du sens principal (CEFR-J / Octanove), null si inconnu. */
  cefr: Cefr | null;
  /** Paquet intégré (absent pour les 500 mots de base et les mots ajoutés). */
  pack?: PackId;
  /** Thème de regroupement des listes (paquets). */
  group?: string;
  /** Remarque d'usage (registre, australien…). */
  note?: string;
  /** Suivi « reconnaître » (anglais → français). */
  srs: SrsState;
  /** Suivi « produire » (français → anglais). */
  prod: SrsState;
}

export interface SessionAnswer {
  /** Clé de carte : identifiant du mot (reconnaître) ou identifiant + « @p » (produire). */
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
/** Réponse aux cartes français → anglais : à voix haute puis vérifier, ou en tapant le mot. */
export type ProdMode = 'oral' | 'written';

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
  prodMode: ProdMode;
  /** Test de placement fait (ou ignoré). */
  placementDone: boolean;
  /** Paquets désactivés : leurs mots ne sont pas proposés comme nouveaux. */
  disabledPacks: PackId[];
  /** Niveau des exercices « S'exprimer ». */
  practiceLevel: PracticeLevel;
  syncEnabled: boolean;
  /** Code d'accès facultatif pour la fonction serveur de traduction. */
  lookupAccessCode: string;
  updatedAt: number;
}

export const SETTINGS_SCHEMA = 3;

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
  prodMode: 'oral',
  placementDone: false,
  disabledPacks: [],
  practiceLevel: 'B1',
  syncEnabled: true,
  lookupAccessCode: '',
  updatedAt: 0,
};

/**
 * Complète et met à jour des réglages enregistrés.
 * Version 1 : limite de 20 nouveaux mots par jour par défaut → désormais sans limite
 * (le bouton « Réviser » enchaîne les nouvelles listes une fois les révisions faites).
 * Version 2 → 3 : mode de réponse des cartes français → anglais et test de placement.
 */
export function normalizeSettings(s: Partial<Settings> | null | undefined): Settings {
  const merged: Settings = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  if ((s?.schema ?? 1) < 2 && merged.newPerDay === 20) merged.newPerDay = 0;
  if (merged.prodMode !== 'oral' && merged.prodMode !== 'written') merged.prodMode = 'oral';
  merged.placementDone = merged.placementDone === true;
  if (!['A2', 'B1', 'B2', 'C1'].includes(merged.practiceLevel)) merged.practiceLevel = 'B1';
  merged.disabledPacks = Array.isArray(merged.disabledPacks) ? merged.disabledPacks.filter((p) => PACK_IDS.includes(p)) : [];
  merged.schema = SETTINGS_SCHEMA;
  return merged;
}

export type LearningStatus = 'new' | 'learning' | 'due' | 'difficult' | 'mastered';
