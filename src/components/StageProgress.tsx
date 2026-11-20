import { PRODUCIBLE_TARGET, SITUATIONS_TARGET, currentStage, type StageProgress } from '../domain/practice';
import { pct } from './ui';

/** Progression A2 → B1 → B2 → C1 : 80 % des mots productibles + 5 situations réussies par niveau. */
export function StageProgressList({ stages }: { stages: StageProgress[] }) {
  const cur = currentStage(stages);
  return (
    <ol className="flex flex-col gap-4">
      {stages.map((s) => {
        const state = s.passed ? 'validé' : s.level === cur ? 'en cours' : 'à venir';
        return (
          <li key={s.level} className={state === 'à venir' ? 'opacity-70' : ''}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span>
                <strong className="font-display text-base">{s.level}</strong>{' '}
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    state === 'validé' ? 'bg-gum-soft text-gum' : state === 'en cours' ? 'bg-ocean-soft text-ocean' : 'bg-surface-2 text-ink-2'
                  }`}
                >
                  {state}
                </span>
              </span>
              <span className="tabular text-ink-2">
                {s.producible} / {s.total} productibles · {Math.min(s.situations, SITUATIONS_TARGET)} / {SITUATIONS_TARGET} situations
              </span>
            </div>
            <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${s.level} : ${pct(s.ratio)} des mots productibles`}>
              <span className="absolute inset-y-0 left-0 bg-ocean-soft" style={{ width: `${(s.recognized / Math.max(1, s.total)) * 100}%` }} />
              <span className="absolute inset-y-0 left-0 bg-gum" style={{ width: `${s.ratio * 100}%` }} />
              <span className="absolute inset-y-0 w-0.5 bg-ink/40" style={{ left: `${PRODUCIBLE_TARGET * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
