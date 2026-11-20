/**
 * État global : chargement des données, actions (révision, ajout, réglages…),
 * sauvegarde locale immédiate et synchronisation en arrière-plan.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { answerCurrent, createSession, currentWordId, endSession, resumeSession } from '../domain/queue';
import { pickAhead, pickFromSelection, planNextSession } from '../domain/selection';
import { groupLabel } from '../data/themes';
import { makeSnapshot } from '../domain/stats';
import { newSrsState } from '../domain/srs';
import { applyAnswer, parseCard, stateOf } from '../domain/tracks';
import { uid } from '../domain/text';
import { buildLangIndex, type LangIndex } from '../domain/lang';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type DailySnapshot,
  type Grade,
  type ReviewSession,
  type Settings,
  type Word,
  type WordContent,
} from '../domain/types';
import { CORE_ENTRIES, coreContent } from '../data/core';
import { Repo, type Changes } from '../storage/repo';
import { openBestStore } from '../storage/store';
import { connectArtifactSync, type SyncTarget } from '../storage/sync/artifactSync';
import { runSync } from '../storage/sync/syncEngine';
import { capabilityErrorCode, inClaudeViewer } from '../services/claudeRuntime';

export type SyncState = 'checking' | 'unavailable' | 'disabled' | 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncInfo {
  state: SyncState;
  lastAt: number | null;
  message: string | null;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface AppValue {
  ready: boolean;
  loadError: string | null;
  storageKind: 'indexeddb' | 'memory';
  storageError: string | null;
  now: number;
  words: Word[];
  wordsById: Map<string, Word>;
  sessions: ReviewSession[];
  daily: DailySnapshot[];
  settings: Settings;
  langIndex: LangIndex;
  activeSession: ReviewSession | null;
  /** Dernière session terminée pendant cette visite (pour l'écran de bilan). */
  finishedSession: ReviewSession | null;
  sync: SyncInfo;
  toasts: Toast[];
  inClaude: boolean;
  online: boolean;
  // actions
  startDailySession(opts?: { ignoreNewLimit?: boolean; ahead?: boolean }): ReviewSession | null;
  startSession(ids: string[], label: string, selection?: { label: string; remainingIds: string[] } | null): ReviewSession | null;
  startFromWords(words: Word[], label: string): ReviewSession | null;
  continueSelection(from: ReviewSession): ReviewSession | null;
  answer(grade: Grade): void;
  resume(): void;
  endActive(): void;
  dismissFinished(): void;
  addWord(content: WordContent, extra?: { audioUrl?: string | null; audioAccent?: string | null }): Word;
  updateWord(id: string, content: Partial<WordContent>): void;
  resetWord(id: string): void;
  restoreCoreContent(id: string): void;
  deleteWord(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  applyImport(changes: Changes): Promise<void>;
  /** Enregistre les mots jugés connus au test de placement et marque le test comme fait. */
  applyPlacement(updated: Word[]): void;
  resetAllProgress(): Promise<void>;
  syncNow(): Promise<void>;
  toast(text: string, tone?: Toast['tone']): void;
  getRepoData(): { words: Word[]; sessions: ReviewSession[]; daily: DailySnapshot[]; settings: Settings };
}

const Ctx = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp hors du fournisseur');
  return v;
}

function upsert<T extends { id: string }>(list: T[], items: T[]): T[] {
  if (!items.length) return list;
  const map = new Map(list.map((x) => [x.id, x]));
  items.forEach((x) => map.set(x.id, x));
  return [...map.values()];
}

/** Ne garde qu'une session active : la plus récente ; les autres sont closes. */
function normalizeActive(sessions: ReviewSession[], now: number): { sessions: ReviewSession[]; closed: ReviewSession[] } {
  const actives = sessions.filter((s) => s.status === 'active' && !s.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
  const closed = actives.slice(1).map((s) => endSession(s, now));
  return { sessions: upsert(sessions, closed), closed };
}

/** Titre d'une session : « Nouvelle liste · pronoms, verbes essentiels ». */
export function sessionTitle(kind: 'review' | 'new' | 'produce', groups: string[]): string {
  const themes = groups.slice(0, 3).map(groupLabel).join(', ');
  const head = kind === 'review' ? 'Révision' : kind === 'new' ? 'Nouvelle liste' : 'À dire en anglais';
  return `${head}${themes ? ' · ' + themes : ''}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<Repo | null>(null);
  const syncTargetRef = useRef<SyncTarget | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storageKind, setStorageKind] = useState<'indexeddb' | 'memory'>('indexeddb');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [words, setWords] = useState<Word[]>([]);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [daily, setDaily] = useState<DailySnapshot[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [finishedSession, setFinished] = useState<ReviewSession | null>(null);
  const [sync, setSync] = useState<SyncInfo>({ state: 'checking', lastAt: null, message: null });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));

  // références à jour pour les callbacks asynchrones
  const stateRef = useRef({ words, sessions, daily, settings });
  stateRef.current = { words, sessions, daily, settings };

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const persist = useCallback(
    (changes: Changes) => {
      const repo = repoRef.current;
      if (!repo) return;
      repo.save(changes).catch((e) => {
        console.error(e);
        toast('Enregistrement local impossible. Exporte tes données par sécurité (Paramètres).', 'error');
      });
      scheduleSync();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast],
  );

  // ---------- synchronisation ----------
  const doSync = useCallback(
    async (manual = false) => {
      const repo = repoRef.current;
      const target = syncTargetRef.current;
      if (!repo || !target || syncing.current) return;
      if (!stateRef.current.settings.syncEnabled) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSync((s) => ({ ...s, state: 'offline', message: 'Hors ligne : la synchronisation reprendra au retour du réseau.' }));
        return;
      }
      syncing.current = true;
      setSync((s) => ({ ...s, state: 'syncing', message: null }));
      try {
        const out = await runSync(target, repo, Date.now());
        const { words: pw, sessions: ps, daily: pd, settings: pset } = out.pulled;
        if (pw.length) setWords((cur) => upsert(cur, pw.filter((w) => w.updatedAt > (cur.find((c) => c.id === w.id)?.updatedAt ?? -1))));
        if (ps.length) {
          setSessions((cur) => {
            const merged = upsert(cur, ps.filter((s) => s.updatedAt > (cur.find((c) => c.id === s.id)?.updatedAt ?? -1)));
            const n = normalizeActive(merged, Date.now());
            if (n.closed.length) repo.save({ sessions: n.closed }).catch(() => undefined);
            return n.sessions;
          });
        }
        if (pd.length) setDaily((cur) => upsert(cur, pd));
        if (pset) setSettings((cur) => (pset.updatedAt > cur.updatedAt ? normalizeSettings(pset) : cur));
        setSync({ state: 'idle', lastAt: out.at, message: null });
        if (manual) toast('Synchronisation terminée.', 'success');
      } catch (e) {
        const code = capabilityErrorCode(e);
        const message =
          code === 'quota_exceeded'
            ? 'Espace de synchronisation plein. Exporte puis réinitialise les anciennes sessions.'
            : code === 'revoked' || code === 'not_granted'
              ? 'Accès à la synchronisation retiré pour cette page.'
              : 'Synchronisation impossible pour le moment. Tes données restent enregistrées sur cet appareil.';
        setSync((s) => ({ ...s, state: 'error', message }));
        if (manual) toast(message, 'error');
      } finally {
        syncing.current = false;
      }
    },
    [toast],
  );

  const scheduleSync = useCallback(() => {
    if (!syncTargetRef.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void doSync(false), 4000);
  }, [doSync]);

  // ---------- chargement ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { store, error } = await openBestStore();
        if (cancelled) return;
        setStorageKind(store.kind);
        setStorageError(error);
        const repo = new Repo(store);
        repoRef.current = repo;
        const t = Date.now();
        const data = await repo.load(t);
        const n = normalizeActive(data.sessions, t);
        if (n.closed.length) await repo.save({ sessions: n.closed });
        setWords(data.words);
        setSessions(n.sessions);
        setDaily(data.daily);
        setSettings(data.settings);
        const lastAt = (await repo.getMeta<number>('lastSyncAt')) ?? null;
        setReady(true);
        // synchronisation (claude.ai uniquement)
        if (!inClaudeViewer()) {
          setSync({ state: 'unavailable', lastAt: null, message: null });
          return;
        }
        const target = await connectArtifactSync();
        if (cancelled) return;
        if (!target) {
          setSync({ state: 'unavailable', lastAt, message: 'Connecte-toi à claude.ai pour synchroniser tes appareils.' });
          return;
        }
        syncTargetRef.current = target;
        setSync({ state: data.settings.syncEnabled ? 'idle' : 'disabled', lastAt, message: null });
        if (data.settings.syncEnabled) void doSync(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doSync]);

  // horloge (états « à revoir aujourd'hui », passage à minuit)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const up = () => {
      setOnline(true);
      void doSync(false);
    };
    const down = () => setOnline(false);
    const vis = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
        if (syncTargetRef.current) void doSync(false);
      }
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [doSync]);

  // thème
  useEffect(() => {
    document.documentElement.setAttribute('data-app-theme', settings.theme);
  }, [settings.theme]);

  // ---------- dérivés ----------
  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const langIndex = useMemo(() => buildLangIndex(words), [words]);
  const activeSession = useMemo(
    () => sessions.filter((s) => s.status === 'active' && !s.deleted).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null,
    [sessions],
  );

  // ---------- sessions ----------
  const startSession = useCallback(
    (ids: string[], label: string, selection: { label: string; remainingIds: string[] } | null = null) => {
      const t = Date.now();
      const valid = ids.filter((id) => {
        const w = wordsById.get(parseCard(id).wordId);
        return !!w && !w.deleted;
      });
      if (!valid.length) return null;
      const closed = activeSession ? [endSession(activeSession, t)] : [];
      const s = createSession(valid, { id: uid('s'), now: t, label, selection });
      setSessions((cur) => upsert(cur, [...closed, s]));
      setFinished(null);
      persist({ sessions: [...closed, s] });
      return s;
    },
    [wordsById, activeSession, persist],
  );

  const startDailySession = useCallback(
    (opts: { ignoreNewLimit?: boolean; ahead?: boolean } = {}) => {
      const t = Date.now();
      if (opts.ahead) return startSession(pickAhead(words, t, settings.sessionSize), 'Révision anticipée');
      const plan = planNextSession(words, t, {
        size: settings.sessionSize,
        newPerDay: settings.newPerDay,
        ignoreNewLimit: opts.ignoreNewLimit,
      });
      if (plan.kind === 'done') return null;
      return startSession(plan.ids, sessionTitle(plan.kind, plan.groups));
    },
    [words, settings.sessionSize, settings.newPerDay, startSession],
  );

  const startFromWords = useCallback(
    (list: Word[], label: string) => {
      const { ids, remaining } = pickFromSelection(list, Date.now(), settings.sessionSize);
      return startSession(ids, label, remaining.length ? { label, remainingIds: remaining } : null);
    },
    [settings.sessionSize, startSession],
  );

  const continueSelection = useCallback(
    (from: ReviewSession) => {
      if (!from.selection) return null;
      const list = from.selection.remainingIds.map((id) => wordsById.get(id)).filter((w): w is Word => !!w && !w.deleted);
      return startFromWords(list, from.selection.label);
    },
    [wordsById, startFromWords],
  );

  const lastAnswerKey = useRef('');
  const answer = useCallback(
    (grade: Grade) => {
      const s = activeSession;
      if (!s) return;
      // un double appui ne doit pas compter deux réponses
      const key = `${s.id}:${s.answers.length}`;
      if (lastAnswerKey.current === key) return;
      lastAnswerKey.current = key;
      const key0 = currentWordId(s);
      if (!key0) return;
      const { wordId, track } = parseCard(key0);
      const w = wordsById.get(wordId);
      const t = Date.now();
      if (!w) {
        // mot supprimé entre-temps : on passe simplement à la carte suivante
        const next = answerCurrent(s, 'good', t, 0);
        setSessions((cur) => upsert(cur, [next]));
        if (next.status !== 'active') setFinished(next);
        persist({ sessions: [next] });
        return;
      }
      const updated = applyAnswer(w, track, grade, t);
      const next = answerCurrent(s, grade, t, stateOf(updated, track).interval);
      const nextWords = words.map((x) => (x.id === updated.id ? updated : x));
      const snap = makeSnapshot(nextWords, t);
      setWords(nextWords);
      setSessions((cur) => upsert(cur, [next]));
      setDaily((cur) => upsert(cur, [snap]));
      if (next.status !== 'active') setFinished(next);
      persist({ words: [updated], sessions: [next], daily: [snap] });
    },
    [activeSession, wordsById, words, persist],
  );

  const resume = useCallback(() => {
    if (!activeSession) return;
    const r = resumeSession(activeSession, Date.now());
    setSessions((cur) => upsert(cur, [r]));
    persist({ sessions: [r] });
  }, [activeSession, persist]);

  const endActive = useCallback(() => {
    if (!activeSession) return;
    const e = endSession(activeSession, Date.now());
    setSessions((cur) => upsert(cur, [e]));
    if (e.answers.length) setFinished(e);
    persist({ sessions: [e] });
  }, [activeSession, persist]);

  const dismissFinished = useCallback(() => setFinished(null), []);

  // ---------- mots ----------
  const addWord = useCallback(
    (content: WordContent, extra: { audioUrl?: string | null; audioAccent?: string | null } = {}) => {
      const t = Date.now();
      const w: Word = {
        ...content,
        id: uid('u'),
        source: 'user',
        rank: null,
        sourceRank: null,
        freqPerMillion: null,
        audioUrl: extra.audioUrl ?? null,
        audioAccent: extra.audioAccent ?? null,
        addedAt: t,
        updatedAt: t,
        edited: false,
        deleted: false,
        cefr: null,
        srs: newSrsState(),
        prod: newSrsState(),
      };
      setWords((cur) => [...cur, w]);
      persist({ words: [w] });
      return w;
    },
    [persist],
  );

  const mutateWord = useCallback(
    (id: string, fn: (w: Word) => Word) => {
      const w = stateRef.current.words.find((x) => x.id === id);
      if (!w) return;
      const updated = { ...fn(w), updatedAt: Date.now() };
      setWords((cur) => cur.map((x) => (x.id === id ? updated : x)));
      persist({ words: [updated] });
    },
    [persist],
  );

  const updateWord = useCallback(
    (id: string, content: Partial<WordContent>) => mutateWord(id, (w) => ({ ...w, ...content, edited: true })),
    [mutateWord],
  );
  const resetWord = useCallback((id: string) => mutateWord(id, (w) => ({ ...w, srs: newSrsState(), prod: newSrsState() })), [mutateWord]);
  const restoreCoreContent = useCallback(
    (id: string) => {
      const entry = CORE_ENTRIES.find((e) => e.id === id);
      if (entry) mutateWord(id, (w) => ({ ...w, ...coreContent(entry), edited: false }));
    },
    [mutateWord],
  );
  const deleteWord = useCallback(
    (id: string) => mutateWord(id, (w) => (w.source === 'user' ? { ...w, deleted: true } : { ...w, srs: newSrsState(), prod: newSrsState() })),
    [mutateWord],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...stateRef.current.settings, ...patch, updatedAt: Date.now() };
      setSettings(next);
      persist({ settings: next });
      if ('syncEnabled' in patch && syncTargetRef.current) {
        setSync((s) => ({ ...s, state: patch.syncEnabled ? 'idle' : 'disabled' }));
        if (patch.syncEnabled) setTimeout(() => void doSync(false), 100);
      }
    },
    [persist, doSync],
  );

  const applyImport = useCallback(
    async (changes: Changes) => {
      const repo = repoRef.current;
      if (!repo) return;
      await repo.save(changes);
      if (changes.words?.length) setWords((cur) => upsert(cur, changes.words!));
      if (changes.sessions?.length) setSessions((cur) => upsert(cur, changes.sessions!));
      if (changes.daily?.length) setDaily((cur) => upsert(cur, changes.daily!));
      if (changes.settings) setSettings(normalizeSettings(changes.settings));
      scheduleSync();
    },
    [scheduleSync],
  );

  const applyPlacement = useCallback(
    (updated: Word[]) => {
      const t = Date.now();
      const map = new Map(updated.map((w) => [w.id, w]));
      const nextSettings = { ...stateRef.current.settings, placementDone: true, updatedAt: t };
      setWords((cur) => cur.map((w) => map.get(w.id) ?? w));
      setSettings(nextSettings);
      persist({ words: updated, settings: nextSettings });
    },
    [persist],
  );

  const resetAllProgress = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) return;
    const t = Date.now();
    const cur = stateRef.current;
    const resetWords = cur.words
      .filter((w) => w.srs.reps > 0 || w.prod.reps > 0 || w.srs.origin)
      .map((w) => ({ ...w, srs: newSrsState(), prod: newSrsState(), updatedAt: t }));
    const delSessions = cur.sessions.filter((s) => !s.deleted).map((s) => ({ ...s, deleted: true, status: 'completed' as const, updatedAt: t }));
    const delDaily = cur.daily.filter((d) => !d.deleted).map((d) => ({ ...d, deleted: true, updatedAt: t }));
    const nextSettings = { ...cur.settings, placementDone: false, updatedAt: t };
    await repo.save({ words: resetWords, sessions: delSessions, daily: delDaily, settings: nextSettings });
    setSettings(nextSettings);
    setWords((w) => upsert(w, resetWords));
    setSessions((s) => upsert(s, delSessions));
    setDaily((d) => upsert(d, delDaily));
    setFinished(null);
    scheduleSync();
  }, [scheduleSync]);

  const syncNow = useCallback(() => doSync(true), [doSync]);

  const getRepoData = useCallback(() => stateRef.current, []);

  const value: AppValue = {
    ready,
    loadError,
    storageKind,
    storageError,
    now,
    words,
    wordsById,
    sessions,
    daily,
    settings,
    langIndex,
    activeSession,
    finishedSession,
    sync,
    toasts,
    inClaude: inClaudeViewer(),
    online,
    startDailySession,
    startSession,
    startFromWords,
    continueSelection,
    answer,
    resume,
    endActive,
    dismissFinished,
    addWord,
    updateWord,
    resetWord,
    restoreCoreContent,
    deleteWord,
    updateSettings,
    applyImport,
    applyPlacement,
    resetAllProgress,
    syncNow,
    toast,
    getRepoData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
