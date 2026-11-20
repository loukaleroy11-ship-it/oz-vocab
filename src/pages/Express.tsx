import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { SpeakChip } from '../components/SpeakChip';
import { PageHeader } from '../components/ui';
import { LETTERS, NONE_OPTION } from '../domain/placement';
import { TENSES, TENSE_QUIZ, type TenseGuide, type TenseQuizItem } from '../data/tenses';

export function ExpressPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader eyebrow="S’exprimer" title="Les 5 temps essentiels" />
      <p className="-mt-3 text-ink-2">
        À l’oral, le présent simple et le prétérit font l’essentiel du travail. Avec le présent progressif, le present perfect et le futur, tu peux dire
        presque tout ce dont tu as besoin, au quotidien comme au travail. Lis la fiche, écoute les exemples, puis fais les consignes « À toi » à voix
        haute.
      </p>

      <section className="card overflow-hidden" aria-label="Résumé des 5 temps">
        <ul className="divide-y divide-line">
          {TENSES.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(t.id) as HTMLDetailsElement | null;
                  if (!el) return;
                  el.open = true;
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocean-soft text-sm font-bold text-ocean">{i + 1}</span>
                <span className="min-w-0">
                  <strong className="block" lang="en">
                    {t.name}
                  </strong>
                  <span className="text-sm text-ink-2">{t.idea}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {TENSES.map((t, i) => (
        <TenseCard key={t.id} tense={t} index={i} />
      ))}

      <TenseQuiz />

      <p className="text-sm text-muted">
        Prochaine étape de l’application : des exercices d’expression avec tes nouveaux mots (faire une phrase, reformuler, choisir le mot juste,
        situations du quotidien et du travail, réponses rapides).
      </p>
    </div>
  );
}

function TenseCard({ tense: t, index }: { tense: TenseGuide; index: number }) {
  return (
    <details id={t.id} className="card group scroll-mt-20 overflow-hidden" open={index === 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
        <span className="min-w-0">
          <span className="eyebrow">Temps {index + 1}</span>
          <span className="block font-display text-xl font-extrabold" lang="en">
            {t.name}
          </span>
          <span className="block text-sm text-ink-2">{t.frName}</span>
        </span>
        <Icon name="chevronRight" className="shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="flex flex-col gap-5 border-t border-line p-4 sm:p-5">
        <p className="font-bold">{t.idea}</p>

        <div>
          <h3 className="eyebrow mb-2">Quand l’utiliser</h3>
          <ul className="flex flex-col gap-2">
            {t.uses.map((u) => (
              <li key={u.en} className="rounded-2xl bg-surface-2 p-3">
                <p className="text-sm text-ink-2">{u.use}</p>
                <SpeakChip text={u.en} className="mt-1 bg-surface font-bold">
                  <span lang="en">{u.en}</span>
                </SpeakChip>
                <p className="mt-1 text-sm text-ink-2">{u.fr}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="eyebrow mb-2">Comment le former</h3>
          <dl className="grid gap-2 sm:grid-cols-3">
            {t.forms.map((f) => (
              <div key={f.label} className="rounded-2xl border border-line p-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-ink-2">{f.label}</dt>
                <dd className="mt-1 text-sm">{f.pattern}</dd>
                <dd className="mt-1.5">
                  <SpeakChip text={f.en} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h3 className="eyebrow mb-2">Mots qui l’annoncent</h3>
          <ul className="flex flex-wrap gap-1.5">
            {t.signals.map((s) => (
              <li key={s} className="rounded-full bg-ocean-soft px-2.5 py-1 text-sm font-bold text-ocean" lang="en">
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="eyebrow mb-2">Pièges de francophone</h3>
          <ul className="flex flex-col gap-2">
            {t.traps.map((tr) => (
              <li key={tr.wrong} className="rounded-2xl border border-line p-3 text-sm">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1 text-coral line-through decoration-2" lang="en">
                    <Icon name="x" size={16} /> {tr.wrong}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-gum" lang="en">
                    <Icon name="check" size={16} /> {tr.right}
                  </span>
                </p>
                <p className="mt-1 text-ink-2">{tr.why}</p>
              </li>
            ))}
          </ul>
        </div>

        {t.aussie && (
          <p className="rounded-2xl bg-wattle-soft p-3 text-sm">
            <strong>En Australie · </strong>
            {t.aussie}
          </p>
        )}

        <div className="rounded-2xl bg-ocean-soft/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-bold">
            <Icon name="mic" size={20} className="text-ocean" /> À toi, à voix haute
          </h3>
          <ul className="ml-5 list-disc text-sm">
            {t.speak.map((s) => (
              <li key={s} className="mt-1">
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Parle sans écrire d’abord. Puis recommence en essayant d’aller plus vite et d’ajouter un détail.</p>
        </div>
      </div>
    </details>
  );
}

interface Shown {
  item: TenseQuizItem;
  /** Ordre d'affichage des 4 propositions (indices dans item.options). */
  order: number[];
}

function shuffled<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function makeRound(): Shown[] {
  return shuffled(TENSE_QUIZ).map((item) => ({ item, order: shuffled([0, 1, 2, 3]) }));
}

function TenseQuiz() {
  const [round, setRound] = useState<Shown[]>(makeRound);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= round.length;
  const cur = round[i];
  // position affichée de la bonne réponse : 0 à 3, ou 4 pour E
  const rightPos = useMemo(() => (cur ? (cur.item.correct == null ? 4 : cur.order.indexOf(cur.item.correct)) : -1), [cur]);
  const tenseName = cur ? TENSES.find((t) => t.id === cur.item.tense)?.name : '';

  const choose = (pos: number) => {
    if (picked != null) return;
    setPicked(pos);
    if (pos === rightPos) setScore((s) => s + 1);
  };

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="quiz-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="quiz-title" className="text-xl font-bold">
          Quiz : quelle phrase est correcte ?
        </h2>
        {!done && (
          <p className="text-sm text-ink-2 tabular">
            {i + 1} / {round.length} · {score} bonne{score > 1 ? 's' : ''}
          </p>
        )}
      </div>
      {done ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-lg">
            <strong className="tabular">
              {score} / {round.length}
            </strong>{' '}
            {score === round.length ? 'Parfait !' : score >= round.length * 0.75 ? 'Très bien.' : 'Relis les pièges des temps ratés, puis recommence.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setRound(makeRound());
              setI(0);
              setPicked(null);
              setScore(0);
            }}
          >
            <Icon name="refresh" size={20} /> Recommencer
          </button>
        </div>
      ) : (
        <>
          <p className="text-lg font-bold">{cur.item.fr}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {[...cur.order.map((k) => cur.item.options[k]), NONE_OPTION].map((label, pos) => {
              const state = picked == null ? '' : pos === rightPos ? 'border-gum bg-gum-soft' : pos === picked ? 'border-coral bg-coral-soft' : 'opacity-60';
              return (
                <li key={pos}>
                  <button
                    type="button"
                    disabled={picked != null}
                    onClick={() => choose(pos)}
                    className={`btn btn-ghost h-auto min-h-12 w-full justify-start whitespace-normal py-2.5 text-left font-medium disabled:cursor-default ${state}`}
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold">{LETTERS[pos]}</span>
                    <span lang={pos === 4 ? 'fr' : 'en'} className={pos === 4 ? 'text-ink-2' : ''}>
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {picked != null && (
            <div className="mt-4 flex flex-col items-start gap-3" role="status">
              <p className={`font-bold ${picked === rightPos ? 'text-gum' : 'text-coral'}`}>
                {picked === rightPos ? 'Bonne réponse.' : `Réponse : ${LETTERS[rightPos]}.`} <span className="font-normal text-ink-2">({tenseName})</span>
              </p>
              <p className="text-sm">{cur.item.explain}</p>
              {cur.item.correct != null && <SpeakChip text={cur.item.options[cur.item.correct]} />}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setI((n) => n + 1);
                  setPicked(null);
                }}
              >
                Question suivante <Icon name="chevronRight" size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
