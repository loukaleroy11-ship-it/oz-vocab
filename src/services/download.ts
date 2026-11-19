/** Enregistrement d'un fichier généré (export). */
import { capability, capabilityErrorCode, inClaudeViewer } from './claudeRuntime';

export type SaveOutcome = { ok: true } | { ok: false; message: string };

export async function saveTextFile(filename: string, content: string, mime: string): Promise<SaveOutcome> {
  if (inClaudeViewer()) {
    // dans claude.ai, les téléchargements passent par une confirmation de l'application
    const downloads = await capability('downloads');
    if (!downloads) return { ok: false, message: 'Le téléchargement n’est pas disponible dans cette vue.' };
    try {
      await downloads.save({ filename, data: content });
      return { ok: true };
    } catch (e) {
      const code = capabilityErrorCode(e);
      if (code === 'declined') return { ok: false, message: 'Téléchargement annulé.' };
      if (code === 'rate_limited') return { ok: false, message: 'Une demande est déjà ouverte. Réessaie dans un instant.' };
      return { ok: false, message: 'Le téléchargement a échoué.' };
    }
  }
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Le téléchargement a échoué.' };
  }
}
