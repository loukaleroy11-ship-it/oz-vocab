/**
 * Navigation par ancre (#accueil, #reviser…) : fonctionne sur n'importe quel
 * hébergeur statique sans règle de réécriture, et dans claude.ai.
 */
import { useEffect, useState } from 'react';

export const ROUTES = ['accueil', 'reviser', 'exprimer', 'explorer', 'apparentes', 'ajouter', 'placement', 'stats', 'parametres'] as const;
export type Route = (typeof ROUTES)[number];

export const ROUTE_LABEL: Record<Route, string> = {
  accueil: 'Accueil',
  reviser: 'Réviser',
  exprimer: 'S’exprimer',
  explorer: 'Vocabulaire',
  apparentes: 'Mots apparentés',
  ajouter: 'Ajouter un mot',
  placement: 'Test de placement',
  stats: 'Progrès',
  parametres: 'Paramètres',
};

function current(): Route {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#/, '');
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : 'accueil';
}

export function navigate(route: Route) {
  if (current() === route) {
    window.scrollTo({ top: 0 });
    return;
  }
  location.hash = route;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(current);
  useEffect(() => {
    const on = () => {
      setRoute(current());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
