import { useMemo, useState } from 'react';
import { AreaChart, DailyBars } from '../components/Charts';
import { PageHeader, Segmented, pct } from '../components/ui';
import { formatDateTime, formatDay, formatDuration } from '../domain/dates';
import { wordOutcome } from '../domain/queue';
import { computeOverview, dailyRows, levelBreakdown, sessionHistory } from '../domain/stats';
import { parseCard } from '../domain/tracks';
import { LevelBars } from '../components/LevelBars';
import { useApp } from '../state/AppContext';

type Range = '14' | '30' | '90';

export function Stats() {
  const { words, sessions, daily, now, wordsById } = useApp();
  const [range, setRange] = useState<Range>('30');
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(20);
  const days = Number(range);
  const rows = useMemo(() => dailyRows(sessions, daily, now, days), [sessions, daily, now, days]);
  const history = useMemo(() => sessionHistory(sessions), [sessions]);
  const o = useMemo(() => computeOverview(words, sessions, now), [words, sessions, now]);
  const levels = useMemo(() => levelBreakdown(words), [words]);
  const totalTime = history.reduce((a, h) => a + h.durationMs, 0);
  const activeDays = rows.filter((r) => r.answers > 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Suivi" title="Progrès">
        <Segmented
          label="Période"
          value={range}
          onChange={setRange}
          options={[
            { value: '14', label: '14 j' },
            { value: '30', label: '30 j' },
            { value: '90', label: '90 j' },
          ]}
        />
      </PageHeader>

      <section className="card mb-6 p-5" aria-labelledby="lv-title">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="lv-title" className="text-lg font-bold">
            Par niveau
          </h2>
          <p className="text-sm text-ink-2 tabular">
            {o.recognized} reconnus · {o.producible} productibles · {o.mastered} maîtrisés (21 j et plus)
          </p>
        </div>
        <LevelBars rows={levels} />
      </section>

      <dl className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <Big label="Sessions" value={history.length} />
        <Big label="Réponses données" value={o.answersTotal} hint={`${o.correctTotal} correctes`} />
        <Big label="Taux de bonnes réponses" value={pct(o.accuracyTotal)} />
        <Big label="Temps de révision" value={formatDuration(totalTime)} />
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card min-w-0 p-5">
          <h2 className="text-lg font-bold">Réponses par jour</h2>
          <p className="mb-3 flex flex-wrap gap-4 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gum" /> correctes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-coral" /> incorrectes
            </span>
          </p>
          <DailyBars rows={rows.map((r) => ({ ts: r.ts, correct: r.correct, incorrect: r.answers - r.correct }))} label="Bonnes et mauvaises réponses par jour" />
        </section>
        <section className="card min-w-0 p-5">
          <h2 className="text-lg font-bold">Mots maîtrisés</h2>
          <p className="mb-3 text-sm text-ink-2">Intervalle de révision d’au moins 21 jours.</p>
          <AreaChart points={rows.map((r) => ({ ts: r.ts, value: r.mastered }))} label="Évolution des mots maîtrisés" total={o.total} />
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Jour par jour</h2>
        {activeDays.length === 0 ? (
          <p className="card p-5 text-ink-2">Aucune révision sur cette période.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line text-ink-2">
                <tr>
                  <th className="px-4 py-3 font-bold">Jour</th>
                  <th className="px-3 py-3 text-right font-bold">Sessions</th>
                  <th className="px-3 py-3 text-right font-bold">Mots</th>
                  <th className="px-3 py-3 text-right font-bold">Réponses</th>
                  <th className="px-3 py-3 text-right font-bold">Réussite</th>
                  <th className="px-3 py-3 text-right font-bold">Temps</th>
                  <th className="px-4 py-3 text-right font-bold">Maîtrisés</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {[...activeDays].reverse().map((r) => (
                  <tr key={r.day} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-bold first-letter:uppercase">{formatDay(r.ts)}</td>
                    <td className="px-3 py-2.5 text-right">{r.sessions}</td>
                    <td className="px-3 py-2.5 text-right">{r.words}</td>
                    <td className="px-3 py-2.5 text-right">{r.answers}</td>
                    <td className="px-3 py-2.5 text-right">{pct(r.answers ? r.correct / r.answers : null)}</td>
                    <td className="px-3 py-2.5 text-right">{formatDuration(r.activeMs)}</td>
                    <td className="px-4 py-2.5 text-right">{r.mastered ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Historique des sessions</h2>
        {history.length === 0 ? (
          <p className="card p-5 text-ink-2">Tes sessions apparaîtront ici après ta première révision.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.slice(0, shown).map((h) => {
              const s = sessions.find((x) => x.id === h.id)!;
              const isOpen = open === h.id;
              return (
                <li key={h.id} className="card overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : h.id)}
                  >
                    <span className="min-w-0">
                      <span className="block font-bold">{h.label}</span>
                      <span className="block text-sm text-ink-2">
                        {formatDateTime(h.start)} · {formatDuration(h.durationMs)}
                        {h.status === 'active' && ' · en pause'}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular">
                      <span>
                        <strong>{h.distinct}</strong> mots
                      </span>
                      <span>
                        <strong>{h.repetitions}</strong> répét.
                      </span>
                      <span className="text-gum">
                        <strong>{h.correct}</strong> ✓
                      </span>
                      <span className="text-coral">
                        <strong>{h.incorrect}</strong> ✗
                      </span>
                      <span className="font-bold">{pct(h.successRate)}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="border-t border-line bg-surface-2 px-4 py-2 text-sm">
                      {s.wordIds.map((id) => {
                        const c = parseCard(id);
                        const w = wordsById.get(c.wordId);
                        const out = wordOutcome(s, id);
                        return (
                          <li key={id} className="flex justify-between gap-3 py-1">
                            <span lang="en" className="font-bold">
                              {w?.en ?? '(mot supprimé)'}
                              {c.track === 'prod' && <span className="ml-1.5 text-xs font-normal text-wattle-ink">FR → EN</span>}
                            </span>
                            <span className="text-ink-2">
                              {out.kind === 'first-try' ? 'du premier coup' : out.kind === 'after-retries' ? `après ${out.attempts} passages` : out.attempts ? 'non terminé' : 'pas vu'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {history.length > shown && (
          <button type="button" className="btn btn-ghost mx-auto mt-3 flex" onClick={() => setShown((n) => n + 20)}>
            Afficher plus de sessions
          </button>
        )}
      </section>
    </div>
  );
}

function Big({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="font-display text-2xl font-extrabold tabular">{value}</dd>
      {hint && <p className="text-xs text-muted tabular">{hint}</p>}
    </div>
  );
}
