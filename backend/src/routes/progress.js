const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const UserBadge = require('../models/UserBadge');
const Badge = require('../models/Badge');
const { BADGE_DEFS } = require('../services/progressService');

router.get('/me', requireAuth, async (req, res) => {
  const earned = await UserBadge.find({ user: req.user._id }).populate('badge');
  const earnedKeys = new Set(earned.map((e) => e.badge.key));
  const allBadges = Object.entries(BADGE_DEFS).map(([key, def]) => ({ key, ...def, unlocked: earnedKeys.has(key) }));
  res.json({
    xp: req.user.xp,
    level: req.user.level,
    streak: req.user.streak,
    badges: allBadges,
  });
});

router.get('/leaderboard', requireAuth, async (req, res) => {
  const top = await User.find({ role: 'student' }).sort({ xp: -1 }).limit(10).select('name xp level');
  res.json(top);
});

module.exports = router;
