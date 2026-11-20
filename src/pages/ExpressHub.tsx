import { useMemo } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader } from '../components/ui';
import { startOfDay } from '../domain/dates';
import { currentStage, stageProgress, type PracticeKind } from '../domain/practice';
import type { Route } from '../router';
import { useApp } from '../state/AppContext';
import { LevelPicker } from './Exercises';

interface Card {
  route: Route;
  kind?: PracticeKind;
  icon: IconName;
  title: string;
  text: string;
}

const EXERCISES: Card[] = [
  { route: 'ex-phrase', kind: 'phrase', icon: 'edit', title: 'Phrase avec le mot', text: 'Réutilise tes mots récents dans une phrase, avec une consigne de ton niveau.' },
  { route: 'ex-motjuste', kind: 'motjuste', icon: 'target', title: 'Le mot juste', text: 'Choisis le synonyme adapté au contexte et comprends la nuance.' },
  { route: 'ex-naturel', kind: 'naturel', icon: 'sparkle', title: 'Plus naturel', text: 'Corrige les calques du français : I am agree, since 3 weeks…' },
  { route: 'ex-reformuler', kind: 'reformuler', icon: 'refresh', title: 'Reformuler', text: 'Plus simple, plus poli, plus formel, plus nuancé.' },
  { route: 'ex-situations', kind: 'situation', icon: 'speech', title: 'Situations', text: 'Livraison, entretien, chantier, mine, auberge, BBQ : prépare-toi, parle, compare.' },
  { route: 'ex-rapide', kind: 'rapide', icon: 'flame', title: 'Réponse rapide', text: '10 questions, 20 secondes chacune, sans préparer.' },
  { route: 'ex-histoire', kind: 'histoire', icon: 'mic', title: 'Mon histoire', text: 'Raconte la même histoire 3 fois ; les mots qui manquent vont dans ton vocabulaire.' },
];

const GUIDES: Card[] = [
  { route: 'temps', icon: 'book', title: 'Les 5 temps essentiels', text: 'Quand et comment les utiliser, pièges de francophone, quiz.' },
  { route: 'prononciation', icon: 'volume', title: 'Prononciation', text: 'Les sons difficiles pour un francophone et l’accent australien : écoute, répète, compare.' },
];

export function ExpressPage() {
  const { practice, words, now, settings } = useApp();
  const stages = useMemo(() => stageProgress(words, practice), [words, practice]);
  const recommended = currentStage(stages);
  const today = startOfDay(now);
  const todayCount = practice.filter((p) => p.at >= today).length;
  const countOf = (kind?: PracticeKind) => (kind ? practice.filter((p) => p.kind === kind).length : 0);
  // entraînement du jour : 2 exercices qui tournent chaque jour, dont une situation un jour sur deux
  const day = Math.floor(today / 86_400_000);
  const daily = [EXERCISES[day % EXERCISES.length], EXERCISES[(day + 3) % EXERCISES.length]];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader eyebrow="Parler" title="S’exprimer">
        <LevelPicker />
      </PageHeader>
      <p className="-mt-3 text-ink-2">
        Tout se travaille à voix haute : tu réponds, tu t’enregistres si tu veux, puis tu compares avec une réponse modèle de ton niveau et une version
        un cran au-dessus.{' '}
        {recommended !== settings.practiceLevel && (
          <span>
            Niveau conseillé d’après tes progrès : <strong>{recommended}</strong>.
          </span>
        )}
      </p>

      <section className="card p-5" aria-labelledby="daily-ex">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="daily-ex" className="text-lg font-bold">
            Entraînement du jour
          </h2>
          <p className="tabular text-sm text-ink-2">
            {todayCount} exercice{todayCount > 1 ? 's' : ''} fait{todayCount > 1 ? 's' : ''} aujourd’hui
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {daily.map((c) => (
            <CardLink key={c.route} c={c} count={countOf(c.kind)} highlight />
          ))}
        </div>
      </section>

      <section aria-labelledby="all-ex">
        <h2 id="all-ex" className="mb-3 text-lg font-bold">
          Tous les exercices
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXERCISES.map((c) => (
            <CardLink key={c.route} c={c} count={countOf(c.kind)} />
          ))}
        </div>
      </section>

      <section aria-labelledby="guides">
        <h2 id="guides" className="mb-3 text-lg font-bold">
          Fiches
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map((c) => (
            <CardLink key={c.route} c={c} count={0} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CardLink({ c, count, highlight = false }: { c: Card; count: number; highlight?: boolean }) {
  return (
    <a href={`#${c.route}`} className={`card flex items-start gap-3 p-4 transition-colors hover:border-ocean ${highlight ? 'bg-ocean-soft/40' : ''}`}>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wattle-soft text-wattle-ink">
        <Icon name={c.icon} />
      </span>
      <span className="min-w-0">
        <strong className="block">{c.title}</strong>
        <span className="text-sm text-ink-2">{c.text}</span>
        {count > 0 && <span className="mt-1 block text-xs text-muted tabular">{count} fait{count > 1 ? 's' : ''}</span>}
      </span>
    </a>
  );
}
