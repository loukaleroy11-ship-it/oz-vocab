/**
 * Mots apparentés français → anglais : les règles de transformation, pas une
 * liste de mots. Une règle « très fiable » marche dans la grande majorité des cas ;
 * « souvent » demande de vérifier. Les faux amis rappellent les exceptions qui piègent.
 */

export type Reliability = 'très fiable' | 'souvent';

export interface CognateRule {
  fr: string;
  en: string;
  reliability: Reliability;
  /** Paires d'exemples [français, anglais]. */
  examples: [string, string][];
  note?: string;
}

export interface CognateGroup {
  id: string;
  title: string;
  rules: CognateRule[];
}

export const COGNATE_GROUPS: CognateGroup[] = [
  {
    id: 'noms',
    title: 'Noms',
    rules: [
      {
        fr: '-tion',
        en: '-tion',
        reliability: 'très fiable',
        examples: [['information', 'information'], ['situation', 'situation'], ['solution', 'solution']],
        note: 'Se prononce « -cheune » /ʃən/, et l’accent tombe juste avant : in-for-MA-tion.',
      },
      { fr: '-sion', en: '-sion', reliability: 'très fiable', examples: [['décision', 'decision'], ['télévision', 'television']] },
      {
        fr: '-té',
        en: '-ty',
        reliability: 'très fiable',
        examples: [['qualité', 'quality'], ['sécurité', 'security'], ['université', 'university'], ['possibilité', 'possibility']],
      },
      {
        fr: '-ie',
        en: '-y',
        reliability: 'souvent',
        examples: [['énergie', 'energy'], ['technologie', 'technology'], ['compagnie', 'company'], ['économie', 'economy']],
      },
      {
        fr: '-eur',
        en: '-or / -our',
        reliability: 'souvent',
        examples: [['acteur', 'actor'], ['docteur', 'doctor'], ['couleur', 'colour'], ['odeur', 'odour']],
        note: 'En Australie on écrit -our comme au Royaume-Uni : colour, honour, behaviour, neighbour.',
      },
      {
        fr: '-isme · -iste',
        en: '-ism · -ist',
        reliability: 'très fiable',
        examples: [['tourisme', 'tourism'], ['optimiste', 'optimist'], ['touriste', 'tourist']],
      },
      {
        fr: '-ance · -ence',
        en: '-ance · -ence',
        reliability: 'très fiable',
        examples: [['distance', 'distance'], ['expérience', 'experience'], ['patience', 'patience']],
      },
      { fr: '-ure', en: '-ure', reliability: 'très fiable', examples: [['nature', 'nature'], ['culture', 'culture'], ['température', 'temperature']] },
      { fr: '-ème', en: '-em', reliability: 'souvent', examples: [['problème', 'problem'], ['système', 'system']] },
      {
        fr: '-oire',
        en: '-ory',
        reliability: 'souvent',
        examples: [['histoire', 'history'], ['mémoire', 'memory'], ['territoire', 'territory']],
        note: '« Histoire » au sens de récit se dit « story ».',
      },
      {
        fr: '-aire',
        en: '-ary',
        reliability: 'souvent',
        examples: [['salaire', 'salary'], ['dictionnaire', 'dictionary'], ['nécessaire', 'necessary'], ['ordinaire', 'ordinary']],
      },
      {
        fr: '-ien · -ain',
        en: '-ian · -an',
        reliability: 'souvent',
        examples: [['musicien', 'musician'], ['australien', 'Australian'], ['humain', 'human'], ['américain', 'American']],
        note: 'Les nationalités prennent une majuscule en anglais.',
      },
      {
        fr: '-que',
        en: '-c · -ck · -k',
        reliability: 'souvent',
        examples: [['musique', 'music'], ['attaque', 'attack'], ['banque', 'bank'], ['risque', 'risk']],
      },
    ],
  },
  {
    id: 'adjectifs',
    title: 'Adjectifs',
    rules: [
      {
        fr: '-eux · -euse',
        en: '-ous',
        reliability: 'très fiable',
        examples: [['dangereux', 'dangerous'], ['nerveux', 'nervous'], ['sérieux', 'serious'], ['curieux', 'curious']],
      },
      {
        fr: '-ique',
        en: '-ic · -ical',
        reliability: 'très fiable',
        examples: [['électrique', 'electric'], ['typique', 'typical'], ['pratique', 'practical'], ['logique', 'logical']],
      },
      { fr: '-if · -ive', en: '-ive', reliability: 'très fiable', examples: [['actif', 'active'], ['positif', 'positive'], ['créatif', 'creative']] },
      {
        fr: '-el · -elle',
        en: '-al',
        reliability: 'très fiable',
        examples: [['naturel', 'natural'], ['personnel', 'personal'], ['professionnel', 'professional'], ['réel', 'real']],
      },
      {
        fr: '-able · -ible',
        en: '-able · -ible',
        reliability: 'très fiable',
        examples: [['possible', 'possible'], ['responsable', 'responsible'], ['confortable', 'comfortable']],
        note: 'Comfortable se dit « KUMF-tuh-bl », en 3 syllabes.',
      },
      {
        fr: '-ant · -ent',
        en: '-ant · -ent',
        reliability: 'très fiable',
        examples: [['important', 'important'], ['différent', 'different'], ['urgent', 'urgent']],
      },
    ],
  },
  {
    id: 'verbes',
    title: 'Verbes',
    rules: [
      {
        fr: '-er',
        en: '(rien)',
        reliability: 'souvent',
        examples: [['accepter', 'accept'], ['changer', 'change'], ['continuer', 'continue'], ['confirmer', 'confirm']],
      },
      {
        fr: '-er',
        en: '-ate',
        reliability: 'souvent',
        examples: [['créer', 'create'], ['participer', 'participate'], ['communiquer', 'communicate'], ['éduquer', 'educate']],
      },
      {
        fr: '-iser',
        en: '-ise',
        reliability: 'très fiable',
        examples: [['organiser', 'organise'], ['moderniser', 'modernise'], ['réaliser', 'realise']],
        note: 'Orthographe australienne en -ise (américaine en -ize). Attention : « realise » veut dire « se rendre compte ».',
      },
      {
        fr: '-ifier',
        en: '-ify',
        reliability: 'très fiable',
        examples: [['vérifier', 'verify'], ['simplifier', 'simplify'], ['identifier', 'identify']],
      },
      {
        fr: 'participe en -é',
        en: '-ed',
        reliability: 'souvent',
        examples: [['décidé', 'decided'], ['préparé', 'prepared'], ['organisé', 'organised']],
      },
    ],
  },
  {
    id: 'adverbes',
    title: 'Adverbes',
    rules: [
      {
        fr: '-ment',
        en: '-ly',
        reliability: 'très fiable',
        examples: [['exactement', 'exactly'], ['finalement', 'finally'], ['généralement', 'generally'], ['rapidement', 'rapidly']],
        note: 'À l’oral, on dit plus souvent « quickly » que « rapidly ».',
      },
    ],
  },
  {
    id: 'accents',
    title: 'Lettres disparues en français',
    rules: [
      {
        fr: 'accent circonflexe (ê, â, ô, î, û)',
        en: '+ s',
        reliability: 'souvent',
        examples: [['forêt', 'forest'], ['hôpital', 'hospital'], ['fête', 'feast'], ['coûter', 'cost'], ['bête', 'beast']],
        note: 'Le circonflexe marque souvent un « s » disparu en français mais resté en anglais.',
      },
      {
        fr: 'é- en début de mot',
        en: 's-',
        reliability: 'souvent',
        examples: [['école', 'school'], ['étudiant', 'student'], ['état', 'state'], ['épice', 'spice'], ['étrange', 'strange']],
      },
    ],
  },
];

/** Même mot, mais l'accent tonique ou le nombre de syllabes change : écoute-les. */
export const STRESS_SHIFTS: { en: string; stress: string; fr: string }[] = [
  { en: 'information', stress: 'in-fuh-MAY-shuhn', fr: 'information' },
  { en: 'comfortable', stress: 'KUMF-tuh-bl', fr: 'confortable' },
  { en: 'chocolate', stress: 'CHOK-luht', fr: 'chocolat' },
  { en: 'development', stress: 'duh-VEL-uhp-muhnt', fr: 'développement' },
  { en: 'interesting', stress: 'IN-truh-sting', fr: 'intéressant' },
  { en: 'photography', stress: 'fuh-TOG-ruh-fee', fr: 'photographie' },
  { en: 'Australia', stress: 'uh-STRAY-lee-uh', fr: 'Australie' },
];

export interface FalseFriend {
  en: string;
  means: string;
  /** Le mot français qui piège, et comment le dire vraiment en anglais. */
  trap: string;
}

export const FALSE_FRIENDS: FalseFriend[] = [
  { en: 'actually', means: 'en fait', trap: 'actuellement = currently, at the moment' },
  { en: 'eventually', means: 'finalement, au bout du compte', trap: 'éventuellement = possibly, maybe' },
  { en: 'sensible', means: 'raisonnable', trap: 'sensible = sensitive' },
  { en: 'library', means: 'bibliothèque', trap: 'librairie = bookshop' },
  { en: 'to attend', means: 'assister à', trap: 'attendre = to wait' },
  { en: 'to assist', means: 'aider', trap: 'assister à = to attend' },
  { en: 'to realise', means: 'se rendre compte', trap: 'réaliser = to achieve, to carry out' },
  { en: 'deception', means: 'tromperie', trap: 'déception = disappointment' },
  { en: 'sympathetic', means: 'compatissant', trap: 'sympathique = nice, friendly' },
  { en: 'journey', means: 'trajet, voyage', trap: 'journée = day' },
  { en: 'to rest', means: 'se reposer', trap: 'rester = to stay' },
  { en: 'lecture', means: 'cours magistral, conférence', trap: 'lecture = reading' },
  { en: 'coin', means: 'pièce de monnaie', trap: 'coin = corner' },
  { en: 'location', means: 'endroit, emplacement', trap: 'location = rental, hire' },
  { en: 'to pretend', means: 'faire semblant', trap: 'prétendre = to claim' },
  { en: 'résumé', means: 'CV (en Australie)', trap: 'résumé = summary' },
];

/** Orthographe en Australie : britannique pour l'essentiel. */
export const AU_SPELLING: { rule: string; examples: string }[] = [
  { rule: '-our (et non -or)', examples: 'colour, favourite, neighbour, behaviour' },
  { rule: '-ise (et non -ize)', examples: 'organise, realise, apologise' },
  { rule: '-re (et non -er)', examples: 'centre, metre, theatre' },
  { rule: 'consonne doublée', examples: 'travelled, cancelled, travelling' },
  { rule: 'nom en -ce, verbe en -se', examples: 'a licence / to license, practice / to practise' },
  { rule: 'mais « program » pour les programmes', examples: 'a TV program, a training program' },
];
