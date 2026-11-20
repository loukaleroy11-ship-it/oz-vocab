/**
 * Correcteur de grammaire gratuit pour les réponses tapées : API publique de
 * LanguageTool (aucune clé). Le texte tapé est envoyé à LanguageTool.
 * En cas d'échec, on le dit : aucune correction n'est inventée.
 */
export interface GrammarIssue {
  message: string;
  excerpt: string;
  replacements: string[];
}

const ENDPOINT = 'https://api.languagetool.org/v2/check';

export async function checkGrammar(text: string, signal?: AbortSignal): Promise<GrammarIssue[]> {
  const body = new URLSearchParams({ text, language: 'en-AU', enabledOnly: 'false' });
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: 'POST', body, signal, headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('Le correcteur gratuit (LanguageTool) ne répond pas. Vérifie ta connexion ; ta phrase n’a pas été vérifiée.');
  }
  if (res.status === 429) throw new Error('Le correcteur gratuit a atteint sa limite pour le moment. Réessaie dans une minute.');
  if (!res.ok) throw new Error(`Le correcteur gratuit a renvoyé une erreur (${res.status}) ; ta phrase n’a pas été vérifiée.`);
  const data = (await res.json()) as {
    matches?: { message: string; offset: number; length: number; replacements?: { value: string }[] }[];
  };
  return (data.matches ?? []).map((m) => ({
    message: m.message,
    excerpt: text.slice(m.offset, m.offset + m.length),
    replacements: (m.replacements ?? []).slice(0, 3).map((r) => r.value),
  }));
}
