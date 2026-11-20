/**
 * Enregistrement de ta voix pour te comparer au modèle (aucune analyse ni
 * transcription : l'audio reste dans la page et disparaît quand tu la quittes).
 */
export function recorderSupported(): boolean {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export interface Recording {
  url: string;
  durationMs: number;
}

export class VoiceRecorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t));
    this.rec = new MediaRecorder(this.stream, type ? { mimeType: type } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.startedAt = Date.now();
    this.rec.start();
  }

  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const rec = this.rec;
      if (!rec) {
        reject(new Error('Aucun enregistrement en cours.'));
        return;
      }
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
        this.stream?.getTracks().forEach((t) => t.stop());
        this.rec = null;
        resolve({ url: URL.createObjectURL(blob), durationMs: Date.now() - this.startedAt });
      };
      rec.stop();
    });
  }

  get recording(): boolean {
    return this.rec?.state === 'recording';
  }

  cancel(): void {
    try {
      this.rec?.stop();
    } catch {
      /* déjà arrêté */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.rec = null;
  }
}

export function micErrorMessage(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Accès au micro refusé. Autorise le micro pour ce site dans les réglages du navigateur.';
  if (name === 'NotFoundError') return 'Aucun micro trouvé sur cet appareil.';
  return 'Impossible de démarrer l’enregistrement sur ce navigateur.';
}
