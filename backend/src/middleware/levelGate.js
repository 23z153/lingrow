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

      let requiredRank = 1;
      if (minLevel) {
        requiredRank = LEVEL_RANKS[minLevel] || 1;
      } else if (minXP >= 500) {
        requiredRank = 3; // Advanced
      } else if (minXP >= 100) {
        requiredRank = 2; // Intermediate
      }

      const meetsLevel = userRank >= requiredRank;
      const meetsXP = userXP >= minXP;

      if (!meetsLevel && !meetsXP) {
        return res.status(403).json({
          error: `${moduleName} is locked. Requires ${minLevel || (requiredRank === 3 ? 'Advanced' : 'Intermediate')} level (${minXP} XP) to unlock.`,
          minXP,
          userXP,
          minLevel,
          locked: true,
        });
      }
    }
    next();
  };
}

module.exports = { requireMinXP, LEVEL_RANKS };

