import { Icon } from '../components/Icon';
import { SpeakChip } from '../components/SpeakChip';
import { PageHeader } from '../components/ui';
import { AU_SPELLING, COGNATE_GROUPS, FALSE_FRIENDS, STRESS_SHIFTS } from '../data/cognates';

export function CognatesPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader eyebrow="Vocabulaire" title="Mots apparentés : les règles">
        <a href="#explorer" className="btn btn-ghost min-h-11 text-sm">
          <Icon name="chevronLeft" size={18} /> Vocabulaire
        </a>
      </PageHeader>
      <p className="-mt-3 text-ink-2">
        Une grande partie du vocabulaire anglais vient du français ou du latin. Avec ces règles de transformation, tu reconnais des milliers de mots, et
        tu peux tenter de les dire quand le mot te manque. Deux réflexes : écoute où tombe l’accent, et méfie-toi des faux amis en bas de page.
      </p>

      {COGNATE_GROUPS.map((g) => (
        <section key={g.id} className="card overflow-hidden" aria-labelledby={`cg-${g.id}`}>
          <h2 id={`cg-${g.id}`} className="border-b border-line px-4 py-3 text-lg font-bold sm:px-5">
            {g.title}
          </h2>
          <ul className="divide-y divide-line">
            {g.rules.map((r) => (
              <li key={`${r.fr}-${r.en}`} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-display text-lg font-extrabold">
                    {r.fr} <span className="text-muted">→</span> <span lang="en">{r.en}</span>
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.reliability === 'très fiable' ? 'bg-gum-soft text-gum' : 'bg-wattle-soft text-wattle-ink'}`}
                  >
                    {r.reliability}
                  </span>
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {r.examples.map(([fr, en]) => (
                    <li key={en}>
                      <SpeakChip text={en}>
                        <span className="text-ink-2">{fr}</span> → <strong lang="en">{en}</strong>
                      </SpeakChip>
                    </li>
                  ))}
                </ul>
                {r.note && <p className="mt-2 text-sm text-ink-2">{r.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card p-4 sm:p-5" aria-labelledby="cg-stress">
        <h2 id="cg-stress" className="text-lg font-bold">
          Même mot, autre prononciation
        </h2>
        <p className="mb-3 text-sm text-ink-2">L’accent tonique (en majuscules) ou le nombre de syllabes change : écoute, puis répète à voix haute.</p>
        <ul className="flex flex-wrap gap-2">
          {STRESS_SHIFTS.map((s) => (
            <li key={s.en}>
              <SpeakChip text={s.en}>
                <strong lang="en">{s.en}</strong> <span className="text-ink-2">· {s.stress}</span>
              </SpeakChip>
            </li>
          ))}
        </ul>
      </section>

      <section className="card overflow-hidden" aria-labelledby="cg-ff">
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <h2 id="cg-ff" className="text-lg font-bold">
            Faux amis fréquents
          </h2>
          <p className="text-sm text-ink-2">Ils ressemblent à un mot français mais n’ont pas le même sens.</p>
        </div>
        <ul className="divide-y divide-line">
          {FALSE_FRIENDS.map((f) => (
            <li key={f.en} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[150px_1fr_1fr] sm:items-center sm:gap-3 sm:px-5">
              <SpeakChip text={f.en.replace(/^to /, '')} className="justify-self-start">
                <strong lang="en">{f.en}</strong>
              </SpeakChip>
              <span>
                = <strong>{f.means}</strong>
              </span>
              <span className="text-ink-2">
                <Icon name="alert" size={15} className="mr-1 inline align-[-2px] text-coral" />
                {f.trap}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4 sm:p-5" aria-labelledby="cg-au">
        <h2 id="cg-au" className="text-lg font-bold">
          Orthographe en Australie
        </h2>
        <p className="mb-3 text-sm text-ink-2">Britannique pour l’essentiel, avec quelques particularités.</p>
        <ul className="flex flex-col gap-2 text-sm">
          {AU_SPELLING.map((a) => (
            <li key={a.rule} className="flex flex-wrap gap-x-2">
              <strong>{a.rule}</strong>
              <span className="text-ink-2" lang="en">
                {a.examples}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
