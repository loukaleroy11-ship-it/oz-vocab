/**
 * Les 5 temps les plus utiles pour parler anglais au quotidien.
 * À l'oral, le présent simple et le prétérit font l'essentiel du travail ;
 * le présent progressif, le present perfect et le futur (will / going to)
 * complètent ce qu'il faut pour presque toutes les situations.
 */

export interface TenseUse {
  /** Quand l'utiliser. */
  use: string;
  en: string;
  fr: string;
}

export interface TenseForm {
  label: 'Affirmation' | 'Négation' | 'Question';
  pattern: string;
  en: string;
}

export interface TenseTrap {
  wrong: string;
  right: string;
  why: string;
}

export interface TenseGuide {
  id: 'present-simple' | 'present-continuous' | 'past-simple' | 'present-perfect' | 'future';
  name: string;
  frName: string;
  /** L'idée en une phrase. */
  idea: string;
  uses: TenseUse[];
  forms: TenseForm[];
  /** Mots qui signalent souvent ce temps. */
  signals: string[];
  traps: TenseTrap[];
  /** Ce qu'on entend en Australie (facultatif). */
  aussie?: string;
  /** Consignes pour parler à voix haute. */
  speak: string[];
}

export const TENSES: TenseGuide[] = [
  {
    id: 'present-simple',
    name: 'Present simple',
    frName: 'Présent simple',
    idea: 'Ce qui est vrai en général : habitudes, faits, goûts, états.',
    uses: [
      { use: 'Habitudes et routines', en: 'I deliver for Uber Eats most evenings.', fr: 'Je livre pour Uber Eats presque tous les soirs.' },
      { use: 'Faits et vérités générales', en: 'Perth gets a lot of sun.', fr: 'Perth a beaucoup de soleil.' },
      {
        use: 'Verbes d’état (know, like, want, need, understand, mean…), même pour maintenant',
        en: 'Sorry, I don’t understand.',
        fr: 'Désolé, je ne comprends pas.',
      },
      { use: 'Horaires et programmes fixes', en: 'The last train leaves at midnight.', fr: 'Le dernier train part à minuit.' },
    ],
    forms: [
      { label: 'Affirmation', pattern: 'sujet + verbe (+ -s avec he / she / it)', en: 'She works nights.' },
      { label: 'Négation', pattern: 'don’t / doesn’t + verbe', en: 'He doesn’t drive.' },
      { label: 'Question', pattern: 'Do / Does + sujet + verbe ?', en: 'Do you live around here?' },
    ],
    signals: ['always', 'usually', 'often', 'sometimes', 'never', 'every day', 'on weekends'],
    traps: [
      { wrong: 'I am agree.', right: 'I agree.', why: '« agree » est un verbe : pas de « am » devant.' },
      { wrong: 'He work here.', right: 'He works here.', why: 'Le -s de he / she / it s’entend : à l’oral, il compte.' },
      { wrong: 'Do he like it?', right: 'Does he like it?', why: 'Avec he / she / it, la question se fait avec « does », et le verbe perd son -s.' },
    ],
    speak: [
      'Décris ta journée type de livreur en 4 phrases (I usually start…, I ride…, I finish…).',
      'Dis 3 choses que tu aimes et 2 que tu n’aimes pas à Perth (I like… / I don’t like…).',
    ],
  },
  {
    id: 'present-continuous',
    name: 'Present continuous',
    frName: 'Présent progressif (be + -ing)',
    idea: 'Ce qui est en train de se passer, ou temporaire en ce moment.',
    uses: [
      { use: 'Action en cours au moment où l’on parle', en: 'I’m riding to the restaurant now.', fr: 'Je suis en route pour le restaurant.' },
      { use: 'Situation temporaire', en: 'I’m staying in a hostel at the moment.', fr: 'Je loge dans une auberge en ce moment.' },
      { use: 'Projet déjà organisé (avec un moment précis)', en: 'I’m starting a new job on Monday.', fr: 'Je commence un nouveau travail lundi.' },
      { use: 'Quelque chose qui évolue', en: 'My English is getting better.', fr: 'Mon anglais s’améliore.' },
    ],
    forms: [
      { label: 'Affirmation', pattern: 'am / is / are + verbe-ing', en: 'They’re waiting outside.' },
      { label: 'Négation', pattern: 'am not / isn’t / aren’t + verbe-ing', en: 'I’m not working today.' },
      { label: 'Question', pattern: 'Am / Is / Are + sujet + verbe-ing ?', en: 'Are you coming tonight?' },
    ],
    signals: ['now', 'right now', 'at the moment', 'today', 'this week', 'currently'],
    traps: [
      {
        wrong: 'Wait, I work now.',
        right: 'Wait, I’m working now.',
        why: 'Le français dit « je travaille » dans les deux cas ; l’anglais distingue l’habitude (I work) de l’action en cours (I’m working).',
      },
      { wrong: 'I’m knowing him.', right: 'I know him.', why: 'Pas de -ing avec les verbes d’état : know, want, like, need, understand, believe.' },
      { wrong: 'Where you are going?', right: 'Where are you going?', why: 'Dans la question, « are » passe avant le sujet.' },
    ],
    aussie: 'Tu entendras souvent « How are you going? » : c’est simplement « Comment ça va ? ». Réponse naturelle : « Good, thanks. You? »',
    speak: [
      'Dis ce que tu es en train de faire, et ce que font les gens autour de toi (I’m…, he’s…, they’re…).',
      'Explique ta situation en Australie en ce moment (At the moment I’m living…, I’m working…, I’m looking for…).',
    ],
  },
  {
    id: 'past-simple',
    name: 'Past simple',
    frName: 'Prétérit',
    idea: 'Une action terminée, à un moment passé connu.',
    uses: [
      { use: 'Action finie à un moment précis', en: 'I arrived in Perth in October.', fr: 'Je suis arrivé à Perth en octobre.' },
      {
        use: 'Une suite d’actions dans un récit',
        en: 'I picked up the order, rode to the house and knocked on the door.',
        fr: 'J’ai récupéré la commande, j’ai roulé jusqu’à la maison et j’ai frappé à la porte.',
      },
      { use: 'Une situation passée qui est finie', en: 'I worked as a waiter in Réunion.', fr: 'J’ai travaillé comme serveur à La Réunion.' },
    ],
    forms: [
      { label: 'Affirmation', pattern: 'verbe + -ed, ou forme irrégulière (went, saw, got, made, took…)', en: 'I got lost yesterday.' },
      { label: 'Négation', pattern: 'didn’t + verbe de base', en: 'I didn’t see the message.' },
      { label: 'Question', pattern: 'Did + sujet + verbe de base ?', en: 'Did you call him back?' },
    ],
    signals: ['yesterday', 'last night', 'last week', 'two days ago', 'in 2025', 'when I was…'],
    traps: [
      {
        wrong: 'I have arrived yesterday.',
        right: 'I arrived yesterday.',
        why: 'Le passé composé français se traduit par le prétérit dès qu’il y a un moment passé précis.',
      },
      { wrong: 'Did you went?', right: 'Did you go?', why: 'Après « did », le verbe reste à sa forme de base.' },
      {
        wrong: 'work-ed (deux syllabes)',
        right: 'worked (« workt »)',
        why: 'Le -ed se dit /t/ après p, k, s, sh, ch ; /d/ après les autres sons (played) ; /ɪd/ seulement après t ou d (wanted, needed).',
      },
    ],
    speak: [
      'Raconte ta dernière journée de livraison du début à la fin (First I…, then I…, after that…, in the end…).',
      'Raconte ton arrivée en Australie : quand, comment, ce qui t’a surpris.',
    ],
  },
  {
    id: 'present-perfect',
    name: 'Present perfect',
    frName: 'Present perfect (have + participe passé)',
    idea: 'Le passé qui compte maintenant : expérience, résultat, durée jusqu’à aujourd’hui.',
    uses: [
      { use: 'Expérience de vie, sans date', en: 'I’ve never worked on a farm.', fr: 'Je n’ai jamais travaillé dans une ferme.' },
      { use: 'Résultat visible maintenant', en: 'I’ve lost my keys.', fr: 'J’ai perdu mes clés (et je ne les ai toujours pas).' },
      {
        use: 'Durée jusqu’à maintenant, avec for / since',
        en: 'I’ve lived in Perth for a month.',
        fr: 'J’habite à Perth depuis un mois.',
      },
      { use: 'Juste fini, déjà, pas encore', en: 'I haven’t eaten yet.', fr: 'Je n’ai pas encore mangé.' },
    ],
    forms: [
      { label: 'Affirmation', pattern: 'have / has + participe passé', en: 'She’s already left.' },
      { label: 'Négation', pattern: 'haven’t / hasn’t + participe passé', en: 'I haven’t seen it.' },
      { label: 'Question', pattern: 'Have / Has + sujet + participe passé ?', en: 'Have you ever tried Vegemite?' },
    ],
    signals: ['ever', 'never', 'already', 'yet', 'just', 'so far', 'for', 'since', 'recently'],
    traps: [
      {
        wrong: 'I live in Perth since October.',
        right: 'I’ve lived in Perth since October.',
        why: '« Depuis » + présent en français = present perfect en anglais (ou I’ve been living…).',
      },
      { wrong: 'I have seen him yesterday.', right: 'I saw him yesterday.', why: 'Avec un moment passé précis (yesterday, last week), on utilise le prétérit.' },
      { wrong: 'since three weeks', right: 'for three weeks', why: '« for » + une durée ; « since » + un point de départ (since Monday, since I arrived).' },
    ],
    speak: [
      'Présente ton expérience pro sans donner de dates (I’ve worked as…, I’ve done…, I’ve never…).',
      'Dis depuis combien de temps tu fais 4 choses (I’ve been… for… / since…).',
    ],
  },
  {
    id: 'future',
    name: 'Future: will / be going to',
    frName: 'Futur : will et be going to',
    idea: 'Parler de l’avenir : intention déjà décidée (going to) ou décision sur le moment (will).',
    uses: [
      { use: 'going to : intention déjà décidée', en: 'I’m going to apply for farm work.', fr: 'Je vais postuler pour du travail en ferme.' },
      { use: 'going to : prédiction avec un indice visible', en: 'Look at those clouds, it’s going to rain.', fr: 'Regarde ces nuages, il va pleuvoir.' },
      { use: 'will : décision prise sur le moment', en: 'OK, I’ll take the next order.', fr: 'OK, je prends la prochaine commande.' },
      { use: 'will : promesse, proposition, avis sur l’avenir', en: 'I’ll call you back. I think it’ll be fine.', fr: 'Je te rappelle. Je pense que ça ira.' },
    ],
    forms: [
      { label: 'Affirmation', pattern: 'will + verbe · am / is / are going to + verbe', en: 'I’ll be there. We’re going to move.' },
      { label: 'Négation', pattern: 'won’t + verbe · am not / isn’t / aren’t going to + verbe', en: 'It won’t take long.' },
      { label: 'Question', pattern: 'Will + sujet + verbe ? · Are you going to + verbe ?', en: 'Are you going to work tonight?' },
    ],
    signals: ['tomorrow', 'tonight', 'next week', 'soon', 'later', 'in two days'],
    traps: [
      { wrong: 'I will to go.', right: 'I’ll go.', why: 'Jamais « to » après will.' },
      {
        wrong: 'When I will arrive, I’ll call you.',
        right: 'When I arrive, I’ll call you.',
        why: 'Après when, as soon as, if, before, after : présent simple, même pour l’avenir.',
      },
      {
        wrong: 'I go to call you.',
        right: 'I’m going to call you. / I’ll call you.',
        why: '« Je vais » + verbe ne se traduit pas mot à mot : il faut « be going to » ou « will ».',
      },
    ],
    aussie: 'À l’oral rapide, « going to » devient souvent « gonna » : « I’m gonna grab a coffee. » À l’écrit ou en entretien, garde « going to ».',
    speak: [
      'Dis tes 3 projets pour les prochains mois (I’m going to…).',
      'Réagis sur le moment : ton client ne répond pas à la porte. Que fais-tu ? (I’ll…)',
    ],
  },
];

export interface TenseQuizItem {
  id: string;
  fr: string;
  /** 4 propositions (affichées dans un ordre mélangé, de A à D) ; E = « Aucune des propositions… ». */
  options: [string, string, string, string];
  /** Indice dans `options`, ou null si aucune n'est exacte (réponse E). */
  correct: number | null;
  explain: string;
  tense: TenseGuide['id'];
}

export const TENSE_QUIZ: TenseQuizItem[] = [
  {
    id: 'q1',
    fr: 'J’habite à Perth depuis octobre.',
    options: ['I live in Perth since October.', 'I’m living in Perth since October.', 'I’ve lived in Perth since October.', 'I lived in Perth since October.'],
    correct: 2,
    explain: '« Depuis » + présent français → present perfect : I’ve lived (ou I’ve been living) in Perth since October.',
    tense: 'present-perfect',
  },
  {
    id: 'q2',
    fr: 'Je suis arrivé hier soir.',
    options: ['I have arrived last night.', 'I arrived last night.', 'I’m arrived last night.', 'I was arrive last night.'],
    correct: 1,
    explain: 'Moment passé précis (last night) → prétérit : I arrived.',
    tense: 'past-simple',
  },
  {
    id: 'q3',
    fr: 'Ne m’appelle pas, je suis en train de rouler.',
    options: ['Don’t call me, I ride.', 'Don’t call me, I’m riding.', 'Don’t call me, I’ve ridden.', 'Don’t call me, I riding.'],
    correct: 1,
    explain: 'Action en cours → be + -ing : I’m riding. Sans « am », la phrase est fausse.',
    tense: 'present-continuous',
  },
  {
    id: 'q4',
    fr: 'Je ne comprends pas la question.',
    options: ['I’m not understanding the question.', 'I don’t understand the question.', 'I not understand the question.', 'I doesn’t understand the question.'],
    correct: 1,
    explain: '« understand » est un verbe d’état : présent simple, négation avec don’t.',
    tense: 'present-simple',
  },
  {
    id: 'q5',
    fr: 'Le client dit qu’il manque une sauce. Toi : « Pas de souci, je retourne au resto. » (tu le décides à l’instant)',
    options: [
      'No worries, I’ll go back to the restaurant.',
      'No worries, I will to go back to the restaurant.',
      'No worries, I went back to the restaurant.',
      'No worries, I’ve gone back to the restaurant.',
    ],
    correct: 0,
    explain: 'Décision prise sur le moment → will (sans « to ») : I’ll go back.',
    tense: 'future',
  },
  {
    id: 'q6',
    fr: 'Je vais postuler pour du travail en ferme le mois prochain. (c’est déjà décidé)',
    options: [
      'I apply for farm work next month.',
      'I’m going to apply for farm work next month.',
      'I’ve applied for farm work next month.',
      'I applied for farm work next month.',
    ],
    correct: 1,
    explain: 'Intention déjà décidée → be going to : I’m going to apply.',
    tense: 'future',
  },
  {
    id: 'q7',
    fr: 'Quand j’arriverai, je t’enverrai un message.',
    options: ['When I will arrive, I’ll text you.', 'When I’ll arrive, I text you.', 'When I arrived, I’ll text you.', 'When I arriving, I’ll text you.'],
    correct: null,
    explain: 'Aucune n’est exacte. Après « when », présent simple même pour le futur : When I arrive, I’ll text you.',
    tense: 'future',
  },
  {
    id: 'q8',
    fr: 'Elle travaille de nuit le week-end.',
    options: ['She work nights on weekends.', 'She’s work nights on weekends.', 'She works nights on weekends.', 'She working nights on weekends.'],
    correct: 2,
    explain: 'Habitude → présent simple, avec le -s de she : She works.',
    tense: 'present-simple',
  },
  {
    id: 'q9',
    fr: 'Tu as déjà goûté la Vegemite ?',
    options: ['Have you ever tried Vegemite?', 'Do you ever tried Vegemite?', 'Are you ever tried Vegemite?', 'Have you ever try Vegemite?'],
    correct: 0,
    explain: 'Expérience de vie sans date → present perfect : Have you ever + participe passé (tried).',
    tense: 'present-perfect',
  },
  {
    id: 'q10',
    fr: 'Je n’ai pas vu le message.',
    options: ['I didn’t saw the message.', 'I haven’t saw the message.', 'I not saw the message.', 'I don’t see the message.'],
    correct: null,
    explain: 'Aucune n’est exacte. Correct : I didn’t see the message (moment passé) ou I haven’t seen the message (toujours pas vu).',
    tense: 'past-simple',
  },
  {
    id: 'q11',
    fr: 'En ce moment, je loge dans une auberge de jeunesse.',
    options: ['At the moment I stay in a hostel.', 'At the moment I’m staying in a hostel.', 'At the moment I’ve stayed in a hostel.', 'At the moment I stayed in a hostel.'],
    correct: 1,
    explain: 'Situation temporaire → be + -ing : I’m staying.',
    tense: 'present-continuous',
  },
  {
    id: 'q12',
    fr: 'Hier, j’ai livré 25 commandes.',
    options: ['Yesterday I’ve delivered 25 orders.', 'Yesterday I delivered 25 orders.', 'Yesterday I was deliver 25 orders.', 'Yesterday I deliver 25 orders.'],
    correct: 1,
    explain: '« Yesterday » → prétérit : I delivered.',
    tense: 'past-simple',
  },
];
