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

// POST /api/grammar/:id/submit - Evaluate answers & record attempt
router.post('/:id/submit', requireAuth, async (req, res) => {
  try {
    const { answers } = req.body; // Array of selected option indexes: [0, 2, 1, ...]
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array of selected option indexes' });
    }

    const topic = await GrammarTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Grammar topic not found' });

    let correctCount = 0;
    const evaluatedAnswers = topic.questions.map((q, idx) => {
      const selectedOption = answers[idx] !== undefined ? Number(answers[idx]) : -1;
      const isCorrect = selectedOption === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      return {
        questionIndex: idx,
        selectedOption,
        isCorrect,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    });

    const totalQuestions = topic.questions.length;
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
