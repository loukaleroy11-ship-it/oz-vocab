import { useState } from 'react';
import { formatDateTime, formatDue } from '../domain/dates';
import { difficultyScore, SRS } from '../domain/srs';
import { POS_LABEL, statusTags } from '../domain/status';
import type { Word } from '../domain/types';
import { useApp } from '../state/AppContext';
import { AudioButton } from './AudioButton';
import { Icon } from './Icon';
import { ConfirmButton, FreqMeter, Ipa, Sheet, StatusChip } from './ui';
import { WordForm, contentFrom, draftFrom } from './WordForm';

const GRADE_LABEL = { again: 'Je ne connais pas', hard: 'Difficile', good: 'Je connais', easy: 'Facile' } as const;
const IPA_SOURCE: Record<string, string> = {
  'britfone-au': 'Britfone, converti en anglais australien',
  claude: 'proposée par Claude, à vérifier',
  'server-ai': 'proposée par l’IA du site, à vérifier',
  dictionary: 'dictionnaire libre (accent non précisé)',
  manual: 'saisie manuelle',
};

export function WordDetail({ wordId, onClose }: { wordId: string | null; onClose: () => void }) {
  const { now, wordsById, updateWord, resetWord, deleteWord, restoreCoreContent, startSession, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const word: Word | undefined = wordId ? wordsById.get(wordId) : undefined;
  if (!word) return null;
  const tags = statusTags(word, now);
  const s = word.srs;

  return (
    <Sheet open={!!word} onClose={() => { setEditing(false); onClose(); }} title={editing ? `Modifier « ${word.en} »` : 'Fiche du mot'}>
      {editing ? (
        <WordForm
          idPrefix={`edit-${word.id}`}
          initial={draftFrom(word)}
          submitLabel="Enregistrer"
          onCancel={() => setEditing(false)}
          onSubmit={(d) => {
            updateWord(word.id, contentFrom(d, word, word.ipaSource));
            setEditing(false);
            toast('Modifications enregistrées.', 'success');
          }}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <AudioButton text={word.en} label={`Écouter « ${word.en} »`} size="lg" audioUrl={word.audioUrl} audioAccent={word.audioAccent} />
            <div className="min-w-0">
              <p className="font-display text-3xl font-extrabold leading-tight" lang="en">
                {word.en}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
                <Ipa value={word.ipa} className="text-lg" />
                {word.ipaAlt.length > 0 && <span className="ipa text-sm text-muted">aussi {word.ipaAlt.join(', ')}</span>}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <StatusChip key={t} status={t} />
                ))}
              </div>
            </div>
          </div>

          <section>
            <p className="eyebrow">Traduction</p>
            <p className="text-xl font-bold">{word.fr}</p>
            {word.frAlt.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-ink-2">
                {word.frAlt.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </section>

          {word.exampleEn && (
            <section className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-start gap-3">
                <AudioButton text={word.exampleEn} label="Écouter l’exemple" size="sm" />
                <div className="min-w-0">
                  <p className="font-bold" lang="en">
                    {word.exampleEn}
                  </p>
                  <p className="text-ink-2">{word.exampleFr}</p>
                </div>
              </div>
            </section>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted">Catégorie</dt>
              <dd className="font-bold">
                {POS_LABEL[word.pos]}
                {word.posAlt.length > 0 && <span className="font-normal text-ink-2"> · aussi {word.posAlt.map((p) => POS_LABEL[p]).join(', ')}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Fréquence</dt>
              <dd>
                {word.rank ? (
                  <span className="font-bold tabular">
                    n° {word.rank}
                    <span className="font-normal text-muted"> (NGSL-S {word.sourceRank})</span>
                  </span>
                ) : (
                  <span className="font-bold">Mot ajouté</span>
                )}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted">À l’oral</dt>
              <dd>
                <FreqMeter perMillion={word.freqPerMillion} />
              </dd>
            </div>
            {word.forms.length > 0 && (
              <div className="col-span-2">
                <dt className="text-muted">Formes regroupées sous ce mot</dt>
                <dd lang="en">{[word.en, ...word.forms].join(', ')}</dd>
              </div>
            )}
            {word.spellingAlt.length > 0 && (
              <div className="col-span-2">
                <dt className="text-muted">Autre orthographe</dt>
                <dd>{word.spellingAlt.join(', ')}</dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="text-muted">Source de l’IPA</dt>
              <dd>{word.ipaSource ? IPA_SOURCE[word.ipaSource] : '—'}</dd>
            </div>
          </dl>

          <section>
            <p className="eyebrow mb-2">Progression</p>
            {s.reps === 0 ? (
              <p className="text-ink-2">Jamais révisé.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <Stat label="Révisions" value={s.reps} />
                <Stat label="Correctes" value={s.correct} />
                <Stat label="Incorrectes" value={s.incorrect} />
                <Stat label="Intervalle" value={s.interval ? `${s.interval} j` : 'apprentissage'} />
                <Stat label="Prochaine révision" value={formatDue(s.due, now)} />
                <Stat label="Dernière révision" value={s.lastReviewed ? formatDateTime(s.lastReviewed) : '—'} />
                <Stat label="Dernier résultat" value={s.lastGrade ? GRADE_LABEL[s.lastGrade] : '—'} />
                <Stat label="Difficulté" value={`${difficultyScore(s)} / 100`} />
                <Stat label="Facilité (SM-2)" value={s.ease.toFixed(2).replace('.', ',')} />
              </dl>
            )}
            {s.reps > 0 && s.interval < SRS.masteredInterval && (
              <p className="mt-2 text-xs text-muted">Un mot est « maîtrisé » quand son intervalle atteint {SRS.masteredInterval} jours.</p>
            )}
          </section>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                startSession([word.id], `Révision : ${word.en}`);
                onClose();
                location.hash = 'reviser';
              }}
            >
              <Icon name="cards" size={20} /> Réviser ce mot
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
              <Icon name="edit" size={20} /> Modifier
            </button>
            {word.source === 'core' && word.edited && (
              <button type="button" className="btn btn-ghost" onClick={() => { restoreCoreContent(word.id); toast('Fiche d’origine restaurée.'); }}>
                <Icon name="undo" size={20} /> Fiche d’origine
              </button>
            )}
            {s.reps > 0 && (
              <ConfirmButton confirmLabel="Oui, remettre à zéro" onConfirm={() => { resetWord(word.id); toast('Progression remise à zéro.'); }}>
                <Icon name="refresh" size={20} /> Remettre à zéro
              </ConfirmButton>
            )}
            {word.source === 'user' && (
              <ConfirmButton
                confirmLabel="Supprimer définitivement"
                onConfirm={() => {
                  deleteWord(word.id);
                  toast(`« ${word.en} » supprimé.`);
                  onClose();
                }}
              >
                <Icon name="trash" size={20} /> Supprimer
              </ConfirmButton>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold tabular">{value}</dd>
    </div>
  );
}
