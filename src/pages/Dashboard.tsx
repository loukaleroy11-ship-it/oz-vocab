import { useMemo } from 'react';
import { Icon } from '../components/Icon';
import { LevelBars } from '../components/LevelBars';
import { Notice, pct } from '../components/ui';
import { sessionProgress } from '../domain/queue';
import { computeOverview, levelBreakdown } from '../domain/stats';
import { navigate } from '../router';
import { useApp } from '../state/AppContext';
import { PlacementInvite, ThemeChips, useNextPlan } from './Review';

export function Dashboard() {
  const { words, sessions, now, activeSession, startDailySession, toast, settings } = useApp();
  const o = useMemo(() => computeOverview(words, sessions, now), [words, sessions, now]);
  const levels = useMemo(() => levelBreakdown(words), [words]);
  const plan = useNextPlan();
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const progress = activeSession ? sessionProgress(activeSession) : null;

  const start = () => {
    if (activeSession) {
      navigate('reviser');
      return;
    }
    const s = startDailySession();
    if (s) navigate('reviser');
    else {
      toast('Rien à réviser pour l’instant : tout est à jour.', 'info');
      navigate('reviser');
    }
  };

  const nextLabel =
    plan.kind === 'review' ? 'cartes à revoir' : plan.kind === 'new' ? 'nouveaux mots' : plan.kind === 'produce' ? 'mots à dire en anglais' : '';
  const newLine =
    plan.newAvailable === 0
      ? 'tous commencés'
      : plan.newLimitReached
        ? `objectif du jour atteint (${settings.newPerDay})`
        : `${plan.newStartedToday} commencé${plan.newStartedToday > 1 ? 's' : ''} aujourd’hui`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="pt-2">
        <p className="eyebrow first-letter:uppercase">{today}</p>
        <h1 className="text-[1.9rem] font-extrabold leading-tight sm:text-[2.4rem]">Séance du jour</h1>
      </header>

      <section className="card relative overflow-hidden p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            {progress ? (
              <>
                <p className="eyebrow">Liste en pause</p>
                <p className="mt-1 text-lg">
                  <strong className="tabular">{progress.seen}</strong> carte{progress.seen > 1 ? 's' : ''} sur <span className="tabular">{progress.total}</span> déjà
                  vue{progress.seen > 1 ? 's' : ''} dans « {activeSession!.label} ».
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">Prochaine liste</p>
                {plan.kind === 'done' ? (
                  <p className="mt-1 text-lg font-bold">Tout est à jour pour l’instant.</p>
                ) : (
                  <>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                      <span className="font-display text-5xl font-extrabold tabular">{plan.ids.length}</span>
                      <span className="text-ink-2">{nextLabel}</span>
                    </p>
                    <div className="mt-2">
                      <ThemeChips groups={plan.groups} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <button type="button" className="btn btn-primary h-14 px-6 text-lg" onClick={start}>
            <Icon name="play" size={20} /> {activeSession ? 'Reprendre' : 'Commencer'}
          </button>
        </div>

        <ol className="mt-6 grid grid-cols-2 gap-2 text-sm lg:grid-cols-4" aria-label="Ordre de la séance">
          <Step n={1} title="Mots oubliés" value={plan.forgotten} note="toujours en premier" />
          <Step n={2} title="Révisions" value={plan.prodDue + plan.recDue} note={`${plan.prodDue} à dire · ${plan.recDue} à reconnaître`} />
          <Step n={3} title="Nouveaux mots" value={plan.newAvailable} note={newLine} />
          <Step n={4} title="À dire pour la 1re fois" value={plan.produceAvailable} note="mots appris les jours précédents" />
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${o.streakIncludesToday ? 'bg-wattle text-ink' : 'bg-wattle-soft text-wattle-ink'}`}>
              <Icon name="flame" size={18} />
            </span>
            <span>
              <strong className="tabular">{o.streak}</strong> jour{o.streak > 1 ? 's' : ''} d’affilée
              {o.streak > 0 && !o.streakIncludesToday && <span className="text-wattle-ink"> · révise aujourd’hui pour continuer</span>}
            </span>
          </span>
          <span className="text-ink-2">
            Aujourd’hui : <strong className="tabular text-ink">{o.correctToday}</strong> bonne{o.correctToday > 1 ? 's' : ''} réponse{o.correctToday > 1 ? 's' : ''} sur{' '}
            <span className="tabular">{o.answersToday}</span> ({pct(o.accuracyToday)})
          </span>
        </div>
      </section>

      <PlacementInvite />

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <section className="card min-w-0 p-5 lg:col-span-3" aria-labelledby="levels-title">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="levels-title" className="text-lg font-bold">
              Reconnus et productibles
            </h2>
            <p className="text-sm text-ink-2 tabular">
              {o.recognized} reconnus · {o.producible} productibles
            </p>
          </div>
          <LevelBars rows={levels} />
          <p className="mt-4 text-xs text-muted">
            Reconnu : tu retrouves le sens à partir de l’anglais. Productible : tu sais le dire en anglais à partir du français. Niveaux CECRL d’après
            CEFR-J et Octanove.
          </p>
        </section>
        <section className="flex min-w-0 flex-col gap-3 lg:col-span-2" aria-label="Fiches">
          <a href="#exprimer" className="card flex items-start gap-3 p-4 transition-colors hover:border-ocean">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wattle-soft text-wattle-ink">
              <Icon name="speech" />
            </span>
            <span className="min-w-0">
              <strong className="block">Les 5 temps essentiels</strong>
              <span className="text-sm text-ink-2">Quand et comment les utiliser, les pièges de francophone, à dire à voix haute, et un quiz.</span>
            </span>
          </a>
          <a href="#apparentes" className="card flex items-start gap-3 p-4 transition-colors hover:border-ocean">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ocean-soft text-ocean">
              <Icon name="book" />
            </span>
            <span className="min-w-0">
              <strong className="block">Mots apparentés : les règles</strong>
              <span className="text-sm text-ink-2">-tion, -té → -ty, -eux → -ous… des milliers de mots que tu connais déjà, et les faux amis à éviter.</span>
            </span>
          </a>
        </section>
      </div>

      {o.seen === 0 && (
        <Notice>
          Ta collection contient les 500 mots les plus fréquents de l’anglais parlé. Ta première liste commence par « be », « have », « do »… Tu peux
          aussi <a className="font-bold underline" href="#ajouter">ajouter tes propres mots</a>.
        </Notice>
      )}
    </div>
  );
}

function Step({ n, title, value, note }: { n: number; title: string; value: number; note: string }) {
  return (
    <li className="min-w-0 rounded-2xl bg-surface-2 p-3">
      <span className="flex items-center gap-2 text-xs font-bold text-ink-2">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface">{n}</span>
        {title}
      </span>
      <span className="mt-1 block font-display text-2xl font-extrabold leading-tight tabular">{value}</span>
      <span className="block text-xs text-ink-2">{note}</span>
    </li>
  );
}
