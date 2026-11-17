const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const ChallengeProgress = require('../models/ChallengeProgress');
const Notification = require('../models/Notification');
const { awardXP } = require('../services/progressService');
const {
  getAllChallenges,
  getChallengeById,
  calculateLevelsSummary,
  UNLOCK_REQUIREMENTS,
} = require('../services/challengeCatalog');
const { recordActivityCompletion } = require('../services/progressionEngine');

/**
 * GET /api/challenges — Retrieve full 3-level progression status & challenges
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const completedDocs = await ChallengeProgress.find({ user: user._id }).select('challengeId score xpEarned completedAt');
    const completedIds = completedDocs.map((c) => c.challengeId);
    const unlockedLevels = user.getUnlockedLevels();

    const summary = calculateLevelsSummary(completedIds, unlockedLevels);

    res.json({
      levels: summary,
      completedChallengeIds: completedIds,
      unlockedLevels,
      userLevel: user.level || 'Beginner',
      xp: user.xp || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/challenges/:id/complete — Complete a challenge and evaluate progressive unlocking
 */
router.post('/:id/complete', requireAuth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const challenge = getChallengeById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: `Challenge with ID "${challengeId}" not found.` });
    }

    const { score = 100 } = req.body;

    let result;
    try {
      result = await recordActivityCompletion({
        user: req.user,
        activityId: challengeId,
        activityType: 'challenge',
        level: challenge.level,
        category: challenge.category,
        score,
        xp: challenge.xp,
      });
    } catch (gateErr) {
      if (gateErr.locked) {
        return res.status(403).json({
          error: `Challenge "${challenge.title}" is in the ${challenge.level} tier, which is currently locked. Complete the previous level to unlock.`,
          locked: true,
          requiredLevel: challenge.level,
          unlockedLevels: gateErr.unlockedLevels,
        });
      }
      throw gateErr;
    }

    const completedDocs = await ChallengeProgress.find({ user: req.user._id }).select('challengeId');
    const completedIds = completedDocs.map((c) => c.challengeId);
    const summary = calculateLevelsSummary(completedIds, result.unlockedLevels);

    res.json({
      ok: true,
      challengeId,
      completed: true,
      isFirstTime: result.isFirstTime,
      xpAwarded: result.xpAwarded,
      totalXp: result.totalXp,
      level: req.user.level,
      unlockedLevels: result.unlockedLevels,
      justUnlockedLevel: result.justUnlockedLevel,
      levels: summary,
      message: result.justUnlockedLevel
        ? `🔥 Incredible! You unlocked the ${result.justUnlockedLevel} tier!`
        : `Challenge completed! +${result.xpAwarded} XP awarded!`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
