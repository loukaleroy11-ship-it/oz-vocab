import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { answerCurrent, createSession } from '../src/domain/queue';
import { schedule } from '../src/domain/srs';
import type { Word } from '../src/domain/types';
import { Repo } from '../src/storage/repo';
import { createMemoryStore, openIndexedDbStore } from '../src/storage/store';
import { wordBucket } from '../src/storage/buckets';
import { NOW, makeWord } from './helpers';

let n = 0;
const freshName = () => `test-db-${++n}-${Math.random()}`;

describe('stockage IndexedDB', () => {
  it('installe les 500 mots à la première ouverture', async () => {
    const repo = new Repo(await openIndexedDbStore(freshName()));
    const data = await repo.load(NOW);
    expect(data.words).toHaveLength(500);
    expect(data.sessions).toHaveLength(0);
    expect(data.settings.sessionSize).toBe(10);
    expect(data.settings.theme).toBe('light');
    // les mots de référence ne sont pas à synchroniser tant qu'ils ne changent pas
    expect(repo.getDirty()).toHaveLength(0);
  });

  it('conserve la progression après « rechargement » (nouvelle connexion à la base)', async () => {
    const name = freshName();
    const store1 = await openIndexedDbStore(name);
    const repo1 = new Repo(store1);
    const data = await repo1.load(NOW);
    const w = data.words.find((x) => x.en === 'house')!;
    const updated: Word = { ...w, srs: schedule(w.srs, 'good', NOW), updatedAt: NOW };
    let s = createSession([w.id, data.words[0].id], { id: 'sess-1', now: NOW, label: 'Révision du jour' });
    s = answerCurrent(s, 'good', NOW + 5000, updated.srs.interval);
    const added = makeWord('u-brave', { en: 'brave', fr: 'courageux', pos: 'adjective' });
    await repo1.save({ words: [updated, added], sessions: [s], settings: { ...data.settings, sessionSize: 15, updatedAt: NOW } });
    store1.close();

    const repo2 = new Repo(await openIndexedDbStore(name));
    const again = await repo2.load(NOW + 1000);
    expect(again.words).toHaveLength(501);
    expect(again.words.find((x) => x.en === 'house')!.srs.reps).toBe(1);
    expect(again.words.find((x) => x.id === 'u-brave')!.fr).toBe('courageux');
    expect(again.sessions[0].answers).toHaveLength(1);
    expect(again.sessions[0].queue).toEqual([data.words[0].id]); // session interrompue récupérable
    expect(again.settings.sessionSize).toBe(15);
    expect(repo2.getDirty()).toEqual(expect.arrayContaining([wordBucket(w.id), 'settings']));
  });

  it('écritures sérialisées : aucune perte quand plusieurs enregistrements se suivent vite', async () => {
    const repo = new Repo(createMemoryStore());
    const data = await repo.load(NOW);
    const ops = data.words.slice(0, 50).map((w, i) =>
      repo.save({ words: [{ ...w, srs: schedule(w.srs, 'good', NOW + i), updatedAt: NOW + i }] }),
    );
    await Promise.all(ops);
    const reloaded = await repo.store.getAllWords();
    expect(reloaded.filter((w) => w.srs.reps === 1)).toHaveLength(50);
  });

  it('nettoie la liste des paquets synchronisés', async () => {
    const repo = new Repo(createMemoryStore());
    const data = await repo.load(NOW);
    await repo.save({ words: [{ ...data.words[0], updatedAt: NOW }] });
    const dirty = repo.getDirty();
    expect(dirty).toHaveLength(1);
    await repo.clearDirty(dirty);
    expect(repo.getDirty()).toHaveLength(0);
    expect(await repo.store.getMeta<string[]>('dirty')).toEqual([]);
  });
});
