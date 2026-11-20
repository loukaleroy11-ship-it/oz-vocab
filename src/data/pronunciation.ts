/** Fiches de prononciation pour francophones, avec l'accent australien (écouter, répéter, comparer). */
export interface PronTip {
  id: string;
  title: string;
  how: string;
  /** Mots ou phrases à répéter. */
  practice: string[];
  trap?: string;
}

export const PRON_TIPS: PronTip[] = [
  {
    id: 'th',
    title: 'Le « th »',
    how: 'Pose le bout de la langue entre les dents et souffle : sans voix pour think, three, thanks ; avec la voix pour the, this, mother. Ni « s », ni « z », ni « f ».',
    practice: ['think', 'three', 'thanks', 'the weather', 'Thanks, I think it’s Thursday.', 'This is my brother.'],
    trap: '« I sink » (je coule) au lieu de « I think ».',
  },
  {
    id: 'h',
    title: 'Le « h » aspiré',
    how: 'Souffle comme sur une vitre pour faire de la buée : hello, house, happy, hungry. Et n’en ajoute pas devant les voyelles : « I », « eat », « arm ».',
    practice: ['hello', 'house', 'hungry', 'He’s hungry and hot.', 'I eat at home.', 'How are you going?'],
    trap: '« I’m ungry » / « hI ate » : le h disparaît ou apparaît au mauvais endroit.',
  },
  {
    id: 'vowels',
    title: 'Voyelles courtes et longues',
    how: 'Une voyelle courte et détendue (ship, live, full) s’oppose à une voyelle longue et tendue (sheep, leave, fool). Le sens change !',
    practice: ['ship · sheep', 'live · leave', 'full · fool', 'it · eat', 'I live here, but I leave tomorrow.', 'Sit in this seat.'],
    trap: '« beach » et « sheet » mal prononcés donnent des mots grossiers : allonge bien le « ee ».',
  },
  {
    id: 'schwa',
    title: 'Le « schwa » et les formes faibles',
    how: 'Dans les syllabes non accentuées et les petits mots (a, to, of, for, can), la voyelle devient un « e » très bref et neutre /ə/. C’est le son le plus fréquent de l’anglais.',
    practice: ['about', 'banana', 'a cup of tea', 'I want to go.', 'I can swim.', 'What are you doing?'],
    trap: 'Prononcer chaque mot en entier : « I want TOU go » sonne haché.',
  },
  {
    id: 'stress',
    title: 'L’accent tonique',
    how: 'Le français accentue la fin des mots ; l’anglais choisit une syllabe, souvent au début, et réduit les autres. Une erreur d’accent gêne plus qu’une voyelle approximative.',
    practice: ['PHOtograph', 'phoTOgraphy', 'deVELop', 'COMfortable', 'INteresting', 'VEgetable'],
    trap: '« comfor-TABLE » en 4 syllabes : on dit « KUMF-tuh-bl ».',
  },
  {
    id: 'ed',
    title: 'Les terminaisons en -ed',
    how: '/t/ après p, k, s, sh, ch (worked = « workt ») ; /d/ après les autres sons (played) ; une syllabe en plus seulement après t ou d (wanted, needed).',
    practice: ['worked', 'stopped', 'played', 'arrived', 'wanted', 'needed', 'I picked up the order and delivered it.'],
    trap: '« work-ed », « pick-ed » : jamais de syllabe en plus après k ou p.',
  },
  {
    id: 'r',
    title: 'Le « r »',
    how: 'Le r anglais n’est ni roulé ni raclé : la langue recule sans toucher le palais. En Australie, il ne se prononce pas en fin de syllabe : car, water, here.',
    practice: ['red', 'right', 'car', 'water', 'Where are you from?', 'Are you ready?'],
  },
  {
    id: 'final',
    title: 'Les consonnes finales',
    how: 'Prononce la dernière consonne : elle change le sens (light, like, line, life) et marque la grammaire (works, worked).',
    practice: ['light · like · line', 'cap · cab', 'He works here.', 'She asked twice.'],
    trap: 'Avaler le -s de la 3e personne : « he work ».',
  },
  {
    id: 'aussie-vowels',
    title: 'Les voyelles australiennes',
    how: 'En Australie, « day » se rapproche de « daï », « no » de « naou », « time » de « toïm », et le « ee » final est très long. Écoute et imite sans exagérer.',
    practice: ['day', 'mate', 'no', 'time', 'G’day mate, how are you going?', 'No worries, see you today.'],
  },
  {
    id: 'flap-t',
    title: 'Le « t » adouci',
    how: 'Entre deux voyelles, le t devient souvent un « d » très rapide : water, better, get a, a lot of.',
    practice: ['water', 'better', 'a bottle of water', 'Get a lot of it.', 'What are you up to?'],
  },
  {
    id: 'linking',
    title: 'Les enchaînements',
    how: 'Une consonne finale s’accroche à la voyelle suivante : « an apple » → « a-napple », « turn off » → « tur-noff ». C’est ce qui rend la phrase fluide.',
    practice: ['an apple', 'turn it off', 'pick it up', 'Come on in.', 'Check it out.'],
  },
  {
    id: 'intonation',
    title: 'L’intonation des questions',
    how: 'Question avec what, where, how : la voix descend à la fin. Question fermée (oui / non) : la voix monte. En Australie, beaucoup font aussi monter la fin des affirmations.',
    practice: ['Where do you live?', 'Do you live here?', 'What time do you finish?', 'Are you keen?'],
  },
];
