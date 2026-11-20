/**
 * Thèmes des 500 mots, pour composer des listes cohérentes (« I » avec
 * « you, he, she… », « one » avec « two, three… »). Chaque mot appartient à
 * un seul thème. Les mots ajoutés par l'utilisateur sont regroupés par
 * catégorie grammaticale.
 */
import { POS_PLURAL } from '../domain/status';
import type { Word } from '../domain/types';

export const THEMES: Record<string, { label: string; words: string[] }> = {
  essentiels: {
    label: 'verbes essentiels',
    words: ['be', 'have', 'do', 'get', 'make', 'take', 'use', 'put', 'give', 'try', 'let', 'keep', 'help', 'bring', 'set', 'become', 'involve', 'provide', 'allow', 'add', 'include'],
  },
  mouvement: {
    label: 'se déplacer',
    words: ['go', 'come', 'leave', 'meet', 'move', 'sit', 'run', 'turn', 'walk', 'stay', 'stand', 'follow', 'pass', 'fall', 'carry'],
  },
  envies: { label: 'aimer et vouloir', words: ['like', 'want', 'need', 'love', 'hope', 'enjoy'] },
  modaux: { label: 'verbes modaux', words: ['will', 'would', 'can', 'could', 'should', 'might', 'may', 'must'] },
  pronoms: { label: 'pronoms', words: ['you', 'it', 'they', 'we', 'he', 'I', 'she', 'mine', 'yourself', 'myself'] },
  indefinis: {
    label: 'quelqu’un, quelque chose',
    words: ['thing', 'something', 'anything', 'stuff', 'else', 'everything', 'whatever', 'somebody', 'nothing', 'everybody', 'someone', 'anybody'],
  },
  determinants: {
    label: 'déterminants',
    words: ['the', 'a', 'that', 'this', 'some', 'other', 'any', 'same', 'another', 'every', 'own', 'both', 'each', 'either', 'such'],
  },
  quantites: {
    label: 'quantités',
    words: ['all', 'more', 'lot', 'much', 'bit', 'many', 'part', 'most', 'half', 'whole', 'enough', 'few', 'least', 'less', 'piece', 'amount'],
  },
  questions: { label: 'mots interrogatifs', words: ['what', 'when', 'which', 'who', 'where', 'how', 'why', 'whether'] },
  liaisons: {
    label: 'mots de liaison',
    words: ['and', 'so', 'but', 'if', 'or', 'as', 'because', 'than', 'also', 'though', 'anyway', 'while', 'although'],
  },
  prepositions: {
    label: 'prépositions',
    words: ['to', 'of', 'in', 'on', 'for', 'with', 'at', 'about', 'from', 'by', 'over', 'into', 'through', 'around', 'round', 'between', 'under', 'within', 'without', 'along', 'across', 'against'],
  },
  directions: {
    label: 'où et dans quelle direction',
    words: ['there', 'up', 'out', 'here', 'back', 'way', 'down', 'off', 'away', 'side', 'far', 'together', 'top', 'front', 'forward', 'somewhere', 'outside'],
  },
  quand: {
    label: 'quand et combien de fois',
    words: ['then', 'now', 'last', 'still', 'before', 'again', 'never', 'always', 'after', 'next', 'today', 'ever', 'late', 'yet', 'already', 'once', 'ago', 'early', 'until', 'sometimes', 'since', 'tomorrow', 'usually', 'yesterday', 'during', 'often', 'soon'],
  },
  moments: { label: 'le temps', words: ['time', 'year', 'day', 'week', 'night', 'minute', 'morning', 'month', 'hour', 'moment', 'past'] },
  nombres: {
    label: 'nombres',
    words: ['one', 'two', 'three', 'first', 'five', 'four', 'hundred', 'number', 'six', 'twenty', 'eight', 'ten', 'seven', 'thousand', 'nine', 'thirty', 'second', 'fifty', 'forty', 'nineteen', 'percent', 'twelve', 'ninety', 'eighty', 'sixty', 'fifteen'],
  },
  pensee: {
    label: 'penser et ressentir',
    words: ['know', 'think', 'mean', 'feel', 'remember', 'seem', 'guess', 'suppose', 'understand', 'idea', 'believe', 'mind', 'care', 'matter', 'concern', 'agree', 'sense', 'decide', 'expect', 'wonder', 'worry', 'forget'],
  },
  parler: {
    label: 'parler et communiquer',
    words: ['say', 'laugh', 'talk', 'tell', 'call', 'ask', 'question', 'name', 'word', 'speak', 'send', 'answer', 'story', 'ring', 'discussion', 'comment', 'mention', 'response', 'suggest'],
  },
  sens: {
    label: 'voir et entendre',
    words: ['see', 'look', 'show', 'hear', 'watch', 'sound', 'view', 'light', 'listen', 'picture', 'colour'],
  },
  reponses: { label: 'oui, non, merci', words: ['not', 'no', 'yes', 'yeah', 'okay', 'thank', 'sorry', 'alright', 'please'] },
  intensite: {
    label: 'nuancer : très, peut-être…',
    words: ['just', 'well', 'really', 'very', 'actually', 'only', 'too', 'quite', 'probably', 'even', 'maybe', 'pretty', 'obviously', 'exactly', 'rather', 'certainly', 'perhaps', 'basically', 'absolutely', 'almost', 'bloody'],
  },
  qualites: {
    label: 'qualités et jugements',
    words: ['right', 'good', 'different', 'sure', 'nice', 'great', 'bad', 'able', 'important', 'real', 'hard', 'clear', 'true', 'wrong', 'easy', 'fine', 'particular', 'full', 'certain', 'local', 'funny', 'difficult', 'happy', 'general', 'possible', 'lovely', 'ready'],
  },
  taille: { label: 'taille et âge', words: ['little', 'big', 'long', 'old', 'new', 'high', 'small', 'young', 'short', 'large', 'low'] },
  personnes: {
    label: 'les gens',
    words: ['people', 'kid', 'child', 'man', 'woman', 'guy', 'couple', 'group', 'friend', 'family', 'person', 'parent', 'girl', 'member', 'dad', 'boy', 'mother'],
  },
  maison: { label: 'la maison', words: ['home', 'house', 'room', 'door', 'table', 'bed', 'dog'] },
  lieux: { label: 'les lieux', words: ['place', 'area', 'country', 'world'] },
  transports: { label: 'transports', words: ['car', 'drive', 'train', 'road'] },
  manger: { label: 'manger et boire', words: ['eat', 'water', 'drink', 'food'] },
  corps: { label: 'le corps et la vie', words: ['live', 'life', 'hand', 'head', 'age', 'face', 'grow', 'die', 'health'] },
  actions: {
    label: 'actions du quotidien',
    words: ['find', 'build', 'open', 'pick', 'close', 'break', 'lose', 'hold', 'cut', 'support', 'check', 'cover', 'wear', 'stick'],
  },
  debut: { label: 'commencer, finir, changer', words: ['start', 'happen', 'end', 'change', 'wait', 'stop', 'begin', 'finish', 'continue'] },
  ecole: {
    label: 'école et études',
    words: ['school', 'course', 'read', 'test', 'write', 'student', 'book', 'paper', 'program', 'learn', 'teacher', 'class', 'teach', 'page', 'language', 'mathematics'],
  },
  travail: {
    label: 'travail et argent',
    words: ['work', 'pay', 'money', 'buy', 'job', 'pound', 'deal', 'report', 'spend', 'cost', 'order', 'business', 'company', 'shop', 'form', 'sell', 'dollar', 'price', 'position', 'office', 'market', 'save'],
  },
  societe: { label: 'la société', words: ['system', 'state', 'government', 'service', 'process', 'public', 'policy', 'community'] },
  objets: { label: 'les objets', words: ['item', 'phone', 'line', 'list', 'tape', 'clock', 'letter', 'card', 'sign'] },
  loisirs: { label: 'loisirs', words: ['play', 'party', 'present', 'draw', 'sing', 'game'] },
  idees: {
    label: 'idées et situations',
    words: ['sort', 'kind', 'point', 'problem', 'fact', 'interest', 'issue', 'term', 'case', 'plan', 'reason', 'example', 'cause', 'information', 'type', 'level', 'situation', 'figure', 'record', 'difference', 'experience', 'decision', 'base', 'choice'],
  },
};

const THEME_OF = new Map<string, string>();
for (const [id, t] of Object.entries(THEMES)) for (const w of t.words) THEME_OF.set(w, id);

/** Clé de regroupement d'un mot : son thème, ou sa catégorie grammaticale s'il n'en a pas. */
export function groupKey(w: Pick<Word, 'en' | 'pos' | 'source' | 'group'>): string {
  if (w.group) return w.group;
  if (w.source === 'core') {
    const t = THEME_OF.get(w.en);
    if (t) return t;
    return `pos:${w.pos}`;
  }
  return `user:${w.pos}`;
}

export function groupLabel(key: string): string {
  if (key.startsWith('pos:')) return (POS_PLURAL[key.slice(4) as Word['pos']] ?? 'autres').toLowerCase();
  if (key.startsWith('t:')) return key.slice(2);
  if (key.startsWith('user:')) return `mes mots : ${(POS_PLURAL[key.slice(5) as Word['pos']] ?? 'autres').toLowerCase()}`;
  return THEMES[key]?.label ?? key;
}
