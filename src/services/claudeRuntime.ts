/**
 * Accès aux capacités offertes quand le site est publié comme Artifact sur
 * claude.ai (window.claude.use). Ailleurs (Vercel, Netlify, local),
 * window.claude n'existe pas et toutes les fonctions renvoient null.
 */

export interface SampleFn {
  (input: string, options?: Record<string, unknown>): Promise<{ text: string; truncated: boolean }>;
  json<T = unknown>(input: string, options?: Record<string, unknown>): Promise<T>;
}

export interface DbDocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
export interface DbQuerySnapshot {
  docs: DbDocSnapshot[];
}
export interface DbQuery {
  where(field: string, op: string, value: unknown): DbQuery;
  orderBy(field: string, dir?: 'asc' | 'desc'): DbQuery;
  limit(n: number): DbQuery;
  get(): Promise<DbQuerySnapshot>;
}
export interface DbDocRef {
  id: string;
  get(): Promise<DbDocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
export interface DbCollectionRef extends DbQuery {
  doc(id: string): DbDocRef;
}
export interface DbApi {
  doc(path: string): DbDocRef;
  collection(path: string): DbCollectionRef;
}
export interface UserApi {
  id(): Promise<string | null>;
}
export interface DownloadsApi {
  save(req: { filename: string; data: string | Blob }): Promise<{ status: 'saved' | 'delivered' }>;
}

interface CapabilityMap {
  sample: SampleFn;
  db: DbApi;
  user: UserApi;
  downloads: DownloadsApi;
}

type ClaudeGlobal = { use?: (name: string) => Promise<unknown> };

export function inClaudeViewer(): boolean {
  if (typeof window === 'undefined') return false;
  const c = (window as unknown as { claude?: ClaudeGlobal }).claude;
  return !!c && typeof c.use === 'function';
}

const cache = new Map<string, Promise<unknown>>();

export function capability<K extends keyof CapabilityMap>(name: K): Promise<CapabilityMap[K] | null> {
  if (!inClaudeViewer()) return Promise.resolve(null);
  if (!cache.has(name)) {
    const c = (window as unknown as { claude: ClaudeGlobal }).claude;
    cache.set(
      name,
      c.use!(name).then(
        (x) => x ?? null,
        () => null,
      ),
    );
  }
  return cache.get(name) as Promise<CapabilityMap[K] | null>;
}

/** Erreur renvoyée par les capacités (forme {code, message}). */
export function capabilityErrorCode(e: unknown): string | null {
  if (e && typeof e === 'object' && 'code' in e && typeof (e as { code: unknown }).code === 'string') {
    return (e as { code: string }).code;
  }
  return null;
}
