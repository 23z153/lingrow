'use strict';

/**
 * Server-side Placement Test Question Bank and Evaluation Logic.
 * This file contains answer keys, option permutation engines, and scoring algorithms.
 * MUST NEVER be imported by levelAccess.js or sent via GET /api/levels/config.
 */

const crypto = require('crypto');
const { LEVELS } = require('./levelAccess');
const { diffWords, heuristicAccuracy } = require('../services/llmService');

let testInjectedSeed = null;

function setTestPlacementSeed(seed) {
  if (process.env.NODE_ENV === 'test') {
    testInjectedSeed = seed;
  }
}

function clearTestPlacementSeed() {
  testInjectedSeed = null;
}

// Advanced question IDs used for difficulty-aware qualification
const ADVANCED_QUESTION_IDS = new Set(['pt-g-04', 'pt-v-04', 'pt-r-03', 'pt-r-04']);

const PLACEMENT_QUESTIONS = [
  {
    id: 'pt-g-01',
    section: 'grammar',
    levelHint: LEVELS.BEGINNER,
    prompt: 'She _____ to the market every Saturday morning.',
    options: ['goes', 'went', 'going', 'gone'],
    correctIndex: 0,
    correctAnswer: 'goes',
  },
  {
    id: 'pt-g-02',
    section: 'grammar',
    levelHint: LEVELS.BEGINNER,
    prompt: 'I have lived in this city _____ 2018.',
    options: ['before', 'around', 'since', 'until'],
    correctIndex: 2,
    correctAnswer: 'since',
  },
  {
    id: 'pt-g-03',
    section: 'grammar',
    levelHint: LEVELS.INTERMEDIATE,
    prompt: 'If you _____ earlier, you wouldn’t have missed the keynote address.',
    options: ['might leave', 'would leave', 'could leave', 'had left'],
    correctIndex: 3,
    correctAnswer: 'had left',
  },
  {
    id: 'pt-g-04',
    section: 'grammar',
    levelHint: LEVELS.ADVANCED,
    prompt: 'Seldom _____ such an inspiring demonstration of eloquence in a debate.',
    options: ['I witnessed', 'have I witnessed', 'I have witnessed', 'had I witness'],
    correctIndex: 1,
    correctAnswer: 'have I witnessed',
  },
  {
    id: 'pt-v-01',
    section: 'vocabulary',
    levelHint: LEVELS.BEGINNER,
    prompt: 'Choose the word closest in meaning to "huge":',
    options: ['fragile', 'narrow', 'hasty', 'enormous'],
    correctIndex: 3,
    correctAnswer: 'enormous',
  },
  {
    id: 'pt-v-02',
    section: 'vocabulary',
    levelHint: LEVELS.INTERMEDIATE,
    prompt: 'The manager decided to _____ the meeting until next Monday due to urgent travel.',
    options: ['put off', 'call off', 'carry on', 'bring up'],
    correctIndex: 0,
    correctAnswer: 'put off',
  },
  {
    id: 'pt-v-03',
    section: 'vocabulary',
    levelHint: LEVELS.INTERMEDIATE,
    prompt: 'Her explanation was completely _____; no one could doubt its logic.',
    options: ['hesitant', 'ambiguous', 'coherent', 'perplexing'],
    correctIndex: 2,
    correctAnswer: 'coherent',
  },
  {
    id: 'pt-v-04',
    section: 'vocabulary',
    levelHint: LEVELS.ADVANCED,
    prompt: 'His speech was notable for its _____ tone, steering clear of hyperbole and sensationalism.',
    options: ['restrained', 'bombastic', 'belligerent', 'frenetic'],
    correctIndex: 0,
    correctAnswer: 'restrained',
  },
  {
    id: 'pt-r-01',
    section: 'reading',
    levelHint: LEVELS.BEGINNER,
    prompt: 'Passage: "Liam packs his camera whenever he travels. He prefers capturing natural landscapes over city architecture."\nWhat does Liam enjoy photographing most?',
    options: ['Busy city streets', 'Nature and scenery', 'Historic cathedrals', 'Modern skyline towers'],
    correctIndex: 1,
    correctAnswer: 'Nature and scenery',
  },
  {
    id: 'pt-r-02',
    section: 'reading',
    levelHint: LEVELS.INTERMEDIATE,
    prompt: 'Passage: "Although renewable energy subsidies were initially met with skepticism, recent econometric models suggest they generated a tenfold return in local manufacturing jobs."\nThe author implies that the subsidies:',
    options: [
      'Displaced traditional regional manufacturing jobs',
      'Delivered substantial measurable local economic gains',
      'Failed to justify their initial legislative expenditure',
      'Primarily benefited multinational corporate businesses',
    ],
    correctIndex: 1,
    correctAnswer: 'Delivered substantial measurable local economic gains',
  },
  {
    id: 'pt-r-03',
    section: 'reading',
    levelHint: LEVELS.ADVANCED,
    prompt: 'Passage: "The scholar argued that linguistic drift is neither decay nor evolution, but an inexorable entropy that mirrors sociocultural flux."\nThe author views linguistic change as:',
    options: [
      'A gradual erosion of foundational grammatical standards',
      'A deliberate attempt by younger speakers to revise syntax',
      'An inevitable mirror of evolving sociocultural patterns',
      'An unnatural disruption of established formal conventions',
    ],
    correctIndex: 2,
    correctAnswer: 'An inevitable mirror of evolving sociocultural patterns',
  },
  {
    id: 'pt-r-04',
    section: 'reading',
    levelHint: LEVELS.ADVANCED,
    prompt: 'Passage: "In mitigating algorithmic bias, post-hoc calibration often resembles treating symptoms rather than the etiology, leaving underlying data asymmetries unaddressed."\nThe passage suggests that post-hoc calibration is:',
    options: [
      'A comprehensive remedy for entrenched historical data skew',
      'A dependable methodology for balancing demographic factors',
      'A promising architectural approach that resolves inequities',
      'A cosmetic intervention that overlooks core systemic causes',
    ],
    correctIndex: 3,
    correctAnswer: 'A cosmetic intervention that overlooks core systemic causes',
  },
];

const READ_ALOUD_SENTENCE = {
  id: 'pt-speech-01',
  sentence: 'The ancient dragon academy inspires courageous scholars to ignite their voices and speak with timeless clarity.',
  difficulty: LEVELS.INTERMEDIATE,
  weight: 0.15,
};

/**
 * Simple Linear Congruential Generator for deterministic seeded randomness.
 */
function makeSeededRNG(seed = 12345) {
  let s = Math.abs(Number(seed) || 12345) % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Creates an array permutation [0..n-1] shuffled pseudo-randomly.
 */
function createPermutation(len = 4, rng = Math.random) {
  const perm = Array.from({ length: len }, (_, i) => i);
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

/**
 * Generates shuffled placement questions for a client session.
 * Stores permutations on the attempt so answers map back securely upon scoring.
 * Production uses crypto.randomBytes; tests inject seed via setTestPlacementSeed().
 */
function generatePlacementSession() {
  let seed = null;
  if (process.env.NODE_ENV === 'test' && testInjectedSeed !== null) {
    seed = testInjectedSeed;
  }
  const rng = seed !== null
    ? makeSeededRNG(seed)
    : () => crypto.randomBytes(4).readUInt32LE(0) / 0xffffffff;

  const permutations = {};
  const questions = PLACEMENT_QUESTIONS.map((q) => {
    const perm = createPermutation(q.options.length, rng);
    permutations[q.id] = perm;
    const shuffledOptions = perm.map((origIdx) => q.options[origIdx]);
    return {
      id: q.id,
      section: q.section,
      category: q.section,
      prompt: q.prompt,
      question: q.prompt,
      options: shuffledOptions,
    };
  });

  return {
    questions,
    permutations,
    readAloudSentence: {
      id: READ_ALOUD_SENTENCE.id,
      sentence: READ_ALOUD_SENTENCE.sentence,
    },
  };
}

/**
 * Sanitizes question objects by completely stripping answer keys and tier hints.
 */
function sanitizePlacementQuestion(q) {
  return {
    id: q.id,
    section: q.section,
    category: q.section,
    prompt: q.prompt,
    question: q.prompt,
    options: q.options,
  };
}

/**
 * Difficulty-Aware Level Determination:
 * - 0..40   -> Beginner
 * - 41..75  -> Intermediate
 * - >= 76   -> Advanced ONLY IF at least 3 of the 4 Advanced-tier questions are correct.
 *              Otherwise capped at Intermediate.
 */
function levelFromScore(score, advancedCorrect = 4) {
  const rounded = Math.round(Number(score) || 0);
  if (rounded >= 76) {
    if (advancedCorrect >= 3) {
      return LEVELS.ADVANCED;
    }
    return LEVELS.INTERMEDIATE; // capped at Intermediate
  }
  if (rounded >= 41) return LEVELS.INTERMEDIATE;
  return LEVELS.BEGINNER;
}

/**
 * Scores placement test.
 * When audio is skipped (speechTranscript not provided), score is renormalized strictly
 * across the 12 questions alone with ZERO penalty.
 * When speechTranscript is provided, accuracy is evaluated server-side via scorePronunciation.
 * Never accepts a client-supplied speech score.
 */
async function scorePlacementTest(input, maybeTranscript = null, maybeSeconds = 0) {
  let answers = [];
  let speechTranscript = null;
  let speechSeconds = 0;
  let permutations = null;

  if (Array.isArray(input)) {
    answers = input;
    speechTranscript = typeof maybeTranscript === 'string' ? maybeTranscript : null;
    speechSeconds = Number(maybeSeconds) || 0;
  } else if (input && typeof input === 'object') {
    answers = Array.isArray(input.answers) ? input.answers : [];
    speechTranscript = typeof input.speechTranscript === 'string' ? input.speechTranscript : null;
    speechSeconds = Number(input.speechSeconds) || 0;
    permutations = input.permutations || null;
  }

  const questions = PLACEMENT_QUESTIONS;
  let correctCount = 0;
  let advancedCorrect = 0;
  const answerMap = new Map();

  if (Array.isArray(answers)) {
    for (const a of answers) {
      if (a && (a.questionId || a.id)) {
        const qId = a.questionId || a.id;
        const sIdx = a.selectedIndex !== undefined ? a.selectedIndex : a.selected;
        answerMap.set(String(qId), Number(sIdx));
      }
    }
  } else if (answers && typeof answers === 'object') {
    for (const [qId, selectedIdx] of Object.entries(answers)) {
      answerMap.set(String(qId), Number(selectedIdx));
    }
  }

  questions.forEach((q) => {
    const selected = answerMap.get(q.id);
    if (selected !== undefined && !isNaN(selected)) {
      // Map back using session permutation if available
      let originalIndex = selected;
      if (permutations && Array.isArray(permutations[q.id])) {
        originalIndex = permutations[q.id][selected];
      }

      if (originalIndex === q.correctIndex) {
        correctCount += 1;
        if (ADVANCED_QUESTION_IDS.has(q.id)) {
          advancedCorrect += 1;
        }
      }
    }
  });

  const writtenPercentage = Math.round((correctCount / questions.length) * 100);
  let placementSpeechScore = null;
  let speechIncluded = false;

  // Placement speech scoring: deterministic word-diff only, zero LLM calls.
  // Recommended level and overall score are computed from the WRITTEN score only to prevent spoofing.
  // Speech score is stored separately as placementSpeechScore for teacher dashboard display.
  if (typeof speechTranscript === 'string' && speechTranscript.trim().length > 0) {
    try {
      const wordScores = diffWords(READ_ALOUD_SENTENCE.sentence, speechTranscript.trim());
      const rawAccuracy = heuristicAccuracy(wordScores);
      placementSpeechScore = Math.min(100, Math.max(0, Math.round(rawAccuracy)));
      speechIncluded = true;
    } catch (_) {
      // Fallback gracefully to null if diff processing fails
      placementSpeechScore = null;
      speechIncluded = false;
    }
  }

  const recommendedLevel = levelFromScore(writtenPercentage, advancedCorrect);

  return {
    score: writtenPercentage,
    writtenScore: writtenPercentage,
    correctCount,
    totalQuestions: questions.length,
    advancedCorrect,
    totalAdvanced: ADVANCED_QUESTION_IDS.size,
    placementSpeechScore,
    speechScore: placementSpeechScore, // alias for backwards compatibility
    speechIncluded,
    recommendedLevel,
  };
}

module.exports = {
  PLACEMENT_QUESTIONS,
  READ_ALOUD_SENTENCE,
  ADVANCED_QUESTION_IDS,
  makeSeededRNG,
  createPermutation,
  generatePlacementSession,
  sanitizePlacementQuestion,
  levelFromScore,
  scorePlacementTest,
  setTestPlacementSeed,
  clearTestPlacementSeed,
};
