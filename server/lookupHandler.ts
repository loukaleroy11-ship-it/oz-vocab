/**
 * Traduction côté serveur (la clé API ne quitte jamais le serveur).
 * Utilisé par api/lookup.ts (Vercel) et netlify/functions/lookup.mts (Netlify).
 *
 * Variables d'environnement :
 *   ANTHROPIC_API_KEY     (obligatoire pour activer la traduction)
 *   ANTHROPIC_MODEL       (facultatif, défaut : claude-haiku-5-5)
 *   LOOKUP_ACCESS_CODE    (facultatif : code à saisir dans Paramètres pour
 *                          empêcher des inconnus d'utiliser ta clé)
 */
import { buildLookupPrompt, validateLookupPayload } from '../src/services/lookup/prompt';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const env = (k: string): string | undefined =>
  (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env[k];

export async function handleLookup(req: Request): Promise<Response> {
  const apiKey = env('ANTHROPIC_API_KEY');
  if (req.method === 'GET') {
    return json(200, { ok: true, configured: !!apiKey, accessCode: !!env('LOOKUP_ACCESS_CODE') });
  }
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });
  if (!apiKey) return json(503, { error: 'Traduction non configurée : ANTHROPIC_API_KEY est absente sur le serveur.' });

  const code = env('LOOKUP_ACCESS_CODE');
  if (code && req.headers.get('x-access-code') !== code) {
    return json(401, { error: 'Code d’accès manquant ou incorrect (Paramètres → Traduction).' });
  }

  let body: { text?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Requête illisible.' });
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 120) return json(400, { error: 'Saisis un mot ou une expression de 120 caractères au maximum.' });
  const lang = body.lang === 'fr' || body.lang === 'en' ? body.lang : null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env('ANTHROPIC_MODEL') || 'claude-haiku-5-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: buildLookupPrompt(text, lang) }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Anthropic API error', res.status, detail.slice(0, 500));
      return json(502, { error: `Le service de traduction a répondu ${res.status}.` });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const out = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
    const start = out.indexOf('{');
    const end = out.lastIndexOf('}');
    if (start < 0 || end < start) return json(502, { error: 'Réponse du service illisible.' });
    const payload = validateLookupPayload(JSON.parse(out.slice(start, end + 1)));
    return json(200, payload);
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return json(aborted ? 504 : 502, { error: aborted ? 'Le service de traduction a mis trop de temps à répondre.' : 'Le service de traduction est injoignable.' });
  } finally {
    clearTimeout(timer);
  }
}
