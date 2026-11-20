import { useEffect, useRef, useState } from 'react';
import { micErrorMessage, recorderSupported, VoiceRecorder, type Recording } from '../services/recorder';
import { playWord } from '../services/speech';
import { useApp } from '../state/AppContext';
import { Icon } from './Icon';

function playUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const a = new Audio(url);
    a.onended = () => resolve();
    a.onerror = () => resolve();
    void a.play().catch(() => resolve());
  });
}

/**
 * S'enregistrer et se réécouter, éventuellement juste après le modèle (accent australien).
 * Aucune analyse automatique : c'est toi qui compares. L'audio reste dans la page.
 */
export function RecordCompare({
  model,
  takes = 1,
  className = '',
  onRecorded,
}: {
  /** Phrase ou mot modèle (lu par la synthèse vocale). Sans modèle : simple enregistreur. */
  model?: string;
  /** Nombre d'essais conservés (Mon histoire : 3). */
  takes?: number;
  className?: string;
  onRecorded?: (count: number) => void;
}) {
  const { settings } = useApp();
  const rec = useRef<VoiceRecorder | null>(null);
  const [state, setState] = useState<'idle' | 'recording' | 'busy'>('idle');
  const [list, setList] = useState<Recording[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      rec.current?.cancel();
      list.forEach((r) => URL.revokeObjectURL(r.url));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const speakModel = () =>
    model ? playWord(model, { voiceURI: settings.voiceURI, rate: settings.speechRate, preferNative: false, knownAudio: null }) : Promise.resolve();

  const toggle = async () => {
    setError(null);
    if (state === 'recording' && rec.current) {
      setState('busy');
      const r = await rec.current.stop();
      setList((cur) => {
        const next = [...cur, r].slice(-takes);
        onRecorded?.(cur.length + 1);
        return next;
      });
      setState('idle');
      return;
    }
    try {
      rec.current = new VoiceRecorder();
      await rec.current.start();
      setState('recording');
    } catch (e) {
      setError(micErrorMessage(e));
      setState('idle');
    }
  };

  if (!recorderSupported()) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {model && (
          <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => void speakModel()}>
            <Icon name="volume" size={18} /> Écouter le modèle
          </button>
        )}
        <p className="text-xs text-muted">L’enregistrement n’est pas disponible sur ce navigateur : répète à voix haute après le modèle.</p>
      </div>
    );
  }

  const last = list[list.length - 1];
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {model && (
          <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => void speakModel()}>
            <Icon name="volume" size={18} /> Modèle
          </button>
        )}
        <button
          type="button"
          className={`btn min-h-10 text-sm ${state === 'recording' ? 'btn-danger' : 'btn-ghost'}`}
          onClick={() => void toggle()}
          disabled={state === 'busy'}
          aria-pressed={state === 'recording'}
        >
          <Icon name={state === 'recording' ? 'pause' : 'mic'} size={18} /> {state === 'recording' ? 'Arrêter' : list.length ? 'Recommencer' : 'M’enregistrer'}
        </button>
        {last && state === 'idle' && (
          <>
            <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => void playUrl(last.url)}>
              <Icon name="play" size={18} /> Me réécouter
            </button>
            {model && (
              <button
                type="button"
                className="btn btn-ghost min-h-10 text-sm"
                onClick={async () => {
                  await speakModel();
                  await playUrl(last.url);
                }}
              >
                <Icon name="refresh" size={18} /> Modèle puis moi
              </button>
            )}
          </>
        )}
      </div>
      {state === 'recording' && (
        <p className="flex items-center gap-2 text-sm font-bold text-coral" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-coral" /> Enregistrement en cours…
        </p>
      )}
      {takes > 1 && list.length > 0 && (
        <ol className="flex flex-wrap gap-1.5 text-sm">
          {list.map((r, i) => (
            <li key={r.url}>
              <button type="button" className="chip" onClick={() => void playUrl(r.url)}>
                <Icon name="play" size={14} /> Essai {i + 1} · {Math.round(r.durationMs / 1000)} s
              </button>
            </li>
          ))}
        </ol>
      )}
      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  );
}
