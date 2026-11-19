import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { Icon } from '../components/Icon';
import { Ipa, PageHeader, PosChip, StatusChip } from '../components/ui';
import { WordDetail } from '../components/WordDetail';
import { EMPTY_FILTER, applyFilter, describeFilter, type FreqPreset, type SortKey, type SourceFilter, type WordFilter } from '../domain/filters';
import { POS_PLURAL, STATUS_FILTER_LABEL, STATUS_LABEL, primaryStatus } from '../domain/status';
import { POS_LIST, type LearningStatus, type Pos } from '../domain/types';
import { navigate } from '../router';
import { useApp } from '../state/AppContext';

const PAGE = 60;
const FREQ: { v: FreqPreset; l: string }[] = [
  { v: 'all', l: 'Tous' },
  { v: 'top100', l: 'Top 100' },
  { v: 'top250', l: 'Top 250' },
  { v: 'top500', l: 'Top 500' },
  { v: 'range', l: 'Plage de rangs' },
];
const STATUSES: LearningStatus[] = ['new', 'learning', 'due', 'difficult', 'mastered'];
const SORTS: { v: SortKey; l: string }[] = [
  { v: 'rank-asc', l: 'Plus fréquents d’abord' },
  { v: 'rank-desc', l: 'Moins fréquents d’abord' },
  { v: 'alpha', l: 'Ordre alphabétique' },
  { v: 'recent', l: 'Ajoutés récemment' },
  { v: 'due', l: 'Prochaine révision' },
];
const STORAGE_KEY = 'oz-vocab.explore-filter';

function loadFilter(): WordFilter {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY_FILTER, ...JSON.parse(raw) };
  } catch {
    /* stockage indisponible : filtre par défaut */
  }
  return EMPTY_FILTER;
}

export function Explore() {
  const { words, now, startFromWords, toast } = useApp();
  const [f, setF] = useState<WordFilter>(loadFilter);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const [detail, setDetail] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const query = useDeferredValue(f.query);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      /* facultatif */
    }
    setLimit(PAGE);
  }, [f]);

  const results = useMemo(() => applyFilter(words, { ...f, query }, now), [words, f, query, now]);
  const userCount = useMemo(() => words.filter((w) => w.source === 'user' && !w.deleted).length, [words]);
  const activeFilters = (f.freq !== 'all' ? 1 : 0) + f.pos.length + f.status.length + (f.source !== 'all' ? 1 : 0);
  const set = <K extends keyof WordFilter>(k: K, v: WordFilter[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const selectedWords = results.filter((w) => selected.has(w.id));
  const label = describeFilter(f, (p) => POS_PLURAL[p].toLowerCase(), (s) => STATUS_LABEL[s].toLowerCase());

  function review(list: typeof results, title: string) {
    const s = startFromWords(list, title);
    if (!s) {
      toast('Aucun mot à réviser dans cette sélection.', 'error');
      return;
    }
    setSelected(new Set());
    navigate('reviser');
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Vocabulaire" title="Explorer le vocabulaire" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="explore-search"
              type="search"
              className="field pl-10"
              placeholder="Chercher en anglais ou en français…"
              value={f.query}
              onChange={(e) => set('query', e.target.value)}
              autoCapitalize="none"
              aria-label="Rechercher un mot"
            />
          </div>
          <button
            type="button"
            className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'} lg:hidden`}
            onClick={() => setShowFilters((x) => !x)}
            aria-expanded={showFilters}
          >
            <Icon name="filter" size={20} /> Filtres{activeFilters ? ` (${activeFilters})` : ''}
          </button>
        </div>

        <div className={`${showFilters ? 'flex' : 'hidden'} card flex-col gap-4 p-4 lg:flex`}>
          <FilterRow title="Fréquence">
            {FREQ.map((o) => (
              <button key={o.v} type="button" className="chip" aria-pressed={f.freq === o.v} onClick={() => set('freq', o.v)}>
                {o.l}
              </button>
            ))}
            {f.freq === 'range' && (
              <span className="inline-flex items-center gap-2 text-sm">
                <label htmlFor="range-from">de</label>
                <input
                  id="range-from"
                  type="number"
                  min={1}
                  max={500}
                  className="field w-20 min-h-10 py-1"
                  value={f.rangeFrom}
                  onChange={(e) => set('rangeFrom', Number(e.target.value) || 1)}
                />
                <label htmlFor="range-to">à</label>
                <input
                  id="range-to"
                  type="number"
                  min={1}
                  max={500}
                  className="field w-20 min-h-10 py-1"
                  value={f.rangeTo}
                  onChange={(e) => set('rangeTo', Number(e.target.value) || 500)}
                />
              </span>
            )}
          </FilterRow>
          <FilterRow title="Catégorie grammaticale">
            {POS_LIST.filter((p) => p !== 'other' || words.some((w) => w.pos === 'other')).map((p: Pos) => (
              <button key={p} type="button" className="chip" aria-pressed={f.pos.includes(p)} onClick={() => set('pos', toggle(f.pos, p))}>
                {POS_PLURAL[p]}
              </button>
            ))}
          </FilterRow>
          <FilterRow title="État d’apprentissage">
            {STATUSES.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={f.status.includes(s)} onClick={() => set('status', toggle(f.status, s))}>
                {STATUS_FILTER_LABEL[s]}
              </button>
            ))}
          </FilterRow>
          <div className="flex flex-wrap items-end gap-4">
            <FilterRow title="Source">
              {(
                [
                  ['all', 'Tous'],
                  ['core', '500 mots'],
                  ['user', `Mes mots (${userCount})`],
                ] as [SourceFilter, string][]
              ).map(([v, l]) => (
                <button key={v} type="button" className="chip" aria-pressed={f.source === v} onClick={() => set('source', v)}>
                  {l}
                </button>
              ))}
            </FilterRow>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="explore-sort" className="eyebrow">
                Tri
              </label>
              <select id="explore-sort" className="field min-h-10 py-1" value={f.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
                {SORTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </div>
            {(activeFilters > 0 || f.query) && (
              <button type="button" className="btn btn-quiet text-ocean" onClick={() => setF(EMPTY_FILTER)}>
                Effacer les filtres
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-sm text-ink-2" aria-live="polite">
            <strong className="tabular text-ink">{results.length}</strong> mot{results.length > 1 ? 's' : ''} · {label}
          </p>
          <div className="flex flex-wrap gap-2">
            {results.length > 0 && (
              <button type="button" className="btn btn-ghost min-h-10" onClick={() => review(results, label)}>
                <Icon name="cards" size={20} /> Réviser ces mots
              </button>
            )}
          </div>
        </div>

        {results.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="font-bold">Aucun mot ne correspond.</p>
            <p className="mt-1 text-sm text-ink-2">Modifie la recherche ou les filtres, ou ajoute ce mot à ta collection.</p>
            <button type="button" className="btn btn-primary mt-4" onClick={() => navigate('ajouter')}>
              <Icon name="plus" size={20} /> Ajouter un mot
            </button>
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {results.slice(0, limit).map((w) => {
              const checked = selected.has(w.id);
              return (
                <li key={w.id} className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${checked ? 'bg-ocean-soft' : ''}`}>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-[var(--ocean)]"
                    checked={checked}
                    aria-label={`Sélectionner « ${w.en} »`}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(w.id)) n.delete(w.id);
                        else n.add(w.id);
                        return n;
                      })
                    }
                  />
                  <span className="hidden w-10 shrink-0 text-right text-sm text-muted tabular sm:block">{w.rank ?? '·'}</span>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDetail(w.id)}>
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold" lang="en">
                        {w.en}
                      </span>
                      <Ipa value={w.ipa} className="text-sm text-muted" />
                    </span>
                    <span className="block truncate text-sm text-ink-2">{w.fr}</span>
                  </button>
                  <span className="hidden shrink-0 sm:inline-flex">
                    <PosChip pos={w.pos} />
                  </span>
                  <span className="shrink-0">
                    <StatusChip status={primaryStatus(w, now)} />
                  </span>
                  <AudioButton text={w.en} label={`Écouter « ${w.en} »`} size="sm" audioUrl={w.audioUrl} audioAccent={w.audioAccent} />
                </li>
              );
            })}
          </ul>
        )}
        {results.length > limit && (
          <button type="button" className="btn btn-ghost mx-auto" onClick={() => setLimit((l) => l + PAGE)}>
            Afficher {Math.min(PAGE, results.length - limit)} mots de plus
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div
          className="fixed inset-x-0 z-30 flex justify-center px-4"
          style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="anim-toast flex flex-wrap items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-bg shadow-card lg:ml-[248px]">
            <span className="text-sm font-bold tabular">
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
            <button type="button" className="btn min-h-10 bg-bg text-ink" onClick={() => review(selectedWords.length ? selectedWords : words.filter((w) => selected.has(w.id)), `Sélection de ${selected.size} mot${selected.size > 1 ? 's' : ''}`)}>
              Réviser la sélection
            </button>
            <button type="button" className="btn btn-quiet min-h-10 text-bg hover:text-ink" onClick={() => setSelected(new Set())}>
              Désélectionner
            </button>
          </div>
        </div>
      )}

      <WordDetail wordId={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function FilterRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="eyebrow">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
