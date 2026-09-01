const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const GrammarTopic = require('../models/GrammarTopic');
const User = require('../models/User');
const { awardXP } = require('../services/progressService');

/* Fisher-Yates shuffle — used so two tests built from the same topic don't
   hand out an identical paper in the same order every time. */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* -------------------------------------------------------------------------
   GET /api/tests/categories
   The list of topics a teacher can build a test from, with how many
   questions currently sit in the bank for each — so the UI can warn if
   a teacher asks for more than the bank actually has.
------------------------------------------------------------------------- */
router.get('/categories', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const topics = await GrammarTopic.find().select('category questions level');
    const byCategory = {};
    for (const t of topics) {
      if (!byCategory[t.category]) byCategory[t.category] = { category: t.category, bankSize: 0, topicCount: 0, levels: new Set() };
      byCategory[t.category].bankSize += t.questions.length;
      byCategory[t.category].topicCount += 1;
      byCategory[t.category].levels.add(t.level);
    }
    const result = Object.values(byCategory).map((c) => ({ ...c, levels: [...c.levels] }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   POST /api/tests
   Teacher creates a test: give it a title + a topic (category) + how many
   questions, and it auto-fetches that many questions from the question
   bank (GrammarTopic docs matching the category/level).
------------------------------------------------------------------------- */
router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, category, level, numQuestions, durationMinutes, batch, status } = req.body;
    if (!title || !category) return res.status(400).json({ error: 'title and category (topic) are required' });

    const requested = Math.max(1, Math.min(500, Number(numQuestions) || 20));

    const filter = { category };
    if (level) filter.level = level;
    const topics = await GrammarTopic.find(filter);

    const pool = [];
    for (const t of topics) {
      for (const q of t.questions) {
        pool.push({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          sourceTopic: t._id,
        });
      }
    }

    if (pool.length === 0) {
      return res.status(400).json({
        error: `No questions found in the question bank for "${category}"${level ? ` (${level})` : ''}. Add topics/questions to that category first.`,
      });
    }

    const picked = shuffle(pool).slice(0, requested);

    const test = await Test.create({
      title,
      category,
      level: level || 'Beginner',
      durationMinutes: Number(durationMinutes) || 20,
      questions: picked,
      requestedQuestionCount: requested,
      createdBy: req.user._id,
      batch: batch || '',
      status: status === 'draft' ? 'draft' : 'published',
    });

    res.status(201).json({
      test,
      message:
        picked.length < requested
          ? `Test created with ${picked.length} questions — the bank only had ${pool.length} available for "${category}". Add more questions to reach ${requested}.`
          : `Test created with ${picked.length} questions from the "${category}" question bank.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Teacher: list tests they created (admins see all), with attempt counts.
------------------------------------------------------------------------- */
router.get('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const tests = await Test.find(filter).sort({ createdAt: -1 }).select('-questions.correctAnswer -questions.explanation');
    const counts = await TestAttempt.aggregate([
      { $match: { test: { $in: tests.map((t) => t._id) } } },
      { $group: { _id: '$test', attempts: { $sum: 1 }, avgScore: { $avg: '$score' } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c]));
    const result = tests.map((t) => ({
      ...t.toObject(),
      questionCount: t.questions.length,
      attempts: countMap[t._id.toString()]?.attempts || 0,
      avgScore: countMap[t._id.toString()] ? Math.round(countMap[t._id.toString()].avgScore) : null,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Student: tests available to them (published, matching batch or open to
   all), each flagged with whether they've already attempted it.
------------------------------------------------------------------------- */
router.get('/available', requireAuth, async (req, res) => {
  try {
    const filter = { status: 'published', $or: [{ batch: '' }, { batch: req.user.batch || '__none__' }] };
    const tests = await Test.find(filter).sort({ createdAt: -1 }).select('-questions.correctAnswer -questions.explanation');
    const myAttempts = await TestAttempt.find({ user: req.user._id, test: { $in: tests.map((t) => t._id) } });
    const bestByTest = {};
    for (const a of myAttempts) {
      const id = a.test.toString();
      if (!bestByTest[id] || a.score > bestByTest[id]) bestByTest[id] = a.score;
    }
    const result = tests.map((t) => ({
      ...t.toObject(),
      questionCount: t.questions.length,
      attempted: bestByTest[t._id.toString()] !== undefined,
      bestScore: bestByTest[t._id.toString()] ?? null,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attempts/me', requireAuth, async (req, res) => {
  try {
    const attempts = await TestAttempt.find({ user: req.user._id }).populate('test', 'title category level').sort({ createdAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Student: fetch a test to take (answers/explanations stripped out).
------------------------------------------------------------------------- */
router.get('/:id/take', requireAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select('-questions.correctAnswer -questions.explanation -questions.sourceTopic');
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (test.status !== 'published') return res.status(403).json({ error: 'This test is not currently open' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Student: submit answers for scoring.
------------------------------------------------------------------------- */
router.post('/:id/attempts', requireAuth, async (req, res) => {
  try {
    const { answers, timeTakenSeconds } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array of selected option indexes' });

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (test.status !== 'published') return res.status(403).json({ error: 'This test is not currently open' });

    let correctCount = 0;
    const evaluated = test.questions.map((q, idx) => {
      const selectedOption = answers[idx] !== undefined ? Number(answers[idx]) : -1;
      const isCorrect = selectedOption === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      return { questionIndex: idx, selectedOption, isCorrect, correctAnswer: q.correctAnswer, explanation: q.explanation };
    });

    const totalQuestions = test.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    let xpEarned = 0;
    if (score >= 50) {
      xpEarned = Math.round(20 + (score / 100) * 30); // 20 - 50 XP, tests are worth more than a single grammar topic
      await awardXP(req.user, xpEarned);
    }

    const attempt = await TestAttempt.create({
      test: test._id,
      user: req.user._id,
      answers: evaluated,
      score,
      correctCount,
      totalQuestions,
      timeTakenSeconds: Number(timeTakenSeconds) || 0,
      xpEarned,
    });

    res.status(201).json({
      attempt,
      evaluatedAnswers: evaluated,
      score,
      correctCount,
      totalQuestions,
      xpEarned,
      message: score >= 80 ? 'Excellent result!' : score >= 50 ? 'Good effort — review the ones you missed.' : 'Keep practicing — review the explanations below.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Teacher: full test detail (with answers) + per-question difficulty stats.
------------------------------------------------------------------------- */
router.get('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { status, title, durationMinutes, batch } = req.body;
    const update = {};
    if (status && ['draft', 'published', 'closed'].includes(status)) update.status = status;
    if (title) update.title = title;
    if (durationMinutes) update.durationMinutes = Number(durationMinutes);
    if (batch !== undefined) update.batch = batch;

    const test = await Test.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    await TestAttempt.deleteMany({ test: req.params.id });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Teacher: results for one test — every student's attempt, best score,
   ranked, plus a per-question breakdown of how many got each one wrong
   (so the teacher can see which questions the class struggled with).
------------------------------------------------------------------------- */
router.get('/:id/results', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const attempts = await TestAttempt.find({ test: test._id }).populate('user', 'name email batch level').sort({ score: -1 });

    const questionStats = test.questions.map((q, idx) => ({ question: q.question, wrongCount: 0, totalAnswered: 0 }));
    for (const a of attempts) {
      for (const ans of a.answers) {
        if (questionStats[ans.questionIndex]) {
          questionStats[ans.questionIndex].totalAnswered += 1;
          if (!ans.isCorrect) questionStats[ans.questionIndex].wrongCount += 1;
        }
      }
    }

    const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;

    res.json({ test, attempts, avgScore, totalAttempts: attempts.length, questionStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
