/**
 * Couche d'accès aux données : initialisation des 500 mots, écritures
 * sérialisées, suivi des paquets modifiés pour la synchronisation.
 */
import { CORE_ENTRIES, CORE_VERSION, coreContent, coreWord } from '../data/core';
import { PACK_ENTRIES, PACK_VERSION, packContent, packMeta, packWord } from '../data/packs';
import { normalizeWord } from '../domain/normalize';
import { normalizeSettings, type DailySnapshot, type ReviewSession, type Settings, type Word } from '../domain/types';
import { SETTINGS_BUCKET, dailyBucket, sessionBucket, wordBucket } from './buckets';
import type { Batch, Store } from './store';

export interface AppData {
  words: Word[];
  sessions: ReviewSession[];
  daily: DailySnapshot[];
  settings: Settings;
}

export interface Changes {
  words?: Word[];
  sessions?: ReviewSession[];
  daily?: DailySnapshot[];
  settings?: Settings;
}

export class Repo {
  private queue: Promise<unknown> = Promise.resolve();
  /** Paquets à synchroniser → numéro de version (pour ne pas effacer une modification faite pendant un envoi). */
  private dirty = new Map<string, number>();
  private seq = 0;

  private mark(id: string) {
    this.dirty.set(id, ++this.seq);
  }
  readonly store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  /** Charge les données ; à la première ouverture, installe les 500 mots. */
  async load(now: number): Promise<AppData> {
    const [words, sessions, daily, settings, coreVersion, dirty, packVersion] = await Promise.all([
      this.store.getAllWords(),
      this.store.getAllSessions(),
      this.store.getAllDaily(),
      this.store.getMeta<Settings>('settings'),
      this.store.getMeta<number>('coreVersion'),
      this.store.getMeta<string[]>('dirty'),
      this.store.getMeta<number>('packVersion'),
    ]);
    (dirty ?? []).forEach((d) => this.mark(d));

    const toWrite: Word[] = [];
    // ajout des champs récents (suivi « produire », niveau) aux mots enregistrés par une ancienne version
    const byId = new Map(
      words.map((raw) => {
        const w = normalizeWord(raw);
        if (w !== raw) toWrite.push(w);
        return [w.id, w];
      }),
    );
    for (const entry of CORE_ENTRIES) {
      const existing = byId.get(entry.id);
      if (!existing) {
        const w = coreWord(entry, now);
        byId.set(w.id, w);
        toWrite.push(w);
      } else if ((coreVersion ?? 0) < CORE_VERSION) {
        // mise à jour des données de référence sans toucher à la progression
        // (le contenu modifié à la main est conservé)
        const meta = { rank: entry.rank, sourceRank: entry.sourceRank, freqPerMillion: entry.freqPerMillion, cefr: entry.cefr };
        const w = existing.edited ? { ...existing, ...meta } : { ...existing, ...coreContent(entry), ...meta };
        byId.set(w.id, w);
        if (!toWrite.includes(existing)) toWrite.push(w);
        else toWrite[toWrite.indexOf(existing)] = w;
      }
    }
    // paquets B1 → C1, phrasal verbs, expressions…
    for (const entry of PACK_ENTRIES) {
      const existing = byId.get(entry.id);
      if (!existing) {
        const w = packWord(entry, now);
        byId.set(w.id, w);
        toWrite.push(w);
      } else if ((packVersion ?? 0) < PACK_VERSION) {
        const w = existing.edited ? { ...existing, ...packMeta(entry) } : { ...existing, ...packContent(entry), ...packMeta(entry) };
        byId.set(w.id, w);
        const at = toWrite.indexOf(existing);
        if (at >= 0) toWrite[at] = w;
        else toWrite.push(w);
      }
    }
    if (toWrite.length || coreVersion !== CORE_VERSION || packVersion !== PACK_VERSION) {
      // les mots installés localement ne sont pas marqués à synchroniser :
      // chaque appareil possède déjà les mots de référence.
      await this.store.commit({ words: toWrite, meta: { coreVersion: CORE_VERSION, packVersion: PACK_VERSION } });
    }
    return {
      words: [...byId.values()],
      sessions,
      daily,
      settings: normalizeSettings(settings),
    };
  }

  /** Enregistre des modifications (en série, dans une transaction) et les marque à synchroniser. */
  save(changes: Changes, opts: { markDirty?: boolean } = {}): Promise<void> {
    const markDirty = opts.markDirty ?? true;
    const run = async () => {
      const batch: Batch = {
        words: changes.words,
        sessions: changes.sessions,
        daily: changes.daily,
        meta: {},
      };
      if (changes.settings) batch.meta!.settings = changes.settings;
      if (markDirty) {
        changes.words?.forEach((w) => this.mark(wordBucket(w.id)));
        changes.sessions?.forEach((s) => this.mark(sessionBucket(s)));
        changes.daily?.forEach((d) => this.mark(dailyBucket(d)));
        if (changes.settings) this.mark(SETTINGS_BUCKET);
        batch.meta!.dirty = [...this.dirty.keys()];
      }
      await this.store.commit(batch);
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /**
   * Écrit des enregistrements reçus d'un autre appareil, seulement s'ils sont
   * plus récents que la version locale actuelle (lue dans la même file
   * d'écriture : une réponse donnée pendant la synchronisation n'est jamais écrasée).
   */
  applyRemote(changes: Changes): Promise<Changes> {
    const run = async (): Promise<Changes> => {
      const [words, sessions, daily, settings] = await Promise.all([
        this.store.getAllWords(),
        this.store.getAllSessions(),
        this.store.getAllDaily(),
        this.store.getMeta<Settings>('settings'),
      ]);
      const newer = <T extends { id: string; updatedAt: number }>(incoming: T[] | undefined, current: T[]) => {
        const map = new Map(current.map((x) => [x.id, x.updatedAt]));
        return (incoming ?? []).filter((x) => x.updatedAt > (map.get(x.id) ?? -1));
      };
      const applied: Changes = {
        words: newer(changes.words?.map(normalizeWord), words),
        sessions: newer(changes.sessions, sessions),
        daily: newer(changes.daily, daily),
        settings:
          changes.settings && changes.settings.updatedAt > (settings?.updatedAt ?? 0) ? changes.settings : undefined,
      };
      const batch: Batch = { words: applied.words, sessions: applied.sessions, daily: applied.daily, meta: {} };
      if (applied.settings) batch.meta!.settings = applied.settings;
      await this.store.commit(batch);
      return applied;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Lecture cohérente pour une synchronisation : données + paquets à envoyer, au même instant. */
  readForSync(): Promise<{ local: AppData; dirty: Map<string, number> }> {
    const run = async () => {
      const [words, sessions, daily, settings] = await Promise.all([
        this.store.getAllWords(),
        this.store.getAllSessions(),
        this.store.getAllDaily(),
        this.store.getMeta<Settings>('settings'),
      ]);
      return {
        local: { words, sessions, daily, settings: normalizeSettings(settings) },
        dirty: new Map(this.dirty),
      };
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  getDirty(): string[] {
    return [...this.dirty.keys()];
  }

  /** Copie de l'état « à synchroniser » au début d'un envoi. */
  dirtySnapshot(): Map<string, number> {
    return new Map(this.dirty);
  }

  /**
   * Retire les paquets envoyés. Avec un instantané, un paquet modifié
   * pendant l'envoi reste marqué et partira au prochain envoi.
   */
  async clearDirty(ids: string[], snapshot?: Map<string, number>): Promise<void> {
    ids.forEach((id) => {
      if (!snapshot || this.dirty.get(id) === snapshot.get(id)) this.dirty.delete(id);
    });
    const run = () => this.store.commit({ meta: { dirty: [...this.dirty.keys()] } });
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    await p;
  }

  async markDirty(ids: string[]): Promise<void> {
    ids.forEach((id) => this.mark(id));
    const run = () => this.store.commit({ meta: { dirty: [...this.dirty.keys()] } });
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    await p;
  }

  getMeta<T>(key: string) {
    return this.store.getMeta<T>(key);
  }

  setMeta(key: string, value: unknown): Promise<void> {
    const run = () => this.store.commit({ meta: { [key]: value } });
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Attend la fin des écritures en cours. */
  flush(): Promise<unknown> {
    return this.queue;
  }
}
