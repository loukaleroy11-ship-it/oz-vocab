import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Ipa, Notice, PageHeader, PosChip, Segmented } from '../components/ui';
import { WordDetail } from '../components/WordDetail';
import { WordForm, contentFrom, draftFrom, type WordDraft } from '../components/WordForm';
import { detectLanguage, type Lang } from '../domain/lang';
import { englishKey } from '../domain/text';
import type { IpaSource, Word, WordContent } from '../domain/types';
import { navigate } from '../router';
import { capabilityErrorCode } from '../services/claudeRuntime';
import { findExisting, lookupWord, providerStatus, type LookupCandidate, type LookupResult, type ProviderStatus } from '../services/lookup';
import { playUrl } from '../services/speech';
import { useApp } from '../state/AppContext';

type LangChoice = 'auto' | Lang;
type Stage =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'result'; result: LookupResult }
  | { kind: 'form'; draft: WordDraft; base: Partial<WordContent>; ipaSource: IpaSource | null; origin: string; result: LookupResult | null }
  | { kind: 'saved'; word: Word };

const LANG_NAME: Record<Lang, string> = { en: 'anglais', fr: 'français' };

/** Mot à chercher en arrivant sur la page (depuis « Mon histoire »). */
let prefill: string | null = null;
export function setAddPrefill(text: string) {
  prefill = text;
}

export function AddWord() {
  const { words, langIndex, settings, addWord, startSession, toast, online, inClaude } = useApp();
  const [input, setInput] = useState(() => {
    const p = prefill ?? '';
    prefill = null;
    return p;
  });
  const [lang, setLang] = useState<LangChoice>('auto');
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [dupConfirm, setDupConfirm] = useState<WordDraft | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    providerStatus().then(setStatus);
  }, [online]);

  const detection = input.trim() ? detectLanguage(input, langIndex) : null;

  async function search() {
    const text = input.trim();
    if (!text) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setStage({ kind: 'searching' });
    try {
      const result = await lookupWord(text, {
        words,
        index: langIndex,
        forcedLang: lang === 'auto' ? null : lang,
        signal: c.signal,
        accessCode: settings.lookupAccessCode,
      });
      if (c.signal.aborted) return;
      if (result.candidates.length === 1 && !result.existing.length) {
        openForm(result.candidates[0], result);
      } else {
        setStage({ kind: 'result', result });
      }
    } catch (e) {
      if (capabilityErrorCode(e) === 'cancelled' || (e instanceof DOMException && e.name === 'AbortError')) {
        setStage({ kind: 'idle' });
        return;
      }
      setStage({ kind: 'idle' });
      toast('La recherche a échoué. Réessaie ou remplis la fiche à la main.', 'error');
    }
  }

  function openForm(c: LookupCandidate, result: LookupResult) {
    const dictIpa = result.dictionary?.ipa ?? null;
    const ipa = c.ipa ?? dictIpa;
    const ipaSource: IpaSource | null = c.ipa
      ? result.provider === 'claude'
        ? 'claude'
        : result.provider === 'server'
          ? 'server-ai'
          : 'dictionary'
      : dictIpa
        ? 'dictionary'
        : null;
    const base: Partial<WordContent> = { ...c, ipa, ipaSource, ipaAlt: [], forms: [], spellingAlt: [], posAlt: [] };
    setStage({ kind: 'form', draft: draftFrom(base), base, ipaSource, origin: result.providerLabel, result });
  }

  function manual(prefill?: { en?: string; fr?: string }) {
    const base: Partial<WordContent> = { en: prefill?.en ?? '', fr: prefill?.fr ?? '', pos: 'noun' };
    setStage({ kind: 'form', draft: draftFrom(base), base, ipaSource: null, origin: 'Saisie manuelle', result: null });
  }

  function save(d: WordDraft, force = false) {
    if (stage.kind !== 'form') return;
    const dup = words.find((w) => !w.deleted && englishKey(w.en) === englishKey(d.en));
    if (dup && !force) {
      setDupConfirm(d);
      return;
    }
    const content = contentFrom(d, stage.base, stage.ipaSource);
    const audio = stage.result?.dictionary?.audio && englishKey(stage.result.candidates[0]?.en ?? '') === englishKey(content.en) ? stage.result.dictionary.audio : null;
    const w = addWord(content, { audioUrl: audio?.url ?? null, audioAccent: audio?.accent ?? null });
    setDupConfirm(null);
    setStage({ kind: 'saved', word: w });
    setInput('');
  }

  const dupWord = dupConfirm ? words.find((w) => !w.deleted && englishKey(w.en) === englishKey(dupConfirm.en)) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Ma collection" title="Ajouter un mot" />

      <section className="card p-4 sm:p-5">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label htmlFor="add-input" className="font-bold">
            Mot ou expression, en anglais ou en français
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="add-input"
              className="field text-lg"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ex. courageux, to improve, arvo…"
              autoCapitalize="none"
              autoComplete="off"
              maxLength={120}
            />
            <button type="submit" className="btn btn-primary h-12 shrink-0" disabled={!input.trim() || stage.kind === 'searching'}>
              <Icon name="search" size={20} /> {stage.kind === 'searching' ? 'Recherche…' : 'Rechercher'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Langue saisie"
              value={lang}
              onChange={setLang}
              options={[
                { value: 'auto', label: 'Détection auto' },
                { value: 'en', label: 'Anglais' },
                { value: 'fr', label: 'Français' },
              ]}
            />
            {lang === 'auto' && detection?.lang && (
              <span className="text-sm text-ink-2">
                Détecté : <strong>{LANG_NAME[detection.lang]}</strong>
                {!detection.confident && ' (probable)'}
              </span>
            )}
          </div>
        </form>
        {status && (
          <p className="mt-3 flex items-start gap-2 text-sm text-ink-2">
            <Icon name={status.id === 'none' ? 'alert' : 'sparkle'} size={18} className={`mt-0.5 shrink-0 ${status.id === 'none' ? 'text-wattle-ink' : 'text-ocean'}`} />
            <span>
              <strong className="text-ink">{status.label}.</strong> {status.detail}
              {!online && ' Tu es hors ligne : seule la saisie manuelle fonctionne.'}
            </span>
          </p>
        )}
        <button type="button" className="btn btn-quiet mt-2 text-ocean" onClick={() => manual(detection?.lang === 'fr' ? { fr: input.trim() } : { en: input.trim() })}>
          <Icon name="edit" size={18} /> Remplir la fiche à la main
        </button>
      </section>

      <div className="mt-5" aria-live="polite">
        {stage.kind === 'searching' && (
          <div className="card flex items-center gap-3 p-5 text-ink-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-ocean border-t-transparent" aria-hidden="true" />
            {inClaude ? 'Claude prépare la fiche… (une autorisation peut t’être demandée)' : 'Recherche de la traduction…'}
            <button type="button" className="btn btn-quiet ml-auto" onClick={() => ctl.current?.abort()}>
              Arrêter
            </button>
          </div>
        )}

        {stage.kind === 'result' && <ResultView result={stage.result} onPick={(c) => openForm(c, stage.result)} onManual={manual} onOpen={setDetail} />}

        {stage.kind === 'form' && (
          <section className="card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold">Vérifie la fiche</h2>
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-ink-2">{stage.origin}</span>
            </div>
            {stage.result && stage.result.provider !== 'none' && (
              <div className="mb-4">
                <Notice>Traduction et exemple proposés automatiquement : relis-les et corrige-les si besoin avant d’enregistrer.</Notice>
              </div>
            )}
            {stage.result?.dictionary?.audio && (
              <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                <button type="button" className="btn btn-ghost min-h-10" onClick={() => playUrl(stage.result!.dictionary!.audio!.url)}>
                  <Icon name="volume" size={18} /> Enregistrement {stage.result.dictionary.audio.accent === 'au' ? 'australien' : stage.result.dictionary.audio.accent === 'uk' ? 'britannique' : stage.result.dictionary.audio.accent === 'us' ? 'américain' : ''} (Wiktionary)
                </button>
              </p>
            )}
            <WordForm
              key={JSON.stringify(stage.draft)}
              idPrefix="add"
              initial={stage.draft}
              submitLabel="Ajouter à ma collection"
              onSubmit={(d) => save(d)}
              onCancel={() => setStage({ kind: 'idle' })}
              ipaNote={
                stage.ipaSource === 'claude' || stage.ipaSource === 'server-ai'
                  ? 'Proposée par l’IA en anglais australien : à vérifier.'
                  : stage.ipaSource === 'dictionary'
                    ? 'Issue d’un dictionnaire libre ; l’accent n’est pas précisé.'
                    : 'Non trouvée automatiquement. Tu peux la laisser vide.'
              }
            />
            {dupConfirm && dupWord && (
              <div className="mt-4 rounded-2xl bg-wattle-soft p-4">
                <p className="font-bold">« {dupWord.en} » est déjà dans ta collection ({dupWord.fr}).</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-ghost bg-surface" onClick={() => setDetail(dupWord.id)}>
                    Voir le mot existant
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => save(dupConfirm, true)}>
                    Ajouter quand même (autre sens)
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {stage.kind === 'saved' && (
          <section className="card p-5">
            <p className="flex items-center gap-2 text-lg font-bold text-gum">
              <Icon name="check" /> « {stage.word.en} » ajouté à ta collection.
            </p>
            <p className="mt-1 text-ink-2">Il fera partie de tes prochaines sessions, avant les mots de la liste de fréquence.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  startSession([stage.word.id], `Révision : ${stage.word.en}`);
                  navigate('reviser');
                }}
              >
                <Icon name="cards" size={20} /> Le réviser maintenant
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setStage({ kind: 'idle' });
                  document.getElementById('add-input')?.focus();
                }}
              >
                <Icon name="plus" size={20} /> Ajouter un autre mot
              </button>
            </div>
          </section>
        )}
      </div>
      <WordDetail wordId={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function ResultView({
  result,
  onPick,
  onManual,
  onOpen,
}: {
  result: LookupResult;
  onPick: (c: LookupCandidate) => void;
  onManual: (p?: { en?: string; fr?: string }) => void;
  onOpen: (id: string) => void;
}) {
  const { words } = useApp();
  const prefill = result.lang === 'fr' ? { fr: result.input } : { en: result.input.replace(/^to\s+/i, '') };
  return (
    <div className="flex flex-col gap-4">
      {result.existing.length > 0 && (
        <Notice tone="warn">
          <p className="font-bold">Déjà dans ta collection :</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {result.existing.slice(0, 6).map((w) => (
              <li key={w.id}>
                <button type="button" className="rounded-lg bg-surface px-2 py-1 text-left font-bold underline-offset-2 hover:underline" onClick={() => onOpen(w.id)}>
                  {w.en} <span className="font-normal text-ink-2">· {w.fr}</span>
                </button>
              </li>
            ))}
          </ul>
        </Notice>
      )}
      {result.error && (
        <Notice tone="warn">
          <p>{result.error}</p>
          <button type="button" className="btn btn-ghost mt-3 min-h-10 bg-surface" onClick={() => onManual(prefill)}>
            <Icon name="edit" size={18} /> Remplir à la main
          </button>
        </Notice>
      )}
      {result.candidates.length > 0 && (
        <section>
          <h2 className="mb-1 text-xl font-bold">{result.candidates.length > 1 ? 'Plusieurs traductions possibles' : 'Traduction proposée'}</h2>
          {result.candidates.length > 1 && <p className="mb-3 text-sm text-ink-2">Choisis le sens que tu veux apprendre ; tu pourras modifier la fiche ensuite.</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {result.candidates.map((c, i) => {
              const exists = findExisting(words, c.en).some((w) => englishKey(w.en) === englishKey(c.en));
              return (
                <li key={i} className="min-w-0">
                  <button type="button" onClick={() => onPick(c)} className="card flex h-full w-full flex-col gap-2 p-4 text-left transition-colors hover:border-ocean">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="font-display text-2xl font-extrabold" lang="en">
                        {c.en}
                      </span>
                      <Ipa value={c.ipa} className="text-sm text-muted" />
                    </span>
                    <span className="font-bold">{c.fr}</span>
                    {c.sense && <span className="text-sm text-ink-2">Sens : {c.sense}</span>}
                    <span className="flex flex-wrap items-center gap-2">
                      <PosChip pos={c.pos} />
                      {exists && <span className="text-xs font-bold text-wattle-ink">déjà dans ta collection</span>}
                    </span>
                    {c.exampleEn && (
                      <span className="text-sm text-ink-2">
                        <span lang="en" className="italic">
                          {c.exampleEn}
                        </span>{' '}
                        — {c.exampleFr}
                      </span>
                    )}
                    <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-bold text-ocean">
                      Choisir ce sens <Icon name="chevronRight" size={16} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
