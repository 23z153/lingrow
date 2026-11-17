const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const SimulationScenario = require('../models/SimulationScenario');
const SimulationSession = require('../models/SimulationSession');
const {
  seedScenariosIfEmpty,
  generateCharacterReply,
  generateSimulationHint,
  evaluateSimulationSession,
} = require('../services/simulationEngine');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

// User-keyed rate limiting for simulation interactive turns
const simulationTurnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 messages per minute per student
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many simulation requests. Please slow down.' },
});

const ENVIRONMENTS = [
  {
    id: 'interview',
    title: 'AI Job Interview Simulator',
    subtitle: 'HR & Technical Job Interviews',
    description: 'Master self-introductions, technical architectural defenses, behavioral STAR questions, and salary negotiation with AI corporate interviewers.',
    icon: 'user-check',
    characters: ['Sarah Jenkins (HR)', 'David Chen (Staff Architect)', 'Marcus Vance (VP Engineering)'],
    badge: 'Popular',
  },
  {
    id: 'office',
    title: 'AI Office Simulator',
    subtitle: 'Workplace & Team Communication',
    description: 'Lead agile standups, explain project timeline delays to executives, handle cross-team blockers, and submit professional leave requests.',
    icon: 'briefcase',
    characters: ['Priya Sharma (Scrum Lead)', 'Jennifer Wu (Product Director)', 'Amanda Ross (Ops Manager)'],
    badge: 'Essential',
  },
  {
    id: 'travel',
    title: 'AI Travel Companion',
    subtitle: 'International Travel & Tourism',
    description: 'Confidently navigate border control immigration, boutique hotel check-in, dietary dining requests, and missing baggage claim.',
    icon: 'compass',
    characters: ['Officer Davies (Border Control)', 'Mateo Rossi (Concierge)', 'Elena Gomez (Baggage Claim)'],
    badge: 'Fluency',
  },
  {
    id: 'emergency',
    title: 'AI Emergency Communication',
    subtitle: 'Urgent Situations & Public Safety',
    description: 'Practice rapid location reporting, roadside collision assistance, and urgent medical symptom triage under simulated educational scenarios.',
    icon: 'alert-octagon',
    characters: ['Dispatcher Harris (Emergency Dispatch)', 'Nurse Patricia (Medical Triage)'],
    badge: 'Vital Skills',
    disclaimer: 'EDUCATIONAL SIMULATION ONLY: Does not contact real emergency services or 911/112.',
  },
  {
    id: 'negotiation',
    title: 'AI Negotiation Trainer',
    subtitle: 'Persuasion, Pricing & Conflict Resolution',
    description: 'Negotiate performance raises, enterprise vendor pricing tiers, and project scope-versus-deadline trade-offs with commercial acumen.',
    icon: 'trending-up',
    characters: ['Director Henderson (Managing Director)', 'Robert Zhang (Enterprise Sales)'],
    badge: 'Advanced',
  },
];

/**
 * GET /api/simulation/environments
 * List all 5 environments with scenario count and user stats
 */
router.get('/environments', requireAuth, async (req, res) => {
  try {
    await seedScenariosIfEmpty();
    const scenarios = await SimulationScenario.find({ active: true }).lean();
    const userSessions = await SimulationSession.find({
      user: req.user._id,
      status: 'completed',
    }).lean();

    const envData = ENVIRONMENTS.map((env) => {
      const envScenarios = scenarios.filter((s) => s.environment === env.id);
      const envSessions = userSessions.filter((s) => s.environment === env.id);
      const completedCount = envSessions.length;
      const totalScore = envSessions.reduce((acc, s) => acc + (s.evaluation?.overallScore || 0), 0);
      const avgScore = completedCount > 0 ? Math.round(totalScore / completedCount) : 0;

      return {
        ...env,
        scenarioCount: envScenarios.length,
        userStats: {
          completedCount,
          avgScore,
        },
      };
    });

    res.json(envData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/simulation/scenarios
 * Filter by environment and/or level
 */
router.get('/scenarios', requireAuth, async (req, res) => {
  try {
    await seedScenariosIfEmpty();
    const { environment, level } = req.query;
    const filter = { active: true };
    if (environment) filter.environment = environment;
    if (level && level !== 'All Levels') {
      filter.$or = [{ level: level }, { level: 'All Levels' }];
    }

    const scenarios = await SimulationScenario.find(filter).sort({ createdAt: 1 }).lean();
    const userSessions = await SimulationSession.find({
      user: req.user._id,
      status: 'completed',
    }).lean();

    const scoredMap = {};
    userSessions.forEach((s) => {
      if (!scoredMap[s.scenarioId] || (s.evaluation?.overallScore || 0) > scoredMap[s.scenarioId].bestScore) {
        scoredMap[s.scenarioId] = {
          bestScore: s.evaluation?.overallScore || 0,
          completedCount: (scoredMap[s.scenarioId]?.completedCount || 0) + 1,
        };
      }
    });

    const result = scenarios.map((s) => ({
      ...s,
      userStats: scoredMap[s.scenarioId] || { bestScore: 0, completedCount: 0 },
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/simulation/scenarios/:id
 * Retrieve single scenario detail
 */
router.get('/scenarios/:id', requireAuth, async (req, res) => {
  try {
    await seedScenariosIfEmpty();
    const scenario = await SimulationScenario.findOne({
      $or: [{ scenarioId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    res.json(scenario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/simulation/sessions
 * Start a new simulation session
 */
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    await seedScenariosIfEmpty();
    const {
      scenarioId,
      characterId,
      level = 'Intermediate',
      mode = 'voice',
      feedbackMode = 'learning',
      targetDurationMinutes = 10,
      learningObjective = '',
    } = req.body;

    if (!scenarioId) return res.status(400).json({ error: 'scenarioId is required' });

    const scenario = await SimulationScenario.findOne({ scenarioId });
    if (!scenario) return res.status(404).json({ error: 'Simulation scenario not found' });

    let selectedCharacter = null;
    if (characterId) {
      selectedCharacter = scenario.characters.find((c) => c.characterId === characterId);
    }
    if (!selectedCharacter && scenario.characters.length > 0) {
      selectedCharacter = scenario.characters[0];
    }

    const initialAiMessage = {
      sender: 'ai',
      text: scenario.initialPrompt,
      audioDurationSeconds: 0,
      timestamp: new Date(),
    };

    const session = await SimulationSession.create({
      user: req.user._id,
      environment: scenario.environment,
      scenarioId: scenario.scenarioId,
      scenarioTitle: scenario.title,
      character: {
        characterId: selectedCharacter.characterId,
        name: selectedCharacter.name,
        role: selectedCharacter.role,
        avatar: selectedCharacter.avatar,
      },
      level,
      mode,
      feedbackMode,
      targetDurationMinutes,
      learningObjective: learningObjective || scenario.learningObjectives[0] || '',
      status: 'active',
      startedAt: new Date(),
      messages: [initialAiMessage],
    });

    res.status(201).json({
      session,
      scenario,
      initialGreeting: initialAiMessage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/simulation/sessions/:id/turn
 * Submit a student utterance and receive AI character response + feedback
 */
router.post('/sessions/:id/turn', requireAuth, simulationTurnLimiter, async (req, res) => {
  try {
    const { utterance, audioDurationSeconds = 0, measuredDuration = false } = req.body;
    if (!utterance || !utterance.trim()) {
      return res.status(400).json({ error: 'Utterance cannot be empty' });
    }

    const session = await SimulationSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Simulation session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: not your simulation session' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is already completed or ended' });
    }

    const scenario = await SimulationScenario.findOne({ scenarioId: session.scenarioId });
    if (!scenario) return res.status(404).json({ error: 'Scenario definition not found' });

    // Generate AI character response & learning feedback
    const { replyText, feedback, evaluator } = await generateCharacterReply({
      session,
      scenario,
      userUtterance: utterance.trim(),
      audioDurationSeconds: Number(audioDurationSeconds) || 0,
      measuredDuration: Boolean(measuredDuration),
    });

    // Record student message
    const studentMsg = {
      sender: 'student',
      text: utterance.trim(),
      audioDurationSeconds: Number(audioDurationSeconds) || 0,
      measuredDuration: Boolean(measuredDuration),
      timestamp: new Date(),
      feedback: feedback || undefined,
    };
    session.messages.push(studentMsg);

    // Record AI message
    const aiMsg = {
      sender: 'ai',
      text: replyText,
      audioDurationSeconds: 0,
      timestamp: new Date(),
    };
    session.messages.push(aiMsg);

    if (audioDurationSeconds > 0) {
      session.totalDurationSeconds = (session.totalDurationSeconds || 0) + Number(audioDurationSeconds);
    }

    await session.save();

    res.json({
      aiReply: aiMsg,
      feedback: session.feedbackMode === 'learning' ? feedback : null,
      turnCount: session.messages.filter((m) => m.sender === 'student').length,
      session,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/simulation/sessions/:id/hint
 * Request a contextual hint during the simulation
 */
router.post('/sessions/:id/hint', requireAuth, async (req, res) => {
  try {
    const session = await SimulationSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Simulation session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scenario = await SimulationScenario.findOne({ scenarioId: session.scenarioId });
    if (!scenario) return res.status(404).json({ error: 'Scenario definition not found' });

    const hintData = await generateSimulationHint({ session, scenario });
    res.json(hintData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/simulation/sessions/:id/end
 * End simulation session, generate 100-point evaluation, and award XP & streak
 */
router.post('/sessions/:id/end', requireAuth, async (req, res) => {
  try {
    const session = await SimulationSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Simulation session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scenario = await SimulationScenario.findOne({ scenarioId: session.scenarioId });
    if (!scenario) return res.status(404).json({ error: 'Scenario definition not found' });

    session.status = 'completed';
    session.endedAt = new Date();

    // Generate comprehensive evaluation
    const evaluation = evaluateSimulationSession({ session, scenario });
    session.evaluation = evaluation;

    // Calculate XP: base 25 XP + up to 15 bonus XP based on performance
    const xpAmount = Math.max(10, Math.min(40, Math.round(20 + (evaluation.overallScore / 100) * 20)));
    session.xpAwarded = xpAmount;

    await session.save();

    // Award XP to user and update level
    await awardXP(req.user, xpAmount);

    // Update streak if score >= 40
    if (evaluation.overallScore >= 40) {
      const now = new Date();
      const last = req.user.lastActiveDate ? new Date(req.user.lastActiveDate) : null;
      let updateStreak = false;

      if (!last) {
        req.user.streak = 1;
        updateStreak = true;
      } else {
        const diffHours = (now - last) / (1000 * 60 * 60);
        if (diffHours >= 20 && diffHours <= 48) {
          req.user.streak = (req.user.streak || 0) + 1;
          updateStreak = true;
        } else if (diffHours > 48) {
          req.user.streak = 1;
          updateStreak = true;
        }
      }
      req.user.lastActiveDate = now;
      await req.user.save();
    }

    // Award badges if applicable
    if (evaluation.overallScore >= 85) {
      await maybeAwardBadge(req.user, 'consistent_debater', 20);
    }

    res.json({
      session,
      evaluation,
      xpAwarded: xpAmount,
      userStreak: req.user.streak,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/simulation/sessions/:id
 * Retrieve simulation session (for review and replay)
 */
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await SimulationSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Simulation session not found' });
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: not your simulation session' });
    }

    const scenario = await SimulationScenario.findOne({ scenarioId: session.scenarioId });
    res.json({ session, scenario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/simulation/history
 * List user's simulation session history
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const sessions = await SimulationSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/simulation/stats
 * Aggregated statistics for the authenticated student
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const sessions = await SimulationSession.find({
      user: req.user._id,
      status: 'completed',
    }).lean();

    const totalSessions = sessions.length;
    let totalScore = 0;
    const catScores = {
      grammar: 0,
      vocabulary: 0,
      sentenceFormation: 0,
      clarity: 0,
      relevance: 0,
      fluencyAndDelivery: 0,
    };
    const envCounts = {
      interview: 0,
      office: 0,
      travel: 0,
      emergency: 0,
      negotiation: 0,
    };

    sessions.forEach((s) => {
      totalScore += s.evaluation?.overallScore || 0;
      if (s.environment && envCounts[s.environment] !== undefined) {
        envCounts[s.environment]++;
      }
      if (s.evaluation?.categoryScores) {
        catScores.grammar += s.evaluation.categoryScores.grammar || 0;
        catScores.vocabulary += s.evaluation.categoryScores.vocabulary || 0;
        catScores.sentenceFormation += s.evaluation.categoryScores.sentenceFormation || 0;
        catScores.clarity += s.evaluation.categoryScores.clarity || 0;
        catScores.relevance += s.evaluation.categoryScores.relevance || 0;
        catScores.fluencyAndDelivery += s.evaluation.categoryScores.fluencyAndDelivery || 0;
      }
    });

    const avgScore = totalSessions > 0 ? Math.round(totalScore / totalSessions) : 0;
    const catAverages = {
      grammar: totalSessions > 0 ? Math.round((catScores.grammar / totalSessions) * 5) : 0, // out of 100 scale for UI
      vocabulary: totalSessions > 0 ? Math.round((catScores.vocabulary / totalSessions) * 6.66) : 0,
      sentenceFormation: totalSessions > 0 ? Math.round((catScores.sentenceFormation / totalSessions) * 6.66) : 0,
      clarity: totalSessions > 0 ? Math.round((catScores.clarity / totalSessions) * 6.66) : 0,
      relevance: totalSessions > 0 ? Math.round((catScores.relevance / totalSessions) * 6.66) : 0,
      fluencyAndDelivery: totalSessions > 0 ? Math.round((catScores.fluencyAndDelivery / totalSessions) * 5) : 0,
    };

    res.json({
      totalSessions,
      avgScore,
      envCounts,
      catAverages,
      streak: req.user.streak || 0,
      xp: req.user.xp || 0,
      level: req.user.level || 'Beginner',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
