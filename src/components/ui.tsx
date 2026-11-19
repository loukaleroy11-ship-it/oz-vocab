import { useEffect, useRef, useState, type ReactNode } from 'react';
import { freqLevel } from '../data/core';
import { POS_LABEL, STATUS_LABEL } from '../domain/status';
import type { LearningStatus, Pos } from '../domain/types';
import { useApp } from '../state/AppContext';
import { Icon } from './Icon';

export function PosChip({ pos }: { pos: Pos }) {
  return (
    <span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2">
      {POS_LABEL[pos]}
    </span>
  );
}

const STATUS_STYLE: Record<LearningStatus, string> = {
  new: 'bg-surface-2 text-ink-2',
  learning: 'bg-ocean-soft text-ocean',
  due: 'bg-wattle-soft text-wattle-ink',
  difficult: 'bg-coral-soft text-coral',
  mastered: 'bg-gum-soft text-gum',
};

export function StatusChip({ status }: { status: LearningStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Ipa({ value, className = '' }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className={`text-sm text-muted ${className}`}>IPA non disponible</span>;
  return (
    <span className={`ipa ${className}`} lang="en-AU" title="Transcription phonétique (anglais australien)">
      {value}
    </span>
  );
}

/** Jauge de fréquence sur échelle logarithmique (occurrences par million de mots). */
export function FreqMeter({ perMillion }: { perMillion: number | null }) {
  if (perMillion == null) return <span className="text-sm text-muted">fréquence inconnue (mot ajouté)</span>;
  const level = freqLevel(perMillion);
  const bars = 5;
  const filled = Math.max(1, Math.round(level * bars));
  return (
    <span className="inline-flex items-center gap-2" title={`≈ ${Math.round(perMillion).toLocaleString('fr-FR')} occurrences par million de mots à l’oral`}>
      <span className="inline-flex items-end gap-0.5" aria-hidden="true">
        {Array.from({ length: bars }, (_, i) => (
          <span
            key={i}
            className={`w-1.5 rounded-sm ${i < filled ? 'bg-ocean' : 'bg-line'}`}
            style={{ height: 6 + i * 3 }}
          />
        ))}
      </span>
      <span className="tabular text-sm text-ink-2">
        {Math.round(perMillion).toLocaleString('fr-FR')}
        <span className="text-muted"> / million</span>
      </span>
    </span>
  );
}

/** Bouton en deux temps (le navigateur intégré n'affiche pas confirm()). */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  className = 'btn btn-ghost',
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-danger"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn btn-quiet" onClick={() => setArmed(false)}>
        Annuler
      </button>
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 rounded-lg px-3 text-sm font-bold transition-colors ${
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Panneau modal : feuille du bas sur téléphone, fenêtre centrée sur ordinateur. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="anim-card relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface shadow-card outline-none sm:max-w-xl sm:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="btn btn-quiet h-11 w-11 p-0" onClick={onClose} aria-label="Fermer">
            <Icon name="x" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`anim-toast pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium shadow-card ${
            t.tone === 'error' ? 'bg-coral text-white' : t.tone === 'success' ? 'bg-gum text-white' : 'bg-ink text-bg'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Notice({ tone = 'info', children, icon }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode; icon?: 'info' | 'alert' | 'wifiOff' }) {
  const style =
    tone === 'error' ? 'bg-coral-soft text-coral' : tone === 'warn' ? 'bg-wattle-soft text-wattle-ink' : 'bg-ocean-soft text-ocean';
  return (
    <div className={`flex gap-3 rounded-2xl px-4 py-3 text-sm ${style}`}>
      <Icon name={icon ?? (tone === 'info' ? 'info' : 'alert')} size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 text-ink">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 pb-5 pt-2">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-[1.75rem] font-extrabold leading-tight sm:text-[2.1rem]">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function pct(x: number | null, digits = 0): string {
  if (x == null) return '—';
  return `${(x * 100).toFixed(digits).replace('.', ',')} %`;
}
