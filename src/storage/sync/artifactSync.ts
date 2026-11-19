/**
 * Synchronisation entre appareils via la base de données des Artifacts
 * claude.ai (capacité `db`). L'authentification est celle du compte Claude :
 * les données sont rangées sous data/users/<id>/, un espace privé à chaque
 * utilisateur (même le propriétaire de la page ne voit pas celui des autres).
 *
 * Chaque document distant est un « paquet » d'enregistrements ; la fusion se
 * fait enregistrement par enregistrement (le plus récent gagne).
 */
import type { DailySnapshot, ReviewSession, Settings, Word } from '../../domain/types';
import { capability, capabilityErrorCode, type DbApi } from '../../services/claudeRuntime';
import { bucketKind, type BucketKind } from '../buckets';
import { mergeItems, type Stamped } from './merge';

export interface LocalSnapshot {
  words: Word[];
  sessions: ReviewSession[];
  daily: DailySnapshot[];
  settings: Settings;
}

export interface PulledChanges {
  words: Word[];
  sessions: ReviewSession[];
  daily: DailySnapshot[];
  settings: Settings | null;
}

interface RemoteDoc {
  kind: BucketKind;
  updatedAt: number;
  items: Record<string, Stamped>;
}

export interface SyncTarget {
  available: true;
  run(opts: {
    local: LocalSnapshot;
    dirty: string[];
    sessionsSince: number;
    bucketsOf: (local: LocalSnapshot) => Map<string, Stamped[]>;
  }): Promise<{ pulled: PulledChanges; pushed: string[] }>;
}

const SETTINGS_ID = 'settings';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (capabilityErrorCode(e) === 'unavailable') {
      await sleep(400 + Math.random() * 800);
      return fn();
    }
    throw e;
  }
}

/** Renvoie la cible de synchronisation si la page tourne dans claude.ai, sinon null. */
export async function connectArtifactSync(): Promise<SyncTarget | null> {
  const [db, user] = await Promise.all([capability('db'), capability('user')]);
  if (!db || !user) return null;
  let uid: string | null = null;
  try {
    uid = await user.id();
  } catch {
    uid = null;
  }
  if (!uid) return null;
  return createArtifactTarget(db, `data/users/${uid}`);
}

export function createArtifactTarget(db: DbApi, colPath: string): SyncTarget {
  const col = db.collection(colPath);

  async function fetchRemote(sessionsSince: number): Promise<Map<string, RemoteDoc>> {
    const out = new Map<string, RemoteDoc>();
    const queries = [
      col.where('kind', '==', 'words').limit(100),
      col.where('kind', '==', 'settings').limit(5),
      col.where('kind', '==', 'daily').limit(500),
      col.where('kind', '==', 'sessions').where('updatedAt', '>', sessionsSince).limit(1000),
    ];
    for (const q of queries) {
      const snap = await withRetry(() => q.get());
      for (const d of snap.docs) {
        const body = d.data() as RemoteDoc | undefined;
        if (d.exists && body && body.items && typeof body.items === 'object') out.set(d.id, body);
      }
    }
    return out;
  }

  return {
    available: true,
    async run({ local, dirty, sessionsSince, bucketsOf }) {
      const remote = await fetchRemote(sessionsSince);
      const localBuckets = bucketsOf(local);
      const pulled: PulledChanges = { words: [], sessions: [], daily: [], settings: null };
      const pushed: string[] = [];
      const ids = new Set<string>([...remote.keys(), ...dirty]);
      for (const bucketId of ids) {
        const kind = bucketKind(bucketId);
        let remoteDoc = remote.get(bucketId);
        if (!remoteDoc) {
          // paquet modifié localement mais pas reçu (session ancienne) : on le lit avant d'écrire
          const snap = await withRetry(() => col.doc(bucketId).get());
          const body = snap.exists ? (snap.data() as RemoteDoc | undefined) : undefined;
          remoteDoc = body && body.items ? body : { kind, updatedAt: 0, items: {} };
        }
        const localItems = localBuckets.get(bucketId) ?? [];
        const res = mergeItems(localItems, remoteDoc.items);
        for (const item of res.pullToLocal) {
          if (kind === 'words') pulled.words.push(item as unknown as Word);
          else if (kind === 'sessions') pulled.sessions.push(item as unknown as ReviewSession);
          else if (kind === 'daily') pulled.daily.push(item as unknown as DailySnapshot);
          else if (item.id === SETTINGS_ID) pulled.settings = item as unknown as Settings;
        }
        if (res.remoteNeedsWrite) {
          const updatedAt = Math.max(0, ...Object.values(res.merged).map((x) => x.updatedAt));
          const body = JSON.parse(JSON.stringify({ kind, updatedAt, items: res.merged }));
          await withRetry(() => col.doc(bucketId).set(body));
        }
        if (dirty.includes(bucketId)) pushed.push(bucketId);
      }
      return { pulled, pushed };
    },
  };
}
