import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { Icon } from '../components/Icon';
import { Ipa, Notice, PageHeader, PosChip, Segmented, pct } from '../components/ui';
import { formatDuration } from '../domain/dates';
import { attemptsFor, currentWordId, sessionProgress, wordOutcome } from '../domain/queue';
import { checkTyped, type TypedCheck } from '../domain/answerCheck';
import { planNextSession, type SessionPlan } from '../domain/selection';
import { parseCard } from '../domain/tracks';
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

export function PlanBreakdown({ plan }: { plan: SessionPlan }) {
  if (!plan.dueNow) return null;
  const parts: string[] = [];
  if (plan.forgotten) parts.push(`${plan.forgotten} oublié${plan.forgotten > 1 ? 's' : ''} (en premier)`);
  if (plan.prodDue) parts.push(`${plan.prodDue} à dire en anglais`);
  if (plan.recDue) parts.push(`${plan.recDue} à reconnaître`);
  return <p className="mt-1 text-sm text-ink-2 tabular">{parts.join(' · ')}</p>;
}

export function PlacementInvite() {
  const { settings, words } = useApp();
  const untouched = useMemo(() => words.filter((w) => w.source === 'core' && !w.deleted && w.srs.reps === 0 && !w.srs.origin).length, [words]);
  if (settings.placementDone || untouched < 100) return null;
  return (
    <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 border-ocean/30 bg-ocean-soft/40 p-4">
      <p className="min-w-0 flex-1 text-sm">
        <strong>Tu connais déjà une partie des 500 mots ?</strong> Le test de placement (5 min) t’évite de les apprendre comme des mots
        nouveaux.
      </p>
      <a href="#placement" className="btn btn-ghost min-h-10 text-sm">
        <Icon name="target" size={18} /> Faire le test
      </a>
    </div>
  );
}

function ReviewStart() {
  const { words, settings, startDailySession, toast } = useApp();
  const firstTime = useMemo(() => !words.some((w) => w.srs.reps > 0 || w.srs.origin), [words]);
  const plan = useNextPlan();
  const extra = useNextPlan(true);

  const start = (opts?: { ignoreNewLimit?: boolean; ahead?: boolean }) => {
    const s = startDailySession(opts);
    if (!s) toast('Aucune carte disponible pour cette session.', 'error');
  };
  const laterNote =
    plan.laterToday > 0 && plan.nextDueAt ? (
      <p className="mt-3 text-sm text-ink-2 tabular">
        {plan.laterToday} carte{plan.laterToday > 1 ? 's' : ''} ratée{plan.laterToday > 1 ? 's' : ''} récemment reviendr{plan.laterToday > 1 ? 'ont' : 'a'} à partir de{' '}
        {timeFmt.format(plan.nextDueAt)}.
      </p>
    ) : null;
  const title = { review: 'À revoir', new: 'Nouvelle liste', produce: 'À dire en anglais', done: 'Tout est à jour' }[plan.kind];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Réviser" title={title} />
      <div className="card p-5 sm:p-6">
        {plan.kind === 'review' && (
          <>
            <p className="text-lg">
              <strong className="tabular">
                {plan.ids.length} carte{plan.ids.length > 1 ? 's' : ''}
              </strong>{' '}
              à revoir{plan.dueNow > plan.ids.length ? <span className="tabular"> (sur {plan.dueNow} en tout)</span> : null}.
            </p>
            <PlanBreakdown plan={plan} />
            {plan.dueNow <= plan.ids.length && <p className="mt-1 text-sm text-ink-2">Ensuite, « Réviser » te proposera la suite de ta séance.</p>}
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
        {plan.kind === 'produce' && (
          <>
            <p className="text-lg">
              Tu reconnais déjà ces <strong className="tabular">{plan.ids.length} mots</strong>. Maintenant, dis-les en anglais à partir du
              français.
            </p>
            <p className="mt-1 text-sm text-ink-2">
              Réponds à voix haute puis vérifie, ou tape le mot (les petites fautes de frappe sont tolérées).
              {plan.produceAvailable > plan.ids.length && <span className="tabular"> Encore {plan.produceAvailable - plan.ids.length} ensuite.</span>}
            </p>
          </>
        )}
        {plan.kind === 'done' && (
          <>
            {plan.newAvailable > 0 ? (
              <p className="text-lg">
                Tu as atteint ton objectif de <strong className="tabular">{settings.newPerDay} nouveaux mots</strong> aujourd’hui.
              </p>
            ) : (
              <p className="text-lg">Tu as commencé tous les mots de ta collection, et tout est révisé. Bravo !</p>
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
            {plan.kind !== 'review' && laterNote}
            <p className="mt-3 text-sm text-muted">Les cartes ratées reviennent à la fin de la liste jusqu’à ce que tu les trouves.</p>
          </>
        )}
      </div>
      <PlacementInvite />
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-2">
        <span>Envie de cibler certains mots ?</span>
        <button type="button" className="btn btn-quiet min-h-10 text-ocean" onClick={() => navigate('explorer')}>
          Choisir dans le vocabulaire <Icon name="chevronRight" size={18} />
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

function hintOf(en: string): string {
  return en
    .split('')
    .map((c, i) => (i === 0 || c === ' ' || c === "'" || c === '-' ? c : '_'))
    .join(' ');
}

function Verdict({ check, word, typed }: { check: TypedCheck; word: Word; typed: string }) {
  const ok = check.verdict === 'exact' || check.verdict === 'typo' || check.verdict === 'form';
  const tone = ok ? 'bg-gum-soft text-gum' : check.verdict === 'other-word' ? 'bg-wattle-soft text-wattle-ink' : 'bg-coral-soft text-coral';
  const t = typed.trim();
  let text: string;
  switch (check.verdict) {
    case 'exact':
      text = 'Exact !';
      break;
    case 'typo':
      text = `Bon, avec une petite faute : tu as écrit « ${t} ».`;
      break;
    case 'form':
      text = `Correct (forme conjuguée). La forme de base est « ${word.en} ».`;
      break;
    case 'other-word':
      text = `« ${t} » veut aussi dire « ${check.matched?.fr ?? word.fr} », mais le mot travaillé ici est « ${word.en} ». À toi de juger.`;
      break;
    case 'empty':
      text = 'Pas de réponse : voici le mot.';
      break;
    default:
      text = check.matched ? `Pas tout à fait : « ${t} » veut dire « ${check.matched.fr} ».` : `Pas tout à fait : tu as écrit « ${t} ».`;
  }
  return (
    <p role="status" className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-sm font-bold ${tone}`}>
      <Icon name={ok ? 'check' : check.verdict === 'other-word' ? 'info' : 'x'} size={18} className="shrink-0" />
      {text}
    </p>
  );
}

function SessionView({ session }: { session: ReviewSession }) {
  const { words, wordsById, settings, answer, endActive, resume, updateSettings } = useApp();
  const [revealed, setRevealed] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [check, setCheck] = useState<TypedCheck | null>(null);
  const [hint, setHint] = useState(false);
  const key = currentWordId(session);
  const card = key ? parseCard(key) : null;
  const word = card ? wordsById.get(card.wordId) : undefined;
  const isProd = card?.track === 'prod';
  const written = isProd && settings.prodMode === 'written';
  const cardKey = `${session.id}:${session.answers.length}`;
  const playedKey = useRef<string | null>(null);
  const progress = sessionProgress(session);
  const attempt = key ? attemptsFor(session, key) + 1 : 1;
  const voice = useMemo(() => describeVoice(settings.voiceURI), [settings.voiceURI]);

  // reprise : le temps passé hors de la session n'est pas compté
  useEffect(() => {
    if (Date.now() - session.lastActivityAt > 60_000) resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    setRevealed(false);
    setTyped('');
    setCheck(null);
    setHint(false);
  }, [cardKey]);

  // sans voix australienne : on prépare les enregistrements humains des mots à venir
  useEffect(() => {
    const ids = session.queue.slice(0, 3);
    prefetchNative(
      ids.map((id) => wordsById.get(parseCard(id).wordId)?.en ?? '').filter(Boolean),
      settings.voiceURI,
    );
  }, [cardKey, session.queue, wordsById, settings.voiceURI]);

  const speakWord = useCallback(
    (w: Word | undefined, k: string) => {
      if (!w) return;
      playedKey.current = k;
      void playWord(w.en, {
        voiceURI: settings.voiceURI,
        rate: settings.speechRate,
        preferNative: settings.audioPreference === 'native-first',
        knownAudio: w.audioUrl ? { url: w.audioUrl, accent: w.audioAccent === 'au' ? 'au' : 'other' } : null,
      }).then((r) => setVoiceLabel(r.label));
    },
    [settings.voiceURI, settings.speechRate, settings.audioPreference],
  );

  // lecture automatique : dès l'affichage (reconnaître), après vérification (produire, sinon l'audio donnerait la réponse)
  useEffect(() => {
    if (!settings.autoPlay || !word || playedKey.current === cardKey) return;
    if (isProd && !revealed) return;
    speakWord(word, cardKey);
  }, [cardKey, word, settings.autoPlay, speakWord, isProd, revealed]);

  const grade = useCallback(
    (g: Grade) => {
      if (!key) return;
      // carte suivante, lue dans le même geste (exigence d'iOS pour l'audio)
      const rest = session.queue.slice(1);
      const nextQueue = g === 'again' ? [...rest, key] : rest;
      const next = nextQueue[0] ? parseCard(nextQueue[0]) : null;
      answer(g);
      if (settings.autoPlay && next && next.track === 'rec') {
        speakWord(wordsById.get(next.wordId), `${session.id}:${session.answers.length + 1}`);
      }
    },
    [key, session, answer, settings.autoPlay, speakWord, wordsById],
  );

  const submitTyped = useCallback(() => {
    if (!word || revealed) return;
    setCheck(checkTyped(typed, word, words));
    setRevealed(true);
  }, [word, revealed, typed, words]);

  // raccourcis clavier (ordinateur)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (!revealed) {
          if (written) return;
          e.preventDefault();
          setRevealed(true);
        } else if (e.key === 'Enter' && check?.suggested) {
          e.preventDefault();
          grade(check.suggested);
        }
        return;
      }
      if (e.key.toLowerCase() === 'p' && word && (!isProd || revealed)) {
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
  }, [revealed, grade, settings.answerMode, word, speakWord, cardKey, written, check, isProd]);

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

  const suggest = (g: Grade) => (check?.suggested === g ? 'ring-4 ring-ocean/30' : '');
  const example = word.exampleEn && (
    <div className="mt-2 flex w-full max-w-md items-start gap-3 rounded-2xl bg-surface-2 p-4 text-left">
      <AudioButton text={word.exampleEn} label="Écouter la phrase d’exemple" size="sm" />
      <div className="min-w-0">
        <p className="font-bold" lang="en">
          {word.exampleEn}
        </p>
        <p className="text-ink-2">{word.exampleFr}</p>
      </div>
    </div>
  );
  const englishHead = (
    <>
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
    </>
  );

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
            aria-label="Mettre en pause et revenir à l’accueil"
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
          <strong className="text-ink">{progress.seen}</strong> carte{progress.seen > 1 ? 's' : ''} distincte{progress.seen > 1 ? 's' : ''} sur {progress.total}
          {progress.toDiscover > 0 && <> · {progress.toDiscover} à découvrir</>}
          {progress.repetitions > 0 && (
            <>
              {' '}
              · {progress.repetitions} répétition{progress.repetitions > 1 ? 's' : ''}
            </>
          )}
        </p>
        {confirmEnd && <p className="text-sm text-ink-2">Les cartes non terminées garderont leur état et reviendront dans une prochaine session.</p>}
      </div>

      <div className="gutter mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto py-4">
        <article
          key={cardKey}
          data-track={isProd ? 'prod' : 'rec'}
          className={`anim-card card flex flex-1 flex-col items-center gap-4 px-5 text-center shadow-card ${revealed ? 'justify-start py-5' : 'justify-center py-8'}`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isProd ? 'bg-wattle-soft text-wattle-ink' : 'bg-ocean-soft text-ocean'}`}>
              {isProd ? 'Français → anglais' : 'Anglais → français'}
            </span>
            {attempt > 1 && (
              <span className="rounded-full bg-coral-soft px-3 py-1 text-xs font-bold text-coral">Revient · {attempt}e passage</span>
            )}
          </div>

          {isProd ? (
            revealed ? (
              <>
                {check && <Verdict check={check} word={word} typed={typed} />}
                {englishHead}
                <p className="text-sm text-muted">Écoute, puis répète-le à voix haute.</p>
                <div className="anim-reveal mt-1 flex w-full flex-col items-center gap-3 border-t border-line pt-5">
                  <PosChip pos={word.pos} />
                  <p className="text-xl font-bold">{word.fr}</p>
                  {example}
                </div>
              </>
            ) : (
              <>
                <PosChip pos={word.pos} />
                <h2 className="font-display text-[clamp(2rem,9vw,3.4rem)] font-extrabold leading-tight">{word.fr}</h2>
                {word.frAlt.length > 0 && <p className="max-w-md text-sm text-ink-2">aussi : {word.frAlt.slice(0, 3).join(' · ')}</p>}
                {word.exampleFr && <p className="max-w-md text-ink-2">Contexte : « {word.exampleFr} »</p>}
                {hint ? (
                  <p className="font-mono text-2xl tracking-wider" lang="en" aria-label={`Indice : commence par ${word.en[0]}, ${word.en.length} caractères`}>
                    {hintOf(word.en)}
                  </p>
                ) : (
                  <button type="button" className="btn btn-quiet min-h-10 text-sm text-ocean" onClick={() => setHint(true)}>
                    <Icon name="sparkle" size={18} /> Indice
                  </button>
                )}
                <Segmented
                  label="Répondre"
                  value={settings.prodMode}
                  onChange={(v) => updateSettings({ prodMode: v })}
                  options={[
                    { value: 'oral', label: 'À l’oral' },
                    { value: 'written', label: 'À l’écrit' },
                  ]}
                />
                {written ? (
                  <form
                    id="prod-form"
                    className="w-full max-w-sm"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitTyped();
                    }}
                  >
                    <label className="sr-only" htmlFor="prod-input">
                      Mot anglais
                    </label>
                    <input
                      id="prod-input"
                      className="field h-14 w-full text-center text-xl"
                      lang="en"
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="done"
                      placeholder="Tape le mot anglais"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                    />
                  </form>
                ) : (
                  <p className="max-w-sm text-sm text-muted">Dis le mot anglais à voix haute, puis vérifie.</p>
                )}
              </>
            )
          ) : (
            <>
              {englishHead}
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
              {revealed ? (
                <div className="anim-reveal mt-2 flex w-full flex-col items-center gap-3 border-t border-line pt-5">
                  <PosChip pos={word.pos} />
                  <p className="text-2xl font-bold">{word.fr}</p>
                  {word.frAlt.length > 0 && <p className="max-w-md text-ink-2">{word.frAlt.join(' · ')}</p>}
                  {example}
                </div>
              ) : (
                <p className="text-sm text-muted">Essaie de trouver la traduction avant de la révéler.</p>
              )}
            </>
          )}
          {voiceLabel && voice.australian && <p className="sr-only">{voiceLabel}</p>}
        </article>
      </div>

      <div className="gutter mx-auto w-full max-w-2xl pb-4">
        {!revealed ? (
          written ? (
            <button type="submit" form="prod-form" className="btn btn-primary h-16 w-full text-lg">
              Vérifier
            </button>
          ) : (
            <button type="button" className="btn btn-primary h-16 w-full text-lg" onClick={() => setRevealed(true)}>
              {isProd ? 'Vérifier' : 'Révéler la réponse'}
            </button>
          )
        ) : settings.answerMode === 'two' ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={`btn h-16 whitespace-normal bg-coral-soft px-3 text-base leading-tight text-coral sm:text-lg ${suggest('again')}`}
              onClick={() => grade('again')}
            >
              <Icon name="x" className="shrink-0" /> {isProd ? 'Je ne l’avais pas' : 'Je ne connais pas'}
            </button>
            <button
              type="button"
              className={`btn h-16 whitespace-normal bg-gum px-3 text-base leading-tight text-white sm:text-lg ${suggest('good')}`}
              onClick={() => grade('good')}
            >
              <Icon name="check" className="shrink-0" /> {isProd ? 'Je l’avais' : 'Je connais'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className={`btn h-16 bg-coral-soft text-base text-coral ${suggest('again')}`} onClick={() => grade('again')}>
              À revoir
            </button>
            <button type="button" className="btn h-16 bg-wattle-soft text-base text-wattle-ink" onClick={() => grade('hard')}>
              Difficile
            </button>
            <button type="button" className={`btn h-16 bg-gum text-base text-white ${suggest('good')}`} onClick={() => grade('easy')}>
              Facile
            </button>
          </div>
        )}
        <p className="mt-2 hidden text-center text-xs text-muted md:block">
          Clavier : {written ? 'Entrée pour vérifier' : 'Espace pour révéler'} ·{' '}
          {settings.answerMode === 'two'
            ? `1 ou ← « ${isProd ? 'Je ne l’avais pas' : 'Je ne connais pas'} » · 2 ou → « ${isProd ? 'Je l’avais' : 'Je connais'} »`
            : '1 À revoir · 2 Difficile · 3 Facile'}{' '}
          · P pour écouter
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
        <Figure label="Cartes distinctes" value={p.seen} />
        <Figure label="Répétitions" value={p.repetitions} />
        <Figure label="Réussite" value={pct(answered ? p.correct / answered : null)} hint={`${p.correct} correctes · ${p.incorrect} incorrectes`} />
        <Figure label="Durée" value={formatDuration(session.activeMs)} />
      </div>
      <h2 className="mb-2 mt-6 text-lg font-bold">Détail</h2>
      <ul className="card divide-y divide-line">
        {session.wordIds.map((id) => {
          const c = parseCard(id);
          const w = wordsById.get(c.wordId);
          const o = wordOutcome(session, id);
          if (!w) return null;
          return (
            <li key={id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-bold" lang="en">
                  {w.en}
                  {c.track === 'prod' && <span className="ml-2 rounded-full bg-wattle-soft px-2 py-0.5 align-middle text-[11px] font-bold text-wattle-ink">FR → EN</span>}
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
              {next.kind === 'review'
                ? `Réviser ${next.ids.length} carte${next.ids.length > 1 ? 's' : ''}`
                : next.kind === 'produce'
                  ? `À dire en anglais (${next.ids.length} mots)`
                  : `Liste suivante (${next.ids.length} nouveaux mots)`}
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
          Accueil
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
