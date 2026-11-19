import { useState } from 'react';
import { playWord, type PlayResult } from '../services/speech';
import { useApp } from '../state/AppContext';
import { Icon } from './Icon';

interface Props {
  text: string;
  label: string;
  size?: 'lg' | 'md' | 'sm';
  /** Enregistrement natif déjà connu (mots ajoutés). */
  audioUrl?: string | null;
  audioAccent?: string | null;
  onResult?: (r: PlayResult) => void;
  className?: string;
}

const SIZES = { lg: 'h-16 w-16', md: 'h-12 w-12', sm: 'h-10 w-10' };
const ICON = { lg: 30, md: 24, sm: 20 };

export function AudioButton({ text, label, size = 'md', audioUrl, audioAccent, onResult, className = '' }: Props) {
  const { settings } = useApp();
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<PlayResult | null>(null);

  async function play(e: React.MouseEvent) {
    e.stopPropagation();
    setPlaying(true);
    const r = await playWord(text, {
      voiceURI: settings.voiceURI,
      rate: settings.speechRate,
      preferNative: settings.audioPreference === 'native-first',
      knownAudio: audioUrl ? { url: audioUrl, accent: audioAccent === 'au' ? 'au' : 'other' } : null,
    });
    setPlaying(false);
    setResult(r);
    onResult?.(r);
  }

  const title = result?.label ? `${label} — ${result.label}` : label;
  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      title={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-ocean-soft text-ocean transition-colors hover:bg-ocean hover:text-on-ocean ${SIZES[size]} ${playing ? 'playing' : ''} ${className}`}
    >
      <Icon name="volume" size={ICON[size]} />
    </button>
  );
}
