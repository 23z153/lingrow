const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const GrammarTopic = require('../models/GrammarTopic');
const GrammarAttempt = require('../models/GrammarAttempt');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

// GET /api/grammar - List all grammar topics with user's completion status & highest score
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, level } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (level) filter.level = level;

    const topics = await GrammarTopic.find(filter).sort({ createdAt: 1 });
    const attempts = await GrammarAttempt.find({ user: req.user._id });

    // Build map of best scores & attempt count per topic
    const topicStats = {};
    for (const a of attempts) {
      const tid = a.topic.toString();
      if (!topicStats[tid]) {
        topicStats[tid] = { bestScore: 0, attemptsCount: 0 };
      }
      topicStats[tid].attemptsCount += 1;
      if (a.score > topicStats[tid].bestScore) {
        topicStats[tid].bestScore = a.score;
      }
    }

    const result = topics.map((t) => {
      const stats = topicStats[t._id.toString()] || { bestScore: 0, attemptsCount: 0 };
      return {
        ...t.toObject(),
        bestScore: stats.bestScore,
        attemptsCount: stats.attemptsCount,
        completed: stats.attemptsCount > 0,
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
      .populate('topic', 'title category level')
      .sort({ createdAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grammar/:id - Single topic details & questions
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const topic = await GrammarTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Grammar topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grammar/:id/test - Fetch 10 questions test from Question Bank for this topic
router.get('/:id/test', requireAuth, async (req, res) => {
  try {
    const topic = await GrammarTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Grammar topic not found' });

    // Pick 10 questions (or all if < 10)
    let questions = [...topic.questions];
    if (questions.length > 10) {
      // Shuffle & pick 10
      questions = questions.sort(() => 0.5 - Math.random()).slice(0, 10);
    }

    const testQuestions = questions.map((q, idx) => ({
      _id: q._id,
      index: idx + 1,
      question: q.question,
      options: q.options,
    }));

    res.json({
      topicId: topic._id,
      title: topic.title,
      category: topic.category,
      level: topic.level,
      videoUrl: topic.videoUrl,
      description: topic.description,
      ruleSummary: topic.ruleSummary,
      totalQuestions: testQuestions.length,
      questions: testQuestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grammar/:id/submit - Evaluate answers & record attempt
router.post('/:id/submit', requireAuth, async (req, res) => {
  try {
    const { answers, questionIds } = req.body; // Array of selected option indexes: [0, 2, 1, ...]
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array of selected option indexes' });
    }

    const topic = await GrammarTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Grammar topic not found' });

    // Determine target questions: either by questionIds array or topic.questions
    let targetQuestions = topic.questions;
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      targetQuestions = questionIds.map(qid => topic.questions.id(qid) || topic.questions.find(q => q._id.toString() === qid.toString())).filter(Boolean);
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

    // Calculate XP: 15 base + bonus for higher accuracy
    let xpEarned = 0;
    if (score >= 50) {
      xpEarned = Math.round(15 + (score / 100) * 15); // 15 - 30 XP
      await awardXP(req.user, xpEarned);
      await maybeAwardBadge(req.user);
    }

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

    res.json({
      attempt,
      evaluatedAnswers,
      score,
      correctCount,
      totalQuestions,
      xpEarned,
      message:
        score >= 80
          ? 'Outstanding job! Grammar master!'
          : score >= 50
          ? 'Good effort! Keep practicing to sharpen your skills.'
          : 'Nice try! Review the rule card and try again.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
