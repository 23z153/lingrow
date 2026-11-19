const User = require('../models/User');
const ChallengeProgress = require('../models/ChallengeProgress');
const Notification = require('../models/Notification');
const { awardXP } = require('./progressService');
const { canAccess, LEVELS } = require('../config/levelAccess');

const UNLOCK_THRESHOLDS = {
  Beginner: 4, // Criteria tracking for Level-Up Trial
  Intermediate: 4,
};

/**
 * Checks if a user can access a target tier using the unified canAccess helper.
 * Teachers, admins, and non-student roles have unrestricted access.
 */
function canUserAccessLevel(user, targetLevel) {
  return canAccess(user, targetLevel);
}

/**
 * Normalizes activity identifier into a collision-free key
 */
function getActivityKey(activityType, activityId) {
  if (!activityType || activityType === 'challenge') return String(activityId);
  return `${activityType}:${activityId}`;
}

/**
 * Centralized Application-Wide Progression Recorder.
 * Records completion of any eligible learning activity across all 7 kingdoms,
 * evaluates tier completion criteria, unlocks next levels automatically,
 * and ensures idempotence (no duplicate XP or duplicate progression count).
 */
async function recordActivityCompletion({
  user,
  activityId,
  activityType = 'general',
  level = 'Beginner',
  category = 'general',
  score = 100,
  xp = 10,
}) {
  const userId = user._id || user;
  const userDoc = await User.findById(userId);
  if (!userDoc) {
    throw new Error('User not found');
  }

  const normalizedLevel = level === 'All Levels' ? 'Beginner' : level;

  // Strict Level Gating Enforcement
  if (userDoc.role === 'student' && !canUserAccessLevel(userDoc, normalizedLevel)) {
    const error = new Error(`Activity is in the ${normalizedLevel} tier, which is currently locked.`);
    error.status = 403;
    error.code = 'LEVEL_LOCKED';
    error.locked = true;
    error.requiredLevel = normalizedLevel;
    error.currentLevel = userDoc.level || null;
    error.unlockedLevels = userDoc.getUnlockedLevels();
    throw error;
  }

  const recordKey = getActivityKey(activityType, activityId);

  // Check existing completion to ensure idempotence
  const existing = await ChallengeProgress.findOne({ user: userDoc._id, challengeId: recordKey });
  const isFirstTime = !existing;

  // Upsert completion record
  await ChallengeProgress.findOneAndUpdate(
    { user: userDoc._id, challengeId: recordKey },
    {
      $setOnInsert: {
        user: userDoc._id,
        challengeId: recordKey,
        level: normalizedLevel,
        category: category || activityType,
        score,
        xpEarned: xp,
      },
    },
    { upsert: true, new: true }
  );

  let xpAwarded = 0;
  if (isFirstTime && xp > 0) {
    xpAwarded = xp;
    await awardXP(userDoc, xpAwarded);
  }

  // Evaluate application-wide progression counts
  const allCompletions = await ChallengeProgress.find({ user: userDoc._id });
  const beginnerCount = allCompletions.filter((c) => c.level === 'Beginner').length;
  const intermediateCount = allCompletions.filter((c) => c.level === 'Intermediate').length;
  const advancedCount = allCompletions.filter((c) => c.level === 'Advanced').length;

  // Auto-unlock mutation removed per 3-Tier specification (Amendment 2).
  // Level promotion is governed strictly by onboarding, Level-Up Trials, and teacher/admin overrides.
  const unlockedLevels = userDoc.getUnlockedLevels();

  return {
    ok: true,
    isFirstTime,
    xpAwarded,
    totalXp: userDoc.xp || 0,
    unlockedLevels,
    justUnlockedLevel: null,
    beginnerCount,
    intermediateCount,
    advancedCount,
    totalCompleted: allCompletions.length,
  };
}

/**
 * Generates an application-wide progression summary for the student dashboard.
 */
async function getApplicationProgressionSummary(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  const unlockedLevels = user.getUnlockedLevels();
  const allCompletions = await ChallengeProgress.find({ user: user._id }).lean();

  const beginnerCompleted = allCompletions.filter((c) => c.level === 'Beginner').length;
  const intermediateCompleted = allCompletions.filter((c) => c.level === 'Intermediate').length;
  const advancedCompleted = allCompletions.filter((c) => c.level === 'Advanced').length;

  const levels = {
    Beginner: {
      completed: beginnerCompleted,
      requiredToUnlockNext: UNLOCK_THRESHOLDS.Beginner,
      unlocked: true,
      percent: Math.min(100, Math.round((beginnerCompleted / UNLOCK_THRESHOLDS.Beginner) * 100)),
      statusText: beginnerCompleted >= UNLOCK_THRESHOLDS.Beginner ? 'Tier Mastered · Intermediate Unlocked' : `${beginnerCompleted} / ${UNLOCK_THRESHOLDS.Beginner} to unlock Intermediate`,
    },
    Intermediate: {
      completed: intermediateCompleted,
      requiredToUnlockNext: UNLOCK_THRESHOLDS.Intermediate,
      unlocked: unlockedLevels.includes('Intermediate'),
      percent: Math.min(100, Math.round((intermediateCompleted / UNLOCK_THRESHOLDS.Intermediate) * 100)),
      statusText: !unlockedLevels.includes('Intermediate')
        ? `🔒 Complete ${Math.max(0, UNLOCK_THRESHOLDS.Beginner - beginnerCompleted)} more Beginner activities to unlock`
        : intermediateCompleted >= UNLOCK_THRESHOLDS.Intermediate
        ? 'Tier Mastered · Advanced Unlocked'
        : `${intermediateCompleted} / ${UNLOCK_THRESHOLDS.Intermediate} to unlock Advanced`,
    },
    Advanced: {
      completed: advancedCompleted,
      unlocked: unlockedLevels.includes('Advanced'),
      percent: Math.min(100, Math.round((advancedCompleted / 6) * 100)),
      statusText: !unlockedLevels.includes('Advanced')
        ? `🔒 Complete ${Math.max(0, UNLOCK_THRESHOLDS.Intermediate - intermediateCompleted)} more Intermediate activities to unlock`
        : 'Mastery Tier Active',
    },
  };

  // Determine current active learning tier
  const currentTier = unlockedLevels.includes('Advanced')
    ? 'Advanced'
    : unlockedLevels.includes('Intermediate')
    ? 'Intermediate'
    : 'Beginner';

  return {
    unlockedLevels,
    currentTier,
    levels,
    totalCompleted: allCompletions.length,
    completedActivityKeys: allCompletions.map((c) => c.challengeId),
  };
}

module.exports = {
  UNLOCK_THRESHOLDS,
  canUserAccessLevel,
  recordActivityCompletion,
  getApplicationProgressionSummary,
};
