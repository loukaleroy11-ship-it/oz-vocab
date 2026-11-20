import { useState, type ReactNode } from 'react';
import { playWord } from '../services/speech';
import { useApp } from '../state/AppContext';
import { Icon } from './Icon';

/** Petit bouton qui lit un mot ou une phrase anglaise (voix australienne si l'appareil en a une). */
export function SpeakChip({ text, children, className = '' }: { text: string; children?: ReactNode; className?: string }) {
  const { settings } = useApp();
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-left text-sm transition-colors hover:bg-ocean-soft ${playing ? 'text-ocean' : ''} ${className}`}
      aria-label={`Écouter « ${text} »`}
      onClick={async () => {
        setPlaying(true);
        await playWord(text, { voiceURI: settings.voiceURI, rate: settings.speechRate, preferNative: false, knownAudio: null });
        setPlaying(false);
      }}
    >
      <span className="min-w-0">{children ?? <span lang="en">{text}</span>}</span>
      <Icon name="volume" size={16} className="shrink-0 text-ocean" />
    </button>
  );
}
