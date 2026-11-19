/**
 * Stockage local persistant. IndexedDB par défaut ; repli en mémoire si
 * IndexedDB est indisponible (navigation privée stricte, cadre bloqué…),
 * avec un avertissement affiché dans l'interface.
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { DailySnapshot, ReviewSession, Word } from '../domain/types';

export interface Batch {
  words?: Word[];
  sessions?: ReviewSession[];
  daily?: DailySnapshot[];
  meta?: Record<string, unknown>;
}

export interface Store {
  kind: 'indexeddb' | 'memory';
  getAllWords(): Promise<Word[]>;
  getAllSessions(): Promise<ReviewSession[]>;
  getAllDaily(): Promise<DailySnapshot[]>;
  getMeta<T>(key: string): Promise<T | undefined>;
  /** Écriture atomique (une seule transaction) : tout est enregistré, ou rien. */
  commit(batch: Batch): Promise<void>;
  clearAll(): Promise<void>;
  close(): void;
}

export const DB_NAME = 'oz-vocab';
const DB_VERSION = 1;
const STORES = ['words', 'sessions', 'daily', 'meta'] as const;

export async function openIndexedDbStore(name = DB_NAME): Promise<Store> {
  const db: IDBPDatabase = await openDB(name, DB_VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains('words')) d.createObjectStore('words', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('sessions')) d.createObjectStore('sessions', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('daily')) d.createObjectStore('daily', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
    },
  });
  return {
    kind: 'indexeddb',
    getAllWords: () => db.getAll('words') as Promise<Word[]>,
    getAllSessions: () => db.getAll('sessions') as Promise<ReviewSession[]>,
    getAllDaily: () => db.getAll('daily') as Promise<DailySnapshot[]>,
    getMeta: async <T,>(key: string) => (await db.get('meta', key)) as T | undefined,
    async commit(batch) {
      const tx = db.transaction([...STORES], 'readwrite');
      const ops: Promise<unknown>[] = [];
      batch.words?.forEach((w) => ops.push(tx.objectStore('words').put(w)));
      batch.sessions?.forEach((s) => ops.push(tx.objectStore('sessions').put(s)));
      batch.daily?.forEach((d) => ops.push(tx.objectStore('daily').put(d)));
      if (batch.meta) {
        for (const [k, v] of Object.entries(batch.meta)) ops.push(tx.objectStore('meta').put(v, k));
      }
      await Promise.all([...ops, tx.done]);
    },
    async clearAll() {
      const tx = db.transaction([...STORES], 'readwrite');
      await Promise.all([...STORES.map((s) => tx.objectStore(s).clear()), tx.done]);
    },
    close: () => db.close(),
  };
}

export function createMemoryStore(): Store {
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  const words = new Map<string, Word>();
  const sessions = new Map<string, ReviewSession>();
  const daily = new Map<string, DailySnapshot>();
  const meta = new Map<string, unknown>();
  return {
    kind: 'memory',
    getAllWords: async () => [...words.values()].map(clone),
    getAllSessions: async () => [...sessions.values()].map(clone),
    getAllDaily: async () => [...daily.values()].map(clone),
    getMeta: async <T,>(key: string) => (meta.has(key) ? clone(meta.get(key)) : undefined) as T | undefined,
    async commit(batch) {
      batch.words?.forEach((w) => words.set(w.id, clone(w)));
      batch.sessions?.forEach((s) => sessions.set(s.id, clone(s)));
      batch.daily?.forEach((d) => daily.set(d.id, clone(d)));
      if (batch.meta) for (const [k, v] of Object.entries(batch.meta)) meta.set(k, clone(v));
    },
    async clearAll() {
      words.clear();
      sessions.clear();
      daily.clear();
      meta.clear();
    },
    close: () => {},
  };
}

/** Ouvre IndexedDB, ou bascule en mémoire si le navigateur le refuse. */
export async function openBestStore(): Promise<{ store: Store; error: string | null }> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB absent');
    const store = await Promise.race([
      openIndexedDbStore(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('délai dépassé')), 4000)),
    ]);
    // demande de stockage persistant (limite l'effacement automatique par le navigateur)
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* facultatif */
    }
    return { store, error: null };
  } catch (e) {
    return { store: createMemoryStore(), error: e instanceof Error ? e.message : String(e) };
  }
}
