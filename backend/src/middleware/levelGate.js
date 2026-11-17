const LEVEL_RANKS = { Beginner: 1, Intermediate: 2, Advanced: 3 };

/**
 * Middleware factory enforcing level and minimum XP requirements for advanced modules.
 * @param {number} minXP - Required minimum XP
 * @param {string} moduleName - Name of the locked module
 * @param {string} minLevel - Optional minimum level ('Beginner', 'Intermediate', 'Advanced')
 */
function requireMinXP(minXP, moduleName = 'This module', minLevel = null) {
  return (req, res, next) => {
    if (req.user && req.user.role === 'student') {
      const userXP = req.user.xp || 0;
      const userLevel = req.user.level || 'Beginner';
      const userRank = LEVEL_RANKS[userLevel] || 1;
      const unlockedLevels = req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : (req.user.unlockedLevels || ['Beginner']);

      let requiredRank = 1;
      if (minLevel) {
        requiredRank = LEVEL_RANKS[minLevel] || 1;
      } else if (minXP >= 500) {
        requiredRank = 2; // Intermediate
      } else if (minXP >= 1500) {
        requiredRank = 3; // Advanced
      }

      const reqLevelName = minLevel || (requiredRank === 3 ? 'Advanced' : requiredRank === 2 ? 'Intermediate' : 'Beginner');
      const hasTierUnlocked = unlockedLevels.includes(reqLevelName);
      const meetsLevel = userRank >= requiredRank || hasTierUnlocked;
      const meetsXP = userXP >= minXP;

      if (!meetsLevel && !meetsXP) {
        const reqLevel = reqLevelName;
        return res.status(403).json({
          error: `${moduleName} is locked. Requires ${reqLevel} level to unlock.`,
          minXP,
          userXP,
          minLevel,
          requiredLevel: reqLevel,
          requiredXp: minXP,
          currentXp: userXP,
          currentLevel: userLevel,
          unlockedLevels,
          xpNeeded: Math.max(0, minXP - userXP),
          locked: true,
        });
      }
    }
    next();
  };
}

/**
 * Middleware factory enforcing specific tier unlocking ('Beginner', 'Intermediate', 'Advanced').
 */
function requireLevel(minLevel, moduleName = 'This content') {
  return (req, res, next) => {
    if (req.user && req.user.role === 'student') {
      const unlocked = req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : (req.user.unlockedLevels || ['Beginner']);
      if (!unlocked.includes(minLevel)) {
        return res.status(403).json({
          error: `${moduleName} is locked. Requires unlocking the ${minLevel} tier first.`,
          locked: true,
          requiredLevel: minLevel,
          unlockedLevels: unlocked,
        });
      }
    }
    next();
  };
}

module.exports = { requireMinXP, requireLevel, LEVEL_RANKS };

