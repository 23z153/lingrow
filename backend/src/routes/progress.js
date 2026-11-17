const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const UserBadge = require('../models/UserBadge');
const Badge = require('../models/Badge');
const DailyWordAnswer = require('../models/DailyWordAnswer');
const GrammarAttempt = require('../models/GrammarAttempt');
const ReadAloudAttempt = require('../models/ReadAloudAttempt');
const WorldStageSession = require('../models/WorldStageSession');
const ListeningAttempt = require('../models/ListeningAttempt');
const VocabProgress = require('../models/VocabProgress');
const { BADGE_DEFS, getDragonEvolution, awardXP, maybeAwardBadge } = require('../services/progressService');
const { getApplicationProgressionSummary } = require('../services/progressionEngine');

router.get('/me', requireAuth, async (req, res) => {
  const earned = await UserBadge.find({ user: req.user._id }).populate('badge');
  const earnedKeys = new Set(earned.map((e) => e.badge?.key).filter(Boolean));
  const allBadges = Object.entries(BADGE_DEFS).map(([key, def]) => ({ key, ...def, unlocked: earnedKeys.has(key) }));
  const dragon = getDragonEvolution(req.user.xp || 0);
  const progression = await getApplicationProgressionSummary(req.user._id);

  res.json({
    xp: req.user.xp,
    level: req.user.level,
    unlockedLevels: req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'],
    streak: req.user.streak,
    dragon,
    badges: allBadges,
    progression,
  });
});

router.get('/progression', requireAuth, async (req, res) => {
  try {
    const summary = await getApplicationProgressionSummary(req.user._id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dragon', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const dragon = getDragonEvolution(user.xp || 0);

    // Calculate start of today (local or UTC)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [dailyWordsDone, vocabDone, grammarCount, readAloudCount, worldStageCount, listeningCount] = await Promise.all([
      DailyWordAnswer.countDocuments({ user: user._id, createdAt: { $gte: startOfDay } }),
      VocabProgress.countDocuments({ user: user._id, updatedAt: { $gte: startOfDay } }),
      GrammarAttempt.countDocuments({ user: user._id, createdAt: { $gte: startOfDay } }),
      ReadAloudAttempt.countDocuments({ user: user._id, createdAt: { $gte: startOfDay } }),
      WorldStageSession.countDocuments({ userId: user._id, createdAt: { $gte: startOfDay } }),
      ListeningAttempt.countDocuments({ user: user._id, createdAt: { $gte: startOfDay } }),
    ]);

    const totalWords = dailyWordsDone + vocabDone;
    const totalSpeaking = readAloudCount + worldStageCount;

    // Check automatic badge unlock triggers
    if (user.xp > 0) await maybeAwardBadge(user, 'first_flight');
    if (user.streak >= 7) await maybeAwardBadge(user, 'seven_day_flame');
    if (dragon.stage >= 5) await maybeAwardBadge(user, 'legendary_dragon_rider');
    if (grammarCount >= 5) await maybeAwardBadge(user, 'grammar_guardian');
    if (totalWords >= 20) await maybeAwardBadge(user, 'vocabulary_master');
    if (totalSpeaking >= 5) await maybeAwardBadge(user, 'speaking_warrior');

    const missions = [
      {
        id: 'vocab',
        title: 'Learn 5 Words in Vocabulary Forest',
        description: 'Complete vocabulary cards, daily words, or weak words practice',
        category: 'Vocabulary',
        target: 5,
        current: Math.min(5, totalWords),
        completed: totalWords >= 5,
        rewardXp: 15,
        destination: 'vocabulary',
      },
      {
        id: 'grammar',
        title: 'Conquer a Trial in Grammar Castle',
        description: 'Complete at least 1 interactive grammar exercise topic',
        category: 'Grammar',
        target: 1,
        current: Math.min(1, grammarCount),
        completed: grammarCount >= 1,
        rewardXp: 20,
        destination: 'grammar',
      },
      {
        id: 'speaking',
        title: 'Voice of the Flame in Speaking Volcano',
        description: 'Practice speaking aloud in Read Aloud, World Stage, or Weak Words',
        category: 'Speaking',
        target: 1,
        current: Math.min(1, totalSpeaking),
        completed: totalSpeaking >= 1,
        rewardXp: 25,
        destination: 'read-aloud',
      },
      {
        id: 'listening',
        title: 'Dive into Listening Ocean',
        description: 'Listen to an audio conversation clip and answer the comprehension questions',
        category: 'Listening',
        target: 1,
        current: Math.min(1, listeningCount),
        completed: listeningCount >= 1,
        rewardXp: 20,
        destination: 'listening',
      },
    ];

    const completedCount = missions.filter((m) => m.completed).length;
    const allCompleted = completedCount === missions.length;

    res.json({
      dragon,
      missions,
      completedCount,
      allCompleted,
      streak: user.streak || 0,
      xp: user.xp || 0,
      level: user.level || 'Beginner',
      unlockedLevels: user.getUnlockedLevels ? user.getUnlockedLevels() : ['Beginner'],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/missions/claim', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [dailyWordsDone, vocabDone, grammarCount, readAloudCount, worldStageCount, listeningCount] = await Promise.all([
      DailyWordAnswer.countDocuments({ user: user._id, createdAt: { $gte: startOfDay } }),
      VocabProgress.countDocuments({ user: user._id, updatedAt: { $gte: startOfDay } }),
      GrammarAttempt.countDocuments({ user: user._id, createdAt: { $gte: startOfDay } }),
      ReadAloudAttempt.countDocuments({ user: user._id, createdAt: { $gte: startOfDay } }),
      WorldStageSession.countDocuments({ userId: user._id, createdAt: { $gte: startOfDay } }),
      ListeningAttempt.countDocuments({ user: user._id, createdAt: { $gte: startOfDay } }),
    ]);

    const totalWords = dailyWordsDone + vocabDone;
    const totalSpeaking = readAloudCount + worldStageCount;

    if (totalWords < 5 || grammarCount < 1 || totalSpeaking < 1 || listeningCount < 1) {
      return res.status(400).json({ error: 'All 4 daily missions must be completed before claiming bonus XP.' });
    }

    // Award +30 Daily Mastery bonus
    const result = await awardXP(user, 30);
    const dragon = getDragonEvolution(result.xp);

    res.json({
      message: 'Dragon Master Daily Bonus Claimed! +30 XP awarded!',
      bonusAwarded: 30,
      xp: result.xp,
      level: result.level,
      dragon,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', requireAuth, async (req, res) => {
  const top = await User.find({ role: 'student' }).sort({ xp: -1 }).limit(10).select('name xp level streak');
  const enriched = top.map((u) => {
    const evo = getDragonEvolution(u.xp || 0);
    return {
      _id: u._id,
      name: u.name,
      xp: u.xp,
      level: u.level,
      streak: u.streak || 0,
      dragonStage: evo.name,
      dragonTitle: evo.title,
    };
  });
  res.json(enriched);
});

module.exports = router;
