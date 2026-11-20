import { PACK_ENTRIES } from '../src/data/packs';
import { describe, expect, it } from 'vitest';
import { answerCurrent, createSession } from '../src/domain/queue';
import { schedule } from '../src/domain/srs';
import type { DbApi, DbCollectionRef, DbDocRef, DbQuery } from '../src/services/claudeRuntime';
import { Repo } from '../src/storage/repo';
import { createMemoryStore } from '../src/storage/store';
import { createArtifactTarget } from '../src/storage/sync/artifactSync';
import { runSync } from '../src/storage/sync/syncEngine';
import { NOW, makeWord } from './helpers';

/** Base de données distante simulée (même contrat que la capacité `db`). */
function fakeDb(): DbApi & { docs: Map<string, Record<string, unknown>>; writes: number } {
  const docs = new Map<string, Record<string, unknown>>();
  const state = { writes: 0 };
  const snap = (path: string) => {
    const body = docs.get(path);
    return { id: path.split('/').pop()!, exists: !!body, data: () => (body ? JSON.parse(JSON.stringify(body)) : undefined) };
  };
  function query(col: string, filters: Array<[string, string, unknown]>, lim = 1000): DbQuery {
    return {
      where: (f, op, v) => query(col, [...filters, [f, op, v]], lim),
      orderBy: () => query(col, filters, lim),
      limit: (n) => query(col, filters, n),
      async get() {
        const out = [...docs.entries()]
          .filter(([p]) => p.startsWith(col + '/') && p.split('/').length === col.split('/').length + 1)
          .filter(([, b]) =>
            filters.every(([f, op, v]) => {
              const x = b[f] as number | string;
              if (op === '==') return x === v;
              if (op === '>') return (x as number) > (v as number);
              throw new Error('op non simulée ' + op);
            }),
          )
          .slice(0, lim)
          .map(([p]) => snap(p));
        return { docs: out };
      },
    };
  }
  const docRef = (path: string): DbDocRef => ({
    id: path.split('/').pop()!,
    get: async () => snap(path),
    set: async (data) => {
      const size = JSON.stringify(data).length;
      if (size > 256 * 1024) throw { code: 'invalid_argument', message: 'trop gros' };
      state.writes++;
      docs.set(path, JSON.parse(JSON.stringify(data)));
    },
    delete: async () => void docs.delete(path),
  });
  return {
    docs,
    get writes() {
      return state.writes;
    },
    doc: docRef,
    collection: (path: string): DbCollectionRef => ({ ...query(path, []), doc: (id: string) => docRef(`${path}/${id}`) }),
  };
}

async function device(now: number) {
  const repo = new Repo(createMemoryStore());
  const data = await repo.load(now);
  return { repo, data };
}

describe('synchronisation entre deux appareils', () => {
  it('la progression faite sur l’iPhone apparaît sur l’ordinateur', async () => {
    const db = fakeDb();
    const target = createArtifactTarget(db, 'data/users/u123');
    const phone = await device(NOW);
    const laptop = await device(NOW + 60_000); // installé plus tard : ne doit pas écraser la progression

    // révision sur le téléphone
    const w = phone.data.words.find((x) => x.en === 'house')!;
    const updated = { ...w, srs: schedule(w.srs, 'good', NOW + 120_000), updatedAt: NOW + 120_000 };
    let s = createSession([w.id], { id: 'sess-phone', now: NOW + 100_000, label: 'Révision du jour' });
    s = answerCurrent(s, 'good', NOW + 120_000, updated.srs.interval);
    const brave = makeWord('u-brave', { en: 'brave', fr: 'courageux', updatedAt: NOW + 130_000 });
    await phone.repo.save({ words: [updated, brave], sessions: [s] });
    const r1 = await runSync(target, phone.repo, NOW + 140_000);
    expect(r1.pushed.length).toBeGreaterThan(0);
    expect(phone.repo.getDirty()).toHaveLength(0);
    // seuls les paquets modifiés sont écrits (pas les 500 mots de référence)
    const wordDocs = [...db.docs.keys()].filter((k) => k.includes('/w-'));
    expect(wordDocs.length).toBeLessThanOrEqual(2);

    // l'ordinateur récupère
    const r2 = await runSync(target, laptop.repo, NOW + 200_000);
    expect(r2.pulled.words.map((x) => x.id).sort()).toEqual([w.id, 'u-brave'].sort());
    expect(r2.pulled.sessions.map((x) => x.id)).toEqual(['sess-phone']);
    const laptopWords = await laptop.repo.store.getAllWords();
    expect(laptopWords.find((x) => x.id === w.id)!.srs.reps).toBe(1);
    expect(laptopWords).toHaveLength(501 + PACK_ENTRIES.length);
  });

  it('conflit : la modification la plus récente l’emporte, sans perte de l’autre appareil', async () => {
    const db = fakeDb();
    const target = createArtifactTarget(db, 'data/users/u1');
    const a = await device(NOW);
    const b = await device(NOW);
    const [w1, w2] = a.data.words;
    const a1 = { ...w1, fr: 'version A', edited: true, updatedAt: NOW + 10 };
    const b1 = { ...w1, fr: 'version B (plus récente)', edited: true, updatedAt: NOW + 20 };
    const b2 = { ...w2, srs: schedule(w2.srs, 'again', NOW + 30), updatedAt: NOW + 30 };
    await a.repo.save({ words: [a1] });
    await b.repo.save({ words: [b1, b2] });
    await runSync(target, a.repo, NOW + 40);
    await runSync(target, b.repo, NOW + 50);
    await runSync(target, a.repo, NOW + 60);
    const aw = await a.repo.store.getAllWords();
    expect(aw.find((x) => x.id === w1.id)!.fr).toBe('version B (plus récente)');
    expect(aw.find((x) => x.id === w2.id)!.srs.incorrect).toBe(1);
  });

  it('une réponse donnée pendant la synchronisation n’est jamais écrasée', async () => {
    const db = fakeDb();
    const target = createArtifactTarget(db, 'data/users/u2');
    const other = await device(NOW);
    const me = await device(NOW);
    const w = other.data.words[0];
    const old = { ...w, srs: schedule(w.srs, 'again', NOW + 10), updatedAt: NOW + 10 };
    await other.repo.save({ words: [old] });
    await runSync(target, other.repo, NOW + 20);
    // sur mon appareil, je réponds pendant que la synchro tourne
    const fresh = { ...w, srs: schedule(w.srs, 'good', NOW + 30), updatedAt: NOW + 30 };
    const syncing = runSync(target, me.repo, NOW + 35);
    await me.repo.save({ words: [fresh] });
    await syncing;
    const mine = (await me.repo.store.getAllWords()).find((x) => x.id === w.id)!;
    expect(mine.updatedAt).toBe(NOW + 30);
    expect(mine.srs.lastGrade).toBe('good');
    // au plus tard au prochain envoi, la réponse récente est partagée
    await runSync(target, me.repo, NOW + 40);
    await runSync(target, other.repo, NOW + 50);
    const theirs = (await other.repo.store.getAllWords()).find((x) => x.id === w.id)!;
    expect(theirs.srs.lastGrade).toBe('good');
    expect(me.repo.getDirty()).toHaveLength(0);
  });
});
