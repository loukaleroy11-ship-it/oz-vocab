import { Icon } from '../components/Icon';
import { RecordCompare } from '../components/RecordCompare';
import { Notice, PageHeader } from '../components/ui';
import { PRON_TIPS } from '../data/pronunciation';
import { describeVoice } from '../services/speech';
import { useApp } from '../state/AppContext';

export function PronunciationPage() {
  const { settings } = useApp();
  const voice = describeVoice(settings.voiceURI);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PageHeader eyebrow="S’exprimer" title="Prononciation">
        <a href="#exprimer" className="btn btn-ghost min-h-11 text-sm">
          <Icon name="chevronLeft" size={18} /> Exercices
        </a>
      </PageHeader>
      <p className="-mt-3 text-ink-2">
        Pour chaque son : lis l’explication, écoute le modèle, enregistre-toi, puis écoute « Modèle puis moi » pour comparer. Le site n’analyse pas ta voix :
        c’est ton oreille qui juge, et elle progresse vite. Tes enregistrements restent sur ton appareil et disparaissent quand tu quittes la page.
      </p>
      {!voice.australian && (
        <Notice>
          Pas de voix australienne sur cet appareil{voice.voice ? ` : les modèles sont lus par ${voice.voice.name} (${voice.voice.lang})` : ''}.{' '}
          <a className="font-bold underline" href="#parametres">
            Comment en installer une
          </a>
        </Notice>
      )}
      {PRON_TIPS.map((t, i) => (
        <details key={t.id} className="card group overflow-hidden" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <strong className="text-lg">{t.title}</strong>
            <Icon name="chevronRight" className="shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <div className="flex flex-col gap-4 border-t border-line p-4">
            <p>{t.how}</p>
            {t.trap && (
              <p className="rounded-2xl bg-coral-soft/60 px-3 py-2 text-sm">
                <strong>Piège · </strong>
                {t.trap}
              </p>
            )}
            <ul className="flex flex-col gap-3">
              {t.practice.map((p) => (
                <li key={p} className="rounded-2xl bg-surface-2 p-3">
                  <p className="font-bold" lang="en">
                    {p}
                  </p>
                  <RecordCompare model={p.replace(/ · /g, ', ')} className="mt-2" />
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}
    </div>
  );
}
