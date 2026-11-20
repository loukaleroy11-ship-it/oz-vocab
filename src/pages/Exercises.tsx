import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { RecordCompare } from '../components/RecordCompare';
import { SpeakChip } from '../components/SpeakChip';
import { Notice, PageHeader, Segmented } from '../components/ui';
import {
  NATURAL,
  QUICK,
  REPHRASE,
  RIGHT_WORD,
  SELF_CHECK,
  SENTENCE_TASKS,
  SITUATIONS,
  STORIES,
  type ExLevel,
  type Situation,
  type SituationTheme,
} from '../data/exercises';
import { LETTERS, NONE_OPTION } from '../domain/placement';
import { PRACTICE_LEVELS, pickItems, type PracticeKind } from '../domain/practice';
import { isRecognized } from '../domain/tracks';
import type { Word } from '../domain/types';
import { navigate } from '../router';
import { checkGrammar, type GrammarIssue } from '../services/grammar';
import { lookupDictionary } from '../services/speech';
import { useApp } from '../state/AppContext';
import { setAddPrefill } from './AddWord';

// ---------------------------------------------------------------- éléments communs

export function LevelPicker() {
  const { settings, updateSettings } = useApp();
  return (
    <Segmented<ExLevel>
      label="Niveau des exercices"
      value={settings.practiceLevel}
      onChange={(v) => updateSettings({ practiceLevel: v })}
      options={PRACTICE_LEVELS.map((l) => ({ value: l, label: l }))}
    />
  );
}

function Frame({ title, intro, children, step }: { title: string; intro: string; children: ReactNode; step?: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader eyebrow="S’exprimer" title={title}>
        <a href="#exprimer" className="btn btn-ghost min-h-11 text-sm">
          <Icon name="chevronLeft" size={18} /> Exercices
        </a>
      </PageHeader>
      <div className="-mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-ink-2">{intro}</p>
        <LevelPicker />
      </div>
      {step && <p className="tabular text-sm font-bold text-ink-2">{step}</p>}
      {children}
    </div>
  );
}

/** Réponse à l'oral (avec enregistrement facultatif) ou à l'écrit (avec correcteur gratuit). */
function Answer({ resetKey, onWritten }: { resetKey: string; onWritten?: (text: string) => void }) {
  const { settings, updateSettings, online } = useApp();
  const [text, setText] = useState('');
  const [issues, setIssues] = useState<GrammarIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    setText('');
    setIssues(null);
    setError(null);
  }, [resetKey]);

  const check = async () => {
    if (!text.trim()) return;
    setChecking(true);
    setError(null);
    try {
      setIssues(await checkGrammar(text.trim()));
    } catch (e) {
      setIssues(null);
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Segmented
        label="Répondre"
        value={settings.prodMode}
        onChange={(v) => updateSettings({ prodMode: v })}
        options={[
          { value: 'oral', label: 'À l’oral' },
          { value: 'written', label: 'À l’écrit' },
        ]}
      />
      {settings.prodMode === 'oral' ? (
        <>
          <p className="text-sm text-muted">Réponds à voix haute. Tu peux t’enregistrer pour te réécouter.</p>
          <RecordCompare key={resetKey} />
        </>
      ) : (
        <>
          <label className="sr-only" htmlFor="ex-answer">
            Ta réponse
          </label>
          <textarea
            id="ex-answer"
            className="field min-h-24"
            lang="en"
            spellCheck={false}
            autoCapitalize="sentences"
            placeholder="Écris ta réponse en anglais"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onWritten?.(e.target.value);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => void check()} disabled={!text.trim() || checking || !online}>
              <Icon name="check" size={18} /> {checking ? 'Vérification…' : 'Vérifier la grammaire'}
            </button>
            <span className="text-xs text-muted">{online ? 'Correcteur gratuit LanguageTool : ton texte lui est envoyé.' : 'Correcteur indisponible hors ligne.'}</span>
          </div>
          {error && <p className="text-sm text-coral">{error}</p>}
          {issues && issues.length === 0 && <p className="text-sm font-bold text-gum">Aucune faute détectée par le correcteur.</p>}
          {issues && issues.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {issues.map((i, k) => (
                <li key={k} className="rounded-xl bg-coral-soft/60 px-3 py-2">
                  <strong lang="en">« {i.excerpt} »</strong> {i.replacements.length > 0 && <>→ <strong lang="en">{i.replacements.join(' / ')}</strong></>}
                  <span className="block text-xs text-ink-2" lang="en">
                    {i.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function SelfScore({ onScore, checklist = false }: { onScore: (success: boolean) => void; checklist?: boolean }) {
  const [checked, setChecked] = useState<boolean[]>(SELF_CHECK.map(() => false));
  const score = checked.filter(Boolean).length;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <p className="font-bold">Ton auto-évaluation</p>
      {checklist && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {SELF_CHECK.map((c, i) => (
            <li key={c}>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={checked[i]} onChange={(e) => setChecked((cur) => cur.map((x, k) => (k === i ? e.target.checked : x)))} />
                {c}
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn h-14 bg-coral-soft text-coral" onClick={() => onScore(false)}>
          À retravailler
        </button>
        <button type="button" className="btn h-14 bg-gum text-white" onClick={() => onScore(checklist ? score >= 2 : true)}>
          {checklist ? `Valider (${score}/3)` : 'Réussi'}
        </button>
      </div>
      {checklist && <p className="text-xs text-muted">Réussi si tu coches au moins 2 critères sur 3.</p>}
    </div>
  );
}

function Done({ title, results, onAgain }: { title: string; results: boolean[]; onAgain: () => void }) {
  const ok = results.filter(Boolean).length;
  return (
    <div className="card flex flex-col items-start gap-3 p-5">
      <p className="text-lg">
        <strong className="tabular">
          {ok} / {results.length}
        </strong>{' '}
        réussi{ok > 1 ? 's' : ''} · {title}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={onAgain}>
          <Icon name="refresh" size={20} /> Une autre série
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('exprimer')}>
          Autres exercices
        </button>
      </div>
    </div>
  );
}

/** Série d'éléments : avance, enregistre chaque résultat dans le journal. */
function useSeries<T extends { id: string; level: ExLevel }>(items: T[], n: number, kind: PracticeKind) {
  const { settings, logPractice } = useApp();
  const [seed, setSeed] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => pickItems(items, settings.practiceLevel, n), [items, settings.practiceLevel, n, seed]);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  useEffect(() => {
    setI(0);
    setResults([]);
  }, [list]);
  const score = (success: boolean) => {
    const item = list[i];
    if (item) logPractice([{ kind, itemId: item.id, level: item.level, success }]);
    setResults((r) => [...r, success]);
    setI((x) => x + 1);
  };
  return { list, i, cur: list[i] as T | undefined, done: i >= list.length, results, score, again: () => setSeed((s) => s + 1) };
}

// ---------------------------------------------------------------- 1. Phrase avec le mot

export function ExPhrase() {
  const { words, settings, logPractice, online } = useApp();
  const pool = useMemo(
    () =>
      words
        .filter((w) => !w.deleted && isRecognized(w) && w.srs.origin !== 'placement')
        .sort((a, b) => (b.srs.lastReviewed ?? b.srs.firstSeen ?? 0) - (a.srs.lastReviewed ?? a.srs.firstSeen ?? 0))
        .slice(0, 30),
    [words],
  );
  const [seed, setSeed] = useState(0);
  const list = useMemo(() => {
    const a = [...pool];
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a.slice(0, 5).map((w) => ({ w, task: SENTENCE_TASKS[settings.practiceLevel][Math.floor(Math.random() * SENTENCE_TASKS[settings.practiceLevel].length)] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length, settings.practiceLevel, seed]);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [examples, setExamples] = useState<string[] | null>(null);
  const cur = list[i];

  useEffect(() => {
    setShown(false);
    setExamples(null);
  }, [i, seed]);

  const reveal = async (w: Word) => {
    setShown(true);
    if (!online) {
      setExamples([]);
      return;
    }
    try {
      const d = await lookupDictionary(w.en);
      setExamples((d?.meanings ?? []).flatMap((m) => m.examples).filter((x) => x && x.toLowerCase() !== w.exampleEn.toLowerCase()).slice(0, 2));
    } catch {
      setExamples([]);
    }
  };

  const intro = 'Construis une phrase avec un mot que tu viens d’apprendre, en respectant la consigne de ton niveau.';
  if (!pool.length) {
    return (
      <Frame title="Phrase avec le mot" intro={intro}>
        <Notice>Apprends d’abord quelques mots dans « Réviser » : cet exercice utilise tes mots récents.</Notice>
      </Frame>
    );
  }
  if (i >= list.length) {
    return (
      <Frame title="Phrase avec le mot" intro={intro}>
        <Done
          title="phrases avec tes mots"
          results={results}
          onAgain={() => {
            setSeed((s) => s + 1);
            setI(0);
            setResults([]);
          }}
        />
      </Frame>
    );
  }
  const { w, task } = cur;
  return (
    <Frame title="Phrase avec le mot" intro={intro} step={`Mot ${i + 1} / ${list.length}`}>
      <article className="card flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <SpeakChip text={w.en}>
            <strong className="font-display text-2xl" lang="en">
              {w.en}
            </strong>
          </SpeakChip>
          <span className="text-ink-2">{w.fr}</span>
        </div>
        <p className="rounded-2xl bg-wattle-soft px-4 py-3 font-bold">{task}</p>
        <Answer resetKey={`${seed}-${i}`} />
        {!shown ? (
          <button type="button" className="btn btn-primary" onClick={() => void reveal(w)}>
            Voir des exemples
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Exemples avec « {w.en} »</p>
            {w.exampleEn && (
              <div>
                <SpeakChip text={w.exampleEn} />
                <p className="mt-1 text-sm text-ink-2">{w.exampleFr}</p>
              </div>
            )}
            {examples === null && <p className="text-sm text-muted">Recherche d’autres exemples…</p>}
            {examples?.map((x) => <SpeakChip key={x} text={x} />)}
            {examples && examples.length === 0 && !w.exampleEn && <p className="text-sm text-muted">Pas d’exemple disponible pour ce mot.</p>}
            {examples && examples.length > 0 && <p className="text-xs text-muted">Exemples : Wiktionary (CC BY-SA).</p>}
            <SelfScore
              onScore={(success) => {
                logPractice([{ kind: 'phrase', itemId: w.id, level: settings.practiceLevel, success }]);
                setResults((r) => [...r, success]);
                setI((x) => x + 1);
              }}
            />
          </div>
        )}
      </article>
    </Frame>
  );
}

// ---------------------------------------------------------------- 2. Le mot juste

export function ExRightWord() {
  const s = useSeries(RIGHT_WORD, 6, 'motjuste');
  const [picked, setPicked] = useState<number | null>(null);
  const order = useMemo(() => (s.cur ? [0, 1, 2, 3].slice(0, s.cur.options.length).sort(() => Math.random() - 0.5) : []), [s.cur]);
  useEffect(() => setPicked(null), [s.cur]);
  const intro = 'Choisis le mot qui convient au contexte. L’explication montre la nuance.';
  if (s.done || !s.cur) {
    return (
      <Frame title="Le mot juste" intro={intro}>
        <Done title="le mot juste" results={s.results} onAgain={s.again} />
      </Frame>
    );
  }
  const item = s.cur;
  const rightPos = item.correct == null ? 4 : order.indexOf(item.correct);
  const full = item.correct == null ? null : item.sentence.replace('___', item.options[item.correct]);
  return (
    <Frame title="Le mot juste" intro={intro} step={`Question ${s.i + 1} / ${s.list.length} · ${item.level}`}>
      <article className="card flex flex-col gap-3 p-5">
        <p className="text-xl font-bold" lang="en">
          {item.sentence}
        </p>
        <ul className="flex flex-col gap-2">
          {[...order.map((k) => item.options[k]), NONE_OPTION].map((label, pos) => {
            const state = picked == null ? '' : pos === rightPos ? 'border-gum bg-gum-soft' : pos === picked ? 'border-coral bg-coral-soft' : 'opacity-60';
            return (
              <li key={pos}>
                <button
                  type="button"
                  disabled={picked != null}
                  onClick={() => setPicked(pos)}
                  className={`btn btn-ghost h-auto min-h-12 w-full justify-start whitespace-normal py-2.5 text-left font-medium disabled:cursor-default ${state}`}
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold">{LETTERS[pos]}</span>
                  <span lang={pos === 4 ? 'fr' : 'en'}>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {picked != null && (
          <div className="flex flex-col items-start gap-3" role="status">
            <p className={`font-bold ${picked === rightPos ? 'text-gum' : 'text-coral'}`}>{picked === rightPos ? 'Bonne réponse.' : `Réponse : ${LETTERS[rightPos]}.`}</p>
            <p className="text-sm">{item.explain}</p>
            {full && <RecordCompare model={full} />}
            <button type="button" className="btn btn-primary" onClick={() => s.score(picked === rightPos)}>
              Suivante <Icon name="chevronRight" size={18} />
            </button>
          </div>
        )}
      </article>
    </Frame>
  );
}

// ---------------------------------------------------------------- 3. Plus naturel

export function ExNatural() {
  const s = useSeries(NATURAL, 6, 'naturel');
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [s.cur]);
  const intro = 'Ces phrases sont des calques du français. Dis la version naturelle, puis compare.';
  if (s.done || !s.cur) {
    return (
      <Frame title="Plus naturel" intro={intro}>
        <Done title="phrases plus naturelles" results={s.results} onAgain={s.again} />
      </Frame>
    );
  }
  const item = s.cur;
  return (
    <Frame title="Plus naturel" intro={intro} step={`Phrase ${s.i + 1} / ${s.list.length} · ${item.level}`}>
      <article className="card flex flex-col gap-4 p-5">
        <p className="eyebrow">Phrase d’un francophone</p>
        <p className="text-xl font-bold text-coral" lang="en">
          {item.wrong}
        </p>
        <Answer resetKey={item.id} />
        {!shown ? (
          <button type="button" className="btn btn-primary" onClick={() => setShown(true)}>
            Voir la version naturelle
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xl font-bold text-gum" lang="en">
              {item.right}
            </p>
            <p className="text-sm">{item.why}</p>
            <RecordCompare model={item.right.split(' / ')[0]} />
            <SelfScore onScore={s.score} />
          </div>
        )}
      </article>
    </Frame>
  );
}

// ---------------------------------------------------------------- 4. Reformuler

export function ExRephrase() {
  const s = useSeries(REPHRASE, 5, 'reformuler');
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [s.cur]);
  const intro = 'Redis la même idée autrement : plus simple, plus poli, plus formel, plus précis ou plus nuancé.';
  if (s.done || !s.cur) {
    return (
      <Frame title="Reformuler" intro={intro}>
        <Done title="reformulations" results={s.results} onAgain={s.again} />
      </Frame>
    );
  }
  const item = s.cur;
  return (
    <Frame title="Reformuler" intro={intro} step={`Phrase ${s.i + 1} / ${s.list.length} · ${item.level}`}>
      <article className="card flex flex-col gap-4 p-5">
        <SpeakChip text={item.base} className="self-start text-lg font-bold" />
        <p className="self-start rounded-full bg-wattle-soft px-3 py-1 text-sm font-bold text-wattle-ink">Rends-la {item.task}</p>
        <Answer resetKey={item.id} />
        {!shown ? (
          <button type="button" className="btn btn-primary" onClick={() => setShown(true)}>
            Voir des modèles
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {item.models.map((m) => (
              <div key={m}>
                <p className="font-bold" lang="en">
                  {m}
                </p>
                <RecordCompare model={m} className="mt-1" />
              </div>
            ))}
            <p className="text-sm text-ink-2">
              <strong>Astuce · </strong>
              {item.tip}
            </p>
            <SelfScore onScore={s.score} />
          </div>
        )}
      </article>
    </Frame>
  );
}

// ---------------------------------------------------------------- 5. Situations

const THEMES: { value: SituationTheme | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'quotidien', label: 'Quotidien' },
  { value: 'travail', label: 'Travail' },
  { value: 'mines', label: 'Mines' },
  { value: 'social', label: 'Social' },
];

export function ExSituations() {
  const { settings, practice, logPractice } = useApp();
  const [theme, setTheme] = useState<SituationTheme | 'all'>('all');
  const [open, setOpen] = useState<Situation | null>(null);
  const done = useMemo(() => new Set(practice.filter((p) => p.kind === 'situation' && p.success).map((p) => p.itemId)), [practice]);
  const list = SITUATIONS.filter((x) => x.level === settings.practiceLevel && (theme === 'all' || x.theme === theme));
  const intro = 'Mises en situation de la vie quotidienne, du travail et des mines. Prépare-toi 30 secondes, puis parle.';
  if (open) return <SituationRun s={open} onClose={() => setOpen(null)} onScore={(success) => {
    logPractice([{ kind: 'situation', itemId: open.id, level: open.level, success }]);
    setOpen(null);
  }} />;
  return (
    <Frame title="Situations" intro={intro}>
      <Segmented label="Thème" value={theme} onChange={setTheme} options={THEMES} />
      <ul className="flex flex-col gap-2">
        {list.map((x) => (
          <li key={x.id}>
            <button type="button" className="card flex w-full items-start justify-between gap-3 p-4 text-left hover:border-ocean" onClick={() => setOpen(x)}>
              <span className="min-w-0">
                <strong className="block">{x.title}</strong>
                <span className="text-sm text-ink-2">{x.context}</span>
              </span>
              {done.has(x.id) ? (
                <span className="shrink-0 rounded-full bg-gum-soft px-2 py-0.5 text-xs font-bold text-gum">réussie</span>
              ) : (
                <Icon name="chevronRight" className="shrink-0 text-ink-2" />
              )}
            </button>
          </li>
        ))}
        {list.length === 0 && <Notice>Pas de situation pour ce thème à ce niveau : choisis un autre thème ou un autre niveau.</Notice>}
      </ul>
    </Frame>
  );
}

function SituationRun({ s, onClose, onScore }: { s: Situation; onClose: () => void; onScore: (success: boolean) => void }) {
  const [phase, setPhase] = useState<'prep' | 'speak' | 'models'>('prep');
  const [left, setLeft] = useState(30);
  const [hints, setHints] = useState(false);
  useEffect(() => {
    if (phase !== 'prep') return;
    if (left <= 0) {
      setPhase('speak');
      return;
    }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader eyebrow={`Situation · ${s.level} · ${s.theme}`} title={s.title}>
        <button type="button" className="btn btn-ghost min-h-11 text-sm" onClick={onClose}>
          <Icon name="chevronLeft" size={18} /> Situations
        </button>
      </PageHeader>
      <article className="card flex flex-col gap-4 p-5">
        <p>{s.context}</p>
        <p className="rounded-2xl bg-wattle-soft px-4 py-3 font-bold">{s.task}</p>
        {hints ? (
          <ul className="flex flex-wrap gap-1.5">
            {s.phrases.map((p) => (
              <li key={p}>
                <SpeakChip text={p} />
              </li>
            ))}
          </ul>
        ) : (
          <button type="button" className="btn btn-quiet self-start text-ocean" onClick={() => setHints(true)}>
            <Icon name="sparkle" size={18} /> Phrases utiles
          </button>
        )}
        {phase === 'prep' && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="tabular text-lg">
              Préparation : <strong>{left} s</strong>
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setPhase('speak')}>
              Je suis prêt
            </button>
          </div>
        )}
        {phase !== 'prep' && (
          <>
            <p className="font-bold">Parle maintenant. Enregistre-toi pour te réécouter.</p>
            <RecordCompare />
          </>
        )}
        {phase === 'speak' && (
          <button type="button" className="btn btn-primary" onClick={() => setPhase('models')}>
            Voir les réponses modèles
          </button>
        )}
        {phase === 'models' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="eyebrow">Réponse modèle · {s.level}</p>
              <p className="mt-1" lang="en">
                {s.model}
              </p>
              <RecordCompare model={s.model} className="mt-2" />
            </div>
            <div className="rounded-2xl bg-ocean-soft/50 p-3">
              <p className="eyebrow">Un cran au-dessus</p>
              <p className="mt-1" lang="en">
                {s.modelUp}
              </p>
              <RecordCompare model={s.modelUp} className="mt-2" />
            </div>
            <SelfScore checklist onScore={onScore} />
          </div>
        )}
      </article>
    </div>
  );
}

// ---------------------------------------------------------------- 6. Réponse rapide

const QUICK_SECONDS = 20;

export function ExQuick() {
  const { settings, logPractice } = useApp();
  const [seed, setSeed] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => pickItems(QUICK, settings.practiceLevel, 10), [settings.practiceLevel, seed]);
  const [i, setI] = useState(-1);
  const [left, setLeft] = useState(QUICK_SECONDS);
  const startedAt = useRef(0);
  useEffect(() => {
    if (i < 0 || i >= list.length) return;
    if (left <= 0) {
      setI((x) => x + 1);
      setLeft(QUICK_SECONDS);
      return;
    }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [i, left, list.length]);

  const intro = `10 questions, ${QUICK_SECONDS} secondes chacune : réponds tout de suite, sans préparer. Le but est de parler, pas d’être parfait.`;
  if (i < 0) {
    return (
      <Frame title="Réponse rapide" intro={intro}>
        <div className="card flex flex-col items-start gap-3 p-5">
          <p>Tu peux enregistrer toute la série pour te réécouter à la fin.</p>
          <RecordCompare />
          <button
            type="button"
            className="btn btn-primary h-14 px-8 text-lg"
            onClick={() => {
              startedAt.current = Date.now();
              setI(0);
              setLeft(QUICK_SECONDS);
            }}
          >
            <Icon name="play" size={20} /> Commencer
          </button>
        </div>
      </Frame>
    );
  }
  if (i >= list.length) {
    return (
      <Frame title="Réponse rapide" intro={intro}>
        <div className="card flex flex-col gap-4 p-5">
          <p className="font-bold">Exemples de réponses</p>
          <ol className="flex flex-col gap-3">
            {list.map((q) => (
              <li key={q.id}>
                <p className="font-bold" lang="en">
                  {q.q}
                </p>
                <SpeakChip text={q.sample} className="mt-1" />
              </li>
            ))}
          </ol>
          <SelfScore
            checklist
            onScore={(success) => {
              logPractice(list.map((q) => ({ kind: 'rapide' as const, itemId: q.id, level: q.level, success })));
              setSeed((x) => x + 1);
              setI(-1);
            }}
          />
        </div>
      </Frame>
    );
  }
  const q = list[i];
  return (
    <Frame title="Réponse rapide" intro={intro} step={`Question ${i + 1} / ${list.length}`}>
      <article className="card flex flex-col items-center gap-4 p-6 text-center">
        <p className="font-display text-[clamp(1.5rem,6vw,2.2rem)] font-extrabold leading-tight" lang="en">
          {q.q}
        </p>
        <SpeakChip text={q.q}>Écouter la question</SpeakChip>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <span className="block h-full bg-wattle transition-[width] duration-1000 ease-linear" style={{ width: `${(left / QUICK_SECONDS) * 100}%` }} />
        </div>
        <p className="tabular text-sm text-ink-2" aria-live="polite">
          {left} s
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setI((x) => x + 1);
            setLeft(QUICK_SECONDS);
          }}
        >
          Question suivante <Icon name="chevronRight" size={18} />
        </button>
      </article>
    </Frame>
  );
}

// ---------------------------------------------------------------- 7. Mon histoire

export function ExStory() {
  const { settings, logPractice } = useApp();
  const topics = STORIES.filter((t) => t.level === settings.practiceLevel);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [takes, setTakes] = useState(0);
  const [missing, setMissing] = useState('');
  const topic = STORIES.find((t) => t.id === topicId);
  const intro = 'Raconte la même histoire trois fois. À chaque essai : plus fluide, plus précis. Les mots qui te manquent vont dans ton vocabulaire.';
  if (!topic) {
    return (
      <Frame title="Mon histoire" intro={intro}>
        <ul className="flex flex-col gap-2">
          {topics.map((t) => (
            <li key={t.id}>
              <button type="button" className="card flex w-full items-start justify-between gap-3 p-4 text-left hover:border-ocean" onClick={() => setTopicId(t.id)}>
                <span>
                  <strong className="block">{t.title}</strong>
                  <span className="text-sm text-ink-2">{t.prompt}</span>
                </span>
                <Icon name="chevronRight" className="shrink-0 text-ink-2" />
              </button>
            </li>
          ))}
        </ul>
      </Frame>
    );
  }
  const words = missing
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const steps = ['Essai 1 : raconte librement, sans t’arrêter.', 'Essai 2 : reprends avec les mots qui te manquaient.', 'Essai 3 : plus vite, plus précis, avec un connecteur de plus.'];
  return (
    <Frame title={topic.title} intro={topic.prompt}>
      <article className="card flex flex-col gap-4 p-5">
        <ul className="flex flex-wrap gap-1.5">
          {topic.hints.map((h) => (
            <li key={h}>
              <SpeakChip text={h} />
            </li>
          ))}
        </ul>
        <p className="rounded-2xl bg-wattle-soft px-4 py-3 font-bold">{steps[Math.min(takes, 2)]}</p>
        <RecordCompare takes={3} onRecorded={(n) => setTakes(n)} />
        {takes >= 1 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="story-missing" className="font-bold">
              Mots qui t’ont manqué (en français, séparés par des virgules)
            </label>
            <input id="story-missing" className="field" value={missing} onChange={(e) => setMissing(e.target.value)} placeholder="ex. : récolte, gagner sa vie" />
            {words.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {words.map((w) => (
                  <li key={w}>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        setAddPrefill(w);
                        navigate('ajouter');
                      }}
                    >
                      <Icon name="plus" size={14} /> {w}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {words.length > 0 && <p className="text-xs text-muted">Touche un mot pour trouver sa traduction et l’ajouter à tes révisions.</p>}
          </div>
        )}
        {takes >= 3 && (
          <SelfScore
            checklist
            onScore={(success) => {
              logPractice([{ kind: 'histoire', itemId: topic.id, level: topic.level, success }]);
              setTopicId(null);
              setTakes(0);
              setMissing('');
            }}
          />
        )}
      </article>
    </Frame>
  );
}
