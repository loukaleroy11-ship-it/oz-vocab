/** Lecture des réponses du dictionnaire libre dictionaryapi.dev (données Wiktionary). Fonction pure. */

export interface NativeAudio {
  url: string;
  accent: 'au' | 'uk' | 'us' | 'other';
}

export interface DictionaryMeaning {
  pos: string;
  /** Nombre de définitions : indique le sens le plus courant. */
  count: number;
  definition: string | null;
  examples: string[];
}

export interface DictionaryEntry {
  ipa: string | null;
  audios: NativeAudio[];
  pos: string[];
  definition: string | null;
  example: string | null;
  meanings: DictionaryMeaning[];
}

type RawEntry = {
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string; example?: string }> }>;
};

export function parseDictionary(raw: unknown): DictionaryEntry | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const data = raw as RawEntry[];
  const audios: NativeAudio[] = [];
  let ipa: string | null = null;
  const pos: string[] = [];
  let definition: string | null = null;
  let example: string | null = null;
  const byPos = new Map<string, DictionaryMeaning>();
  for (const entry of data) {
    ipa = ipa ?? entry.phonetic ?? null;
    for (const ph of entry.phonetics ?? []) {
      if (!ipa && ph.text) ipa = ph.text;
      if (ph.audio) {
        const m = /-(au|uk|us)\.mp3$/i.exec(ph.audio);
        const accent = (m?.[1]?.toLowerCase() as NativeAudio['accent']) ?? 'other';
        if (!audios.some((a) => a.url === ph.audio)) audios.push({ url: ph.audio, accent });
      }
    }
    for (const m of entry.meanings ?? []) {
      if (!m.partOfSpeech) continue;
      if (!pos.includes(m.partOfSpeech)) pos.push(m.partOfSpeech);
      const row = byPos.get(m.partOfSpeech) ?? { pos: m.partOfSpeech, count: 0, definition: null, examples: [] };
      for (const d of m.definitions ?? []) {
        row.count++;
        row.definition = row.definition ?? d.definition ?? null;
        if (d.example) row.examples.push(d.example);
        definition = definition ?? d.definition ?? null;
        example = example ?? d.example ?? null;
      }
      byPos.set(m.partOfSpeech, row);
    }
  }
  return { ipa, audios, pos, definition, example, meanings: [...byPos.values()] };
}
