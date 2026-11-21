'use strict';

const {
  LEVELS,
  LEVEL_RANKS,
  MODULE_MIN_LEVEL,
  canAccess,
} = require('../config/levelAccess');

/**
 * Middleware requiring student accounts to have completed onboarding and have an active level assigned.
 * Fail-Closed (Item 15):
 * - req.user.onboardingCompleted === true
 * - req.user.level is a valid non-empty string
 * If either condition is missing or false, returns 403 ONBOARDING_REQUIRED.
 * Teachers and Admins are strictly exempt.
 */
function requireOnboarded(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Teachers and Admins are strictly exempt from learner gating
  if (req.user.role && req.user.role !== 'student') {
    return next();
  }

  const hasCompletedOnboarding = req.user.onboardingCompleted === true;
  const hasValidLevel = typeof req.user.level === 'string' && req.user.level.trim().length > 0;

  if (!hasCompletedOnboarding || !hasValidLevel) {
    return res.status(403).json({
      error: 'Onboarding required. Please complete the Dragon Egg Trial or self-select your starting level before accessing learning modules.',
      code: 'ONBOARDING_REQUIRED',
      message: 'Dragon Egg Trial onboarding must be completed before entering kingdoms.',
      onboardingCompleted: false,
      locked: true,
    });
  }

  next();
}

/**
 * Middleware factory enforcing specific learner tier access ('Beginner', 'Intermediate', 'Advanced').
 * Standardized 403 payloads:
 * - { code: "ONBOARDING_REQUIRED", message, onboardingCompleted: false }
 * - { code: "LEVEL_LOCKED", requiredLevel, currentLevel, message }
 */
function requireLevel(minLevel, moduleName = 'This content') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Teachers and Admins are not restricted by learner levels
    if (req.user.role && req.user.role !== 'student') {
      return next();
    }

    const hasCompletedOnboarding = req.user.onboardingCompleted === true;
    const hasValidLevel = typeof req.user.level === 'string' && req.user.level.trim().length > 0;

    // Fail-closed onboarding guard
    if (!hasCompletedOnboarding || !hasValidLevel) {
      return res.status(403).json({
        code: 'ONBOARDING_REQUIRED',
        message: 'Dragon Egg Trial onboarding must be completed before entering kingdoms.',
        onboardingCompleted: false,
      });
    }

    const currentLevel = req.user.level;
    const requiredLevel = minLevel || LEVELS.BEGINNER;

    if (!canAccess(req.user, requiredLevel)) {
      return res.status(403).json({
        code: 'LEVEL_LOCKED',
        requiredLevel,
        currentLevel,
        error: `${moduleName} is locked. Requires ${requiredLevel} rank to enter.`,
        message: `${moduleName} is locked. Requires ${requiredLevel} rank to enter.`,
        locked: true, // for backwards-compatibility with existing frontend checks
      });
    }

    next();
  };
}

/**
 * Middleware factory enforcing level access mapped by module key (e.g. 'read-aloud', 'world-stage').
 * Reads from centralized config/levelAccess.js.
 */
function requireModuleAccess(moduleKey) {
  const minLevel = MODULE_MIN_LEVEL[moduleKey] || LEVELS.BEGINNER;
  return requireLevel(minLevel, `${moduleKey} chamber`);
}

/**
 * Legacy XP / rank middleware kept for backwards compatibility.
 */
function requireMinXP(minXP = 0, moduleName = 'This module', minLevel = null) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'student') {
      return next();
    }

    if (req.user.onboardingCompleted === false) {
      return res.status(403).json({
        code: 'ONBOARDING_REQUIRED',
        message: 'Dragon Egg Trial onboarding must be completed before entering kingdoms.',
        onboardingCompleted: false,
      });
    }

    const userXP = req.user.xp || 0;
    const userLevel = req.user.level || LEVELS.BEGINNER;
    const reqLevelName = minLevel || (minXP >= 1500 ? LEVELS.ADVANCED : minXP >= 500 ? LEVELS.INTERMEDIATE : LEVELS.BEGINNER);

    const meetsLevel = canAccess(req.user, reqLevelName);
    const meetsXP = userXP >= minXP;

    if (!meetsLevel && !meetsXP) {
      return res.status(403).json({
        code: 'LEVEL_LOCKED',
        error: `${moduleName} is locked. Requires ${reqLevelName} rank to unlock.`,
        message: `${moduleName} is locked. Requires ${reqLevelName} rank to unlock.`,
        minXP,
        userXP,
        minLevel: reqLevelName,
        requiredLevel: reqLevelName,
        requiredXp: minXP,
        currentXp: userXP,
        currentLevel: userLevel,
        unlockedLevels: req.user.unlockedLevels || [LEVELS.BEGINNER],
        xpNeeded: Math.max(0, minXP - userXP),
        locked: true,
      });
    }

    next();
  };
}

module.exports = {
  requireOnboarded,
  requireLevel,
  requireModuleAccess,
  requireMinXP,
  canAccess,
  LEVEL_RANKS,
};
