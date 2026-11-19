/**
 * Prononciation. Source principale : la synthèse vocale du navigateur
 * (Web Speech API) avec une voix réglée en anglais australien (en-AU).
 * Si l'appareil n'a aucune voix australienne, on le dit clairement et on
 * propose un enregistrement humain australien quand il en existe un
 * (dictionnaire libre dictionaryapi.dev, issu de Wiktionary).
 */
import { inClaudeViewer } from './claudeRuntime';

export interface VoiceInfo {
  uri: string;
  name: string;
  lang: string;
  australian: boolean;
  local: boolean;
}

export interface PlayResult {
  ok: boolean;
  kind: 'tts-au' | 'tts-other' | 'native-au' | 'native-other' | 'none';
  label: string;
}

const norm = (lang: string) => lang.replace('_', '-').toLowerCase();
export const isAustralianLang = (lang: string) => norm(lang) === 'en-au' || norm(lang).startsWith('en-au-');

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function toInfo(v: SpeechSynthesisVoice): VoiceInfo {
  return { uri: v.voiceURI, name: v.name, lang: v.lang, australian: isAustralianLang(v.lang), local: v.localService };
}

/** Classement des voix : australiennes d'abord, puis qualité (voix « naturelles », « premium »…). */
function score(v: SpeechSynthesisVoice): number {
  const l = norm(v.lang);
  let s = 0;
  if (isAustralianLang(l)) s += 1000;
  else if (l === 'en-gb' || l === 'en-nz') s += 300;
  else if (l.startsWith('en')) s += 200;
  else return -1;
  const n = v.name.toLowerCase();
  if (/natural|neural|premium|enhanced|online/.test(n)) s += 50;
  if (/karen|natasha|william|catherine|lee|gordon/.test(n)) s += 20;
  if (/compact|eloquence|novelty|bad news|bells|bubbles|cellos|whisper|zarvox|trinoids|jester|organ|boing|superstar/.test(n)) s -= 150;
  if (v.default) s += 5;
  return s;
}

let voicesCache: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();

function refreshVoices() {
  if (!speechSupported()) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length !== voicesCache.length || v.some((x, i) => x.voiceURI !== voicesCache[i]?.voiceURI)) {
    voicesCache = v;
    listeners.forEach((l) => l());
  }
}

if (speechSupported()) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
  // Safari ne déclenche pas toujours voiceschanged : quelques relectures
  let tries = 0;
  const t = setInterval(() => {
    refreshVoices();
    if (++tries > 10 || voicesCache.length) clearInterval(t);
  }, 300);
}

export function onVoicesChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function englishVoices(): VoiceInfo[] {
  return voicesCache
    .filter((v) => score(v) >= 0)
    .sort((a, b) => score(b) - score(a))
    .map(toInfo);
}

export function australianVoices(): VoiceInfo[] {
  return englishVoices().filter((v) => v.australian);
}

function resolveVoice(preferredUri: string | null): SpeechSynthesisVoice | null {
  if (preferredUri) {
    const v = voicesCache.find((x) => x.voiceURI === preferredUri);
    if (v) return v;
  }
  const ranked = voicesCache.filter((v) => score(v) >= 0).sort((a, b) => score(b) - score(a));
  return ranked[0] ?? null;
}

export function describeVoice(preferredUri: string | null): { voice: VoiceInfo | null; australian: boolean } {
  const v = resolveVoice(preferredUri);
  return { voice: v ? toInfo(v) : null, australian: v ? isAustralianLang(v.lang) : false };
}

export function speak(text: string, opts: { voiceURI: string | null; rate: number }): Promise<PlayResult> {
  if (!speechSupported()) {
    return Promise.resolve({ ok: false, kind: 'none', label: 'La synthèse vocale n’est pas disponible dans ce navigateur.' });
  }
  refreshVoices();
  const synth = window.speechSynthesis;
  const voice = resolveVoice(opts.voiceURI);
  return new Promise((resolve) => {
    const wasBusy = synth.speaking || synth.pending;
    if (wasBusy) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? 'en-AU';
    if (voice) u.voice = voice;
    u.rate = opts.rate;
    const australian = voice ? isAustralianLang(voice.lang) : false;
    const label = voice
      ? australian
        ? `Voix australienne : ${voice.name}`
        : `Voix non australienne : ${voice.name} (${voice.lang})`
      : 'Voix par défaut du navigateur (accent inconnu)';
    const kind = australian ? 'tts-au' : 'tts-other';
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve({ ok, kind: ok ? kind : 'none', label: ok ? label : 'La lecture audio a échoué.' });
    };
    u.onend = () => done(true);
    u.onerror = (e) => done(e.error === 'interrupted' || e.error === 'canceled');
    const start = () => {
      synth.speak(u);
      // certains navigateurs ne déclenchent jamais onend : on considère la lecture lancée
      setTimeout(() => done(true), Math.max(2500, text.length * 120));
    };
    // Appel direct quand rien ne joue (garde le « geste utilisateur » exigé par iOS) ;
    // sinon léger délai après cancel(), sans quoi Safari ignore parfois la lecture.
    if (wasBusy) setTimeout(start, 60);
    else start();
  });
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

// ---------- enregistrements natifs (hors claude.ai, en ligne uniquement) ----------

import { parseDictionary, type DictionaryEntry, type NativeAudio } from './dictionaryParse';
export type { DictionaryEntry, NativeAudio } from './dictionaryParse';

const dictCache = new Map<string, Promise<DictionaryEntry | null>>();
/** Résultats déjà reçus (lecture instantanée sans attendre le réseau). */
const dictResolved = new Map<string, DictionaryEntry | null>();

/** Le réseau externe est bloqué dans claude.ai : ce service n'y est pas utilisé. */
export function nativeAudioAvailable(): boolean {
  return !inClaudeViewer() && typeof navigator !== 'undefined' && navigator.onLine !== false;
}

export function lookupDictionary(word: string): Promise<DictionaryEntry | null> {
  const key = word.trim().toLowerCase();
  if (!nativeAudioAvailable() || !/^[a-z' -]+$/.test(key)) return Promise.resolve(null);
  if (!dictCache.has(key)) {
    const p = (async () => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 6000);
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`, {
          signal: ctl.signal,
        });
        if (!res.ok) return null;
        return parseDictionary(await res.json());
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    })();
    dictCache.set(key, p);
    p.then((r) => {
      dictResolved.set(key, r);
      if (r === null) setTimeout(() => dictCache.delete(key), 60_000); // nouvel essai possible plus tard
    });
  }
  return dictCache.get(key)!;
}

/** Prépare à l'avance les enregistrements des prochains mots (si l'appareil n'a pas de voix australienne). */
export function prefetchNative(words: string[], voiceURI: string | null) {
  if (!nativeAudioAvailable() || describeVoice(voiceURI).australian) return;
  words.forEach((w) => {
    if (/^[A-Za-z' -]{1,40}$/.test(w.trim())) void lookupDictionary(w);
  });
}

let currentAudio: HTMLAudioElement | null = null;

export async function playUrl(url: string): Promise<boolean> {
  try {
    currentAudio?.pause();
    currentAudio = new Audio(url);
    await currentAudio.play();
    return true;
  } catch {
    return false;
  }
}

/**
 * Lecture d'un mot : voix australienne de l'appareil si elle existe ; sinon
 * enregistrement humain australien s'il est disponible ; sinon meilleure voix
 * anglaise disponible, en l'indiquant clairement.
 */
export async function playWord(
  text: string,
  opts: { voiceURI: string | null; rate: number; preferNative: boolean; knownAudio?: NativeAudio | null },
): Promise<PlayResult> {
  const { australian } = describeVoice(opts.voiceURI);
  const isSingleWord = /^[A-Za-z' -]{1,40}$/.test(text.trim());
  const tryNative = isSingleWord && nativeAudioAvailable() && (opts.preferNative || !australian);
  if (tryNative) {
    let audio: NativeAudio | undefined = opts.knownAudio?.accent === 'au' ? opts.knownAudio : undefined;
    if (!audio) {
      const key = text.trim().toLowerCase();
      const entry = dictResolved.has(key)
        ? dictResolved.get(key)
        : // on n'attend le réseau que brièvement : au-delà, la voix de l'appareil prend le relais
          await Promise.race([lookupDictionary(text), new Promise<null>((r) => setTimeout(() => r(null), 700))]);
      audio = entry?.audios.find((a) => a.accent === 'au');
    }
    if (audio && (await playUrl(audio.url))) {
      return { ok: true, kind: 'native-au', label: 'Enregistrement australien (Wiktionary)' };
    }
  }
  return speak(text, { voiceURI: opts.voiceURI, rate: opts.rate });
}
