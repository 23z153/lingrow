const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const Notification = require('../models/Notification');

const LEVEL_THRESHOLDS = [
  { level: 'Beginner', min: 0 },
  { level: 'Intermediate', min: 500 },
  { level: 'Advanced', min: 1500 },
];

function levelForXP(xp) {
  let current = 'Beginner';
  for (const t of LEVEL_THRESHOLDS) if (xp >= t.min) current = t.level;
  return current;
}

async function awardXP(user, amount) {
  user.xp += amount;
  const newLevel = levelForXP(user.xp);
  const leveledUp = newLevel !== user.level;
  user.level = newLevel;
  await user.save();
  if (leveledUp) {
    await Notification.create({ user: user._id, type: 'levelup', text: `You've reached ${newLevel} level! Keep going.` });
  }
  return { xp: user.xp, level: user.level, leveledUp };
}

const BADGE_DEFS = {
  first_read_aloud: { name: 'First Steps', description: 'Complete your first Read Aloud passage' },
  streak_7: { name: '7-Day Streak', description: 'Practice 7 days in a row' },
  debate_champion: { name: 'Debate Champion', description: 'Score 85 or higher on a debate' },
  first_debate: { name: 'First Debate', description: 'Complete your first collegiate debate speech' },
  both_sides: { name: 'Both Sides Master', description: 'Argue both FOR and AGAINST on the same topic' },
  consistent_debater: { name: 'Consistent Debater', description: 'Score 70+ on 3 consecutive debate attempts' },
  debate_streak_5: { name: '5-Day Debate Streak', description: 'Practice debate on 5 consecutive days' },
  vocab_master: { name: 'Wordsmith', description: 'Master 20 vocabulary words' },
};

async function maybeAwardBadge(user, key) {
  const def = BADGE_DEFS[key];
  if (!def) return null;
  let badge = await Badge.findOne({ key });
  if (!badge) {
    try {
      badge = await Badge.create({ key, name: def.name, description: def.description });
    } catch (e) {
      badge = await Badge.findOne({ key });
    }
  }
  if (!badge) return null;

  try {
    await UserBadge.create({ user: user._id, badge: badge._id });
    await Notification.create({ user: user._id, type: 'badge', text: `New badge unlocked: ${def.name}!` });
    return badge;
  } catch (err) {
    if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
      // Concurrently or previously awarded — return null safely
      return null;
    }
    throw err;
  }
}

module.exports = { awardXP, maybeAwardBadge, levelForXP, BADGE_DEFS };
