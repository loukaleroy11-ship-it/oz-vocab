import { useState, type ReactNode } from 'react';
import { POS_LABEL } from '../domain/status';
import { splitList } from '../domain/text';
import { POS_LIST, type IpaSource, type Pos, type WordContent } from '../domain/types';
import { AudioButton } from './AudioButton';

export interface WordDraft {
  en: string;
  fr: string;
  frAlt: string;
  pos: Pos;
  ipa: string;
  exampleEn: string;
  exampleFr: string;
}

export function draftFrom(c: Partial<WordContent>): WordDraft {
  return {
    en: c.en ?? '',
    fr: c.fr ?? '',
    frAlt: (c.frAlt ?? []).join(' ; '),
    pos: c.pos ?? 'noun',
    ipa: c.ipa ?? '',
    exampleEn: c.exampleEn ?? '',
    exampleFr: c.exampleFr ?? '',
  };
}

export function contentFrom(d: WordDraft, base: Partial<WordContent>, ipaSource: IpaSource | null): WordContent {
  const ipa = d.ipa.trim();
  const ipaChanged = ipa !== (base.ipa ?? '');
  return {
    en: d.en.trim(),
    fr: d.fr.trim(),
    frAlt: splitList(d.frAlt),
    pos: d.pos,
    posAlt: (base.posAlt ?? []).filter((p) => p !== d.pos),
    ipa: ipa ? (ipa.startsWith('/') || ipa.startsWith('[') ? ipa : `/${ipa}/`) : null,
    ipaAlt: ipaChanged ? [] : (base.ipaAlt ?? []),
    ipaSource: ipa ? (ipaChanged ? 'manual' : (base.ipaSource ?? ipaSource)) : null,
    exampleEn: d.exampleEn.trim(),
    exampleFr: d.exampleFr.trim(),
    forms: base.forms ?? [],
    spellingAlt: base.spellingAlt ?? [],
  };
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function WordForm({
  idPrefix,
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  ipaNote,
}: {
  idPrefix: string;
  initial: WordDraft;
  onSubmit: (d: WordDraft) => void;
  onCancel?: () => void;
  submitLabel: string;
  ipaNote?: string;
}) {
  const [d, setD] = useState<WordDraft>(initial);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof WordDraft>(k: K, v: WordDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const missing = !d.en.trim() || !d.fr.trim();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!missing) onSubmit(d);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-en`} label="Anglais">
          <div className="flex items-center gap-2">
            <input id={`${idPrefix}-en`} className="field" lang="en" autoCapitalize="none" value={d.en} onChange={(e) => set('en', e.target.value)} />
            {d.en.trim() && <AudioButton text={d.en.trim()} label={`Écouter « ${d.en.trim()} »`} size="sm" />}
          </div>
        </Field>
        <Field id={`${idPrefix}-fr`} label="Français (traduction principale)">
          <input id={`${idPrefix}-fr`} className="field" value={d.fr} onChange={(e) => set('fr', e.target.value)} />
        </Field>
        <Field id={`${idPrefix}-fralt`} label="Autres traductions" hint="Sépare-les par un point-virgule.">
          <input id={`${idPrefix}-fralt`} className="field" value={d.frAlt} onChange={(e) => set('frAlt', e.target.value)} />
        </Field>
        <Field id={`${idPrefix}-pos`} label="Catégorie grammaticale">
          <select id={`${idPrefix}-pos`} className="field" value={d.pos} onChange={(e) => set('pos', e.target.value as Pos)}>
            {POS_LIST.map((p) => (
              <option key={p} value={p}>
                {POS_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${idPrefix}-ipa`} label="Transcription IPA (facultatif)" hint={ipaNote}>
          <input id={`${idPrefix}-ipa`} className="field ipa" lang="en-AU" value={d.ipa} onChange={(e) => set('ipa', e.target.value)} placeholder="/bɹæɪv/" />
        </Field>
      </div>
      <Field id={`${idPrefix}-exen`} label="Exemple en anglais">
        <div className="flex items-start gap-2">
          <textarea id={`${idPrefix}-exen`} className="field min-h-[72px]" lang="en" rows={2} value={d.exampleEn} onChange={(e) => set('exampleEn', e.target.value)} />
          {d.exampleEn.trim() && <AudioButton text={d.exampleEn.trim()} label="Écouter l’exemple" size="sm" />}
        </div>
      </Field>
      <Field id={`${idPrefix}-exfr`} label="Traduction de l’exemple">
        <textarea id={`${idPrefix}-exfr`} className="field min-h-[72px]" rows={2} value={d.exampleFr} onChange={(e) => set('exampleFr', e.target.value)} />
      </Field>
      {touched && missing && <p className="text-sm font-bold text-coral">Le mot anglais et sa traduction française sont obligatoires.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
