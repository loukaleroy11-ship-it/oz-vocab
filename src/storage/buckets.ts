/**
 * Regroupement des enregistrements en « paquets » pour la synchronisation :
 * peu de documents distants, chacun bien en dessous de 256 Kio.
 */
import { dayKey } from '../domain/dates';
import type { DailySnapshot, ReviewSession } from '../domain/types';

export const WORD_BUCKETS = 16;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const wordBucket = (id: string) => `w-${(hash(id) % WORD_BUCKETS).toString(16)}`;
export const sessionBucket = (s: Pick<ReviewSession, 'createdAt'>) => `s-${dayKey(s.createdAt)}`;
export const dailyBucket = (d: Pick<DailySnapshot, 'id'>) => `d-${d.id.slice(0, 7)}`;
export const SETTINGS_BUCKET = 'settings';

export type BucketKind = 'words' | 'sessions' | 'daily' | 'settings';

export function bucketKind(bucketId: string): BucketKind {
  if (bucketId.startsWith('w-')) return 'words';
  if (bucketId.startsWith('s-')) return 'sessions';
  if (bucketId.startsWith('d-')) return 'daily';
  return 'settings';
}
