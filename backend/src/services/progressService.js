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

let indexesReady = false;
async function ensureUserBadgeIndex() {
  if (!indexesReady) {
    try {
      await UserBadge.init();
      indexesReady = true;
    } catch (e) {}
  }
}

async function awardXP(user, amount) {
  const User = require('../models/User');
  const cleanAmount = Number(amount) || 0;
  const updated = await User.findByIdAndUpdate(
    user._id,
    { $inc: { xp: cleanAmount } },
    { new: true }
  );
  if (!updated) return { xp: user.xp, level: user.level, leveledUp: false };
  user.xp = updated.xp;
  return { xp: user.xp, level: user.level, leveledUp: false };
}

const BADGE_DEFS = {
  first_read_aloud: { name: 'First Steps', description: 'Complete your first Read Aloud passage' },
  streak_7: { name: '7-Day Streak', description: 'Practice 7 days in a row' },
  debate_champion: { name: 'Debate Champion', description: 'Score 85 or higher on a debate' },
  first_debate: { name: 'First Debate', description: 'Complete your first collegiate debate speech' },
  both_sides: { name: 'Both Sides Master', description: 'Argue both FOR and AGAINST on the same topic' },
  consistent_debater: { name: 'Consistent Debater', description: 'Score 70+ on 3 consecutive debate attempts' },
  debate_streak_5: { name: '5-Day Debate Streak', description: 'Practice debate on 5 consecutive days' },
  rebuttal_ready: { name: 'Rebuttal Ready', description: 'Score 70+ on 3 rebuttal rounds' },
  vocab_master: { name: 'Wordsmith', description: 'Master 20 vocabulary words' },
  word_smith: { name: 'Word Smith', description: 'Master 10 weak words in Weak Words Lab' },
  first_flight: { name: 'First Flight', description: 'Take your first steps as an aspiring Dragon Rider' },
  grammar_guardian: { name: 'Grammar Guardian', description: 'Conquer challenges in Grammar Castle' },
  vocabulary_master: { name: 'Vocabulary Master', description: 'Master new words in Vocabulary Forest' },
  speaking_warrior: { name: 'Speaking Warrior', description: 'Demonstrate bravery in Speaking Volcano' },
  seven_day_flame: { name: 'Seven-Day Flame', description: 'Keep your dragon flame burning with a 7-day streak' },
  legendary_dragon_rider: { name: 'Legendary Dragon Rider', description: 'Awaken your dragon to Ancient or Legendary status' },
};

const DRAGON_EVOLUTIONS = [
  { stage: 1, name: 'Dragon Egg', minXp: 0, nextXp: 250, title: 'Novice Hatchling', description: 'A mystical dragon egg pulsing with ancient linguistic runes.' },
  { stage: 2, name: 'Baby Dragon', minXp: 250, nextXp: 500, title: 'Curious Fledgling', description: 'A spirited companion learning its very first English words.' },
  { stage: 3, name: 'Young Dragon', minXp: 500, nextXp: 1000, title: 'Brave Apprentice', description: 'Sprouting shimmering wings and speaking with newfound confidence.' },
  { stage: 4, name: 'Fire Dragon', minXp: 1000, nextXp: 1500, title: 'Flame Keeper', description: 'Breathing fluent speech and mastering complex English grammar.' },
  { stage: 5, name: 'Ancient Dragon', minXp: 1500, nextXp: 2500, title: 'Sky Guardian', description: 'A venerable sage of expression, debate, and rhetoric.' },
  { stage: 6, name: 'Legendary Dragon', minXp: 2500, nextXp: 5000, title: 'Grand Drake Archon', description: 'The pinnacle of mastery, commanding the English realm with eloquence.' },
];

function getDragonEvolution(xp = 0) {
  let current = DRAGON_EVOLUTIONS[0];
  for (const evo of DRAGON_EVOLUTIONS) {
    if (xp >= evo.minXp) current = evo;
  }
  const nextEvo = DRAGON_EVOLUTIONS.find(e => e.stage === current.stage + 1) || null;
  const stageMin = current.minXp;
  const stageTarget = nextEvo ? nextEvo.minXp : current.nextXp;
  const stageRange = Math.max(1, stageTarget - stageMin);
  const stageProgress = Math.min(100, Math.round(((xp - stageMin) / stageRange) * 100));

  return {
    stage: current.stage,
    name: current.name,
    title: current.title,
    description: current.description,
    currentXp: xp,
    minXp: current.minXp,
    nextXp: current.nextXp,
    xpToNext: nextEvo ? Math.max(0, nextEvo.minXp - xp) : 0,
    nextStageName: nextEvo ? nextEvo.name : 'Max Evolution',
    percentToNext: stageProgress,
  };
}

async function maybeAwardBadge(user, key, bonusXp = 0) {
  const def = BADGE_DEFS[key];
  if (!def) return null;
  await ensureUserBadgeIndex();
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
    if (bonusXp > 0) {
      await awardXP(user, bonusXp);
    }
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

module.exports = { awardXP, maybeAwardBadge, levelForXP, BADGE_DEFS, getDragonEvolution, DRAGON_EVOLUTIONS };
