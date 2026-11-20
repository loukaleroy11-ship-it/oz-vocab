/**
 * Mise à niveau des mots enregistrés par une version précédente (ou reçus d'un
 * appareil pas encore mis à jour) : la progression existante devient le suivi
 * « reconnaître », le suivi « produire » démarre à zéro.
 * Renvoie l'objet d'origine quand il n'y a rien à changer.
 */
import { CORE_BY_ID } from '../data/core';
import { PACK_BY_ID, packMeta } from '../data/packs';
import { newSrsState } from './srs';
import { CEFR_LEVELS, type Cefr, type Word } from './types';

export function normalizeWord(w: Word): Word {
  const raw = w as Partial<Word>;
  const needsProd = !raw.prod || typeof raw.prod !== 'object';
  const packEntry = w.source === 'core' ? PACK_BY_ID.get(w.id) : undefined;
  if (packEntry && (!raw.pack || !raw.group)) {
    return normalizeWord({ ...w, ...packMeta(packEntry), cefr: raw.cefr ?? packEntry.cefr });
  }
  const coreLevel = w.source === 'core' ? (CORE_BY_ID.get(w.id)?.cefr ?? packEntry?.cefr ?? null) : null;
  const level: Cefr | null = CEFR_LEVELS.includes(raw.cefr as Cefr) ? (raw.cefr as Cefr) : coreLevel;
  const needsLevel = raw.cefr === undefined || (raw.cefr !== level);
  if (!needsProd && !needsLevel) return w;
  return { ...w, prod: needsProd ? newSrsState() : w.prod, cefr: level };
}
