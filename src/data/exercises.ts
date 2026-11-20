/**
 * Contenu des exercices « S'exprimer », rédigé pour l'application, par niveau.
 * La difficulté monte surtout par la construction des phrases et la nuance :
 *  A2 phrases simples · B1 phrases reliées (because, when, so) · B2 avis argumenté,
 *  hypothèses, relatives · C1 nuance, concession, choix du registre.
 */

import type { PracticeLevel } from '../domain/practice';
export type ExLevel = PracticeLevel;
export const EX_LEVELS: ExLevel[] = ['A2', 'B1', 'B2', 'C1'];

/** Ce qu'on attend d'une phrase à chaque niveau (exercice « Phrase avec le mot »). */
export const SENTENCE_TASKS: Record<ExLevel, string[]> = {
  A2: [
    'Une phrase simple sur ta journée.',
    'Une question que tu pourrais poser à un collègue.',
    'Une phrase au passé (hier, la semaine dernière).',
    'Une phrase sur ce que tu aimes ou n’aimes pas.',
  ],
  B1: [
    'Une phrase avec « because » pour expliquer une raison.',
    'Une phrase avec « when » sur une habitude au travail.',
    'Une phrase au present perfect (I’ve…, I’ve never…).',
    'Deux phrases reliées par « so » ou « but ».',
    'Un projet avec « I’m going to… ».',
  ],
  B2: [
    'Donne ton avis et une raison (I think… because…, In my view…).',
    'Une hypothèse avec « If I…, I would… ».',
    'Une phrase avec une relative (who, which, where).',
    'Compare deux choses (… is more … than …, whereas…).',
    'Une phrase polie pour demander quelque chose au travail (Would you mind…?, Could you possibly…?).',
  ],
  C1: [
    'Nuance ton avis (arguably, to some extent, it depends on…).',
    'Une concession (Although…, Even though…, Admittedly…, but…).',
    'Reformule la même idée dans un registre formel, puis familier.',
    'Une phrase avec une conséquence logique (consequently, which means that…).',
    'Une critique polie et constructive (It might be worth…, I wonder whether…).',
  ],
};

export interface RightWordItem {
  id: string;
  level: ExLevel;
  /** Phrase avec ___ à la place du mot. */
  sentence: string;
  options: string[];
  /** Indice de la bonne réponse, ou null si aucune ne convient (réponse E). */
  correct: number | null;
  explain: string;
}

export const RIGHT_WORD: RightWordItem[] = [
  { id: 'rw1', level: 'A2', sentence: 'Can you ___ me the salt, please?', options: ['pass', 'give back', 'borrow', 'lend'], correct: 0, explain: '« pass » = faire passer (à table). « borrow » = emprunter, « lend » = prêter.' },
  { id: 'rw2', level: 'A2', sentence: 'I ___ a mistake in the order.', options: ['did', 'made', 'had', 'took'], correct: 1, explain: 'On dit « make a mistake ». « Do » s’emploie pour les tâches (do the dishes).' },
  { id: 'rw3', level: 'A2', sentence: 'It’s really ___ today, take some water.', options: ['warm', 'hot', 'heat', 'cooked'], correct: 1, explain: '« hot » = très chaud (40 °C à Perth !). « warm » = agréablement chaud. « heat » est un nom.' },
  { id: 'rw4', level: 'A2', sentence: 'Can I ___ your phone? Mine is dead.', options: ['lend', 'borrow', 'take off', 'rent'], correct: 1, explain: '« borrow » = emprunter (je prends). « lend » = prêter (je donne).' },
  { id: 'rw5', level: 'A2', sentence: 'I ___ for Uber Eats in the evenings.', options: ['work', 'job', 'labour', 'make'], correct: 0, explain: '« work » est le verbe ; « job » est un nom (I have a job).' },
  { id: 'rw6', level: 'A2', sentence: 'The restaurant is ___ to the station.', options: ['near', 'next', 'close', 'beside'], correct: 2, explain: '« close to » ou « near » (sans « to »). « next to » = juste à côté.' },
  { id: 'rw7', level: 'A2', sentence: 'I’m ___ in surfing.', options: ['interesting', 'interested', 'keen', 'fun'], correct: 1, explain: '« interested » = intéressé (ce que je ressens) ; « interesting » = intéressant (la chose).' },
  { id: 'rw8', level: 'A2', sentence: 'We ___ a great time at the beach.', options: ['passed', 'spent', 'had', 'made'], correct: 2, explain: '« have a great time » = bien s’amuser. On « spend time », mais pas « spend a great time ».' },
  { id: 'rw9', level: 'B1', sentence: 'Sorry, I didn’t ___ what you said.', options: ['hear', 'listen', 'understand to', 'catch up'], correct: 0, explain: '« hear » = entendre (sans effort). « listen to » = écouter. « catch » marche aussi : I didn’t catch that.' },
  { id: 'rw10', level: 'B1', sentence: 'My boss ___ me to finish early.', options: ['let', 'allowed', 'made', 'permitted to'], correct: 1, explain: '« allow someone to do » ; « let someone do » (sans « to ») : My boss let me finish early.' },
  { id: 'rw11', level: 'B1', sentence: 'Can you ___ me when the order is ready?', options: ['remember', 'remind', 'tell', 'say'], correct: 2, explain: '« tell someone » (dire à quelqu’un). « say » ne prend pas de personne directement. « remind » = rappeler.' },
  { id: 'rw12', level: 'B1', sentence: 'The job is hard, but the pay is ___.', options: ['worth', 'worthy', 'worth it', 'value'], correct: null, explain: 'Aucune ne convient : on dirait « the pay is good » ou « it’s worth it » (ça vaut le coup) en fin de phrase.' },
  { id: 'rw13', level: 'B1', sentence: 'I’m used to ___ early.', options: ['wake up', 'waking up', 'woke up', 'be waking'], correct: 1, explain: '« be used to + -ing » = être habitué à. « I used to wake up early » = avant, je me levais tôt.' },
  { id: 'rw14', level: 'B1', sentence: 'There’s too much ___ on the freeway.', options: ['circulation', 'traffic', 'cars jam', 'movement'], correct: 1, explain: 'Faux ami : « circulation » (sang, journal) ≠ circulation routière = « traffic ».' },
  { id: 'rw15', level: 'B1', sentence: 'I’ll ___ you up at eight.', options: ['take', 'pick', 'bring', 'get'], correct: 1, explain: '« pick someone up » = passer prendre quelqu’un.' },
  { id: 'rw16', level: 'B1', sentence: 'She’s very ___: she always helps new workers.', options: ['sympathetic', 'nice', 'sensible', 'gentle'], correct: 1, explain: '« nice / friendly » = sympa. « sympathetic » = compatissant, « sensible » = raisonnable (faux amis).' },
  { id: 'rw17', level: 'B2', sentence: 'The new roster will ___ productivity.', options: ['rise', 'raise', 'boost', 'grow up'], correct: 2, explain: '« boost » = stimuler. « raise » = augmenter (avec un complément) marche moins bien ici ; « rise » n’a pas de complément.' },
  { id: 'rw18', level: 'B2', sentence: 'We need to ___ the problem before it gets worse.', options: ['address', 'adress', 'face to', 'resolve to'], correct: 0, explain: '« address a problem » = s’attaquer à un problème (un seul « d » en français, deux en anglais).' },
  { id: 'rw19', level: 'B2', sentence: 'I’m ___ to start on Monday.', options: ['keen', 'eager', 'available', 'free'], correct: 2, explain: 'Les quatre sont possibles, mais « available to start » est la formule attendue en entretien pour dire qu’on est disponible.' },
  { id: 'rw20', level: 'B2', sentence: 'The results were ___ better than last year.', options: ['significant', 'significantly', 'signified', 'meaningful'], correct: 1, explain: 'Devant un comparatif, il faut un adverbe : significantly better.' },
  { id: 'rw21', level: 'B2', sentence: 'He ___ that he had made a mistake.', options: ['admitted', 'confessed to', 'accepted', 'recognised to'], correct: 0, explain: '« admit that… » = reconnaître que. « confess to + -ing / nom ».' },
  { id: 'rw22', level: 'B2', sentence: 'The meeting has been ___ until next week.', options: ['delayed', 'postponed', 'cancelled', 'retarded'], correct: 1, explain: '« postpone » = reporter à une date ultérieure. « delay » = retarder. « retarded » est insultant : à éviter.' },
  { id: 'rw23', level: 'B2', sentence: 'Wearing PPE is ___ on site.', options: ['obligatory to', 'mandatory', 'forced', 'compelled'], correct: 1, explain: '« mandatory » (ou « compulsory ») = obligatoire, très utilisé dans les consignes de sécurité.' },
  { id: 'rw24', level: 'B2', sentence: 'Could you ___ the main points of the meeting?', options: ['resume', 'summarise', 'sum', 'abstract'], correct: 1, explain: 'Faux ami : « resume » = reprendre. Résumer = « summarise » ou « sum up ».' },
  { id: 'rw25', level: 'C1', sentence: 'The plan is ___ ambitious, but not impossible.', options: ['admittedly', 'arguably', 'barely', 'hardly'], correct: 0, explain: '« admittedly » introduit une concession (certes). « arguably » = on peut soutenir que.' },
  { id: 'rw26', level: 'C1', sentence: 'Cutting the safety training would ___ everything we’ve achieved.', options: ['undermine', 'underline', 'undergo', 'understate'], correct: 0, explain: '« undermine » = saper, affaiblir. « underline » = souligner.' },
  { id: 'rw27', level: 'C1', sentence: 'His feedback was ___ but fair.', options: ['blunt', 'rude', 'sharp-tongued', 'dull'], correct: 0, explain: '« blunt » = direct, sans détour (pas forcément impoli). « rude » = impoli.' },
  { id: 'rw28', level: 'C1', sentence: 'The cost of the delay is ___ compared to the risk of an accident.', options: ['negligible', 'negligent', 'neglected', 'neglectful'], correct: 0, explain: '« negligible » = négligeable. « negligent » = négligent (une personne).' },
  { id: 'rw29', level: 'C1', sentence: 'There’s a ___ between what he says and what he does.', options: ['discrepancy', 'difference of', 'distance', 'gap off'], correct: 0, explain: '« discrepancy » = écart, divergence (souvent entre deux chiffres ou versions).' },
  { id: 'rw30', level: 'C1', sentence: 'I was ___ to accept the offer at first.', options: ['reluctant', 'reticent to', 'hesitating', 'unwilling of'], correct: 0, explain: '« reluctant to do » = réticent à faire. « reticent » = peu disposé à parler.' },
  { id: 'rw31', level: 'C1', sentence: 'The new system has ___ the ordering process.', options: ['streamlined', 'mainstreamed', 'downsized', 'outlined'], correct: 0, explain: '« streamline » = simplifier, rationaliser.' },
  { id: 'rw32', level: 'C1', sentence: 'We need a more ___ approach, not just quick fixes.', options: ['comprehensive', 'comprehensible', 'understanding', 'complete of'], correct: 0, explain: '« comprehensive » = complet, global (faux ami : compréhensif = understanding).' },
];

export interface NaturalItem {
  id: string;
  level: ExLevel;
  wrong: string;
  right: string;
  why: string;
}

export const NATURAL: NaturalItem[] = [
  { id: 'n1', level: 'A2', wrong: 'I am agree with you.', right: 'I agree with you.', why: '« agree » est un verbe.' },
  { id: 'n2', level: 'A2', wrong: 'I have 18 years.', right: 'I’m 18 (years old).', why: 'L’âge se dit avec « be ».' },
  { id: 'n3', level: 'A2', wrong: 'I am hungry since this morning.', right: 'I’ve been hungry since this morning.', why: '« depuis » + situation qui continue → present perfect.' },
  { id: 'n4', level: 'A2', wrong: 'He don’t like coffee.', right: 'He doesn’t like coffee.', why: 'he / she / it → doesn’t.' },
  { id: 'n5', level: 'A2', wrong: 'Where is the toilets?', right: 'Where are the toilets?', why: '« toilets » est au pluriel. En Australie on dit aussi « Where’s the loo? ».' },
  { id: 'n6', level: 'A2', wrong: 'I explain you the problem.', right: 'Let me explain the problem to you.', why: '« explain something to someone ».' },
  { id: 'n7', level: 'A2', wrong: 'It depends of the weather.', right: 'It depends on the weather.', why: '« depend on ».' },
  { id: 'n8', level: 'A2', wrong: 'I go to work with my bike.', right: 'I ride to work. / I go to work by bike.', why: '« by bike, by bus » ; ou simplement « ride ».' },
  { id: 'n9', level: 'A2', wrong: 'Can you repeat please?', right: 'Sorry, could you say that again?', why: 'Plus naturel et plus poli à l’oral.' },
  { id: 'n10', level: 'B1', wrong: 'I live in Perth since three weeks.', right: 'I’ve been living in Perth for three weeks.', why: 'Durée → « for » ; depuis + présent → present perfect.' },
  { id: 'n11', level: 'B1', wrong: 'Actually, I work for Uber Eats.', right: 'At the moment, I work for Uber Eats.', why: '« actually » = en fait ; actuellement = at the moment / currently.' },
  { id: 'n12', level: 'B1', wrong: 'I didn’t went to work yesterday.', right: 'I didn’t go to work yesterday.', why: 'Après « didn’t », verbe à la base.' },
  { id: 'n13', level: 'B1', wrong: 'Is it possible to have a coffee?', right: 'Could I get a coffee, please?', why: 'Formule naturelle au café.' },
  { id: 'n14', level: 'B1', wrong: 'I have a lot of works.', right: 'I’ve got a lot of work.', why: '« work » (travail) est indénombrable.' },
  { id: 'n15', level: 'B1', wrong: 'Give me an information about the job.', right: 'Could you give me some information about the job?', why: '« information » est indénombrable ; et la demande est plus polie.' },
  { id: 'n16', level: 'B1', wrong: 'I’m boring at work.', right: 'I’m bored at work.', why: '« bored » = je m’ennuie ; « boring » = ennuyeux.' },
  { id: 'n17', level: 'B1', wrong: 'Make attention to the cars.', right: 'Watch out for the cars.', why: 'Calque de « faire attention » : on dit « be careful / watch out ».' },
  { id: 'n18', level: 'B1', wrong: 'I will call you when I will finish.', right: 'I’ll call you when I finish.', why: 'Après « when » : présent pour le futur.' },
  { id: 'n19', level: 'B2', wrong: 'If I would have a car, I would work in a mine.', right: 'If I had a car, I’d work in a mine.', why: 'Pas de « would » après « if ».' },
  { id: 'n20', level: 'B2', wrong: 'He said me that the shift was cancelled.', right: 'He told me (that) the shift was cancelled.', why: '« tell someone » ; « say something ».' },
  { id: 'n21', level: 'B2', wrong: 'I look forward to hear from you.', right: 'I look forward to hearing from you.', why: '« look forward to + -ing ».' },
  { id: 'n22', level: 'B2', wrong: 'Despite of the rain, we kept working.', right: 'Despite the rain, we kept working.', why: '« despite » sans « of » (ou « in spite of »).' },
  { id: 'n23', level: 'B2', wrong: 'I’m used to work long shifts.', right: 'I’m used to working long shifts.', why: '« be used to + -ing ».' },
  { id: 'n24', level: 'B2', wrong: 'It’s the first time I come to Australia.', right: 'It’s the first time I’ve been to Australia.', why: '« It’s the first time » + present perfect.' },
  { id: 'n25', level: 'B2', wrong: 'The person which called you is my manager.', right: 'The person who called you is my manager.', why: '« who » pour une personne, « which » pour une chose.' },
  { id: 'n26', level: 'B2', wrong: 'I propose you to start tomorrow.', right: 'I suggest (that) you start tomorrow.', why: '« suggest that someone do » ; « propose » est plus formel.' },
  { id: 'n27', level: 'B2', wrong: 'We discussed about the roster.', right: 'We discussed the roster.', why: '« discuss » sans « about » (mais « talk about »).' },
  { id: 'n28', level: 'C1', wrong: 'I am completely agree that safety is important.', right: 'I couldn’t agree more that safety is paramount.', why: 'Formule idiomatique et vocabulaire plus précis.' },
  { id: 'n29', level: 'C1', wrong: 'In my opinion, I think that the plan is bad.', right: 'To my mind, the plan has some serious flaws.', why: 'Évite la double introduction (in my opinion + I think) et le vague « bad ».' },
  { id: 'n30', level: 'C1', wrong: 'It’s a very very big problem.', right: 'It’s a major issue.', why: 'Un mot précis vaut mieux que des intensifs répétés.' },
  { id: 'n31', level: 'C1', wrong: 'The price augmented a lot.', right: 'Prices rose sharply.', why: '« augment » existe mais sonne très formel ; « rise sharply » est naturel.' },
  { id: 'n32', level: 'C1', wrong: 'He is responsible of the team.', right: 'He’s in charge of the team.', why: '« responsible for » ; « in charge of » est plus courant pour diriger.' },
  { id: 'n33', level: 'C1', wrong: 'Even if it’s expensive, it’s worth.', right: 'Even though it’s expensive, it’s worth it.', why: '« even though » pour un fait réel ; « worth it » en fin de phrase.' },
  { id: 'n34', level: 'C1', wrong: 'I want that you send me the report.', right: 'I’d like you to send me the report.', why: '« want / would like someone to do ».' },
  { id: 'n35', level: 'C1', wrong: 'Thanks for your comprehension.', right: 'Thanks for your understanding.', why: 'Faux ami : comprehension = compréhension d’un texte.' },
  { id: 'n36', level: 'C1', wrong: 'We must absolutely finish today.', right: 'It’s essential that we finish today.', why: 'Calque du français ; la tournure « It’s essential that… » est plus naturelle.' },
];

export type RephraseTask = 'plus simple' | 'plus poli' | 'plus formel' | 'plus familier' | 'plus précis' | 'plus nuancé' | 'plus naturel';

export interface RephraseItem {
  id: string;
  level: ExLevel;
  base: string;
  task: RephraseTask;
  models: string[];
  tip: string;
}

export const REPHRASE: RephraseItem[] = [
  { id: 'r1', level: 'A2', base: 'Give me a coffee.', task: 'plus poli', models: ['Could I have a coffee, please?', 'Can I get a coffee, please?'], tip: 'Could I / Can I + please.' },
  { id: 'r2', level: 'A2', base: 'Repeat.', task: 'plus poli', models: ['Sorry, could you say that again?', 'Sorry, what was that?'], tip: 'Commence par « Sorry ».' },
  { id: 'r3', level: 'A2', base: 'The food was not bad, it was good, I liked it a lot.', task: 'plus simple', models: ['The food was great.', 'I really liked the food.'], tip: 'Un seul adjectif fort remplace trois idées faibles.' },
  { id: 'r4', level: 'A2', base: 'I am very, very tired.', task: 'plus précis', models: ['I’m exhausted.', 'I’m knackered.'], tip: 'Un adjectif fort à la place de « very very ».' },
  { id: 'r5', level: 'A2', base: 'Where is your house?', task: 'plus poli', models: ['Could you tell me your address, please?', 'What’s your address, please?'], tip: 'Utile en livraison.' },
  { id: 'r6', level: 'A2', base: 'I don’t want to work Sunday.', task: 'plus poli', models: ['I’d rather not work on Sunday, if that’s OK.', 'Would it be possible not to work on Sunday?'], tip: 'I’d rather… / Would it be possible…?' },
  { id: 'r7', level: 'B1', base: 'Your order is late because the restaurant was slow.', task: 'plus poli', models: ['Sorry for the wait, the restaurant took a bit longer than expected.', 'Sorry it’s late, there was a delay at the restaurant.'], tip: 'Excuse-toi d’abord, explique ensuite sans accuser.' },
  { id: 'r8', level: 'B1', base: 'I want more hours.', task: 'plus poli', models: ['Would it be possible to get a few more shifts?', 'I’m keen to pick up extra hours if any come up.'], tip: '« keen to », « if any come up » : ça montre la motivation sans exiger.' },
  { id: 'r9', level: 'B1', base: 'The job was good and bad.', task: 'plus précis', models: ['The pay was good, but the hours were really long.', 'I liked the team, but the work was physically demanding.'], tip: 'Dis ce qui était bien ET ce qui l’était moins, avec « but ».' },
  { id: 'r10', level: 'B1', base: 'I don’t understand nothing.', task: 'plus naturel', models: ['I don’t understand anything.', 'Sorry, I’m a bit lost.'], tip: 'Une seule négation en anglais.' },
  { id: 'r11', level: 'B1', base: 'Hello, I would like to know if you have work.', task: 'plus naturel', models: ['Hi, I was wondering if you’re hiring at the moment?', 'Hi, are you looking for any staff at the moment?'], tip: '« I was wondering if… » est naturel et poli.' },
  { id: 'r12', level: 'B1', base: 'Hey, gimme the keys.', task: 'plus formel', models: ['Could you pass me the keys, please?', 'Would you mind giving me the keys?'], tip: 'Would you mind + -ing ?' },
  { id: 'r13', level: 'B2', base: 'Your idea is bad.', task: 'plus nuancé', models: ['I’m not sure that would work, because…', 'I see your point, but I have a few concerns about it.'], tip: 'Reconnais l’idée, puis exprime un doute.' },
  { id: 'r14', level: 'B2', base: 'You are late again!', task: 'plus poli', models: ['I noticed you’ve been running late a few times. Is everything OK?', 'Could we have a quick chat about start times?'], tip: 'Décris le fait, pose une question ouverte.' },
  { id: 'r15', level: 'B2', base: 'I quit.', task: 'plus formel', models: ['I’d like to hand in my notice.', 'I’m writing to resign from my position, effective in two weeks.'], tip: '« hand in my notice » = donner son préavis.' },
  { id: 'r16', level: 'B2', base: 'The truck is broken.', task: 'plus précis', models: ['The haul truck has lost brake pressure and needs to be tagged out.', 'The loader won’t start; I think it’s the battery.'], tip: 'Dis quoi, quel symptôme, quelle action.' },
  { id: 'r17', level: 'B2', base: 'Pay me more.', task: 'plus poli', models: ['I’d like to discuss my pay rate, given my experience.', 'Is there any room to review my rate?'], tip: '« given my experience », « any room to… » : on argumente sans exiger.' },
  { id: 'r18', level: 'B2', base: 'It was a very nice experience.', task: 'plus précis', models: ['It was a really rewarding experience: I learnt how to work under pressure.', 'It taught me a lot about teamwork.'], tip: 'Remplace « nice » par ce que ça t’a apporté.' },
  { id: 'r19', level: 'C1', base: 'Everybody knows that FIFO is bad for families.', task: 'plus nuancé', models: ['FIFO can arguably put a strain on families, although many people make it work.', 'For some families, FIFO is tough, but it depends a lot on the roster.'], tip: 'arguably, can, for some, it depends : on évite les généralités.' },
  { id: 'r20', level: 'C1', base: 'The new rule is stupid.', task: 'plus nuancé', models: ['I can see why the rule was introduced, but I’m not convinced it’ll be effective in practice.', 'The intention is good; the implementation could be better.'], tip: 'Concession + réserve.' },
  { id: 'r21', level: 'C1', base: 'Hey mate, can’t come tomorrow, sorry.', task: 'plus formel', models: ['Unfortunately, I won’t be able to attend tomorrow. Please accept my apologies.', 'I’m afraid I’m unable to make it tomorrow.'], tip: 'I’m afraid…, unable to, attend.' },
  { id: 'r22', level: 'C1', base: 'I would be grateful if you could inform me of the schedule.', task: 'plus familier', models: ['Could you let me know the roster?', 'When am I on next?'], tip: 'Garde le sens, simplifie le registre.' },
  { id: 'r23', level: 'C1', base: 'We made a lot of money but people were very tired.', task: 'plus nuancé', models: ['Profits rose considerably, albeit at the cost of staff fatigue.', 'While revenue was strong, it came at a real cost to the team’s wellbeing.'], tip: 'albeit, while, at the cost of.' },
  { id: 'r24', level: 'C1', base: 'It’s not my fault.', task: 'plus nuancé', models: ['I take responsibility for my part, but there were other factors involved.', 'I don’t think I’m solely to blame here.'], tip: 'Reconnaître une part sans tout endosser.' },
];

export type SituationTheme = 'quotidien' | 'travail' | 'mines' | 'social';

export interface Situation {
  id: string;
  level: ExLevel;
  theme: SituationTheme;
  title: string;
  context: string;
  task: string;
  phrases: string[];
  /** Réponse modèle au niveau de la situation. */
  model: string;
  /** Même réponse, un niveau au-dessus. */
  modelUp: string;
}

export const SITUATIONS: Situation[] = [
  { id: 's1', level: 'A2', theme: 'travail', title: 'Client introuvable', context: 'Tu livres une commande Uber Eats. Tu es devant l’immeuble, mais l’interphone ne marche pas.', task: 'Appelle le client : présente-toi, explique le problème, demande ce qu’il veut que tu fasses.', phrases: ['Hi, it’s your Uber Eats driver.', 'I’m outside your building.', 'The intercom isn’t working.', 'Can you come down?'], model: 'Hi, it’s your Uber Eats driver. I’m outside your building, but the intercom isn’t working. Can you come down, or should I leave it at the door?', modelUp: 'Hi, it’s your Uber Eats rider. I’m at the front of the building but the intercom doesn’t seem to be working. Would you be able to come down, or would you prefer me to leave it in the lobby?' },
  { id: 's2', level: 'A2', theme: 'quotidien', title: 'À l’auberge', context: 'Tu arrives à l’accueil de l’auberge de jeunesse.', task: 'Dis que tu as une réservation, demande l’heure du petit-déjeuner et le mot de passe du wifi.', phrases: ['I have a booking.', 'What time is breakfast?', 'What’s the wifi password?'], model: 'Hi, I have a booking under Louka. What time is breakfast? And what’s the wifi password, please?', modelUp: 'Hi, I’ve got a booking under the name Louka. Could you tell me what time breakfast is served, and what the wifi password is?' },
  { id: 's3', level: 'A2', theme: 'social', title: 'Te présenter', context: 'Au barbecue de l’auberge, quelqu’un te demande « So, what’s your story? ».', task: 'Présente-toi en 4 phrases : d’où tu viens, depuis quand tu es là, ce que tu fais.', phrases: ['I’m from Réunion Island.', 'I arrived in October.', 'I deliver for Uber Eats.', 'I’m on a working holiday visa.'], model: 'I’m Louka, I’m from Réunion Island, near Madagascar. I arrived in Perth in October. I’m on a working holiday visa and I deliver for Uber Eats.', modelUp: 'I’m Louka. I’m from Réunion, a French island next to Madagascar. I got to Perth in October on a working holiday visa, and at the moment I’m delivering for Uber Eats while I look for farm work.' },
  { id: 's4', level: 'A2', theme: 'quotidien', title: 'À la pharmacie', context: 'Tu as mal à la gorge depuis deux jours.', task: 'Explique ton problème et demande un conseil.', phrases: ['I have a sore throat.', 'since two days → for two days', 'Can you recommend something?'], model: 'Hi, I’ve had a sore throat for two days. Can you recommend something?', modelUp: 'Hi, I’ve had a sore throat for a couple of days and it’s getting worse. What would you recommend? Should I see a doctor?' },
  { id: 's5', level: 'A2', theme: 'travail', title: 'En retard', context: 'Tu vas arriver 15 minutes en retard à ton service.', task: 'Envoie un message vocal à ton responsable.', phrases: ['Sorry,', 'I’m running late.', 'I’ll be there in fifteen minutes.'], model: 'Hi, it’s Louka. Sorry, I’m running late. I’ll be there in fifteen minutes.', modelUp: 'Hi, it’s Louka. Really sorry, I got a flat tyre on the way, so I’m running about fifteen minutes late. I’ll be there as soon as I can.' },
  { id: 's6', level: 'A2', theme: 'social', title: 'Proposer une sortie', context: 'Tu veux aller à la plage de Cottesloe samedi avec ton coloc.', task: 'Propose, donne l’heure et le moyen de transport.', phrases: ['Do you want to…?', 'We could take the train.', 'At ten?'], model: 'Do you want to go to Cottesloe on Saturday? We could take the train at ten.', modelUp: 'Are you keen to head to Cottesloe on Saturday? We could catch the train around ten and grab lunch there.' },
  { id: 's7', level: 'B1', theme: 'travail', title: 'Déposer un CV', context: 'Tu entres dans un café pour proposer ta candidature.', task: 'Présente-toi, dis ce que tu cherches, ton expérience et tes disponibilités.', phrases: ['I was wondering if you’re hiring.', 'I’ve worked as a waiter for three months.', 'I’m available…'], model: 'Hi, I was wondering if you’re hiring at the moment. I’ve worked as a waiter for three months in Réunion, and I’m available most days. Here’s my résumé.', modelUp: 'Hi, sorry to bother you. I was wondering if you’re looking for any staff at the moment. I’ve got three months’ experience as a waiter, I’m comfortable with a fast pace, and I’m available weekdays and weekends. I’ve brought my résumé.' },
  { id: 's8', level: 'B1', theme: 'travail', title: 'Commande incomplète', context: 'Un client t’appelle : il manque une boisson dans sa commande.', task: 'Excuse-toi, explique ce que tu peux faire.', phrases: ['I’m really sorry about that.', 'The restaurant packs the bag.', 'You can request a refund in the app.'], model: 'I’m really sorry about that. The restaurant packs the bag, so I didn’t see it. You can request a refund in the app for the missing drink.', modelUp: 'I’m really sorry about that. The bags are sealed by the restaurant, so I can’t check them, unfortunately. If you report the missing drink in the app, you should get a refund straight away.' },
  { id: 's9', level: 'B1', theme: 'quotidien', title: 'Problème de logement', context: 'La douche de ta chambre ne marche plus depuis hier.', task: 'Explique le problème à l’accueil et demande quand ce sera réparé.', phrases: ['The shower in my room isn’t working.', 'since yesterday', 'When can someone fix it?'], model: 'Hi, the shower in room 12 hasn’t been working since yesterday. When can someone fix it?', modelUp: 'Hi, sorry to bother you, but the shower in room 12 hasn’t worked since yesterday morning: there’s no hot water at all. Do you know when someone might be able to have a look at it?' },
  { id: 's10', level: 'B1', theme: 'social', title: 'Raconter ta semaine', context: 'Un ami te demande « How was your week? ».', task: 'Raconte 3 choses qui se sont passées, avec des connecteurs (first, then, in the end).', phrases: ['It was pretty busy.', 'First…', 'Then…', 'In the end…'], model: 'It was pretty busy. First, I worked four nights in a row. Then I went surfing on Sunday. In the end, I was knackered but happy.', modelUp: 'Pretty hectic, to be honest. I did four nights in a row on Uber Eats, which was full-on, then I finally made it to the beach on Sunday for a surf. By the end of it I was knackered, but it was worth it.' },
  { id: 's11', level: 'B1', theme: 'travail', title: 'Entretien : parle de toi', context: 'Entretien pour un travail en ferme. On te demande « Tell me about yourself. ».', task: 'Parle de ton expérience physique, de ta motivation et de ta fiabilité.', phrases: ['I’ve done physical work before.', 'I’m used to working outside.', 'I’m reliable and I learn fast.'], model: 'I’m 18 and I’m from Réunion. I’ve done physical work before: I cleaned pools and did gardening with a chainsaw and a brushcutter. I’m used to working outside in the heat, and I’m reliable.', modelUp: 'I’m from Réunion, and I’ve done quite a bit of physical work: six months maintaining pools with my dad and two months of gardening, using chainsaws and brushcutters. I’m used to long days outside in the heat, I pick things up quickly, and I’m really keen to do my 88 days.' },
  { id: 's12', level: 'B1', theme: 'quotidien', title: 'Chez le médecin', context: 'Tu t’es fait mal au genou à vélo.', task: 'Explique ce qui s’est passé, depuis quand ça fait mal et ce que tu ne peux plus faire.', phrases: ['I fell off my bike.', 'It’s been hurting since…', 'I can’t bend it.'], model: 'I fell off my bike on Monday. My knee has been hurting since then, and I can’t bend it properly.', modelUp: 'I came off my bike on Monday when a car pulled out in front of me. My knee’s been swollen and sore ever since, and I can’t bend it all the way, which is a problem because I ride for work.' },
  { id: 's13', level: 'B2', theme: 'travail', title: 'Négocier un horaire', context: 'Ton responsable veut te mettre de service dimanche, mais tu as déjà prévu quelque chose.', task: 'Refuse poliment, explique, propose une alternative.', phrases: ['I’d love to help, but…', 'Would it be possible to…?', 'I could do… instead.'], model: 'I’d love to help, but I’ve already got plans on Sunday. Would it be possible to do Saturday instead? I could also stay late on Friday if that helps.', modelUp: 'I’d really like to help out, but unfortunately I’ve already committed to something on Sunday. Would it work if I took the Saturday shift instead? I’m also happy to stay back on Friday if you’re short-staffed.' },
  { id: 's14', level: 'B2', theme: 'mines', title: 'Briefing sécurité', context: 'C’est ton tour de prendre la parole au « toolbox talk » du matin.', task: 'Signale un danger que tu as vu hier et propose une mesure.', phrases: ['I noticed that…', 'Someone could get hurt.', 'I suggest we…'], model: 'Yesterday I noticed that the walkway near the conveyor was covered in loose rocks. Someone could slip and get hurt. I suggest we clean it at the start of each shift and put up a sign.', modelUp: 'Just a quick one from me. Yesterday afternoon I noticed loose material building up on the walkway next to conveyor two, which is a real slip hazard, especially on night shift. I’d suggest we add it to the pre-start checks and get it cleared at the start of every shift.' },
  { id: 's15', level: 'B2', theme: 'travail', title: 'Entretien : un point faible', context: 'On te demande : « What’s your biggest weakness? ».', task: 'Donne un vrai point faible et ce que tu fais pour progresser.', phrases: ['To be honest…', 'I’m working on it by…', 'It’s getting better.'], model: 'To be honest, my English isn’t perfect yet. I’m working on it every day with an app and by talking to customers, and it’s getting better quickly.', modelUp: 'To be honest, my English is still a work in progress. I practise every day, I deliberately talk to as many customers as I can, and I ask colleagues to correct me. I’ve already noticed a big difference since I arrived.' },
  { id: 's16', level: 'B2', theme: 'social', title: 'Donner ton avis', context: 'Débat à l’auberge : « Is it better to work in the city or on a farm? ».', task: 'Donne ton avis, deux arguments, et une concession.', phrases: ['In my view…', 'On the one hand… on the other hand…', 'That said…'], model: 'In my view, the farm is better for saving money, because you spend less and work more hours. On the other hand, the city is more fun. That said, it depends on your goals.', modelUp: 'Personally, I’d go for the farm, mainly because you can save a lot more: rent’s cheaper and there’s not much to spend money on. That said, it can be pretty isolating, so if you want a social life, the city definitely has the edge.' },
  { id: 's17', level: 'B2', theme: 'quotidien', title: 'Réclamation', context: 'Ta banque t’a prélevé des frais que tu ne comprends pas.', task: 'Appelle, décris le problème avec précision et demande un remboursement.', phrases: ['I’ve noticed a charge on my account.', 'I don’t recognise it.', 'Could you look into it?'], model: 'Hi, I’ve noticed a $15 charge on my account from last Tuesday that I don’t recognise. Could you look into it and refund it if it’s a mistake?', modelUp: 'Hi, I’m calling about a $15 fee that came out of my account last Tuesday. I don’t recognise it and I wasn’t told about any fees when I opened the account. Could you look into it for me and, if it was charged in error, reverse it?' },
  { id: 's18', level: 'B2', theme: 'mines', title: 'Premier jour en camp', context: 'Tu arrives au camp minier. Tu parles avec ton superviseur.', task: 'Pose 4 questions utiles (planning, repas, sécurité, logement).', phrases: ['What time is the pre-start?', 'Where’s the crib room?', 'Who do I report to?'], model: 'What time is the pre-start tomorrow? Where’s the crib room? Who do I report hazards to? And which donga am I in?', modelUp: 'Just a few questions so I’m ready for tomorrow: what time’s the pre-start and where is it? Who should I report to if I see a hazard? And could you point me to my donga and the crib room?' },
  { id: 's19', level: 'C1', theme: 'travail', title: 'Désaccord avec ton chef', context: 'Ton chef d’équipe veut sauter la vérification de sécurité pour gagner du temps.', task: 'Exprime ton désaccord fermement mais poliment, avec un argument et une solution.', phrases: ['I understand the time pressure, but…', 'I’m not comfortable…', 'What if we…?'], model: 'I understand we’re under time pressure, but I’m not comfortable skipping the check. If something goes wrong, we lose far more time. What if I do the check while you start the paperwork?', modelUp: 'I completely get that we’re behind, but I’m genuinely not comfortable skipping the isolation check: if anything goes wrong, the delay, let alone the consequences, would be far worse. How about I run the check now while you get the permit sorted? We’d only lose a few minutes.' },
  { id: 's20', level: 'C1', theme: 'social', title: 'Nuancer', context: 'Quelqu’un affirme : « Backpackers just come here to party. ».', task: 'Réponds avec nuance : reconnais une part de vrai, puis contredis.', phrases: ['There’s some truth in that, but…', 'It’s a bit of a generalisation.', 'Most people I’ve met…'], model: 'There’s some truth in that, but it’s a bit of a generalisation. Most backpackers I’ve met work really hard, often in jobs Australians don’t want, like fruit picking.', modelUp: 'I’d say there’s a grain of truth in it, but it’s a sweeping generalisation. Most of the backpackers I know are working long, physical shifts, often in regional areas where farms genuinely struggle to find staff. The partying is just the most visible part.' },
  { id: 's21', level: 'C1', theme: 'travail', title: 'Retour constructif', context: 'Un nouveau collègue fait souvent la même erreur sur les commandes.', task: 'Donne-lui un retour utile sans le vexer.', phrases: ['Can I give you a quick tip?', 'I made the same mistake…', 'It might help to…'], model: 'Can I give you a quick tip? I used to make the same mistake. It might help to check the order number on the bag before you leave the restaurant.', modelUp: 'Hey, mind if I share something that helped me? I kept mixing up orders in my first few weeks too. What really made a difference was double-checking the order number on the bag before leaving the restaurant. It takes five seconds and saves a lot of hassle.' },
  { id: 's22', level: 'C1', theme: 'mines', title: 'Rapport d’incident', context: 'Un camion a reculé trop près d’un piéton. Personne n’est blessé.', task: 'Décris l’incident au superviseur de façon factuelle, puis donne ton analyse.', phrases: ['At around… a haul truck reversed…', 'There was no spotter.', 'It was a near miss.', 'In my view, the main factor was…'], model: 'At around 2 pm, a truck reversed near the workshop while a worker was walking behind it. There was no spotter. Nobody was hurt, but it was a near miss. In my view, the main factor was the lack of a spotter.', modelUp: 'At approximately 2 pm, a light vehicle reversed out of bay three while a fitter was crossing behind it. There was no spotter and the reversing alarm was barely audible over the compressor. No one was injured, but it was a genuine near miss. I’d say the root cause was the absence of a spotter, compounded by the noise.' },
  { id: 's23', level: 'C1', theme: 'quotidien', title: 'Défendre un choix', context: 'Ta famille te demande pourquoi tu ne rentres pas faire tes études maintenant.', task: 'Explique ton choix avec des arguments nuancés et reconnais leurs inquiétudes.', phrases: ['I understand why you’re worried.', 'The way I see it…', 'It’s not that…, it’s more that…'], model: 'I understand why you’re worried. The way I see it, this year is teaching me things I couldn’t learn at school: English, independence, work. It’s not that I’m giving up on my studies, it’s more that I’m taking a step back.', modelUp: 'I completely understand where you’re coming from. The way I see it, this year is giving me something no course could: real fluency in English, financial independence and work experience. It’s not that I’m abandoning my studies; if anything, I’ll go back far more motivated and with a clearer idea of what I want.' },
  { id: 's24', level: 'C1', theme: 'social', title: 'Comparer deux villes', context: 'On te demande ce que tu préfères : La Réunion ou Perth.', task: 'Compare avec précision et nuance (whereas, while, on balance).', phrases: ['Whereas…', 'What strikes me is…', 'On balance…'], model: 'Réunion is more mountainous and wild, whereas Perth is flat and very organised. What strikes me is how laid-back people are here. On balance, I miss the mountains, but I love the space in Perth.', modelUp: 'They’re hard to compare. Réunion is rugged and volcanic, with a real mix of cultures, whereas Perth feels spacious, orderly and very outdoorsy. What strikes me most is how laid-back people are here. On balance, I miss the mountains and the food, but I appreciate how easy day-to-day life is in Perth.' },
];

export interface QuickQuestion {
  id: string;
  level: ExLevel;
  q: string;
  sample: string;
}

export const QUICK: QuickQuestion[] = [
  { id: 'q1', level: 'A2', q: 'Where are you from?', sample: 'I’m from Réunion Island, a French island near Madagascar.' },
  { id: 'q2', level: 'A2', q: 'What do you do for work?', sample: 'I deliver food for Uber Eats, by bike.' },
  { id: 'q3', level: 'A2', q: 'What did you have for breakfast?', sample: 'I had oats with a banana and a coffee.' },
  { id: 'q4', level: 'A2', q: 'How do you get around Perth?', sample: 'Mostly by bike, and sometimes by train.' },
  { id: 'q5', level: 'A2', q: 'What’s the weather like today?', sample: 'It’s sunny and pretty hot, about 30 degrees.' },
  { id: 'q6', level: 'A2', q: 'What do you do in your free time?', sample: 'I go running, I go to the beach and I learn English.' },
  { id: 'q7', level: 'A2', q: 'What’s your favourite food?', sample: 'Rougail saucisse, a dish from Réunion.' },
  { id: 'q8', level: 'A2', q: 'Do you have any brothers or sisters?', sample: 'Yes, I have… / No, I’m an only child.' },
  { id: 'q9', level: 'A2', q: 'What time do you usually get up?', sample: 'I usually get up at about seven.' },
  { id: 'q10', level: 'A2', q: 'Where do you live in Perth?', sample: 'I live in a hostel in Northbridge.' },
  { id: 'q11', level: 'A2', q: 'What did you do last weekend?', sample: 'I worked on Saturday and went to the beach on Sunday.' },
  { id: 'q12', level: 'A2', q: 'Do you like Australia?', sample: 'Yes, I love it. People are really friendly.' },
  { id: 'q13', level: 'B1', q: 'Why did you choose Australia?', sample: 'Because I wanted to improve my English and work abroad, and the working holiday visa makes it easy.' },
  { id: 'q14', level: 'B1', q: 'What’s the hardest part of your job?', sample: 'Riding in the heat and finding addresses at night, especially in big apartment blocks.' },
  { id: 'q15', level: 'B1', q: 'What have you learnt since you arrived?', sample: 'I’ve learnt to be more independent, and my English has improved a lot.' },
  { id: 'q16', level: 'B1', q: 'What are you going to do next month?', sample: 'I’m going to look for farm work so I can do my 88 days.' },
  { id: 'q17', level: 'B1', q: 'Tell me about a good day you had recently.', sample: 'Last Sunday I surfed at Scarborough in the morning, then I had a barbie with friends from the hostel.' },
  { id: 'q18', level: 'B1', q: 'What do you miss about home?', sample: 'I miss my family and the food, and the mountains too.' },
  { id: 'q19', level: 'B1', q: 'How do you stay fit?', sample: 'I ride a lot for work, and I run twice a week.' },
  { id: 'q20', level: 'B1', q: 'What would you change about your routine?', sample: 'I’d go to bed earlier, because I’m often tired after night shifts.' },
  { id: 'q21', level: 'B1', q: 'Have you ever had a problem with a customer?', sample: 'Once, a customer was angry because his order was late, but I apologised and explained, and he calmed down.' },
  { id: 'q22', level: 'B1', q: 'What kind of job would you like in Australia?', sample: 'I’d like to work in a mine, because the pay is good and I like physical work.' },
  { id: 'q23', level: 'B1', q: 'Describe your hostel.', sample: 'It’s quite big and noisy, but the people are friendly and the kitchen is OK.' },
  { id: 'q24', level: 'B1', q: 'What’s something you’re proud of?', sample: 'I’m proud that I moved to the other side of the world on my own.' },
  { id: 'q25', level: 'B2', q: 'What are the pros and cons of delivery work?', sample: 'It’s flexible and you stay fit, but the pay depends on demand and it can be dangerous in traffic.' },
  { id: 'q26', level: 'B2', q: 'If you could live anywhere, where would you live?', sample: 'I’d probably live near the coast somewhere warm, maybe Margaret River, because I love surfing.' },
  { id: 'q27', level: 'B2', q: 'Do you think working holidays are worth it?', sample: 'Definitely, because you learn far more than in a classroom, although it can be tough financially at first.' },
  { id: 'q28', level: 'B2', q: 'How has your English changed since you arrived?', sample: 'I’m much more confident on the phone, and I understand the accent better, but I still need more vocabulary.' },
  { id: 'q29', level: 'B2', q: 'What makes a good boss?', sample: 'Someone who’s fair, who explains things clearly and who listens to the team.' },
  { id: 'q30', level: 'B2', q: 'Would you rather work FIFO or in the city? Why?', sample: 'I’d rather try FIFO for a while, since you can save a lot, although being away for weeks must be hard.' },
  { id: 'q31', level: 'B2', q: 'What’s a mistake you learnt from?', sample: 'I once accepted too many orders at once, and they were all late. Now I take one at a time.' },
  { id: 'q32', level: 'B2', q: 'How would you explain your job to a child?', sample: 'I bring people their dinner on my bike when they’re too busy or tired to cook.' },
  { id: 'q33', level: 'B2', q: 'What should tourists know before coming to Perth?', sample: 'That the sun is really strong, distances are huge, and you need sunscreen every single day.' },
  { id: 'q34', level: 'B2', q: 'What’s the best advice you’ve ever been given?', sample: 'My dad told me to always do a job properly, even if nobody’s watching.' },
  { id: 'q35', level: 'B2', q: 'How do you deal with stress?', sample: 'I go for a run or a surf; being active really helps me clear my head.' },
  { id: 'q36', level: 'B2', q: 'Which is more important: salary or enjoying your job?', sample: 'At the moment, salary, because I’m saving, but long term I’d rather enjoy what I do.' },
  { id: 'q37', level: 'C1', q: 'To what extent does technology make us less social?', sample: 'To some extent, yes: we often default to our phones. That said, it also keeps me in touch with my family on the other side of the world.' },
  { id: 'q38', level: 'C1', q: 'Should backpackers be required to do farm work for a second visa?', sample: 'It’s a double-edged sword: it fills real labour shortages, but it can leave young workers vulnerable to exploitation if it isn’t properly regulated.' },
  { id: 'q39', level: 'C1', q: 'What does success mean to you?', sample: 'For me, it’s less about money than about being independent and doing work I’m genuinely proud of.' },
  { id: 'q40', level: 'C1', q: 'How has living abroad changed the way you see your home?', sample: 'I appreciate things I used to take for granted, like the food and family ties, but I’m also more aware of its limitations.' },
  { id: 'q41', level: 'C1', q: 'Is it better to specialise or to be versatile?', sample: 'It depends on the stage of your career; early on, versatility opens doors, whereas later, expertise tends to pay off.' },
  { id: 'q42', level: 'C1', q: 'What would you say to someone who thinks learning English is too hard?', sample: 'I’d say it’s daunting at first, but consistency matters far more than talent: twenty minutes a day adds up.' },
  { id: 'q43', level: 'C1', q: 'Do mining jobs benefit regional communities?', sample: 'Arguably they do economically, but FIFO means much of the money leaves the town, so the benefits are uneven.' },
  { id: 'q44', level: 'C1', q: 'Describe a time you had to adapt quickly.', sample: 'On my first week, my phone died mid-shift; I had to find the addresses from memory and borrow a customer’s charger.' },
  { id: 'q45', level: 'C1', q: 'What’s overrated, in your opinion?', sample: 'Nightlife, honestly: I’d much rather get up early for a surf than spend the night in a club.' },
  { id: 'q46', level: 'C1', q: 'How do you give bad news to someone?', sample: 'I try to be direct but kind: get to the point quickly, explain why, and offer whatever help I can.' },
  { id: 'q47', level: 'C1', q: 'What would make Perth a better city to live in?', sample: 'Better public transport late at night, and more affordable housing, which is a real issue at the moment.' },
  { id: 'q48', level: 'C1', q: 'What skill would you most like to master, and why?', sample: 'Public speaking in English, because being articulate under pressure would open a lot of doors.' },
];

export interface StoryTopic {
  id: string;
  level: ExLevel;
  title: string;
  prompt: string;
  hints: string[];
}

export const STORIES: StoryTopic[] = [
  { id: 'h1', level: 'A2', title: 'Ma journée d’hier', prompt: 'Raconte ta journée d’hier, du réveil au coucher.', hints: ['I woke up at…', 'Then I…', 'After that…', 'In the evening…'] },
  { id: 'h2', level: 'A2', title: 'Ma famille', prompt: 'Présente ta famille : qui, où, ce qu’ils font.', hints: ['There are … people in my family.', 'My dad is a…', 'We live in…'] },
  { id: 'h3', level: 'A2', title: 'Mon plat préféré', prompt: 'Décris ton plat préféré et comment on le prépare.', hints: ['My favourite dish is…', 'You need…', 'First you…'] },
  { id: 'h4', level: 'B1', title: 'Mon arrivée en Australie', prompt: 'Raconte ton voyage et tes premiers jours à Perth : ce qui t’a surpris, ce qui a été difficile.', hints: ['When I arrived…', 'What surprised me was…', 'At first it was hard to…', 'Now I…'] },
  { id: 'h5', level: 'B1', title: 'Une livraison compliquée', prompt: 'Raconte une livraison qui s’est mal passée et comment tu as réglé le problème.', hints: ['One night…', 'The problem was that…', 'So I decided to…', 'In the end…'] },
  { id: 'h6', level: 'B1', title: 'Mon ancien travail', prompt: 'Décris un de tes anciens travaux (piscines, restaurant, jardin) : tâches, journée type, ce que tu as appris.', hints: ['I used to…', 'A typical day…', 'I learnt how to…'] },
  { id: 'h7', level: 'B2', title: 'Une décision importante', prompt: 'Raconte une décision importante, pourquoi tu l’as prise, et ce que tu ferais différemment.', hints: ['I had to decide whether…', 'The main reason was…', 'If I had to do it again, I would…'] },
  { id: 'h8', level: 'B2', title: 'Mes projets', prompt: 'Explique tes projets pour l’année : travail, voyage, argent, avec les « si ».', hints: ['I’m planning to…', 'If I find…, I’ll…', 'Ideally, I’d like to…'] },
  { id: 'h9', level: 'B2', title: 'Un défi sportif', prompt: 'Raconte un défi sportif (course, surf…) : préparation, difficulté, ressenti.', hints: ['I’d been training for…', 'The hardest part was…', 'I felt…'] },
  { id: 'h10', level: 'C1', title: 'Ce que l’expatriation m’apprend', prompt: 'Analyse ce que cette année à l’étranger change chez toi : avantages, limites, nuances.', hints: ['If anything, …', 'What I hadn’t anticipated was…', 'On balance…'] },
  { id: 'h11', level: 'C1', title: 'Pour ou contre le FIFO', prompt: 'Présente les deux côtés du travail en rotation dans les mines, puis donne une conclusion nuancée.', hints: ['On the one hand…', 'Admittedly…', 'That said…', 'All things considered…'] },
  { id: 'h12', level: 'C1', title: 'Un échec utile', prompt: 'Raconte un échec et ce qu’il t’a appris, avec du recul.', hints: ['In hindsight…', 'It was a blessing in disguise because…', 'What I took away from it was…'] },
];

/** Grille d'auto-évaluation commune. */
export const SELF_CHECK = [
  'J’ai dit tout ce que la consigne demandait.',
  'Mes phrases étaient complètes (sujet + verbe), au bon temps.',
  'J’ai utilisé au moins un mot ou une tournure de mon niveau.',
];
