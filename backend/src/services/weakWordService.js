/**
 * weakWordService.js — Weak Words Lab Spaced Repetition & Enrichment Engine
 */

const WeakWord = require('../models/WeakWord');
const User = require('../models/User');
const { chatCompletion, DEFAULT_FAST_MODEL } = require('./ollamaClient');
const { awardXP, maybeAwardBadge } = require('./progressService');

// Built-in phonetic dictionary for instant fallback without network latency
const LOCAL_PHONETICS = {
  algorithm: { phonetic: '/ˈæl.ɡə.rɪ.ðəm/', exampleSentence: 'The search algorithm processes millions of queries efficiently.' },
  asynchronous: { phonetic: '/eɪˈsɪŋ.krə.nəs/', exampleSentence: 'Node.js uses asynchronous non-blocking event loops for scalability.' },
  architecture: { phonetic: '/ˈɑː.kɪ.tek.tʃər/', exampleSentence: 'A clean software architecture decouples business logic from frameworks.' },
  scalable: { phonetic: '/ˈskeɪ.lə.bəl/', exampleSentence: 'Cloud microservices provide a scalable foundation for modern web apps.' },
  optimization: { phonetic: '/ˌɒp.tɪ.maɪˈzeɪ.ʃən/', exampleSentence: 'Database query optimization drastically reduced API response times.' },
  repository: { phonetic: '/rɪˈpɒz.ɪ.tər.i/', exampleSentence: 'Clone the Git repository to your local development environment.' },
  infrastructure: { phonetic: '/ˈɪn.frə.strʌk.tʃər/', exampleSentence: 'Serverless infrastructure removes the operational overhead of server maintenance.' },
  relational: { phonetic: '/rɪˈleɪ.ʃən.əl/', exampleSentence: 'PostgreSQL is a powerful open-source relational database management system.' },
  indexing: { phonetic: '/ˈɪn.deks.ɪŋ/', exampleSentence: 'Proper indexing speeds up query filtering on high-volume tables.' },
  efficiency: { phonetic: '/ɪˈfɪʃ.ən.si/', exampleSentence: 'Code refactoring improved the memory efficiency of the backend process.' },
  benchmark: { phonetic: '/ˈbentʃ.mɑːk/', exampleSentence: 'We ran a performance benchmark to compare HTTP throughput under load.' },
  compliance: { phonetic: '/kəmˈplaɪ.əns/', exampleSentence: 'The engineering team ensured data privacy compliance with regulatory standards.' },
  synchronization: { phonetic: '/ˌsɪŋ.krə.naɪˈzeɪ.ʃən/', exampleSentence: 'Thread synchronization prevents race conditions during concurrent data access.' },
  parameter: { phonetic: '/pəˈræm.ɪ.tər/', exampleSentence: 'Pass the configuration parameter to initialize the API client.' },
  hierarchy: { phonetic: '/ˈhaɪə.rɑː.ki/', exampleSentence: 'The class hierarchy defines clean object inheritance across the module.' },
};

/**
 * Enriches a word with IPA phonetic transcription and an example sentence
 * Uses the fast qwen2.5:3b model without verifier loop. Gracefully falls back to empty strings.
 */
async function enrichWordWithFastModel(word) {
  const cleanWord = (word || '').toLowerCase().trim();
  if (!cleanWord) return { phonetic: '', exampleSentence: '' };

  // Check instant local lookup
  if (LOCAL_PHONETICS[cleanWord]) {
    return { ...LOCAL_PHONETICS[cleanWord] };
  }

  const promptMessages = [
    {
      role: 'system',
      content:
        'You are an English pronunciation and vocabulary tutor. For the given English word, provide its IPA phonetic transcription (e.g. "/ˈkɒn.trækt/") and ONE clear, natural example sentence in an academic or workplace context.\nOutput strictly valid JSON with keys "phonetic" and "exampleSentence" only.',
    },
    {
      role: 'user',
      content: `Word: "${cleanWord}"\nJSON format: {"phonetic":"/IPA/","exampleSentence":"Sentence using the word."}`,
    },
  ];

  try {
    const res = await chatCompletion({
      model: DEFAULT_FAST_MODEL,
      messages: promptMessages,
      temperature: 0.3,
      numPredict: 90,
      timeoutMs: 4000,
    });

    if (res && res.content) {
      const cleaned = res.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        phonetic: typeof parsed.phonetic === 'string' ? parsed.phonetic.trim() : '',
        exampleSentence: typeof parsed.exampleSentence === 'string' ? parsed.exampleSentence.trim() : '',
      };
    }
  } catch (err) {
    // Model offline or invalid JSON response — safe fallback
  }

  return {
    phonetic: `/${cleanWord}/`,
    exampleSentence: `Practice pronouncing the word "${cleanWord}" clearly in a sentence.`,
  };
}

/**
 * Spaced repetition interval calculator
 * Review schedule:
 *  - Streak 1: +1 day (Learning)
 *  - Streak 2: +2 days (Almost)
 *  - Streak 3: +4 days (Mastered)
 *  - Streak 4+: +7 days (Mastered)
 */
function calculateNextReview({ correct, currentStreak = 0 }) {
  if (!correct) {
    return {
      nextStreak: 0,
      stage: 'learning',
      nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 day
      xpAwarded: 0,
      becameMastered: false,
    };
  }

  const nextStreak = currentStreak + 1;
  let intervalDays = 1;
  let stage = 'learning';

  if (nextStreak === 1) {
    intervalDays = 1;
    stage = 'learning';
  } else if (nextStreak === 2) {
    intervalDays = 2;
    stage = 'almost';
  } else if (nextStreak >= 3) {
    intervalDays = nextStreak === 3 ? 4 : 7;
    stage = 'mastered';
  }

  const becameMastered = nextStreak >= 3;
  const baseXP = 5;
  const masteryBonus = becameMastered && currentStreak < 3 ? 10 : 0;
  const xpAwarded = baseXP + masteryBonus;

  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    nextStreak,
    stage,
    nextReviewAt,
    xpAwarded,
    becameMastered,
  };
}

/**
 * Processes a practice review result for a weak word
 */
async function recordReviewResult({ weakWord, correct, user }) {
  const result = calculateNextReview({
    correct,
    currentStreak: weakWord.correctStreak,
  });

  weakWord.correctStreak = result.nextStreak;
  weakWord.stage = result.stage;
  weakWord.nextReviewAt = result.nextReviewAt;
  weakWord.lastResult = correct ? 'correct' : 'wrong';

  await weakWord.save();

  // Award XP if correct
  if (result.xpAwarded > 0) {
    await awardXP(user, result.xpAwarded);
  }

  // Check if Word Smith badge should be unlocked (10 mastered words)
  let badgeUnlocked = null;
  if (result.becameMastered) {
    const masteredCount = await WeakWord.countDocuments({
      userId: user._id,
      stage: 'mastered',
    });
    if (masteredCount >= 10) {
      badgeUnlocked = await maybeAwardBadge(user, 'word_smith', 50);
    }
  }

  return {
    weakWord,
    xpAwarded: result.xpAwarded,
    becameMastered: result.becameMastered,
    badgeUnlocked,
  };
}

/**
 * Aggregates top 10 most missed words across a teacher's students
 */
async function getClassWeakWordsSummary({ teacherUser }) {
  // Find all students
  const studentFilter = { role: 'student' };
  if (teacherUser.batch) {
    studentFilter.batch = new RegExp(`^${teacherUser.batch}$`, 'i');
  }

  const students = await User.find(studentFilter).select('_id name');
  const studentIds = students.map((s) => s._id);

  if (studentIds.length === 0) {
    return { topMissed: [], totalStudents: 0 };
  }

  const summary = await WeakWord.aggregate([
    { $match: { userId: { $in: studentIds } } },
    {
      $group: {
        _id: '$word',
        totalMisses: { $sum: '$missCount' },
        studentIds: { $addToSet: '$userId' },
        masteredCount: {
          $sum: { $cond: [{ $eq: ['$stage', 'mastered'] }, 1, 0] },
        },
        learningCount: {
          $sum: { $cond: [{ $ne: ['$stage', 'mastered'] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        word: '$_id',
        totalMisses: 1,
        studentCount: { $size: '$studentIds' },
        masteredCount: 1,
        learningCount: 1,
      },
    },
    { $sort: { totalMisses: -1, studentCount: -1 } },
    { $limit: 10 },
  ]);

  return {
    topMissed: summary,
    totalStudents: studentIds.length,
  };
}

module.exports = {
  enrichWordWithFastModel,
  calculateNextReview,
  recordReviewResult,
  getClassWeakWordsSummary,
};

