// Transforme dist-single/index.html (page complète) en fragment publiable comme
// Artifact claude.ai : la plateforme ajoute elle-même doctype, <head> et <body>.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = readFileSync('dist-single/index.html', 'utf8');
let html = src
  .replace(/<!doctype html>/i, '')
  .replace(/<html[^>]*>|<\/html>/gi, '')
  .replace(/<head>|<\/head>|<body>|<\/body>/gi, '')
  .replace(/<meta charset="UTF-8"\s*\/?>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<(link|meta)[^>]*data-pwa[^>]*>/gi, '')
  .replace(/<!--[^]*?-->/g, '');

// le <title> doit figurer dans les 8 premiers Ko
const title = html.match(/<title>[^<]*<\/title>/i)?.[0] ?? '<title>Oz Vocab</title>';
html = title + '\n' + html.replace(title, '').trim() + '\n';

mkdirSync('dist-artifact', { recursive: true });
writeFileSync('dist-artifact/oz-vocab.html', html);
console.log(`dist-artifact/oz-vocab.html : ${(html.length / 1024).toFixed(0)} Ko`);
