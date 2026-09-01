/**
 * Middleware factory enforcing minimum XP level requirements for advanced modules.
 * @param {number} minXP - Required minimum XP
 * @param {string} moduleName - Name of the locked module
 */
function requireMinXP(minXP, moduleName = 'This module') {
  return (req, res, next) => {
    if (req.user && req.user.role === 'student') {
      const userXP = req.user.xp || 0;
      if (userXP < minXP) {
        return res.status(403).json({
          error: `${moduleName} is locked. Requires ${minXP} XP to unlock. Practice beginner modules to level up!`,
          minXP,
          userXP,
          locked: true,
        });
      }
    }
    next();
  };
}

module.exports = { requireMinXP };
