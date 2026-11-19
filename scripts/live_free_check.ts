// Essai réel du service gratuit (réseau nécessaire) : npx vite-node scripts/live_free_check.ts
import { lookupFree } from '../src/services/lookup/free';

for (const [q, lang] of [['courageux', 'fr'], ['to improve', 'en'], ['se débrouiller', 'fr'], ['right', 'en'], ['une plage', 'fr']] as const) {
  try {
    const p = await lookupFree(q, lang);
    console.log(`\n« ${q} » → ambigu=${p.ambiguous}`);
    for (const c of p.candidates) console.log(`  ${c.en} = ${c.fr} [${c.pos}] ${c.ipa ?? '—'} | ${c.exampleEn} | ${c.exampleFr}${c.sense ? ' | sens: ' + c.sense : ''}`);
  } catch (e) {
    console.log(`« ${q} » → ERREUR ${(e as Error).message}`);
  }
}
