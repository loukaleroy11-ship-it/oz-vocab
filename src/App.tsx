import { useMemo } from 'react';
import { Icon, type IconName } from './components/Icon';
import { Notice, Toasts } from './components/ui';
import { computeOverview } from './domain/stats';
import { AddWord } from './pages/AddWord';
import { Dashboard } from './pages/Dashboard';
import { CognatesPage } from './pages/Cognates';
import { Explore } from './pages/Explore';
import { TensesPage } from './pages/Express';
import { ExpressPage } from './pages/ExpressHub';
import { ExNatural, ExPhrase, ExQuick, ExRephrase, ExRightWord, ExSituations, ExStory } from './pages/Exercises';
import { PronunciationPage } from './pages/Pronunciation';
import { PlacementPage } from './pages/Placement';
import { ReviewPage } from './pages/Review';
import { SettingsPage, SyncBadge } from './pages/Settings';
import { Stats } from './pages/Stats';
import { ROUTE_LABEL, navigate, useRoute, type Route } from './router';
import { useApp } from './state/AppContext';

const NAV: { route: Route; icon: IconName; short: string }[] = [
  { route: 'accueil', icon: 'home', short: 'Accueil' },
  { route: 'reviser', icon: 'cards', short: 'Réviser' },
  { route: 'exprimer', icon: 'speech', short: 'S’exprimer' },
  { route: 'explorer', icon: 'book', short: 'Vocabulaire' },
  { route: 'ajouter', icon: 'plus', short: 'Ajouter' },
  { route: 'stats', icon: 'chart', short: 'Progrès' },
  { route: 'parametres', icon: 'gear', short: 'Paramètres' },
];
// barre du bas : 5 onglets atteignables au pouce ; les paramètres sont en haut à droite
const TABS: Route[] = ['accueil', 'reviser', 'exprimer', 'explorer', 'stats'];
// pages rattachées à un onglet (pour le surligner)
const PARENT: Partial<Record<Route, Route>> = {
  apparentes: 'explorer',
  ajouter: 'explorer',
  placement: 'accueil',
  temps: 'exprimer',
  prononciation: 'exprimer',
  'ex-phrase': 'exprimer',
  'ex-motjuste': 'exprimer',
  'ex-naturel': 'exprimer',
  'ex-reformuler': 'exprimer',
  'ex-situations': 'exprimer',
  'ex-rapide': 'exprimer',
  'ex-histoire': 'exprimer',
};

function Brand() {
  return (
    <a href="#accueil" className="flex items-center gap-2.5" aria-label="Oz Vocab, accueil">
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-ocean font-display text-lg font-extrabold text-on-ocean">
        Oz
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-bg bg-wattle" aria-hidden="true" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-lg font-extrabold">Oz Vocab</span>
        <span className="block text-[11px] font-medium text-muted">vocabulaire & expression · A2 → C1</span>
      </span>
    </a>
  );
}

export function App() {
  const { ready, loadError, words, sessions, now, activeSession, online } = useApp();
  const route = useRoute();
  const due = useMemo(() => (ready ? computeOverview(words, sessions, now) : null), [ready, words, sessions, now]);

  if (loadError) {
    return (
      <div className="gutter mx-auto max-w-lg py-16">
        <Notice tone="error">
          <p className="font-bold">Impossible de charger tes données.</p>
          <p className="mt-1">{loadError}</p>
          <button type="button" className="btn btn-primary mt-3" onClick={() => location.reload()}>
            Recharger la page
          </button>
        </Notice>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-ink-2" role="status">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-ocean border-t-transparent" aria-hidden="true" />
        Chargement de ton vocabulaire…
      </div>
    );
  }

  const inSession = route === 'reviser' && !!activeSession;
  const badge = (r: Route) =>
    r === 'reviser' && due && due.dueNow > 0 ? (
      <span className="tabular absolute -right-2 -top-1.5 min-w-5 rounded-full bg-wattle px-1 text-center text-[11px] font-bold leading-5 text-ink">
        {due.dueNow > 99 ? '99+' : due.dueNow}
      </span>
    ) : null;

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[248px_1fr]">
      {/* barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-line bg-surface px-4 py-6 lg:flex">
        <Brand />
        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
          {NAV.map((n) => (
            <a
              key={n.route}
              href={`#${n.route}`}
              aria-current={route === n.route ? 'page' : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 font-bold transition-colors ${
                route === n.route || (PARENT[route] === n.route && route !== 'ajouter')
                  ? 'bg-ocean-soft text-ocean'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <Icon name={n.icon} size={21} />
              <span className="relative">
                {ROUTE_LABEL[n.route]}
                {badge(n.route)}
              </span>
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
          {due && (
            <>
              <p>
                <strong className="tabular">{due.dueNow}</strong> à revoir maintenant
              </p>
              <p className="flex items-center gap-1.5">
                <Icon name="flame" size={16} className="text-wattle-ink" />
                <strong className="tabular">{due.streak}</strong> jour{due.streak > 1 ? 's' : ''} d’affilée
              </p>
            </>
          )}
          <SyncBadge />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* barre du haut (téléphone) */}
        {!inSession && (
          <header
            className="gutter sticky z-20 flex items-center justify-between border-b border-line bg-bg/95 py-2.5 backdrop-blur lg:hidden"
            style={{ top: 'env(safe-area-inset-top, 0px)' }}
          >
            <Brand />
            <a
              href="#parametres"
              className={`btn btn-quiet h-11 w-11 p-0 ${route === 'parametres' ? 'text-ocean' : ''}`}
              aria-label="Paramètres"
              aria-current={route === 'parametres' ? 'page' : undefined}
            >
              <Icon name="gear" />
            </a>
          </header>
        )}
        {!online && !inSession && (
          <div className="gutter bg-wattle-soft py-2 text-sm text-ink">
            <span className="inline-flex items-center gap-2">
              <Icon name="wifiOff" size={18} /> Hors ligne : les révisions continuent et sont enregistrées ; la traduction automatique est indisponible.
            </span>
          </div>
        )}

        <main id="contenu" className="gutter flex-1 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-4 lg:px-10 lg:pb-12 lg:pt-8">
          {route === 'accueil' && <Dashboard />}
          {route === 'reviser' && <ReviewPage />}
          {route === 'exprimer' && <ExpressPage />}
          {route === 'explorer' && <Explore />}
          {route === 'apparentes' && <CognatesPage />}
          {route === 'ajouter' && <AddWord />}
          {route === 'placement' && <PlacementPage />}
          {route === 'temps' && <TensesPage />}
          {route === 'prononciation' && <PronunciationPage />}
          {route === 'ex-phrase' && <ExPhrase />}
          {route === 'ex-motjuste' && <ExRightWord />}
          {route === 'ex-naturel' && <ExNatural />}
          {route === 'ex-reformuler' && <ExRephrase />}
          {route === 'ex-situations' && <ExSituations />}
          {route === 'ex-rapide' && <ExQuick />}
          {route === 'ex-histoire' && <ExStory />}
          {route === 'stats' && <Stats />}
          {route === 'parametres' && <SettingsPage />}
        </main>

        {/* barre d'onglets (téléphone) */}
        {!inSession && (
          <nav
            aria-label="Navigation principale"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
            }}
          >
            <ul className="mx-auto grid max-w-lg grid-cols-5">
              {TABS.map((r) => {
                const n = NAV.find((x) => x.route === r)!;
                const active = route === r || PARENT[route] === r;
                const main = r === 'reviser';
                return (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => navigate(r)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-bold ${active ? 'text-ocean' : 'text-ink-2'}`}
                    >
                      <span
                        className={`relative inline-flex items-center justify-center ${
                          main ? `h-10 w-14 rounded-2xl ${active ? 'bg-ocean text-on-ocean' : 'bg-ocean-soft text-ocean'}` : 'h-7 w-7'
                        }`}
                      >
                        <Icon name={n.icon} size={main ? 24 : 22} />
                        {badge(r)}
                      </span>
                      {n.short}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
      <Toasts />
    </div>
  );
}
