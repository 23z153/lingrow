const User = require('../models/User');
const ChallengeProgress = require('../models/ChallengeProgress');
const Notification = require('../models/Notification');
const { awardXP } = require('./progressService');

const UNLOCK_THRESHOLDS = {
  Beginner: 4, // 4 Beginner completions unlock Intermediate
  Intermediate: 4, // 4 Intermediate completions unlock Advanced
};

/**
 * Checks if a user has unlocked a target tier.
 * Teachers, admins, and non-student roles have unrestricted access.
 */
function canUserAccessLevel(user, targetLevel) {
  if (!user) return false;
  if (user.role && user.role !== 'student') return true;
  if (!targetLevel || targetLevel === 'Beginner' || targetLevel === 'All Levels') return true;

  const unlocked = user.getUnlockedLevels ? user.getUnlockedLevels() : (user.unlockedLevels || ['Beginner']);
  return unlocked.includes(targetLevel);
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
    error.locked = true;
    error.requiredLevel = normalizedLevel;
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

  let justUnlockedLevel = null;
  let userModified = false;

  // Unlock Intermediate if criteria met
  if (beginnerCount >= UNLOCK_THRESHOLDS.Beginner && !userDoc.unlockedLevels.includes('Intermediate')) {
    userDoc.unlockedLevels.push('Intermediate');
    justUnlockedLevel = 'Intermediate';
    userModified = true;
    await Notification.create({
      user: userDoc._id,
      type: 'levelup',
      text: '🎉 Congratulations! You completed 4 Beginner activities and unlocked the Intermediate Tier across LinGrow AI!',
    }).catch(() => {});
  }

  // Unlock Advanced if criteria met
  if (intermediateCount >= UNLOCK_THRESHOLDS.Intermediate && !userDoc.unlockedLevels.includes('Advanced')) {
    userDoc.unlockedLevels.push('Advanced');
    justUnlockedLevel = 'Advanced';
    userModified = true;
    await Notification.create({
      user: userDoc._id,
      type: 'levelup',
      text: '🏆 Legendary Achievement! You completed 4 Intermediate activities and unlocked the Advanced Tier across LinGrow AI!',
    }).catch(() => {});
  }

  if (userModified) {
    await userDoc.save();
  }

  const unlockedLevels = userDoc.getUnlockedLevels();

  return {
    ok: true,
    isFirstTime,
    xpAwarded,
    totalXp: userDoc.xp || 0,
    unlockedLevels,
    justUnlockedLevel,
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
