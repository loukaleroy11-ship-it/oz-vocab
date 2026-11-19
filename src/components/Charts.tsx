/** Graphiques SVG légers (aucune bibliothèque) dessinés à l'échelle. */
import { useEffect, useId, useRef, useState } from 'react';

/** Maximum « rond » dont la moitié est un entier (graduations 0, max/2, max). */
function niceMax(v: number): number {
  if (v <= 4) return 4;
  let pow = 10 ** Math.floor(Math.log10(v));
  for (;;) {
    for (const m of [1, 2, 5]) if (m * pow >= v && (m * pow) % 2 === 0) return m * pow;
    pow *= 10;
  }
}

/** Largeur réelle du conteneur : le dessin garde des textes lisibles à toutes les tailles. */
function useWidth(fallback = 600) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

const shortDay = (ts: number) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(ts).replace('.', '');

export interface Point {
  ts: number;
  value: number | null;
}

/** Courbe en aire : évolution du nombre de mots maîtrisés. */
export function AreaChart({ points, label, total }: { points: Point[]; label: string; total?: number }) {
  const gid = useId().replace(/:/g, '');
  const { ref, w: W } = useWidth();
  const H = Math.round(Math.min(240, Math.max(170, W * 0.42)));
  const pad = { l: 40, r: 16, t: 16, b: 30 };
  const values = points.map((p) => p.value ?? 0);
  const maxV = niceMax(Math.max(1, ...values));
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / maxV);
  const known = points.map((p, i) => ({ ...p, i })).filter((p) => p.value != null) as Array<Point & { i: number; value: number }>;
  const line = known.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = known.length
    ? `${line} L${x(known[known.length - 1].i).toFixed(1)},${y(0)} L${x(known[0].i).toFixed(1)},${y(0)} Z`
    : '';
  const ticks = [0, maxV / 2, maxV];
  const last = known[known.length - 1];
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor(W / 90)));
  return (
    <figure className="m-0" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--ocean)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--ocean)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? '' : '3 4'} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)" className="tabular">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.ts} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="12" fill="var(--muted)">
              {shortDay(p.ts)}
            </text>
          ) : null,
        )}
        {area && <path d={area} fill={`url(#${gid})`} />}
        {line && <path d={line} fill="none" stroke="var(--ocean)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {last && (
          <g>
            <circle cx={x(last.i)} cy={y(last.value)} r="5.5" fill="var(--surface)" stroke="var(--ocean)" strokeWidth="2.5" />
            <text
              x={Math.min(x(last.i), W - pad.r - 4)}
              y={Math.max(14, y(last.value) - 12)}
              textAnchor="end"
              fontSize="13"
              fontWeight="700"
              fill="var(--ink)"
              className="tabular"
            >
              {last.value}
              {total ? ` / ${total}` : ''}
            </text>
          </g>
        )}
      </svg>
      {!known.length && <figcaption className="text-sm text-muted">Pas encore de données : la courbe apparaît après ta première révision.</figcaption>}
    </figure>
  );
}

/** Barres empilées : bonnes et mauvaises réponses par jour. */
export function DailyBars({ rows, label }: { rows: Array<{ ts: number; correct: number; incorrect: number }>; label: string }) {
  const { ref, w: W } = useWidth();
  const H = Math.round(Math.min(200, Math.max(150, W * 0.36)));
  const pad = { l: 34, r: 8, t: 12, b: 28 };
  const maxV = niceMax(Math.max(1, ...rows.map((r) => r.correct + r.incorrect)));
  const bw = (W - pad.l - pad.r) / rows.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / maxV);
  const labelEvery = Math.ceil(rows.length / Math.max(2, Math.floor(W / 90)));
  return (
    <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      {[0, maxV / 2, maxV].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? '' : '3 4'} />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
            {Math.round(t)}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const x0 = pad.l + i * bw + bw * 0.18;
        const w = bw * 0.64;
        const hc = y(0) - y(r.correct);
        const hi = y(0) - y(r.incorrect);
        return (
          <g key={r.ts}>
            {r.correct > 0 && <rect x={x0} y={y(r.correct)} width={w} height={hc} rx="3" fill="var(--gum)" />}
            {r.incorrect > 0 && <rect x={x0} y={y(r.correct + r.incorrect)} width={w} height={hi} rx="3" fill="var(--coral)" opacity="0.85" />}
            {(i % labelEvery === 0 || i === rows.length - 1) && (
              <text
                x={i === rows.length - 1 ? W - pad.r : i === 0 ? pad.l : x0 + w / 2}
                y={H - 8}
                textAnchor={i === rows.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'}
                fontSize="12"
                fill="var(--muted)"
              >
                {shortDay(r.ts)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
    </div>
  );
}
