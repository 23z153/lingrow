const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const WorldStageScenario = require('../models/WorldStageScenario');
const WorldStageSession = require('../models/WorldStageSession');
const {
  DEFAULT_STAGES,
  seedWorldStageScenariosIfEmpty,
  createWorldStageSession,
  appendSpeechSegment,
  triggerAudienceQuestion,
  submitAudienceAnswer,
  endSessionAndEvaluate,
} = require('../services/worldStageEngine');
const { canUserAccessLevel, recordActivityCompletion } = require('../services/progressionEngine');

// Rate limiting for interactive speech submissions
const speechSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many speech updates. Please speak naturally.' },
});

/**
 * GET /api/world-stage/stages
 * List the 5 stage environments with student performance stats
 */
router.get('/stages', requireAuth, async (req, res) => {
  try {
    await seedWorldStageScenariosIfEmpty();
    const stages = await WorldStageScenario.find({ active: true }).lean();
    const userSessions = await WorldStageSession.find({
      user: req.user._id,
      status: 'completed',
    }).lean();

    const stageData = stages.map((stg) => {
      const stgSessions = userSessions.filter((s) => s.stageId === stg.stageId);
      const completedCount = stgSessions.length;
      let bestScore = 0;
      let totalScore = 0;

      stgSessions.forEach((s) => {
        const score = s.evaluation?.overallScore || 0;
        totalScore += score;
        if (score > bestScore) bestScore = score;
      });

      const avgScore = completedCount > 0 ? Math.round(totalScore / completedCount) : 0;

      return {
        ...stg,
        stats: {
          completedCount,
          bestScore,
          avgScore,
        },
      };
    });

    res.json(stageData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/world-stage/topics
 * Retrieve suggested speech topics filtered by stageId and difficulty
 */
router.get('/topics', requireAuth, async (req, res) => {
  try {
    await seedWorldStageScenariosIfEmpty();
    const { stageId, difficulty } = req.query;
    const filter = { active: true };
    if (stageId) filter.stageId = stageId;

    const stages = await WorldStageScenario.find(filter).lean();
    let allTopics = [];

    stages.forEach((stg) => {
      (stg.suggestedTopics || []).forEach((top) => {
        if (!difficulty || top.difficulty === difficulty || top.difficulty === 'All Levels') {
          allTopics.push({
            ...top,
            stageId: stg.stageId,
            stageName: stg.name,
          });
        }
      });
    });

    res.json(allTopics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/world-stage/sessions
 * Start a new World Stage presentation session
 */
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const {
      stageId = 'ted-talk',
      topic,
      difficulty = 'Intermediate',
      audienceSize = 30,
      targetDurationMinutes = 3,
      mode = 'practice',
      inputMode = 'voice',
      feedbackTiming = 'after',
    } = req.body;

    const validStages = ['ted-talk', 'college-seminar', 'corporate-conference', 'debate-arena', 'global-summit'];
    if (!validStages.includes(stageId)) {
      return res.status(400).json({ error: `Invalid stageId. Must be one of: ${validStages.join(', ')}` });
    }

    if (req.user && req.user.role === 'student') {
      const stageObj = await WorldStageScenario.findOne({ stageId });
      const requiredTier = difficulty && difficulty !== 'All Levels' ? difficulty : (stageObj?.level || 'Advanced');
      if (!canUserAccessLevel(req.user, requiredTier)) {
        return res.status(403).json({
          error: `This World Stage session is in the ${requiredTier} tier, which is currently locked. Complete previous level activities to unlock.`,
          locked: true,
          requiredLevel: requiredTier,
          unlockedLevels: req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'],
        });
      }
    }

    const { session, stage } = await createWorldStageSession({
      user: req.user,
      stageId,
      topic,
      difficulty,
      audienceSize: Number(audienceSize) || 30,
      targetDurationMinutes: Number(targetDurationMinutes) || 3,
      mode,
      inputMode,
      feedbackTiming,
    });

    res.status(201).json({
      session,
      stage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/world-stage/sessions/:id/speech
 * Stream/append speech segment and receive live audience reactions
 */
router.post('/sessions/:id/speech', requireAuth, speechSubmissionLimiter, async (req, res) => {
  try {
    const { text, audioDurationSeconds = 0, measuredDuration = false } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Speech text is required' });
    }

    const session = await WorldStageSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: not your World Stage session' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is already finished' });
    }

    const { session: updatedSession, newReactions } = await appendSpeechSegment({
      session,
      text: text.trim(),
      audioDurationSeconds: Number(audioDurationSeconds) || 0,
      measuredDuration: Boolean(measuredDuration),
    });

    res.json({
      session: updatedSession,
      newReactions,
      totalDurationSeconds: updatedSession.totalDurationSeconds,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/world-stage/sessions/:id/question
 * Trigger an unexpected, contextual audience question
 */
router.post('/sessions/:id/question', requireAuth, async (req, res) => {
  try {
    const session = await WorldStageSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { question, session: updatedSession } = await triggerAudienceQuestion({ session });

    res.json({
      question,
      session: updatedSession,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/world-stage/sessions/:id/answer
 * Answer an audience question
 */
router.post('/sessions/:id/answer', requireAuth, async (req, res) => {
  try {
    const { questionId, answerText } = req.body;
    if (!questionId) return res.status(400).json({ error: 'questionId is required' });
    if (!answerText || !answerText.trim()) return res.status(400).json({ error: 'answerText is required' });

    const session = await WorldStageSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { session: updatedSession, question } = await submitAudienceAnswer({
      session,
      questionId,
      answerText: answerText.trim(),
    });

    res.json({
      session: updatedSession,
      question,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/world-stage/sessions/:id/end
 * Finish presentation, evaluate 100-point rubric, and award XP
 */
router.post('/sessions/:id/end', requireAuth, async (req, res) => {
  try {
    const session = await WorldStageSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await endSessionAndEvaluate({
      session,
      user: req.user,
    });

    const stageObj = await WorldStageScenario.findOne({ stageId: session.stageId });
    const prog = await recordActivityCompletion({
      user: req.user,
      activityId: session.stageId,
      activityType: 'world-stage',
      level: session.difficulty === 'Beginner' ? 'Beginner' : (stageObj?.level || 'Advanced'),
      category: 'world-stage',
      score: result.evaluation?.overallScore || 80,
      xp: 0, // XP is already claimed and awarded in endSessionAndEvaluate; pass 0 to prevent double-award
    }).catch((e) => {
      console.warn('[progression] World Stage record error:', e);
      return null;
    });

    result.progression = prog;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/world-stage/sessions/:id/report
 * Retrieve complete report and transcript for a completed session
 */
router.get('/sessions/:id/report', requireAuth, async (req, res) => {
  try {
    const session = await WorldStageSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: not your World Stage session' });
    }

    const stage = await WorldStageScenario.findOne({ stageId: session.stageId });

    res.json({
      session,
      stage,
      evaluation: session.evaluation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/world-stage/history
 * List student's past World Stage sessions
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const sessions = await WorldStageSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/world-stage/stats
 * Aggregate public speaking statistics for authenticated student
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const sessions = await WorldStageSession.find({
      user: req.user._id,
      status: 'completed',
    }).lean();

    const totalSessions = sessions.length;
    let totalScore = 0;
    let bestScore = 0;
    const stageCounts = {
      'ted-talk': 0,
      'college-seminar': 0,
      'corporate-conference': 0,
      'debate-arena': 0,
      'global-summit': 0,
    };

    const dimensionSums = {
      grammarAccuracy: 0,
      vocabulary: 0,
      sentenceFormation: 0,
      clarity: 0,
      topicRelevance: 0,
      fluency: 0,
      speechOrganization: 0,
      audienceEngagement: 0,
    };

    sessions.forEach((s) => {
      const score = s.evaluation?.overallScore || 0;
      totalScore += score;
      if (score > bestScore) bestScore = score;
      if (stageCounts[s.stageId] !== undefined) stageCounts[s.stageId]++;

      if (s.evaluation?.dimensionScores) {
        Object.keys(dimensionSums).forEach((dim) => {
          dimensionSums[dim] += s.evaluation.dimensionScores[dim] || 0;
        });
      }
    });

    const avgScore = totalSessions > 0 ? Math.round(totalScore / totalSessions) : 0;
    const dimensionAverages = {};
    Object.keys(dimensionSums).forEach((dim) => {
      dimensionAverages[dim] = totalSessions > 0 ? Math.round((dimensionSums[dim] / totalSessions) * 10) / 10 : 0;
    });

    res.json({
      totalSessions,
      avgScore,
      bestScore,
      stageCounts,
      dimensionAverages,
      streak: req.user.streak || 0,
      xp: req.user.xp || 0,
      level: req.user.level || 'Beginner',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
