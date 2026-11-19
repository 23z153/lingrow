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
    unlockedKingdoms: ['Grammar Castle (Basics)', 'Vocabulary Forest', 'Listening Ocean (Gentle Currents)', 'Reading Grimoires (A1-A2)', 'Conversation Village', 'Weak Words Lab', 'Ignis Mentor'],
  },
  [LEVELS.INTERMEDIATE]: {
    id: LEVELS.INTERMEDIATE,
    rank: 2,
    title: 'Flame Keeper',
    stageName: 'Ember Dragon',
    description: 'Ignite vocal power! Tackle modals, conditionals, fluent reading aloud, and real-world workplace scenarios.',
    badge: 'FLAME_KEEPER',
    unlockedKingdoms: ['All Beginner Kingdoms', 'Speaking Volcano (Read Aloud)', 'Communication Simulator (Everyday Scenarios)', 'Idioms & Phrasal Grove', 'Peer Practice Duels'],
  },
  [LEVELS.ADVANCED]: {
    id: LEVELS.ADVANCED,
    rank: 3,
    title: 'Sky Guardian',
    stageName: 'Astral Dragon',
    description: 'Command cosmic fluency! Master high-stakes diplomacy, debate combat, oratory rhetoric, and nuanced syntax.',
    badge: 'SKY_GUARDIAN',
    unlockedKingdoms: ['All Kingdoms Unlocked', 'World Stage Arena', 'Dragon Debate Arena', 'High-Stakes Crisis Simulations', 'Advanced Grimoires (C1-C2)'],
  },
};

/**
 * Module-to-Level Mapping (Granularity: Whole Module)
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
 * Granular Item-Level Rules (Subtopics, Passages, Scenarios)
 */
const CONTENT_MIN_LEVEL = {
  grammarTopics: {
    // Beginner Topics
    'present-simple': LEVELS.BEGINNER,
    'past-simple': LEVELS.BEGINNER,
    'future-simple': LEVELS.BEGINNER,
    'prepositions': LEVELS.BEGINNER,
    'articles': LEVELS.BEGINNER,
    'basic-sentence': LEVELS.BEGINNER,
    // Intermediate Topics
    'modals': LEVELS.INTERMEDIATE,
    'conditionals-1-2': LEVELS.INTERMEDIATE,
    'gerunds-infinitives': LEVELS.INTERMEDIATE,
    'present-perfect': LEVELS.INTERMEDIATE,
    'comparatives-superlatives': LEVELS.INTERMEDIATE,
    // Advanced Topics
    'passive-voice': LEVELS.ADVANCED,
    'conditionals-3-mixed': LEVELS.ADVANCED,
    'relative-clauses': LEVELS.ADVANCED,
    'subjunctive-inversion': LEVELS.ADVANCED,
    'cleft-sentences': LEVELS.ADVANCED,
  },
  readingLevels: {
    'A1': LEVELS.BEGINNER,
    'A2': LEVELS.BEGINNER,
    'B1': LEVELS.INTERMEDIATE,
    'B2': LEVELS.INTERMEDIATE,
    'C1': LEVELS.ADVANCED,
    'C2': LEVELS.ADVANCED,
  },
  listeningSpeeds: {
    'slow': LEVELS.BEGINNER,
    'normal': LEVELS.INTERMEDIATE,
    'fast': LEVELS.ADVANCED,
  },
  simulationScenarios: {
    'coffee-shop': LEVELS.INTERMEDIATE,
    'hotel-checkin': LEVELS.INTERMEDIATE,
    'interview-hr-intro': LEVELS.INTERMEDIATE,
    'team-sync': LEVELS.INTERMEDIATE,
    'investor-pitch': LEVELS.ADVANCED,
    'technical-interview': LEVELS.ADVANCED,
    'incident-escalation': LEVELS.ADVANCED,
    'hostage-negotiation': LEVELS.ADVANCED,
  },
};

/**
 * Placement Test Client-Safe Metadata
 * Confidential question bank & answer keys are isolated strictly in placementBank.js.
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
 * Promotion Criteria Configuration
 */
const PROMOTION_CONFIG = {
  [LEVELS.INTERMEDIATE]: {
    targetLevel: LEVELS.INTERMEDIATE,
    requiredTierCompletions: 7,
    completedTier: LEVELS.BEGINNER,
    minAverageScore: 70,
    trialTitle: 'Trial of the First Flame',
  },
  [LEVELS.ADVANCED]: {
    targetLevel: LEVELS.ADVANCED,
    requiredTierCompletions: 7,
    completedTier: LEVELS.INTERMEDIATE,
    minAverageScore: 75,
    trialTitle: 'Trial of the Sky Guardian',
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
  MODULE_MIN_LEVEL,
  CONTENT_MIN_LEVEL,
  PLACEMENT_CONFIG,
  PROMOTION_CONFIG,
  getRank,
  getUnlockedLevelsForLevel,
  canAccess,
};

