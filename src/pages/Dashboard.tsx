import { useMemo } from 'react';
import { AreaChart } from '../components/Charts';
import { Icon } from '../components/Icon';
import { Notice, pct } from '../components/ui';
import { sessionProgress } from '../domain/queue';
import { dailyPlan } from '../domain/selection';
import { computeOverview, dailyRows, posBreakdown } from '../domain/stats';
import { POS_PLURAL } from '../domain/status';
import { navigate } from '../router';
import { useApp } from '../state/AppContext';

export function Dashboard() {
  const { words, sessions, daily, now, settings, activeSession, startDailySession, toast } = useApp();
  const o = useMemo(() => computeOverview(words, sessions, now), [words, sessions, now]);
  const plan = useMemo(() => dailyPlan(words, now, settings.newPerDay), [words, now, settings.newPerDay]);
  const rows = useMemo(() => dailyRows(sessions, daily, now, 30), [sessions, daily, now]);
  const pos = useMemo(() => posBreakdown(words, now), [words, now]);
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const newToday = Math.min(plan.newAllowance, plan.newAvailable.length);
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="pt-2">
        <p className="eyebrow first-letter:uppercase">{today}</p>
        <h1 className="text-[1.9rem] font-extrabold leading-tight sm:text-[2.4rem]">Tableau de bord</h1>
      </header>

      <section className="card relative overflow-hidden p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            {progress ? (
              <>
                <p className="eyebrow">Session en pause</p>
                <p className="mt-1 text-lg">
                  <strong className="tabular">{progress.seen}</strong> mot{progress.seen > 1 ? 's' : ''} sur <span className="tabular">{progress.total}</span> déjà vu
                  {progress.seen > 1 ? 's' : ''} dans « {activeSession!.label} ».
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">Aujourd’hui</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span>
                    <span className="font-display text-5xl font-extrabold tabular">{o.dueToday}</span>
                    <span className="ml-2 text-ink-2">à revoir</span>
                  </span>
                  <span>
                    <span className="font-display text-5xl font-extrabold tabular text-ink-2">{newToday}</span>
                    <span className="ml-2 text-ink-2">nouveaux possibles</span>
                  </span>
                </p>
              </>
            )}
          </div>
          <button type="button" className="btn btn-primary h-14 px-6 text-lg" onClick={start}>
            <Icon name="play" size={20} /> {activeSession ? 'Reprendre ma révision' : 'Commencer ma révision'}
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
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
            Révisés aujourd’hui : <strong className="tabular text-ink">{o.reviewedToday}</strong> mot{o.reviewedToday > 1 ? 's' : ''} ·{' '}
            <strong className="tabular text-ink">{o.correctToday}</strong> bonne{o.correctToday > 1 ? 's' : ''} réponse{o.correctToday > 1 ? 's' : ''} sur{' '}
            <span className="tabular">{o.answersToday}</span> ({pct(o.accuracyToday)})
          </span>
        </div>
      </section>

      <section aria-labelledby="progress-title">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="progress-title" className="text-xl font-bold">
            Progression globale
          </h2>
          <p className="text-sm text-ink-2 tabular">
            {o.mastered} maîtrisés sur {o.total} · {pct(o.masteredPct)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex h-4 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${o.mastered} maîtrisés, ${o.learning} en cours, ${o.newCount} nouveaux`}>
            <span className="bg-gum" style={{ width: `${(o.mastered / Math.max(1, o.total)) * 100}%` }} />
            <span className="bg-ocean" style={{ width: `${(o.learning / Math.max(1, o.total)) * 100}%` }} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Tile label="Dans la collection" value={o.total} />
            <Tile label="Nouveaux" value={o.newCount} dot="bg-line" />
            <Tile label="En cours" value={o.learning} dot="bg-ocean" />
            <Tile label="Maîtrisés" value={o.mastered} dot="bg-gum" hint="intervalle ≥ 21 jours" />
            <Tile label="Reconnus au moins 1 fois" value={o.recognized} />
            <Tile label="Bonnes réponses (total)" value={o.correctTotal} hint={`taux ${pct(o.accuracyTotal)}`} />
          </dl>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <section className="card min-w-0 p-5 lg:col-span-3" aria-labelledby="mastered-title">
          <h2 id="mastered-title" className="text-lg font-bold">
            Mots maîtrisés, 30 derniers jours
          </h2>
          <p className="mb-3 text-sm text-ink-2">Relevé chaque jour où tu révises.</p>
          <AreaChart points={rows.map((r) => ({ ts: r.ts, value: r.mastered }))} label="Évolution du nombre de mots maîtrisés" total={o.total} />
        </section>
        <section className="card min-w-0 p-5 lg:col-span-2" aria-labelledby="pos-title">
          <h2 id="pos-title" className="text-lg font-bold">
            Par catégorie
          </h2>
          <p className="mb-4 text-sm text-ink-2">Catégorie principale de chaque mot.</p>
          <ul className="flex flex-col gap-3">
            {pos.map((r) => (
              <li key={r.pos}>
                <div className="flex justify-between text-sm">
                  <span className="font-bold">{POS_PLURAL[r.pos]}</span>
                  <span className="tabular text-ink-2">
                    {r.mastered} / {r.total}
                  </span>
                </div>
                <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-surface-2">
                  <span className="bg-gum" style={{ width: `${(r.mastered / r.total) * 100}%` }} />
                  <span className="bg-ocean" style={{ width: `${(r.learning / r.total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {o.seen === 0 && (
        <Notice>
          Ta collection contient les 500 mots les plus fréquents de l’anglais parlé, classés du plus fréquent au moins fréquent. Ta première session commence par
          « be », « the », « you »… Tu peux aussi <a className="font-bold underline" href="#ajouter">ajouter tes propres mots</a>.
        </Notice>
      )}
    </div>
  );
}

function Tile({ label, value, hint, dot }: { label: string; value: number; hint?: string; dot?: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-sm text-ink-2">
        {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
        {label}
      </dt>
      <dd className="font-display text-2xl font-extrabold tabular">{value}</dd>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
