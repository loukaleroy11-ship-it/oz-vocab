# Oz Vocab

Site web pour apprendre les **500 mots les plus fréquents de l’anglais parlé**, avec la **prononciation australienne** et une **répétition espacée** inspirée d’Anki. Interface en français, pensée d’abord pour l’iPhone (Safari) et utilisable sur ordinateur.

C’est un site web (React + TypeScript + Vite + Tailwind CSS), pas une application native : il s’ouvre depuis une URL, et peut être ajouté à l’écran d’accueil de l’iPhone (PWA facultative).

---

## Ce que fait le site

| Section | Contenu |
|---|---|
| **Tableau de bord** | mots à revoir aujourd’hui, bouton « Commencer ma révision », série de jours, nouveaux / en cours / maîtrisés, bonnes réponses, courbe des mots maîtrisés, répartition par catégorie |
| **Réviser** | sessions de 10 mots distincts ; un mot inconnu revient en fin de liste jusqu’à ce qu’il soit reconnu ; reprise après interruption ; bilan de fin de session |
| **Explorer le vocabulaire** | recherche anglais / français (partielle, sans accents), filtres combinables : fréquence (top 100 / 250 / 500 / plage de rangs), catégorie grammaticale, état d’apprentissage, source ; tri ; sélection de mots à réviser |
| **Ajouter un mot** | saisie en anglais ou en français, détection de la langue, traduction(s), catégorie, IPA, exemple, détection des doublons, fiche modifiable avant l’enregistrement |
| **Statistiques et historique** | réponses par jour, mots maîtrisés dans le temps, tableau jour par jour, historique détaillé des sessions |
| **Paramètres** | voix et vitesse, lecture automatique, taille des sessions, nouveaux mots par jour, mode 2 boutons / 3 niveaux, thème clair / sombre, export JSON / CSV, import JSON, synchronisation, réinitialisation |

---

## Lancer le site en local

Prérequis : Node.js 20 ou plus récent.

```bash
npm install          # 1. installer les dépendances
npm run dev          # 2. lancer en local → http://localhost:5173
npm test             # 3. tests automatisés (moteur de révision, file, stockage, import/export, synchro)
npm run build        # 4. version de production dans dist/
npm run preview      #    la tester → http://localhost:4173
```

Test complet dans un vrai navigateur (Chromium via Playwright, Python) :

```bash
pip install playwright && playwright install chromium
npm run build && npx vite preview --port 4173 &
python3 scripts/e2e_check.py http://localhost:4173 ./captures
```

---

## Mettre le site en ligne (URL publique)

### Option A — GitHub Pages (version actuelle, gratuite)

Le site est publié sur **https://loukaleroy11-ship-it.github.io/oz-vocab/**.

- Chaque modification poussée sur la branche `main` relance les tests, recompile et republie le site automatiquement (`.github/workflows/deploy.yml`, onglet « Actions » du dépôt).
- Réglage du dépôt : Settings › Pages › Source = **GitHub Actions**.
- GitHub Pages ne sert que des fichiers statiques : pas de fonction serveur. La traduction utilise donc le service gratuit (voir plus bas).

### Option B — Vercel

1. Crée un dépôt GitHub et pousse ce dossier (`git init`, `git add .`, `git commit -m "Oz Vocab"`, `git push`).
2. Sur [vercel.com](https://vercel.com), « Add New… › Project », importe le dépôt. Vercel détecte Vite : commande `npm run build`, dossier `dist` (déjà fixés dans `vercel.json`).
3. Clique « Deploy ». Tu obtiens une URL du type `https://oz-vocab.vercel.app`.
4. (Facultatif) Traduction automatique : voir plus bas.

Sans GitHub : `npm i -g vercel` puis `vercel` dans ce dossier, et `vercel --prod`.

### Option C — Netlify

1. Sur [app.netlify.com](https://app.netlify.com), « Add new site › Import an existing project » depuis GitHub (réglages lus dans `netlify.toml`).
2. Ou sans GitHub : `npm run build` puis glisse le dossier `dist/` sur [app.netlify.com/drop](https://app.netlify.com/drop) (dans ce cas, pas de fonction serveur, donc pas de traduction automatique).

### Sur l’iPhone

Ouvre l’URL dans Safari, puis Partager › « Sur l’écran d’accueil ». Le site s’ouvre alors en plein écran et fonctionne hors ligne pour les révisions.

---

## Traduction automatique (« Ajouter un mot »)

La traduction n’est jamais simulée : si aucun service ne répond, le site le dit et propose la saisie manuelle.

Trois fournisseurs interchangeables (voir `src/services/lookup/`), choisis automatiquement :

1. **Dans claude.ai** (version publiée comme Artifact) : la page demande à Claude via ton compte, sans clé à gérer. Une autorisation est demandée à la première recherche.
2. **Sur Vercel / Netlify avec une clé** : la fonction serveur `/api/lookup` appelle l’API Claude d’Anthropic. La clé reste sur le serveur, jamais dans le code du navigateur. Meilleure qualité (exemples naturels, IPA australienne, sens distingués).
3. **Partout ailleurs (GitHub Pages, Vercel sans clé)** : service gratuit sans compte ni clé. Traduction par [MyMemory](https://mymemory.translated.net), catégorie, IPA et exemple par le dictionnaire libre [dictionaryapi.dev](https://dictionaryapi.dev) (Wiktionary). Les propositions sont à vérifier ; quand aucun exemple du bon sens n’existe, le champ reste vide plutôt que d’en inventer un. Limite d’environ 5 000 caractères traduits par jour et par connexion.

Configuration sur l’hébergeur (Settings › Environment Variables), puis redéploie :

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | **obligatoire** pour activer la traduction (clé créée sur console.anthropic.com) |
| `ANTHROPIC_MODEL` | facultatif, `claude-haiku-5-5` par défaut |
| `LOOKUP_ACCESS_CODE` | facultatif mais conseillé : un code à saisir dans Paramètres › Traduction, pour que des inconnus ne puissent pas utiliser ta clé via ton URL |

Pour changer de service (DeepL, autre modèle…), il suffit de réécrire `server/lookupHandler.ts` en gardant le même format de réponse (`src/services/lookup/prompt.ts`).

Les mots anglais ajoutés sont aussi enrichis, quand c’est possible, par le dictionnaire libre [dictionaryapi.dev](https://dictionaryapi.dev) (IPA, enregistrement humain issu de Wiktionary, avec l’accent australien quand il existe).

---

## Prononciation australienne

- Chaque mot et chaque exemple se lit avec la **synthèse vocale du navigateur** réglée en `en-AU`. Le site choisit automatiquement la meilleure voix australienne installée (Karen, Lee, Catherine, Gordon sur iPhone et Mac ; Natasha, William sur Edge…).
- **Si l’appareil n’a aucune voix australienne**, le site l’affiche clairement (il ne présente jamais une voix britannique ou américaine comme australienne), explique comment en installer une (Paramètres) et utilise un **enregistrement humain australien** de Wiktionary quand il en existe un (version web classique, en ligne).
- L’IPA des 500 mots suit la notation de Cox & Palethorpe (2007) pour l’anglais australien général (« day » /dæɪ/, « go » /ɡəʉ/, « time » /tɑem/).

Sur iPhone : Réglages › Accessibilité › Contenu énoncé › Voix › Anglais › Karen (Australie), version « améliorée ».

---

## Les 500 mots : source et méthode

- **Source** : [NGSL-Spoken 1.2](https://www.newgeneralservicelist.com/ngsl-spoken) (Browne & Culligan), liste des mots les plus fréquents de l’anglais **parlé**, calculée sur les sous-corpus oraux du corpus NGSL et classée par fréquence. Licence CC BY-SA 4.0.
- **Unité = lemme** : « go » regroupe go, goes, went, gone, going (formes affichées sur la fiche) ; les formes d’un verbe ne sont donc pas comptées comme des mots différents.
- **Nettoyage**, sans changer l’ordre : retrait de 5 balises de transcription du corpus oral (`pause`, `unclear`, `laughter`, `breath`, `cough`) et correction de l’entrée « true » abîmée dans le fichier source. Les 500 mots sont donc les rangs 1 à 505 de NGSL-Spoken moins ces 5 balises. Le rang affiché « n° » est la position dans la liste nettoyée ; le rang NGSL-S d’origine est conservé.
- **Fréquence relative** : indice U de NGSL-Spoken (occurrences estimées par million de mots), affiché avec une jauge logarithmique.
- **Orthographe** : australienne pour l’affichage (« colour »), sans toucher au rang.
- **IPA** : dictionnaire [Britfone](https://github.com/JoseLlarena/Britfone) (anglais britannique, licence MIT) converti automatiquement en anglais australien, phonème par phonème (`scripts/build_dataset.py`).
- **Traductions, catégories et exemples** : rédigés pour ce projet (`scripts/source-data/fr_entries.tsv`), avec traductions secondaires pour les mots à plusieurs sens (get, right, mean, still, since…).

Régénérer la base : `npm run data` (écrit `src/data/coreWords.json`).

---

## Répétition : deux mécanismes distincts

**1. Répétition immédiate** (`src/domain/queue.ts`) — dans la session :
- 10 mots distincts au départ (moins si la sélection est plus petite) ;
- « Je ne connais pas » → le mot repart en fin de file ; « Je connais » → il sort de la file ;
- le compteur distingue les mots distincts des répétitions ; on peut terminer ou mettre en pause à tout moment.

**2. Répétition espacée** (`src/domain/srs.ts`) — entre les sessions, adaptation de SM-2 :

| Situation | Effet |
|---|---|
| mot nouveau, inconnu | revient dans 10 min, facilité inchangée |
| mot en apprentissage, encore raté | revient dans 10 min, facilité −0,05 |
| mot appris, oublié | revient dans 10 min, facilité −0,20 ; une fois retrouvé, intervalle = 40 % de l’ancien (pas de retour systématique au lendemain) |
| mot nouveau ou retrouvé, connu | 1 jour |
| mot appris, connu | intervalle × facilité (2,5 au départ) : 1 → 3 → 8 → 20 → 50 jours… |
| mode avancé « Difficile » / « Facile » | intervalle × 1,2 et facilité −0,15 / bonus × 1,3 et facilité +0,15 |

Un mot est **maîtrisé** à partir de 21 jours d’intervalle (seuil « mature » d’Anki). Les états « reconnu au moins une fois » et « maîtrisé » sont distincts.

---

## Sauvegarde locale ou synchronisation ?

- **Sauvegarde locale** (toujours active) : chaque réponse est écrite immédiatement dans IndexedDB, en une transaction. Rien n’est perdu au rechargement ni hors ligne. Les données restent sur l’appareil et le navigateur utilisés.
- **Synchronisation entre appareils** : active dans la version publiée sur claude.ai. Les données sont copiées dans la base de l’Artifact, dans un espace privé lié à ton compte Claude (`data/users/<ton identifiant>/`) ; ouvre le même lien sur l’iPhone et l’ordinateur. Fusion enregistrement par enregistrement : la modification la plus récente gagne, sans jamais écraser une réponse donnée pendant la synchronisation.
- **Version publique (GitHub Pages, Vercel, Netlify)** : pas de compte, donc pas de synchronisation automatique. Utilise l’export / import JSON pour passer d’un appareil à l’autre. Le code est prêt à recevoir un autre service : il suffit d’implémenter l’interface `SyncTarget` (`src/storage/sync/artifactSync.ts`) avec une vraie base et une vraie authentification (Supabase, Firebase…).

---

## Architecture

```
src/
  domain/          logique pure, testée sans interface
    srs.ts         répétition espacée (SM-2 adapté)
    queue.ts       file de session (retour en fin de liste)
    selection.ts   choix des mots d'une session
    filters.ts     filtres, tri, recherche
    stats.ts       statistiques et historique
    lang.ts        détection de la langue saisie
  data/            les 500 mots (coreWords.json) + accès
  storage/         IndexedDB, écritures sérialisées, import/export, synchronisation
  services/        prononciation, traduction, téléchargement, runtime claude.ai
  state/           état global et actions
  components/      boutons audio, fiches, graphiques SVG, formulaires…
  pages/           les six sections
server/            traduction côté serveur (clé API protégée)
api/, netlify/     points d'entrée Vercel et Netlify
scripts/           construction de la base, icônes, tests navigateur
tests/             tests Vitest
```

Deux sorties de compilation :
- `npm run build` → `dist/` : site web classique avec PWA (service worker, manifeste, icônes) ;
- `npm run build:single` → `dist-artifact/oz-vocab.html` : un seul fichier, publiable comme Artifact claude.ai.

---

## Limites connues

- La voix dépend de l’appareil : sans voix australienne installée, l’accent n’est pas australien (le site le signale).
- L’IPA australienne des 500 mots est convertie automatiquement depuis l’anglais britannique : fiable pour les voyelles, mais certaines variantes régionales (ex. « dance » avec /æ/) ne sont pas représentées. L’IPA des mots ajoutés provient de l’IA ou d’un dictionnaire et est marquée « à vérifier ».
- Les traductions automatiques et les enregistrements Wiktionary nécessitent Internet.
- Dans claude.ai, le site n’a pas accès au réseau externe : pas d’enregistrements Wiktionary ni de service worker ; la synchronisation et la traduction passent par ton compte Claude.

---

## Licences

- Code : libre d’usage pour toi.
- Liste NGSL-Spoken : CC BY-SA 4.0 (Browne & Culligan) — la base dérivée (`src/data/coreWords.json`) est partagée sous la même licence.
- Britfone : licence MIT (`scripts/source-data/BRITFONE_LICENSE.txt`).
