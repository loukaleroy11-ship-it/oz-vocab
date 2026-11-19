import { endOfDay } from './dates';
import { isDifficult, isMastered } from './srs';
import type { LearningStatus, Pos, Word } from './types';

/** Un mot est-il à réviser aujourd'hui (échéance passée ou dans la journée) ? */
export function isDueToday(w: Word, now: number): boolean {
  return w.srs.reps > 0 && w.srs.due != null && w.srs.due <= endOfDay(now);
}

/** Les états se recoupent : un mot peut être à la fois « difficile » et « à revoir ». */
export function statusTags(w: Word, now: number): LearningStatus[] {
  const tags: LearningStatus[] = [];
  if (w.srs.reps === 0) return ['new'];
  if (isMastered(w.srs)) tags.push('mastered');
  else tags.push('learning');
  if (isDueToday(w, now)) tags.push('due');
  if (isDifficult(w.srs)) tags.push('difficult');
  return tags;
}

/** État principal affiché sur une ligne. */
export function primaryStatus(w: Word, now: number): LearningStatus {
  const t = statusTags(w, now);
  if (t.includes('due')) return 'due';
  if (t.includes('difficult')) return 'difficult';
  return t[0];
}

export const STATUS_LABEL: Record<LearningStatus, string> = {
  new: 'Nouveau',
  learning: 'En cours',
  due: 'À revoir',
  difficult: 'Difficile',
  mastered: 'Maîtrisé',
};

export const STATUS_FILTER_LABEL: Record<LearningStatus, string> = {
  new: 'Nouveaux mots',
  learning: 'En cours d’apprentissage',
  due: 'À revoir aujourd’hui',
  difficult: 'Mots difficiles',
  mastered: 'Mots maîtrisés',
};

export const POS_LABEL: Record<Pos, string> = {
  noun: 'nom',
  verb: 'verbe',
  adjective: 'adjectif',
  adverb: 'adverbe',
  preposition: 'préposition',
  pronoun: 'pronom',
  determiner: 'déterminant',
  conjunction: 'conjonction',
  auxiliary: 'auxiliaire / modal',
  interjection: 'interjection',
  number: 'nombre',
  other: 'autre',
};

export const POS_PLURAL: Record<Pos, string> = {
  noun: 'Noms',
  verb: 'Verbes',
  adjective: 'Adjectifs',
  adverb: 'Adverbes',
  preposition: 'Prépositions',
  pronoun: 'Pronoms',
  determiner: 'Déterminants',
  conjunction: 'Conjonctions',
  auxiliary: 'Auxiliaires',
  interjection: 'Interjections',
  number: 'Nombres',
  other: 'Autres',
};
