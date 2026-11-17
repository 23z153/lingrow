const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const GrammarTopic = require('../models/GrammarTopic');
const GrammarAttempt = require('../models/GrammarAttempt');
const GrammarProgress = require('../models/GrammarProgress');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

// Pass mark threshold required to complete a topic and unlock the next topic
const PASS_PERCENT = 50;

/**
 * Normalizes any topic id representation (ObjectId, populated doc, string) to string
 */
function toIdString(id) {
  if (!id) return '';
  if (id._id) return String(id._id);
  return String(id);
}

/**
 * Flexible lookup by MongoDB _id or numeric topicId
 */
async function findTopicByIdOrTopicId(paramId) {
  if (!paramId) return null;
  const idStr = String(paramId).trim();
  if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
    const byId = await GrammarTopic.findById(idStr);
    if (byId) return byId;
  }
  const num = Number(idStr);
  if (!isNaN(num)) {
    const byNum = await GrammarTopic.findOne({ topicId: num });
    if (byNum) return byNum;
  }
  return null;
}

/**
 * Helper to fetch or create user's grammar progress.
 * Migrates existing attempts so users with prior completions are not locked out.
 */
async function getOrCreateGrammarProgress(userId) {
  let progress = await GrammarProgress.findOne({ userId });

  // Find all historical attempts for migration / sync
  const pastAttempts = await GrammarAttempt.find({ user: userId }).select('topic score').lean();

  if (!progress) {
    const completedSet = new Set();
    const scores = {};

    for (const a of pastAttempts) {
      if (!a.topic) continue;
      const tid = toIdString(a.topic);
      if (a.score !== undefined && a.score !== null) {
        scores[tid] = Math.max(scores[tid] || 0, a.score);
        if (a.score >= PASS_PERCENT) {
          completedSet.add(tid);
        }
      }
    }

    progress = new GrammarProgress({
      userId,
      completedTopicIds: Array.from(completedSet),
      bestScores: scores,
    });
    await progress.save();
  } else {
    // Ensure any previously unrecorded passing attempts are migrated
    let updated = false;
    const currentCompleted = new Set(progress.completedTopicIds.map(toIdString));

    for (const a of pastAttempts) {
      if (!a.topic) continue;
      const tid = toIdString(a.topic);
      const prevBest = progress.bestScores.get
        ? (progress.bestScores.get(tid) || 0)
        : (progress.bestScores[tid] || 0);
      if (a.score > prevBest) {
        if (progress.bestScores.set) {
          progress.bestScores.set(tid, a.score);
        } else {
          progress.bestScores[tid] = a.score;
        }
        updated = true;
      }
      if (a.score >= PASS_PERCENT && !currentCompleted.has(tid)) {
        progress.completedTopicIds.push(a.topic);
        currentCompleted.add(tid);
        updated = true;
      }
    }

    if (updated) {
      await progress.save();
    }
  }

  return progress;
}

/**
 * Checks if a topic is unlocked for a given user progress and sorted topic list.
 * Topic 1 (index 0) is always unlocked.
 * Topic N is unlocked if Topic N-1 is in completedTopicIds.
 */
function checkTopicUnlocked(targetTopicId, allSortedTopics, completedSet) {
  const targetIdStr = toIdString(targetTopicId);
  let index = allSortedTopics.findIndex((t) => toIdString(t._id) === targetIdStr);
  if (index === -1 && !isNaN(Number(targetIdStr))) {
    const num = Number(targetIdStr);
    index = allSortedTopics.findIndex((t) => t.topicId === num);
  }
  if (index === -1) return false;
  if (index === 0) return true; // First topic is always unlocked

  const prevTopic = allSortedTopics[index - 1];
  const prevIdStr = toIdString(prevTopic._id);
  return completedSet.has(prevIdStr);
}

// GET /api/grammar/progress - Current user's progress summary
router.get('/progress', requireAuth, async (req, res) => {
  try {
    const progress = await getOrCreateGrammarProgress(req.user._id);
    const totalTopics = await GrammarTopic.countDocuments();
    const completedTopicIds = progress.completedTopicIds.map(toIdString);

    res.json({
      completedTopicIds,
      bestScores: Object.fromEntries(progress.bestScores || new Map()),
      totalTopics,
      completedCount: completedTopicIds.length,
      passPercent: PASS_PERCENT,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grammar - List all grammar topics with sequential unlock state
router.get('/', requireAuth, async (req, res) => {
  try {
    const topics = await GrammarTopic.find({})
      .select('title category level unit topicId description ruleSummary videoUrl questions')
      .sort({ topicId: 1, createdAt: 1 })
      .lean();

    const progress = await getOrCreateGrammarProgress(req.user._id);
    const completedSet = new Set(progress.completedTopicIds.map(toIdString));

    const attempts = await GrammarAttempt.find({ user: req.user._id }).select('topic score').lean();
    const topicAttemptCounts = {};
    for (const a of attempts) {
      if (!a.topic) continue;
      const tid = toIdString(a.topic);
      topicAttemptCounts[tid] = (topicAttemptCounts[tid] || 0) + 1;
    }

    const result = topics.map((t, idx) => {
      const tid = toIdString(t._id);
      const isCompleted = completedSet.has(tid);
      const isUnlocked = idx === 0 || completedSet.has(toIdString(topics[idx - 1]._id));
      const bestScore = progress.bestScores.get
        ? (progress.bestScores.get(tid) || 0)
        : (progress.bestScores[tid] || 0);
      const prevTopic = idx > 0 ? topics[idx - 1] : null;

      return {
        _id: t._id,
        topicId: t.topicId || idx + 1,
        order: t.topicId || idx + 1,
        title: t.title,
        category: t.category,
        level: t.level,
        unit: t.unit,
        description: t.description,
        ruleSummary: t.ruleSummary,
        videoUrl: t.videoUrl,
        questionCount: (t.questions && t.questions.length) || 0,
        bestScore,
        attemptsCount: topicAttemptCounts[tid] || 0,
        completed: isCompleted,
        isCompleted,
        isLocked: !isUnlocked,
        previousTopicTitle: prevTopic ? prevTopic.title : null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grammar/attempts/me - User's grammar attempt history
router.get('/attempts/me', requireAuth, async (req, res) => {
  try {
    const attempts = await GrammarAttempt.find({ user: req.user._id })
      .populate('topic', 'title category level topicId')
      .sort({ createdAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grammar/:id - Single topic details & questions (locked check)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const topic = await findTopicByIdOrTopicId(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Grammar topic not found' });

    // Verify sequential unlock
    const allTopics = await GrammarTopic.find({}).sort({ topicId: 1, createdAt: 1 }).select('_id topicId title').lean();
    const progress = await getOrCreateGrammarProgress(req.user._id);
    const completedSet = new Set(progress.completedTopicIds.map(toIdString));

    if (!checkTopicUnlocked(topic._id, allTopics, completedSet)) {
      return res.status(403).json({
        error: 'This topic is locked. Complete the previous topic to unlock it.',
        locked: true,
      });
    }

    res.json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grammar/:id/test - Fetch questions test for this topic (locked check)
router.get('/:id/test', requireAuth, async (req, res) => {
  try {
    const topic = await findTopicByIdOrTopicId(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Grammar topic not found' });

    // Verify sequential unlock
    const allTopics = await GrammarTopic.find({}).sort({ topicId: 1, createdAt: 1 }).select('_id topicId title').lean();
    const progress = await getOrCreateGrammarProgress(req.user._id);
    const completedSet = new Set(progress.completedTopicIds.map(toIdString));

    if (!checkTopicUnlocked(topic._id, allTopics, completedSet)) {
      return res.status(403).json({
        error: 'This topic is locked. Complete the previous topic to unlock it.',
        locked: true,
      });
    }

    // Select questions from topic question pool
    let questions = [...(topic.questions || [])];
    if (questions.length > 50) {
      questions = questions.slice(0, 50);
    }

    const testQuestions = questions.map((q, idx) => ({
      _id: q._id,
      index: idx + 1,
      question: q.question,
      options: q.options,
    }));

    res.json({
      topicId: topic._id,
      order: topic.topicId,
      title: topic.title,
      category: topic.category,
      level: topic.level,
      videoUrl: topic.videoUrl,
      description: topic.description,
      ruleSummary: topic.ruleSummary,
      passPercent: PASS_PERCENT,
      totalQuestions: testQuestions.length,
      questions: testQuestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grammar/:id/submit - Evaluate answers & record attempt (locked check)
router.post('/:id/submit', requireAuth, async (req, res) => {
  try {
    const { answers, questionIds } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array of selected option indexes' });
    }

    const topic = await findTopicByIdOrTopicId(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Grammar topic not found' });

    // Verify sequential unlock
    const allTopics = await GrammarTopic.find({}).sort({ topicId: 1, createdAt: 1 }).select('_id topicId title').lean();
    const progress = await getOrCreateGrammarProgress(req.user._id);
    const completedSet = new Set(progress.completedTopicIds.map(toIdString));

    if (!checkTopicUnlocked(topic._id, allTopics, completedSet)) {
      return res.status(403).json({
        error: 'This topic is locked. Complete the previous topic to unlock it.',
        locked: true,
      });
    }

    // Determine target questions
    let targetQuestions = topic.questions || [];
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      targetQuestions = questionIds
        .map((qid) => (topic.questions.id ? topic.questions.id(qid) : topic.questions.find((q) => toIdString(q._id) === toIdString(qid))))
        .filter(Boolean);
    }

    let correctCount = 0;
    const evaluatedAnswers = targetQuestions.map((q, idx) => {
      const selectedOption = answers[idx] !== undefined ? Number(answers[idx]) : -1;
      const isCorrect = selectedOption === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      return {
        questionId: q._id,
        questionText: q.question,
        questionIndex: idx,
        selectedOption,
        isCorrect,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    });

    const totalQuestions = targetQuestions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= PASS_PERCENT;
    const tidStr = toIdString(topic._id);
    const wasAlreadyCompleted = completedSet.has(tidStr);

    let xpEarned = 0;
    // Award +25 XP only once per topic, on first completion
    if (passed && !wasAlreadyCompleted) {
      xpEarned = 25;
      await awardXP(req.user, xpEarned);
      await maybeAwardBadge(req.user);
    }

    // Update GrammarProgress
    const prevBest = progress.bestScores.get
      ? (progress.bestScores.get(tidStr) || 0)
      : (progress.bestScores[tidStr] || 0);

    if (score > prevBest) {
      if (progress.bestScores.set) {
        progress.bestScores.set(tidStr, score);
      } else {
        progress.bestScores[tidStr] = score;
      }
    }

    if (passed && !wasAlreadyCompleted) {
      progress.completedTopicIds.push(topic._id);
    }
    await progress.save();

    const attempt = new GrammarAttempt({
      user: req.user._id,
      topic: topic._id,
      score,
      correctCount,
      totalQuestions,
      answers: evaluatedAnswers,
      xpEarned,
    });
    await attempt.save();

    const updatedCompletedIds = progress.completedTopicIds.map(toIdString);
    const progressSummary = {
      completedTopicIds: updatedCompletedIds,
      bestScores: Object.fromEntries(progress.bestScores || new Map()),
      totalTopics: allTopics.length,
      completedCount: updatedCompletedIds.length,
      passPercent: PASS_PERCENT,
    };

    res.json({
      attempt,
      evaluatedAnswers,
      score,
      correctCount,
      totalQuestions,
      xpEarned,
      passed,
      isCompleted: passed || wasAlreadyCompleted,
      passPercent: PASS_PERCENT,
      progress: progressSummary,
      message: passed
        ? (wasAlreadyCompleted ? 'Topic retake completed!' : 'Congratulations! Topic completed and next topic unlocked!')
        : `Score ${score}%. Need ${PASS_PERCENT}% to unlock the next topic. Retry`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.PASS_PERCENT = PASS_PERCENT;
