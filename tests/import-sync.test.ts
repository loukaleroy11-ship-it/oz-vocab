import { describe, expect, it } from 'vitest';
import { answerCurrent, createSession } from '../src/domain/queue';
import { schedule } from '../src/domain/srs';
import { DEFAULT_SETTINGS, type Word } from '../src/domain/types';
import { analyzeImport, buildCsv, buildExport, planImport } from '../src/storage/importExport';
import type { AppData } from '../src/storage/repo';
import { mergeItems } from '../src/storage/sync/merge';
import { NOW, allCore, makeWord } from './helpers';

function appData(words: Word[] = allCore()): AppData {
  return { words, sessions: [], daily: [], settings: { ...DEFAULT_SETTINGS } };
}

describe('export / import', () => {
  it('aller-retour JSON sans perte', () => {
    const words = allCore();
    words[5].srs = schedule(words[5].srs, 'good', NOW);
    words[5].updatedAt = NOW;
    const user = makeWord('u1', { en: 'brave', fr: 'courageux', updatedAt: NOW });
    let s = createSession([words[5].id], { id: 'sess', now: NOW, label: 'x' });
    s = answerCurrent(s, 'good', NOW + 1, 1);
    const src: AppData = { ...appData([...words, user]), sessions: [s] };
    const file = JSON.stringify(buildExport(src, NOW));

    const target = appData();
    const a = analyzeImport(file, target);
    expect(a.ok).toBe(true);
    expect(a.errors).toEqual([]);
    expect(a.newWords).toBe(1);
    expect(a.sameId).toBe(500);
    expect(a.newSessions).toBe(1);
    const changes = planImport(a, target, 'newest', NOW + 10);
    expect(changes.words!.map((w) => w.id).sort()).toEqual([words[5].id, 'u1'].sort());
    expect(changes.sessions).toHaveLength(1);
  });

  it('refuse un fichier invalide avec un message clair', () => {
    expect(analyzeImport('pas du json', appData()).fatal).toMatch(/JSON valide/);
    expect(analyzeImport('{"app":"autre"}', appData()).fatal).toMatch(/Oz Vocab/);
    const bad = analyzeImport(
      JSON.stringify({ app: 'oz-vocab', schema: 1, words: [{ id: 'x', en: '', fr: 'a', pos: 'noun' }, { id: 'y', en: 'ok', fr: 'b', pos: 'zzz' }, { id: 'z', en: 'fine', fr: 'bien', pos: 'adjective' }] }),
      appData(),
    );
    expect(bad.ok).toBe(true);
    expect(bad.errors).toHaveLength(2);
    expect(bad.words).toHaveLength(1);
  });

  it('gestion des doublons selon la stratégie', () => {
    const local = appData([...allCore(), makeWord('u-local', { en: 'brave', fr: 'courageux', updatedAt: NOW })]);
    const incoming = makeWord('u-other', { en: 'Brave', fr: 'vaillant', updatedAt: NOW + 5 });
    const file = JSON.stringify({ app: 'oz-vocab', schema: 1, words: [incoming] });
    const a = analyzeImport(file, local);
    expect(a.sameEnglish).toBe(1);
    expect(planImport(a, local, 'newest', NOW + 10).words).toHaveLength(0);
    expect(planImport(a, local, 'keep-local', NOW + 10).words).toHaveLength(0);
    const replaced = planImport(a, local, 'replace', NOW + 10).words!;
    expect(replaced.find((w) => w.id === 'u-local')!.deleted).toBe(true);
    expect(replaced.find((w) => w.id === 'u-other')!.fr).toBe('vaillant');
  });

  it('CSV lisible par Excel (BOM, point-virgule, guillemets échappés)', () => {
    const csv = buildCsv([makeWord('u', { en: 'say "hi"', fr: 'dire ; saluer' })], NOW);
    expect(csv.startsWith('﻿anglais;')).toBe(true);
    expect(csv).toContain('"say ""hi"""');
    expect(csv).toContain('"dire ; saluer"');
  });
});

describe('fusion pour la synchronisation', () => {
  it('le plus récent gagne, enregistrement par enregistrement', () => {
    const local = [
      { id: 'a', updatedAt: 10, v: 'local-a' },
      { id: 'b', updatedAt: 5, v: 'local-b' },
      { id: 'c', updatedAt: 7, v: 'local-c' },
    ];
    const remote = {
      a: { id: 'a', updatedAt: 3, v: 'remote-a' },
      b: { id: 'b', updatedAt: 9, v: 'remote-b' },
      d: { id: 'd', updatedAt: 1, v: 'remote-d' },
    };
    const r = mergeItems(local, remote);
    expect(r.merged.a.v).toBe('local-a');
    expect(r.merged.b.v).toBe('remote-b');
    expect(r.merged.c.v).toBe('local-c');
    expect(r.merged.d.v).toBe('remote-d');
    expect(r.pullToLocal.map((x) => x.id).sort()).toEqual(['b', 'd']);
    expect(r.remoteNeedsWrite).toBe(true);
  });

  it('rien à écrire si le distant est déjà à jour', () => {
    const r = mergeItems([{ id: 'a', updatedAt: 3 }], { a: { id: 'a', updatedAt: 3 } });
    expect(r.remoteNeedsWrite).toBe(false);
    expect(r.pullToLocal).toHaveLength(0);
  });
});
