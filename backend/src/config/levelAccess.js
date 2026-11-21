'use strict';

/**
 * Single source of truth for LinGrow AI 3-Tier Learner Level System.
 * Cumulative Progression:
 * - BEGINNER: Beginner modules only.
 * - INTERMEDIATE: Beginner + Intermediate modules.
 * - ADVANCED: Beginner + Intermediate + Advanced (all modules).
 * - Teachers & Admins bypass learner level restrictions.
 */

const LEVELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const LEVEL_ORDER = [LEVELS.BEGINNER, LEVELS.INTERMEDIATE, LEVELS.ADVANCED];

const LEVEL_RANKS = {
  [LEVELS.BEGINNER]: 1,
  [LEVELS.INTERMEDIATE]: 2,
  [LEVELS.ADVANCED]: 3,
};

const THEMED_CARDS = {
  [LEVELS.BEGINNER]: {
    id: LEVELS.BEGINNER,
    rank: 1,
    title: 'Hatchling',
    stageName: 'Awakening Dragon',
    description: 'Begin your journey! Master fundamental tenses, everyday vocabulary, and conversational foundations.',
    badge: 'HATCHLING',
    unlockedKingdoms: [
      'Grammar Castle',
      'Vocabulary Forest',
      'Listening Ocean',
      'Reading Grimoires',
      'Conversation Village',
      'Weak Words Lab',
      'Ignis: Dragon Mentor',
    ],
  },
  [LEVELS.INTERMEDIATE]: {
    id: LEVELS.INTERMEDIATE,
    rank: 2,
    title: 'Flame Keeper',
    stageName: 'Ember Dragon',
    description: 'Ignite vocal power! Tackle modals, conditionals, fluent reading aloud, and real-world workplace scenarios.',
    badge: 'FLAME_KEEPER',
    unlockedKingdoms: [
      'All Beginner Kingdoms',
      'Speaking Volcano (Read Aloud)',
      "Scriptor's Workshop",
      'Idioms & Phrasal Grove',
      'Peer Practice Duels',
    ],
  },
  [LEVELS.ADVANCED]: {
    id: LEVELS.ADVANCED,
    rank: 3,
    title: 'Sky Guardian',
    stageName: 'Astral Dragon',
    description: 'Command cosmic fluency! Master high-stakes diplomacy, debate combat, oratory rhetoric, and nuanced syntax.',
    badge: 'SKY_GUARDIAN',
    unlockedKingdoms: [
      'All Kingdoms Unlocked',
      'World Stage',
      'Dragon Debate Arena',
    ],
  },
};

/**
 * Tier Details (Aligned strictly with approved spec & NAV.student in frontend/js/app.js)
 * Cleaned: no invented kingdom/tier names, no iconKey, no listening speeds, no grammarTopicTiers.
 * promotionCriteria: null (learner level is assigned during onboarding / placement or teacher override).
 */
const TIER_DETAILS = {
  [LEVELS.BEGINNER]: {
    rank: 1,
    displayName: 'Hatchling',
    badge: 'HATCHLING',
    modules: [
      { id: 'grammar', name: 'Grammar Castle' },
      { id: 'vocabulary', name: 'Vocabulary Forest' },
      { id: 'listening', name: 'Listening Ocean' },
      { id: 'story', name: 'Reading Grimoires' },
      { id: 'situational', name: 'Conversation Village' },
      { id: 'weakwords', name: 'Weak Words Lab' },
      { id: 'tutor', name: 'Ignis: Dragon Mentor' },
    ],
    promotionCriteria: null,
  },
  [LEVELS.INTERMEDIATE]: {
    rank: 2,
    displayName: 'Flame Keeper',
    badge: 'FLAME_KEEPER',
    modules: [
      { id: 'read-aloud', name: 'Speaking Volcano (Read Aloud)' },
      { id: 'practice', name: 'Speaking Volcano' },
      { id: 'simulator', name: "Scriptor's Workshop" },
      { id: 'idioms', name: 'Idioms & Phrasal Grove' },
      { id: 'peer', name: 'Peer Practice Duels' },
    ],
    promotionCriteria: null,
  },
  [LEVELS.ADVANCED]: {
    rank: 3,
    displayName: 'Sky Guardian',
    badge: 'SKY_GUARDIAN',
    modules: [
      { id: 'world-stage', name: 'World Stage' },
      { id: 'debate', name: 'Dragon Debate Arena' },
    ],
    promotionCriteria: null,
  },
};

/**
 * Module-to-Level Mapping (Granularity: Whole Module)
 * Single source of truth.
 */
const MODULE_MIN_LEVEL = {
  // Beginner Modules
  'grammar': LEVELS.BEGINNER,
  'vocabulary': LEVELS.BEGINNER,
  'listening': LEVELS.BEGINNER,
  'story': LEVELS.BEGINNER,
  'situational': LEVELS.BEGINNER,
  'weakwords': LEVELS.BEGINNER,
  'tutor': LEVELS.BEGINNER,

  // Intermediate Modules
  'read-aloud': LEVELS.INTERMEDIATE,
  'practice': LEVELS.INTERMEDIATE,
  'simulator': LEVELS.INTERMEDIATE,
  'idioms': LEVELS.INTERMEDIATE,
  'peer': LEVELS.INTERMEDIATE,

  // Advanced Modules
  'world-stage': LEVELS.ADVANCED,
  'debate': LEVELS.ADVANCED,
};

/**
 * Placement Test Client-Safe Metadata
 * Question bank & answer keys isolated strictly in placementBank.js.
 */
const PLACEMENT_CONFIG = {
  cooldownMs: 24 * 60 * 60 * 1000, // 24 hours between placement attempts
  expiryMs: 30 * 60 * 1000,        // 30 minutes to complete an issued attempt
  thresholds: {
    [LEVELS.BEGINNER]: { min: 0, max: 40 },
    [LEVELS.INTERMEDIATE]: { min: 41, max: 75 },
    [LEVELS.ADVANCED]: { min: 76, max: 100 },
  },
};

/**
 * Helper: numeric rank of level
 */
function getRank(level) {
  if (!level) return 0;
  const normalized = String(level).trim();
  const titleCased = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  return LEVEL_RANKS[titleCased] || 0;
}

/**
 * Helper: returns cumulative unlocked levels array for given level
 */
function getUnlockedLevelsForLevel(level) {
  const rank = getRank(level);
  if (rank >= 3) return [LEVELS.BEGINNER, LEVELS.INTERMEDIATE, LEVELS.ADVANCED];
  if (rank === 2) return [LEVELS.BEGINNER, LEVELS.INTERMEDIATE];
  return [LEVELS.BEGINNER];
}

/**
 * Core Access Control Helper:
 * Evaluates whether a user can access content/modules requiring `minLevel`.
 * Teachers & Admins bypass all gates.
 */
function canAccess(user, minLevel) {
  if (!user) return false;
  // Teachers and Admins bypass all learner level restrictions
  if (user.role && user.role !== 'student') return true;

  // If no level is required, or it's accessible to All Levels
  if (!minLevel || minLevel === 'All Levels') return true;

  // Student must have an assigned level to access level-gated content (reads level ONLY)
  if (!user.level) return false;

  const userRank = getRank(user.level);
  const requiredRank = getRank(minLevel);

  return userRank >= requiredRank;
}

module.exports = {
  LEVELS,
  LEVEL_ORDER,
  LEVEL_RANKS,
  THEMED_CARDS,
  TIER_DETAILS,
  MODULE_MIN_LEVEL,
  PLACEMENT_CONFIG,
  getRank,
  getUnlockedLevelsForLevel,
  canAccess,
};
