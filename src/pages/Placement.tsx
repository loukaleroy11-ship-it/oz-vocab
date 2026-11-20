import { useEffect, useMemo, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { Icon } from '../components/Icon';
import { Notice, PageHeader, PosChip, pct } from '../components/ui';
import {
  BAND_SIZE,
  LETTERS,
  bandLabel,
  placementBands,
  NONE_OPTION,
  PER_BAND,
  buildPlacement,
  scorePlacement,
  shouldStop,
  type PlacementAnswer,
  type PlacementOutcome,
  type PlacementQuestion,
} from '../domain/placement';
import { isStarted } from '../domain/srs';
import { navigate } from '../router';
import { useApp } from '../state/AppContext';

type Stage = 'intro' | 'test' | 'result';

export function PlacementPage() {
  const { words, wordsById, settings, updateSettings, applyPlacement } = useApp();
  const [stage, setStage] = useState<Stage>('intro');
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [outcome, setOutcome] = useState<PlacementOutcome | null>(null);
  // chaque question s'affiche en haut de l'écran (le bouton de départ peut être plus bas)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stage, answers.length]);
  const untouched = useMemo(() => {
    const bands = placementBands(words);
    return words.filter((w) => bands.has(w.id) && !isStarted(w.srs)).length;
  }, [words]);

  const begin = () => {
    const q = buildPlacement(words);
    setQuestions(q);
    setAnswers([]);
    setStage(q.length ? 'test' : 'result');
  };

  const finish = (all: PlacementAnswer[]) => {
    const o = scorePlacement(words, questions, all, Date.now());
    applyPlacement(o.placed);
    setOutcome(o);
    setStage('result');
  };

  const choose = (a: PlacementAnswer) => {
    const next = [...answers, a];
    setAnswers(next);
    if (next.length >= questions.length || shouldStop(questions, next)) finish(next);
  };

  if (stage === 'intro') {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Vocabulaire" title="Test de placement" />
        <div className="card flex flex-col gap-3 p-5 sm:p-6">
          <p className="text-lg">
            Environ <strong>5 minutes</strong> pour repérer les mots que tu connais déjà, afin de ne pas les apprendre comme des mots nouveaux.
          </p>
          <ul className="ml-5 list-disc text-ink-2">
            <li>Pour chaque mot anglais, choisis sa traduction parmi A à E.</li>
            <li>Si tu ne sais pas, appuie sur « Je ne sais pas » : deviner fausserait le résultat.</li>
            <li>
              {PER_BAND} mots par tranche : les 500 mots de base par tranches de {BAND_SIZE}, puis les niveaux B1, B2 et C1 par tranches de 100. Le
              test s’arrête tout seul quand les mots deviennent trop difficiles.
            </li>
            <li>Les mots jugés connus ne te seront pas présentés comme nouveaux : ils reviendront en révision d’ici 1 à 4 semaines pour vérifier, et passeront aux cartes « dire en anglais ».</li>
          </ul>
          <Notice>
            Ta progression actuelle est conservée : seuls les mots jamais commencés sont concernés ({untouched}). Les phrasal verbs, expressions,
            australianismes et le vocabulaire pro ne sont pas testés : ils restent à découvrir dans tes listes.
          </Notice>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary h-14 px-8 text-lg" onClick={begin} disabled={untouched < 2}>
              <Icon name="play" size={20} /> Commencer le test
            </button>
            {!settings.placementDone && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  updateSettings({ placementDone: true });
                  navigate('accueil');
                }}
              >
                Passer, je commence au début
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'test') {
    const i = answers.length;
    const q = questions[i];
    const w = q ? wordsById.get(q.wordId) : undefined;
    if (!q || !w) return null;
    const band = q.band;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between gap-3 pt-2 text-sm text-ink-2">
          <span className="tabular">
            Question {i + 1} / {questions.length} · {bandLabel(band)}
          </span>
          <button type="button" className="btn btn-quiet min-h-10 text-sm" onClick={() => finish(answers)}>
            Arrêter ici
          </button>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <span className="block h-full bg-ocean transition-[width]" style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <article key={i} className="anim-card card flex flex-col items-center gap-3 p-5 text-center sm:p-7">
          <PosChip pos={w.pos} />
          <h2 className="font-display text-[clamp(2.2rem,10vw,3.6rem)] font-extrabold leading-none" lang="en">
            {w.en}
          </h2>
          <AudioButton text={w.en} label={`Écouter « ${w.en} »`} size="md" audioUrl={w.audioUrl} audioAccent={w.audioAccent} />
          <p className="text-sm text-muted">Quelle est la traduction ?</p>
          <ul className="mt-2 flex w-full flex-col gap-2 text-left">
            {[...q.options, NONE_OPTION].map((label, k) => (
              <li key={k}>
                <button
                  type="button"
                  className="btn btn-ghost h-auto min-h-12 w-full justify-start whitespace-normal py-2.5 text-left font-medium"
                  onClick={() => choose(k)}
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold">{LETTERS[k]}</span>
                  <span className={k === 4 ? 'text-ink-2' : ''}>{label}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-quiet mt-1 text-ocean" onClick={() => choose(null)}>
            Je ne sais pas
          </button>
        </article>
      </div>
    );
  }

  // résultat
  const placed = outcome?.placed.length ?? 0;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Test de placement" title="Résultat" />
      <div className="card flex flex-col gap-4 p-5 sm:p-6">
        {!outcome ? (
          <p>Tous les mots ont déjà été commencés : il n’y a rien à placer.</p>
        ) : (
          <>
            <p className="text-lg">
              <strong className="tabular">{placed} mot{placed > 1 ? 's' : ''}</strong> jugé{placed > 1 ? 's' : ''} connu{placed > 1 ? 's' : ''} : ils
              ne te seront pas présentés comme nouveaux. Estimation : tu connais environ <strong className="tabular">{outcome.knownEstimate}</strong>{' '}
              mots parmi les 500 de base et les niveaux B1 à C1.
            </p>
            {outcome.byLevel.length > 0 && (
              <ul className="flex flex-wrap gap-2 text-sm">
                {outcome.byLevel.map((l) => (
                  <li key={l.level} className="rounded-full bg-surface-2 px-3 py-1">
                    <strong>{l.level}</strong> : {l.correct}/{l.asked} ({pct(l.correct / l.asked)})
                  </li>
                ))}
              </ul>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-2">
                  <th className="py-1 font-medium">Mots (fréquence)</th>
                  <th className="py-1 text-right font-medium">Bonnes réponses</th>
                  <th className="py-1 text-right font-medium">Tranche</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {outcome.bands.map((b) => (
                  <tr key={b.band} className="border-t border-line">
                    <td className="py-1.5 first-letter:uppercase">{b.label}</td>
                    <td className="py-1.5 text-right">
                      {b.correct} / {b.asked}
                    </td>
                    <td className={`py-1.5 text-right font-bold ${b.passed ? 'text-gum' : 'text-ink-2'}`}>{b.passed ? 'acquise' : 'à apprendre'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-ink-2">
              Les mots ratés pendant le test restent à apprendre. Si un mot « jugé connu » ne l’est pas vraiment, réponds « Je ne connais pas » quand il
              reviendra : il repartira comme un mot nouveau.
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => navigate('accueil')}>
            <Icon name="play" size={20} /> Voir ma séance du jour
          </button>
        </div>
      </div>
    </div>
  );
}
