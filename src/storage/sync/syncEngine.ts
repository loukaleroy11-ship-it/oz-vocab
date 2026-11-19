/** Orchestration d'une synchronisation : regroupement local, échange, écriture locale. */
import type { Settings } from '../../domain/types';
import { SETTINGS_BUCKET, dailyBucket, sessionBucket, wordBucket } from '../buckets';
import type { Repo } from '../repo';
import type { LocalSnapshot, PulledChanges, SyncTarget } from './artifactSync';

import type { Stamped } from './merge';

const SESSIONS_MARGIN_MS = 3 * 24 * 3600 * 1000;

export function localBuckets(local: LocalSnapshot): Map<string, Stamped[]> {
  const map = new Map<string, Stamped[]>();
  const add = (b: string, item: Stamped) => {
    const arr = map.get(b);
    if (arr) arr.push(item);
    else map.set(b, [item]);
  };
  // un mot de référence jamais modifié (updatedAt = 0) existe déjà sur chaque appareil
  local.words.filter((w) => w.updatedAt > 0).forEach((w) => add(wordBucket(w.id), w));
  local.sessions.forEach((s) => add(sessionBucket(s), s));
  local.daily.forEach((d) => add(dailyBucket(d), d));
  if (local.settings.updatedAt > 0) add(SETTINGS_BUCKET, { ...local.settings, id: 'settings' } as Stamped);
  return map;
}

export interface SyncOutcome {
  pulled: PulledChanges;
  pushed: string[];
  at: number;
}

/**
 * Lance un échange complet. Les enregistrements reçus sont écrits localement
 * sans être re-marqués « à synchroniser ».
 */
export async function runSync(target: SyncTarget, repo: Repo, now: number): Promise<SyncOutcome> {
  const lastPull = (await repo.getMeta<number>('lastSessionsPull')) ?? 0;
  // lecture dans la file d'écriture : les données envoyées correspondent exactement aux paquets marqués
  const { local, dirty: snapshot } = await repo.readForSync();
  const dirty = [...snapshot.keys()];
  const { pulled, pushed } = await target.run({
    local,
    dirty,
    sessionsSince: Math.max(0, lastPull - SESSIONS_MARGIN_MS),
    bucketsOf: localBuckets,
  });
  const settings: Settings | undefined = pulled.settings
    ? (({ id: _id, ...rest }) => rest as Settings)(pulled.settings as Settings & { id?: string })
    : undefined;
  const applied = await repo.applyRemote({
    words: pulled.words,
    sessions: pulled.sessions,
    daily: pulled.daily,
    settings,
  });
  await repo.clearDirty(pushed, snapshot);
  await repo.setMeta('lastSessionsPull', now);
  await repo.setMeta('lastSyncAt', now);
  return {
    pulled: {
      words: applied.words ?? [],
      sessions: applied.sessions ?? [],
      daily: applied.daily ?? [],
      settings: applied.settings ?? null,
    },
    pushed,
    at: now,
  };
}
