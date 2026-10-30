/**
 * vocabQuizBuilder.js
 * Generates varied, pedagogical vocabulary quiz questions from flashcard data.
 * Implements 10 distinct question types with a type-rotation scheduler.
 */

// In-memory cache of the last 3 quizzes' prompt texts per user
const userRecentPrompts = new Map();

// Curated dictionary of synonyms, antonyms, word forms, misspellings, and related contexts
const VOCAB_KNOWLEDGE_BANK = {
  meticulous: {
    synonyms: ['thorough', 'painstaking', 'precise', 'scrupulous'],
    antonyms: ['careless', 'sloppy', 'negligent', 'hasty'],
    forms: { adjective: 'meticulous', adverb: 'meticulously', noun: 'meticulousness' },
    misspellings: ['meticuluos', 'meticulus', 'metickulous'],
    scenarios: [
      'The forensic auditor checked every single ledger transaction three times.',
      'The watchmaker spent five hours aligning each micro-gear under a magnifying glass.'
    ],
    oddCategory: 'Attention to detail',
  },
  ambiguous: {
    synonyms: ['unclear', 'vague', 'equivocal', 'obscure'],
    antonyms: ['clear', 'explicit', 'definite', 'lucid'],
    forms: { adjective: 'ambiguous', adverb: 'ambiguously', noun: 'ambiguity' },
    misspellings: ['ambiguos', 'ambigeous', 'ambigous'],
    scenarios: [
      'The project requirements could be interpreted in three completely contradictory ways.',
      'The contract clause left both parties disputing its true legal intent.'
    ],
    oddCategory: 'Lack of clarity',
  },
  resilient: {
    synonyms: ['tough', 'durable', 'tenacious', 'hardy'],
    antonyms: ['fragile', 'vulnerable', 'weak', 'brittle'],
    forms: { adjective: 'resilient', adverb: 'resiliently', noun: 'resilience' },
    misspellings: ['resiliant', 'rezeelient', 'resillient'],
    scenarios: [
      'Despite the economic downturn, the startup adapted quickly and returned to profitability.',
      'The athlete rebounded from a severe knee injury to win the championship final.'
    ],
    oddCategory: 'Overcoming hardship',
  },
  candid: {
    synonyms: ['frank', 'honest', 'forthright', 'straightforward'],
    antonyms: ['deceitful', 'guarded', 'insincere', 'evasive'],
    forms: { adjective: 'candid', adverb: 'candidly', noun: 'candor' },
    misspellings: ['candide', 'kandid', 'candidd'],
    scenarios: [
      'The director gave an honest, unvarnished review of our quarterly mistakes.',
      'She spoke with open sincerity instead of sugarcoating the unpleasant truth.'
    ],
    oddCategory: 'Truthfulness and honesty',
  },
  diligent: {
    synonyms: ['hardworking', 'assiduous', 'industrious', 'conscientious'],
    antonyms: ['lazy', 'idle', 'careless', 'negligent'],
    forms: { adjective: 'diligent', adverb: 'diligently', noun: 'diligence' },
    misspellings: ['deligent', 'dilligent', 'diligint'],
    scenarios: [
      'He worked tirelessly every evening until every bug in the codebase was resolved.',
      'She prepared systematically for months, reviewing every syllabus module with care.'
    ],
    oddCategory: 'Hard work and persistence',
  },
  pragmatic: {
    synonyms: ['realistic', 'practical', 'sensible', 'utilitarian'],
    antonyms: ['idealistic', 'impractical', 'visionary', 'unrealistic'],
    forms: { adjective: 'pragmatic', adverb: 'pragmatically', noun: 'pragmatism' },
    misspellings: ['pragmatick', 'pragmatoc', 'pragmetic'],
    scenarios: [
      'Rather than pursuing an impossible ideal, the manager chose a workable immediate solution.',
      'We made decisions based on verifiable facts and real constraints rather than wishful thinking.'
    ],
    oddCategory: 'Practicality and reality',
  },
  coherent: {
    synonyms: ['logical', 'consistent', 'lucid', 'rational'],
    antonyms: ['disjointed', 'incoherent', 'confused', 'muddled'],
    forms: { adjective: 'coherent', adverb: 'coherently', noun: 'coherence' },
    misspellings: ['coherant', 'cohearernt', 'coherint'],
    scenarios: [
      'His thesis presented an orderly, logically sound flow of arguments from start to finish.',
      'The team formed a unified, well-coordinated communication plan that everyone understood.'
    ],
    oddCategory: 'Logical consistency',
  },
  versatile: {
    synonyms: ['adaptable', 'flexible', 'multipurpose', 'all-around'],
    antonyms: ['inflexible', 'rigid', 'limited', 'narrow'],
    forms: { adjective: 'versatile', adverb: 'versatilely', noun: 'versatility' },
    misspellings: ['versatyle', 'versatle', 'versetile'],
    scenarios: [
      'The engineer seamlessly handled frontend design, backend systems, and client pitches.',
      'This multi-tool can slice wood, open cans, and turn screws with ease.'
    ],
    oddCategory: 'Adaptability and multi-use',
  },
  eloquent: {
    synonyms: ['articulate', 'expressive', 'persuasive', 'fluent'],
    antonyms: ['inarticulate', 'tongue-tied', 'unexpressive', 'halting'],
    forms: { adjective: 'eloquent', adverb: 'eloquently', noun: 'eloquence' },
    misspellings: ['eloquont', 'elloquent', 'eloquant'],
    scenarios: [
      'The keynote speaker moved the entire audience to tears with her persuasive speech.',
      'He defended the proposal with grace, clarity, and powerful phrasing.'
    ],
    oddCategory: 'Fluent and persuasive speech',
  },
  lucid: {
    synonyms: ['clear', 'comprehensible', 'intelligible', 'transparent'],
    antonyms: ['confusing', 'obscure', 'vague', 'muddy'],
    forms: { adjective: 'lucid', adverb: 'lucidly', noun: 'lucidity' },
    misspellings: ['lucide', 'luced', 'lused'],
    scenarios: [
      'The professor explained quantum mechanics so simply that even novices understood.',
      'Her thoughts remained sharp and clear even under immense pressure.'
    ],
    oddCategory: 'Clarity and understanding',
  },
};

// General fallback word bank for plausible distractors
const GENERAL_WORD_BANK = [
  { word: 'Tenacious', pos: 'adjective', meaning: 'Holding fast; characterized by keeping a firm hold.', example: 'The tenacious detective refused to close the cold case.' },
  { word: 'Prudent', pos: 'adjective', meaning: 'Acting with or showing care and thought for the future.', example: 'It is prudent to save a portion of your income each month.' },
  { word: 'Concise', pos: 'adjective', meaning: 'Giving a lot of information clearly and in a few words.', example: 'His summary was concise and easy to comprehend.' },
  { word: 'Empathetic', pos: 'adjective', meaning: 'Showing an ability to understand and share the feelings of another.', example: 'The counselor was warm and empathetic toward the students.' },
  { word: 'Innovate', pos: 'verb', meaning: 'Make changes in something established, especially by introducing new methods.', example: 'Companies must innovate constantly to stay competitive.' },
  { word: 'Substantiate', pos: 'verb', meaning: 'Provide evidence to support or prove the truth of.', example: 'You must substantiate your thesis with empirical data.' },
  { word: 'Cognizant', pos: 'adjective', meaning: 'Having knowledge or being aware of something.', example: 'Leaders must remain cognizant of shifts in team morale.' },
  { word: 'Exemplary', pos: 'adjective', meaning: 'Serving as a desirable model; representing the best of its kind.', example: 'Her exemplary dedication earned her the highest academic honors.' },
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cleanWord(str) {
  return (str || '').trim();
}

function getWordEntry(word) {
  const key = cleanWord(word).toLowerCase();
  return VOCAB_KNOWLEDGE_BANK[key] || null;
}

/**
 * Builds an array of exactly `count` unique options including `correct`.
 */
function makeUniqueOptions(correct, candidateDistractors, fallbackList = [], count = 4) {
  const seen = new Set();
  const options = [];

  const addOption = (val) => {
    if (!val || typeof val !== 'string') return;
    const trimmed = val.trim();
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      options.push(trimmed);
    }
  };

  addOption(correct);

  for (const d of candidateDistractors) {
    if (options.length >= count) break;
    addOption(d);
  }

  for (const f of fallbackList) {
    if (options.length >= count) break;
    addOption(f);
  }

  // If still under count, pad with generic fallbacks
  let padIndex = 1;
  while (options.length < count) {
    addOption(`Option ${padIndex++}`);
  }

  const shuffled = shuffle(options);
  const correctIndex = shuffled.findIndex((opt) => opt.toLowerCase() === correct.trim().toLowerCase());
  return { options: shuffled, correctIndex };
}

function getDistractorWords(targetWord, pool, count = 3) {
  const poolWords = pool
    .map((w) => cleanWord(w.word))
    .filter((w) => w.toLowerCase() !== targetWord.toLowerCase());

  const bankWords = GENERAL_WORD_BANK
    .map((w) => w.word)
    .filter((w) => w.toLowerCase() !== targetWord.toLowerCase() && !poolWords.includes(w));

  const combined = shuffle([...new Set([...poolWords, ...bankWords])]);
  return combined.slice(0, count);
}

function getDistractorMeanings(targetWordObj, pool, count = 3) {
  const poolMeanings = pool
    .filter((w) => cleanWord(w.word).toLowerCase() !== cleanWord(targetWordObj.word).toLowerCase())
    .map((w) => w.meaning);

  const bankMeanings = GENERAL_WORD_BANK.map((w) => w.meaning);
  const combined = shuffle([...new Set([...poolMeanings, ...bankMeanings])]);
  return combined.slice(0, count);
}

/* =======================================================================
   10 QUESTION GENERATORS
   ======================================================================= */

// 1. Meaning match: pick correct definition for word
function generateMeaningMatch(target, pool) {
  const distractors = getDistractorMeanings(target, pool, 3);
  const fallbackMeanings = GENERAL_WORD_BANK.map((b) => b.meaning);
  const { options, correctIndex } = makeUniqueOptions(target.meaning, distractors, fallbackMeanings, 4);

  return {
    type: 'meaning_match',
    typeLabel: 'Meaning Match',
    prompt: `What is the correct definition of the word "${target.word}"?`,
    options,
    correctIndex,
    explanation: `"${target.word}" (${target.partOfSpeech || 'word'}) means: ${target.meaning}`,
    wordId: target._id,
    word: target.word,
  };
}

// 2. Reverse match: given definition, pick word
function generateReverseMatch(target, pool) {
  const distractors = getDistractorWords(target.word, pool, 3);
  const fallbackWords = GENERAL_WORD_BANK.map((b) => b.word);
  const { options, correctIndex } = makeUniqueOptions(target.word, distractors, fallbackWords, 4);

  return {
    type: 'reverse_match',
    typeLabel: 'Reverse Match',
    prompt: `Which word matches this definition: "${target.meaning}"?`,
    options,
    correctIndex,
    explanation: `"${target.word}" is defined as: ${target.meaning}`,
    wordId: target._id,
    word: target.word,
  };
}

// 3. Fill in the blank: example sentence with word removed
function generateFillInTheBlank(target, pool) {
  const example = target.example || `The candidate proved to be highly ${target.word.toLowerCase()} during the evaluation.`;
  const regex = new RegExp(`\\b${target.word}\\b`, 'gi');
  let blanked = example.replace(regex, '______');
  if (!blanked.includes('______')) {
    blanked = `The team admired her for being exceptionally ______ in every task.`;
  }
  const distractors = getDistractorWords(target.word, pool, 3);
  const fallbackWords = GENERAL_WORD_BANK.map((b) => b.word);
  const { options, correctIndex } = makeUniqueOptions(target.word, distractors, fallbackWords, 4);

  return {
    type: 'fill_in_the_blank',
    typeLabel: 'Fill in the Blank',
    prompt: `Choose the word that best completes the sentence:\n"${blanked}"`,
    options,
    correctIndex,
    explanation: `The complete sentence is: "${example}"`,
    wordId: target._id,
    word: target.word,
  };
}

// 4. Synonym: choose closest meaning
function generateSynonym(target, pool) {
  const info = getWordEntry(target.word);
  const correct = info && info.synonyms && info.synonyms.length ? info.synonyms[0] : (target.meaning.split(/[,;]/)[0] || 'fitting');
  const candidateDistractors = info && info.antonyms && info.antonyms.length
    ? info.antonyms
    : ['unrelated', 'inconsequential', 'negligible'];
  const fallbacks = ['careless', 'obscure', 'inflexible', 'awkward'];
  const { options, correctIndex } = makeUniqueOptions(correct, candidateDistractors, fallbacks, 4);

  return {
    type: 'synonym',
    typeLabel: 'Synonym Identification',
    prompt: `Which of the following is the closest SYNONYM for "${target.word}"?`,
    options,
    correctIndex,
    explanation: `"${correct}" shares the same meaning as "${target.word}" (${target.meaning}).`,
    wordId: target._id,
    word: target.word,
  };
}

// 5. Antonym: choose opposite
function generateAntonym(target, pool) {
  const info = getWordEntry(target.word);
  const correct = info && info.antonyms && info.antonyms.length ? info.antonyms[0] : 'opposite in nature';
  const candidateDistractors = info && info.synonyms && info.synonyms.length
    ? info.synonyms
    : ['favorable', 'relevant', 'suitable'];
  const fallbacks = ['thorough', 'logical', 'truthful', 'capable'];
  const { options, correctIndex } = makeUniqueOptions(correct, candidateDistractors, fallbacks, 4);

  return {
    type: 'antonym',
    typeLabel: 'Antonym Identification',
    prompt: `Which of the following is the most direct ANTONYM (opposite) of "${target.word}"?`,
    options,
    correctIndex,
    explanation: `The opposite of "${target.word}" is "${correct}".`,
    wordId: target._id,
    word: target.word,
  };
}

// 6. Correct usage: which sentence uses word correctly
function generateCorrectUsage(target, pool) {
  const correct = target.example || `She demonstrated a ${target.word.toLowerCase()} approach toward achieving her goals.`;
  const distractors = [
    `The weather today is completely ${target.word.toLowerCase()} with heavy rainfall.`,
    `He drank a cup of hot ${target.word.toLowerCase()} before going to bed.`,
    `She parked her ${target.word.toLowerCase()} in front of the building.`,
  ];
  const { options, correctIndex } = makeUniqueOptions(correct, distractors, [], 4);

  return {
    type: 'correct_usage',
    typeLabel: 'Sentence Usage',
    prompt: `Which sentence uses the word "${target.word}" correctly in context?`,
    options,
    correctIndex,
    explanation: `"${correct}" demonstrates the accurate contextual usage of "${target.word}".`,
    wordId: target._id,
    word: target.word,
  };
}

// 7. Odd one out: 3 related words and 1 unrelated
function generateOddOneOut(target, pool) {
  const info = getWordEntry(target.word);
  const synonyms = info && info.synonyms ? info.synonyms.slice(0, 3) : ['meticulous', 'precise', 'accurate'];
  const oddWord = 'reckless';
  const { options, correctIndex } = makeUniqueOptions(oddWord, synonyms, ['careless', 'hurried'], 4);

  return {
    type: 'odd_one_out',
    typeLabel: 'Odd One Out',
    prompt: `Three words below share a related theme with "${target.word}". Which word is the ODD ONE OUT?`,
    options,
    correctIndex,
    explanation: `"${oddWord}" does not belong with the words related to "${target.word}".`,
    wordId: target._id,
    word: target.word,
  };
}

// 8. Word form: choose correct grammatical form for a sentence
function generateWordForm(target, pool) {
  const info = getWordEntry(target.word);
  const forms = (info && info.forms) || {
    adjective: target.word.toLowerCase(),
    adverb: `${target.word.toLowerCase()}ly`,
    noun: `${target.word.toLowerCase()}ness`,
  };
  const correct = forms.adverb || `${target.word.toLowerCase()}ly`;
  const candidates = [
    forms.adjective,
    forms.noun,
    `${target.word.toLowerCase()}ing`,
    `${target.word.toLowerCase()}ed`,
  ];
  const { options, correctIndex } = makeUniqueOptions(correct, candidates, [], 4);

  return {
    type: 'word_form',
    typeLabel: 'Word Form & Grammar',
    prompt: `Choose the correct grammatical form of "${target.word}" to complete:\n"The project manager handled the client negotiations ______."`,
    options,
    correctIndex,
    explanation: `An adverb ("${correct}") is required to modify the verb "handled".`,
    wordId: target._id,
    word: target.word,
  };
}

// 9. Context inference: short scenario; which word fits best
function generateContextInference(target, pool) {
  const info = getWordEntry(target.word);
  const scenario = (info && info.scenarios && info.scenarios[0]) ||
    `During the high-stakes project audit, every line item was scrutinized and cross-verified without error.`;
  const distractors = getDistractorWords(target.word, pool, 3);
  const fallbackWords = GENERAL_WORD_BANK.map((b) => b.word);
  const { options, correctIndex } = makeUniqueOptions(target.word, distractors, fallbackWords, 4);

  return {
    type: 'context_inference',
    typeLabel: 'Context Inference',
    prompt: `Read the short scenario below and choose the word that best describes it:\n\n"${scenario}"`,
    options,
    correctIndex,
    explanation: `"${target.word}" best describes the scenario (${target.meaning}).`,
    wordId: target._id,
    word: target.word,
  };
}

// 10. Spelling: choose correct spelling
function generateSpelling(target, pool) {
  const info = getWordEntry(target.word);
  const word = target.word;
  const misspellings = (info && info.misspellings) || [
    `${word.slice(0, -2)}os`,
    `${word.replace(/i/g, 'e')}`,
    `${word.replace(/c/g, 'k')}`,
  ];
  const { options, correctIndex } = makeUniqueOptions(word, misspellings, [`${word}x`, `${word}e`], 4);

  return {
    type: 'spelling',
    typeLabel: 'Correct Spelling',
    prompt: `Choose the correctly spelled word corresponding to the definition: "${target.meaning}":`,
    options,
    correctIndex,
    explanation: `"${word}" is the standard correct spelling.`,
    wordId: target._id,
    word: target.word,
  };
}

const GENERATORS = [
  generateMeaningMatch,      // 0
  generateReverseMatch,      // 1
  generateFillInTheBlank,    // 2
  generateSynonym,           // 3
  generateAntonym,           // 4
  generateCorrectUsage,      // 5
  generateOddOneOut,         // 6
  generateWordForm,          // 7
  generateContextInference,  // 8
  generateSpelling,          // 9
];

/**
 * Builds a quiz for a given list of flashcard words.
 * Rotates types so no two consecutive questions share a type.
 * Enforces at least 5 distinct question types in every quiz (when >= 5 words).
 * Prevents repeating prompts from recent quizzes for that user.
 */
function buildVocabQuiz(words, fullPool, userId = null) {
  if (!Array.isArray(words) || !words.length) return [];

  const pool = Array.isArray(fullPool) && fullPool.length ? fullPool : words;
  const recentUserSet = userId ? (userRecentPrompts.get(userId.toString()) || new Set()) : new Set();

  const numQuestions = words.length;
  const questions = [];
  const chosenTypeIndices = [];

  for (let i = 0; i < numQuestions; i++) {
    const prevType = i > 0 ? chosenTypeIndices[i - 1] : -1;
    const candidates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((t) => t !== prevType);

    const distinctSoFar = new Set(chosenTypeIndices);
    const unseen = candidates.filter((t) => !distinctSoFar.has(t));

    let chosenType;
    if (unseen.length && distinctSoFar.size < 5) {
      chosenType = unseen[Math.floor(Math.random() * unseen.length)];
    } else {
      chosenType = candidates[Math.floor(Math.random() * candidates.length)];
    }

    chosenTypeIndices.push(chosenType);
    const generator = GENERATORS[chosenType];
    const targetWord = words[i];

    let question = generator(targetWord, pool);

    if (recentUserSet.has(question.prompt)) {
      const altTypes = candidates.filter((t) => t !== chosenType);
      if (altTypes.length) {
        const altType = altTypes[0];
        chosenTypeIndices[i] = altType;
        question = GENERATORS[altType](targetWord, pool);
      }
    }

    questions.push(question);
  }

  if (userId) {
    const uidStr = userId.toString();
    if (!userRecentPrompts.has(uidStr)) {
      userRecentPrompts.set(uidStr, new Set());
    }
    const userSet = userRecentPrompts.get(uidStr);
    questions.forEach((q) => userSet.add(q.prompt));
    if (userSet.size > 60) {
      const arr = Array.from(userSet);
      userRecentPrompts.set(uidStr, new Set(arr.slice(arr.length - 30)));
    }
  }

  return questions;
}

module.exports = {
  buildVocabQuiz,
  GENERATORS,
  VOCAB_KNOWLEDGE_BANK,
};
