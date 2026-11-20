import type { LevelRow } from '../domain/stats';

const LEVEL_NOTE: Record<string, string> = {
  A1: 'débutant',
  A2: 'élémentaire',
  B1: 'intermédiaire',
  B2: 'avancé',
  C1: 'autonome',
  C2: 'maîtrise',
};

/** Reconnus (anglais → français) et productibles (français → anglais) par niveau CECRL. */
export function LevelBars({ rows }: { rows: LevelRow[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => {
        const name = r.level ?? 'Mes mots';
        return (
          <li key={name}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span>
                <strong className="font-display text-base">{name}</strong>
                {r.level && <span className="text-ink-2"> · {LEVEL_NOTE[r.level]}</span>}
              </span>
              <span className="tabular text-ink-2">{r.total} mots</span>
            </div>
            <Bar label="Reconnus" value={r.recognized} total={r.total} cls="bg-ocean" />
            <Bar label="Productibles" value={r.producible} total={r.total} cls="bg-gum" />
          </li>
        );
      })}
    </ul>
  );
}

function Bar({ label, value, total, cls }: { label: string; value: number; total: number; cls: string }) {
  return (
    <div className="mt-1.5 grid grid-cols-[92px_1fr_64px] items-center gap-2 text-xs">
      <span className="text-ink-2">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${label} : ${value} sur ${total}`}>
        <span className={`block h-full ${cls}`} style={{ width: `${(value / Math.max(1, total)) * 100}%` }} />
      </span>
      <span className="tabular text-right font-bold">
        {value}
        <span className="font-normal text-muted"> / {total}</span>
      </span>
    </div>
  );
}
