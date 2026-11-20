# Oz Vocab

Site web pour **développer son vocabulaire anglais (A2 → C1) et s’exprimer à l’oral**, avec la **prononciation australienne** et une **répétition espacée** inspirée d’Anki. Interface en français, pensée d’abord pour l’iPhone (Safari) et utilisable sur ordinateur. Pas de module de compréhension orale, de dictée ni de transcription : l’audio sert à entendre le bon modèle et à répéter.

C’est un site web (React + TypeScript + Vite + Tailwind CSS), pas une application native : il s’ouvre depuis une URL, et peut être ajouté à l’écran d’accueil de l’iPhone (PWA facultative).

---

## Ce que fait le site

| Section | Contenu |
|---|---|
| **Accueil — séance du jour** | ordre de la séance : mots oubliés → révisions (à dire / à reconnaître) → nouveaux mots ↔ mots à dire pour la 1re fois ; reconnus et productibles par niveau CECRL ; invitation au test de placement |
| **Réviser** | listes de 10 cartes ; deux sortes de cartes : *anglais → français* (reconnaître) et *français → anglais* (produire, à l’oral ou en tapant le mot, fautes de frappe tolérées) ; une carte ratée revient en fin de liste ; reprise après interruption ; bilan |
| **S’exprimer** | 7 exercices par niveau (A2, B1, B2, C1) : *Phrase avec le mot* (tes mots récents + consigne de niveau), *Le mot juste* (synonymes et nuances), *Plus naturel* (calques du français), *Reformuler* (plus simple / poli / formel / nuancé), *Situations* (quotidien, travail, mines, social : préparation 30 s, réponse modèle + version un cran au-dessus), *Réponse rapide* (10 questions × 20 s), *Mon histoire* (3 essais enregistrés, mots manquants ajoutés au vocabulaire) ; fiches *Les 5 temps* et *Prononciation* (12 sons, écouter / s’enregistrer / comparer). Réponse à l’oral ou à l’écrit, correcteur gratuit LanguageTool pour l’écrit, auto-évaluation |
| **Vocabulaire** | recherche anglais / français, filtres combinables, fiche de chaque mot avec ses deux suivis ; **mots apparentés** (règles -tion, -té → -ty, -eux → -ous…, accent tonique, faux amis, orthographe australienne) ; ajout de mots |
| **Test de placement** | ≈ 5 min, QCM A–E par tranches de 50 mots ; les tranches réussies ne sont pas reproposées comme nouvelles (vérifiées en révision 1 à 4 semaines plus tard) |
| **Progrès** | progression A2 → C1 (un niveau est validé avec 80 % de ses mots productibles et 5 situations réussies), reconnus / productibles par niveau, réponses par jour, mots maîtrisés, tableau jour par jour, historique des sessions |
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
python3 scripts/e2e_v2.py http://localhost:4173 ./captures     # placement, cartes FR → EN, fiches
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

## Paquets de vocabulaire (après les 500)

| Paquet | Contenu |
|---|---|
| B1 · B2 · C1 | ≈ 690 + 550 + 400 mots. B1 et B2 : mots CEFR-J classés par fréquence orale (sous-titres OpenSubtitles, FrequencyWords), triés à la main (mots utiles gardés, mots de films policiers relégués) ; C1 : sélection rédigée pour nuancer et argumenter. Traductions rédigées pour l’application. |
| Phrasal verbs | 150, avec exemple et traduction |
| Expressions | ≈ 95 expressions idiomatiques et tournures naturelles |
| Anglais australien | ≈ 95 mots et expressions (arvo, servo, reckon, yeah nah…) avec registre |
| Travail et mines | ≈ 130 : recherche d’emploi, livraison, hôtellerie, ferme, chantier, mines (FIFO, roster, donga, crib…), sécurité (PPE, Take 5, JHA, isolation…) |

Ordre : B1 → B2 → C1, les paquets thématiques étant intercalés par petits groupes du même thème. Chaque paquet peut être désactivé dans les paramètres. Régénérer : `python3 scripts/build_packs.py` (sources dans `scripts/source-data/packs/`).

## Les 500 mots : source et méthode

- **Source** : [NGSL-Spoken 1.2](https://www.newgeneralservicelist.com/ngsl-spoken) (Browne & Culligan), liste des mots les plus fréquents de l’anglais **parlé**, calculée sur les sous-corpus oraux du corpus NGSL et classée par fréquence. Licence CC BY-SA 4.0.
- **Unité = lemme** : « go » regroupe go, goes, went, gone, going (formes affichées sur la fiche) ; les formes d’un verbe ne sont donc pas comptées comme des mots différents.
- **Nettoyage**, sans changer l’ordre : retrait de 5 balises de transcription du corpus oral (`pause`, `unclear`, `laughter`, `breath`, `cough`) et correction de l’entrée « true » abîmée dans le fichier source. Les 500 mots sont donc les rangs 1 à 505 de NGSL-Spoken moins ces 5 balises. Le rang affiché « n° » est la position dans la liste nettoyée ; le rang NGSL-S d’origine est conservé.
- **Fréquence relative** : indice U de NGSL-Spoken (occurrences estimées par million de mots), affiché avec une jauge logarithmique.
- **Orthographe** : australienne pour l’affichage (« colour »), sans toucher au rang.
- **IPA** : dictionnaire [Britfone](https://github.com/JoseLlarena/Britfone) (anglais britannique, licence MIT) converti automatiquement en anglais australien, phonème par phonème (`scripts/build_dataset.py`).
- **Traductions, catégories et exemples** : rédigés pour ce projet (`scripts/source-data/fr_entries.tsv`), avec traductions secondaires pour les mots à plusieurs sens (get, right, mean, still, since…).

- **Niveaux CECRL** : [CEFR-J Wordlist 1.5](https://github.com/openlanguageprofiles/olp-en-cefrj) (A1–B2, Tono Lab, TUFS) et Octanove Vocabulary Profile C1/C2 (CC BY-SA 4.0), sens principal du mot ; un mot oral très fréquent absent des listes (yeah, okay…) est classé A1.

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

Un mot est **maîtrisé** à partir de 21 jours d’intervalle (seuil « mature » d’Anki), gagné en révision.

**3. Deux suivis par mot** (`src/domain/tracks.ts`) — chacun avec sa propre répétition espacée :
- *reconnaître* (anglais → français) ; *produire* (français → anglais), qui commence le lendemain d’une première reconnaissance réussie ;
- réussir une carte « produire » valide aussi la reconnaissance si elle était à revoir ;
- priorité (`src/domain/selection.ts`) : oubliés → produire à revoir → reconnaître à revoir → nouvelle liste et mots à dire pour la 1re fois, en alternance (la 1re nouvelle liste du jour passe d’abord) ;
- un mot « jugé connu » au test de placement n’a aucune révision inventée : il est simplement programmé pour une vérification ; raté, il repart comme un mot nouveau.

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
- The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies (usage libre, y compris commercial, avec cette citation ; copyright Tono Laboratory, TUFS). Via [Open Language Profiles](https://github.com/openlanguageprofiles/olp-en-cefrj).
- Octanove Vocabulary Profile C1/C2 1.0 : CC BY-SA 4.0.
- FrequencyWords (Hermit Dave, d’après OpenSubtitles) : CC BY-SA 4.0, utilisé seulement pour classer les mots.
- Correcteur des réponses tapées : API publique gratuite de LanguageTool (le texte tapé lui est envoyé ; aucune clé dans le code).
