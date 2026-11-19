import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { Icon } from '../components/Icon';
import { Ipa, Notice, PageHeader, PosChip, pct } from '../components/ui';
import { formatDuration } from '../domain/dates';
import { attemptsFor, currentWordId, sessionProgress, wordOutcome } from '../domain/queue';
import { planNextSession, type SessionPlan } from '../domain/selection';
import { groupLabel } from '../data/themes';
import type { Grade, ReviewSession, Word } from '../domain/types';
import { navigate } from '../router';
import { describeVoice, playWord, prefetchNative, speechSupported } from '../services/speech';
import { useApp } from '../state/AppContext';

export function ReviewPage() {
  const { activeSession, finishedSession } = useApp();
  if (activeSession) return <SessionView session={activeSession} />;
  if (finishedSession) return <SessionSummary session={finishedSession} />;
  return <ReviewStart />;
}

// ---------------------------------------------------------------- départ

/** Prochaine liste proposée par le bouton « Réviser » (révisions d'abord, puis nouveaux mots). */
export function useNextPlan(ignoreNewLimit = false): SessionPlan {
  const { words, now, settings } = useApp();
  return useMemo(
    () => planNextSession(words, now, { size: settings.sessionSize, newPerDay: settings.newPerDay, ignoreNewLimit }),
    [words, now, settings.sessionSize, settings.newPerDay, ignoreNewLimit],
  );
}

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function ThemeChips({ groups }: { groups: string[] }) {
  if (!groups.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Thèmes de la liste">
      {groups.map((g) => (
        <li key={g} className="rounded-full bg-ocean-soft px-2.5 py-1 text-xs font-bold text-ocean">
          {groupLabel(g)}
        </li>
      ))}
    </ul>
  );
}

function ReviewStart() {
  const { words, settings, startDailySession, toast } = useApp();
  const firstTime = useMemo(() => !words.some((w) => w.srs.reps > 0), [words]);
  const plan = useNextPlan();
  const extra = useNextPlan(true);

  const start = (opts?: { ignoreNewLimit?: boolean; ahead?: boolean }) => {
    const s = startDailySession(opts);
    if (!s) toast('Aucun mot disponible pour cette session.', 'error');
  };
  const laterNote =
    plan.laterToday > 0 && plan.nextDueAt ? (
      <p className="mt-3 text-sm text-ink-2 tabular">
        {plan.laterToday} mot{plan.laterToday > 1 ? 's' : ''} raté{plan.laterToday > 1 ? 's' : ''} récemment reviendr{plan.laterToday > 1 ? 'ont' : 'a'} à partir de{' '}
        {timeFmt.format(plan.nextDueAt)}.
      </p>
    ) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Réviser" title={plan.kind === 'review' ? 'À revoir' : plan.kind === 'new' ? 'Nouvelle liste' : 'Tout est à jour'} />
      <div className="card p-5 sm:p-6">
        {plan.kind === 'review' && (
          <>
            <p className="text-lg">
              <strong className="tabular">{plan.ids.length} mot{plan.ids.length > 1 ? 's' : ''}</strong> des listes précédentes à revoir.
            </p>
            {plan.dueNow > plan.ids.length && (
              <p className="mt-1 text-sm text-ink-2 tabular">
                Encore {plan.dueNow - plan.ids.length} après cette révision, puis de nouveaux mots.
              </p>
            )}
            {plan.dueNow <= plan.ids.length && <p className="mt-1 text-sm text-ink-2">Ensuite, « Réviser » te proposera une nouvelle liste.</p>}
          </>
        )}
        {plan.kind === 'new' && (
          <>
            <p className="text-lg">
              {firstTime ? (
                <>
                  Voici tes <strong className="tabular">{plan.ids.length} premiers mots</strong>, parmi les plus fréquents, regroupés par thème.
                </>
              ) : (
                <>
                  Tes révisions sont faites : voici <strong className="tabular">{plan.ids.length} nouveaux mots</strong>, les suivants par ordre de
                  fréquence, regroupés par thème.
                </>
              )}
            </p>
            {settings.newPerDay > 0 && (
              <p className="mt-1 text-sm text-ink-2 tabular">
                {plan.newStartedToday} / {settings.newPerDay} nouveaux mots aujourd’hui.
              </p>
            )}
          </>
        )}
        {plan.kind === 'done' && (
          <>
            {plan.newAvailable > 0 ? (
              <p className="text-lg">
                Tu as atteint ton objectif de <strong className="tabular">{settings.newPerDay} nouveaux mots</strong> aujourd’hui.
              </p>
            ) : (
              <p className="text-lg">Tu as déjà commencé tous les mots de ta collection. Bravo !</p>
            )}
            {laterNote}
            <div className="mt-5 flex flex-wrap gap-2">
              {plan.newAvailable > 0 && (
                <button type="button" className="btn btn-primary" onClick={() => start({ ignoreNewLimit: true })}>
                  <Icon name="plus" size={20} /> Nouvelle liste quand même ({extra.ids.length} mots)
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => start({ ahead: true })}>
                <Icon name="refresh" size={20} /> Réviser en avance
              </button>
            </div>
          </>
        )}
        {plan.kind !== 'done' && (
          <>
            <div className="mt-4">
              <ThemeChips groups={plan.groups} />
            </div>
            <button type="button" className="btn btn-primary mt-5 h-14 w-full text-lg sm:w-auto sm:px-8" onClick={() => start()}>
              <Icon name="play" size={20} /> {plan.kind === 'review' ? 'Commencer la révision' : 'Commencer la liste'}
            </button>
            {plan.kind === 'new' && laterNote}
            <p className="mt-3 text-sm text-muted">Les mots que tu ne connais pas reviennent à la fin de la liste jusqu’à ce que tu les reconnaisses.</p>
          </>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-2">
        <span>Envie de cibler certains mots ?</span>
        <button type="button" className="btn btn-quiet min-h-10 text-ocean" onClick={() => navigate('explorer')}>
          Choisir dans l’explorateur <Icon name="chevronRight" size={18} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- session

function ProgressDots({ session }: { session: ReviewSession }) {
  const seen = new Set(session.answers.map((a) => a.wordId));
  const queued = new Set(session.queue);
  const current = session.queue[0];
  return (
    <div className="flex gap-1" aria-hidden="true">
      {session.wordIds.map((id) => {
        const state = id === current ? 'current' : !queued.has(id) ? 'done' : seen.has(id) ? 'retry' : 'todo';
        const cls =
          state === 'done'
            ? 'bg-gum'
            : state === 'retry'
              ? 'bg-coral'
              : state === 'current'
                ? 'bg-ocean'
                : 'bg-line';
        return <span key={id} className={`h-1.5 flex-1 rounded-full transition-colors ${cls}`} />;
      })}
    </div>
  );
}

function SessionView({ session }: { session: ReviewSession }) {
  const { wordsById, settings, answer, endActive, resume } = useApp();
  const [revealed, setRevealed] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const wordId = currentWordId(session);
  const word = wordId ? wordsById.get(wordId) : undefined;
  const cardKey = `${session.id}:${session.answers.length}`;
  const playedKey = useRef<string | null>(null);
  const progress = sessionProgress(session);
  const attempt = wordId ? attemptsFor(session, wordId) + 1 : 1;
  const voice = useMemo(() => describeVoice(settings.voiceURI), [settings.voiceURI]);

  // reprise : le temps passé hors de la session n'est pas compté
  useEffect(() => {
    if (Date.now() - session.lastActivityAt > 60_000) resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    setRevealed(false);
  }, [cardKey]);

  // sans voix australienne : on prépare les enregistrements humains des mots à venir
  useEffect(() => {
    const ids = session.queue.slice(0, 3);
    prefetchNative(
      ids.map((id) => wordsById.get(id)?.en ?? '').filter(Boolean),
      settings.voiceURI,
    );
  }, [cardKey, session.queue, wordsById, settings.voiceURI]);

  const speakWord = useCallback(
    (w: Word | undefined, key: string) => {
      if (!w) return;
      playedKey.current = key;
      void playWord(w.en, {
        voiceURI: settings.voiceURI,
        rate: settings.speechRate,
        preferNative: settings.audioPreference === 'native-first',
        knownAudio: w.audioUrl ? { url: w.audioUrl, accent: w.audioAccent === 'au' ? 'au' : 'other' } : null,
      }).then((r) => setVoiceLabel(r.label));
    },
    [settings.voiceURI, settings.speechRate, settings.audioPreference],
  );

  // lecture automatique de chaque nouvelle carte
  useEffect(() => {
    if (!settings.autoPlay || !word || playedKey.current === cardKey) return;
    speakWord(word, cardKey);
  }, [cardKey, word, settings.autoPlay, speakWord]);

  const grade = useCallback(
    (g: Grade) => {
      if (!wordId) return;
      // carte suivante, lue dans le même geste (exigence d'iOS pour l'audio)
      const rest = session.queue.slice(1);
      const nextQueue = g === 'again' ? [...rest, wordId] : rest;
      const nextId = nextQueue[0];
      answer(g);
      if (settings.autoPlay && nextId) speakWord(wordsById.get(nextId), `${session.id}:${session.answers.length + 1}`);
    },
    [wordId, session, answer, settings.autoPlay, speakWord, wordsById],
  );

  // raccourcis clavier (ordinateur)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (!revealed) {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (e.key.toLowerCase() === 'p' && word) {
        speakWord(word, cardKey);
        return;
      }
      if (!revealed) return;
      if (settings.answerMode === 'two') {
        if (e.key === '1' || e.key === 'ArrowLeft') grade('again');
        if (e.key === '2' || e.key === 'ArrowRight') grade('good');
      } else {
        if (e.key === '1') grade('again');
        if (e.key === '2') grade('hard');
        if (e.key === '3') grade('easy');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, grade, settings.answerMode, word, speakWord, cardKey]);

  if (!word) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Notice tone="error">Ce mot n’existe plus dans ta collection.</Notice>
        <button type="button" className="btn btn-ghost mt-4" onClick={() => answer('good')}>
          Passer au mot suivant
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-bg"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="gutter mx-auto flex w-full max-w-2xl flex-col gap-3 pt-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => navigate('accueil')}
            aria-label="Mettre en pause et revenir au tableau de bord"
          >
            <Icon name="pause" size={20} /> Pause
          </button>
          <p className="min-w-0 truncate text-sm font-bold text-ink-2">{session.label}</p>
          {confirmEnd ? (
            <span className="flex items-center gap-1">
              <button type="button" className="btn btn-danger min-h-10 px-3 text-sm" onClick={() => endActive()}>
                Terminer
              </button>
              <button type="button" className="btn btn-quiet min-h-10 px-2 text-sm" onClick={() => setConfirmEnd(false)}>
                Annuler
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-quiet text-sm" onClick={() => setConfirmEnd(true)}>
              Terminer
            </button>
          )}
        </div>
        <ProgressDots session={session} />
        <p className="tabular text-sm text-ink-2" aria-live="polite">
          <strong className="text-ink">{progress.seen}</strong> mot{progress.seen > 1 ? 's' : ''} distinct{progress.seen > 1 ? 's' : ''} sur {progress.total}
          {progress.toDiscover > 0 && <> · {progress.toDiscover} à découvrir</>}
          {progress.repetitions > 0 && (
            <>
              {' '}
              · {progress.repetitions} répétition{progress.repetitions > 1 ? 's' : ''}
            </>
          )}
        </p>
        {confirmEnd && <p className="text-sm text-ink-2">Les mots non terminés garderont leur état et reviendront dans une prochaine session.</p>}
      </div>

      <div className="gutter mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto py-4">
        <article
          key={cardKey}
          className={`anim-card card flex flex-1 flex-col items-center gap-4 px-5 text-center shadow-card ${revealed ? 'justify-start py-5' : 'justify-center py-8'}`}
        >
          {attempt > 1 && (
            <span className="rounded-full bg-coral-soft px-3 py-1 text-xs font-bold text-coral">
              Revient · {attempt}e passage
            </span>
          )}
          <h2
            className={`font-display font-extrabold leading-none transition-[font-size] ${revealed ? 'text-[clamp(2rem,8vw,3rem)]' : 'text-[clamp(2.4rem,11vw,4rem)]'}`}
            lang="en"
          >
            {word.en}
          </h2>
          <Ipa value={word.ipa} className="text-xl text-ink-2" />
          <AudioButton
            text={word.en}
            label={`Écouter « ${word.en} » avec l’accent australien`}
            size={revealed ? 'md' : 'lg'}
            audioUrl={word.audioUrl}
            audioAccent={word.audioAccent}
            onResult={(r) => setVoiceLabel(r.label)}
          />
          {revealed ? null : !speechSupported() ? (
            <p className="text-xs text-coral">Synthèse vocale indisponible dans ce navigateur.</p>
          ) : (
            !voice.australian && (
              <p className="max-w-sm text-xs text-wattle-ink">
                Pas de voix australienne sur cet appareil{voice.voice ? ` : lecture avec ${voice.voice.name} (${voice.voice.lang})` : ''}.{' '}
                <a className="underline" href="#parametres">
                  Comment en installer une
                </a>
              </p>
            )
          )}
          {voiceLabel && voice.australian && <p className="sr-only">{voiceLabel}</p>}

          {revealed ? (
            <div className="anim-reveal mt-2 flex w-full flex-col items-center gap-3 border-t border-line pt-5">
              <PosChip pos={word.pos} />
              <p className="text-2xl font-bold">{word.fr}</p>
              {word.frAlt.length > 0 && <p className="max-w-md text-ink-2">{word.frAlt.join(' · ')}</p>}
              {word.exampleEn && (
                <div className="mt-2 flex w-full max-w-md items-start gap-3 rounded-2xl bg-surface-2 p-4 text-left">
                  <AudioButton text={word.exampleEn} label="Écouter la phrase d’exemple" size="sm" />
                  <div className="min-w-0">
                    <p className="font-bold" lang="en">
                      {word.exampleEn}
                    </p>
                    <p className="text-ink-2">{word.exampleFr}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Essaie de trouver la traduction avant de la révéler.</p>
          )}
        </article>
      </div>

      <div className="gutter mx-auto w-full max-w-2xl pb-4">
        {!revealed ? (
          <button type="button" className="btn btn-primary h-16 w-full text-lg" onClick={() => setRevealed(true)}>
            Révéler la réponse
          </button>
        ) : settings.answerMode === 'two' ? (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn h-16 whitespace-normal bg-coral-soft px-3 text-base leading-tight text-coral sm:text-lg" onClick={() => grade('again')}>
              <Icon name="x" className="shrink-0" /> Je ne connais pas
            </button>
            <button type="button" className="btn h-16 whitespace-normal bg-gum px-3 text-base leading-tight text-white sm:text-lg" onClick={() => grade('good')}>
              <Icon name="check" className="shrink-0" /> Je connais
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="btn h-16 bg-coral-soft text-base text-coral" onClick={() => grade('again')}>
              À revoir
            </button>
            <button type="button" className="btn h-16 bg-wattle-soft text-base text-wattle-ink" onClick={() => grade('hard')}>
              Difficile
            </button>
            <button type="button" className="btn h-16 bg-gum text-base text-white" onClick={() => grade('easy')}>
              Facile
            </button>
          </div>
        )}
        <p className="mt-2 hidden text-center text-xs text-muted md:block">
          Clavier : Espace pour révéler · {settings.answerMode === 'two' ? '1 ou ← « Je ne connais pas » · 2 ou → « Je connais »' : '1 À revoir · 2 Difficile · 3 Facile'} · P pour écouter
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- bilan

function SessionSummary({ session }: { session: ReviewSession }) {
  const { wordsById, dismissFinished, startDailySession, continueSelection } = useApp();
  const next = useNextPlan();
  const p = sessionProgress(session);
  const answered = p.correct + p.incorrect;
  const remaining = session.selection?.remainingIds.length ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Session terminée" title={session.label} />
      <div className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <Figure label="Mots distincts" value={p.seen} />
        <Figure label="Répétitions" value={p.repetitions} />
        <Figure label="Réussite" value={pct(answered ? p.correct / answered : null)} hint={`${p.correct} correctes · ${p.incorrect} incorrectes`} />
        <Figure label="Durée" value={formatDuration(session.activeMs)} />
      </div>
      <h2 className="mb-2 mt-6 text-lg font-bold">Détail</h2>
      <ul className="card divide-y divide-line">
        {session.wordIds.map((id) => {
          const w = wordsById.get(id);
          const o = wordOutcome(session, id);
          if (!w) return null;
          return (
            <li key={id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-bold" lang="en">
                  {w.en}
                </p>
                <p className="truncate text-sm text-ink-2">{w.fr}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  o.kind === 'first-try' ? 'bg-gum-soft text-gum' : o.kind === 'after-retries' ? 'bg-wattle-soft text-wattle-ink' : 'bg-surface-2 text-ink-2'
                }`}
              >
                {o.kind === 'first-try'
                  ? 'Du premier coup'
                  : o.kind === 'after-retries'
                    ? `Après ${o.attempts} passages`
                    : o.attempts
                      ? 'Non terminé'
                      : 'Pas vu'}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {remaining > 0 ? (
          <button type="button" className="btn btn-primary" onClick={() => continueSelection(session)}>
            <Icon name="play" size={20} /> Continuer la sélection ({remaining} restants)
          </button>
        ) : (
          next.kind !== 'done' ? (
            <button type="button" className="btn btn-primary" onClick={() => startDailySession()}>
              <Icon name="play" size={20} />{' '}
              {next.kind === 'review' ? `Réviser ${next.ids.length} mot${next.ids.length > 1 ? 's' : ''}` : `Liste suivante (${next.ids.length} nouveaux mots)`}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => dismissFinished()}>
              <Icon name="play" size={20} /> Voir la suite
            </button>
          )
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            dismissFinished();
            navigate('accueil');
          }}
        >
          Tableau de bord
        </button>
      </div>
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className="font-display text-2xl font-extrabold tabular">{value}</p>
      {hint && <p className="text-xs text-muted tabular">{hint}</p>}
    </div>
  );
}
