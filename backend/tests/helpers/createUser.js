'use strict';

const User = require('../../src/models/User');
const { signAccessToken } = require('../../src/utils/tokens');
const { LEVELS, getUnlockedLevelsForLevel } = require('../../src/config/levelAccess');

/**
 * Creates a test user in the database with explicit level, role, and onboarding status.
 * Automatically issues a valid signed access token.
 *
 * @param {Object} [options]
 * @param {string} [options.role='student'] - 'student' | 'teacher' | 'admin'
 * @param {string} [options.level='Beginner'] - 'Beginner' | 'Intermediate' | 'Advanced'
 * @param {boolean} [options.onboardingCompleted=true] - Defaults to true for active testing
 * @param {string} [options.name]
 * @param {string} [options.email]
 * @param {string} [options.password='password123']
 * @param {number} [options.xp=0]
 * @param {Array<string>} [options.unlockedLevels]
 * @returns {Promise<{ user: Object, token: string, authHeader: { Authorization: string }, rawPassword: string }>}
 */
async function createTestUser(options = {}) {
  const role = options.role || 'student';
  const level = options.level !== undefined ? options.level : LEVELS.BEGINNER;
  const onboardingCompleted = options.onboardingCompleted !== undefined ? options.onboardingCompleted : true;
  const name = options.name || `Test ${role} ${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = options.email || `test.${Date.now()}.${Math.random().toString(36).slice(2, 9)}@example.com`;
  const password = options.password || 'password123';
  const xp = options.xp || 0;
  const unlockedLevels = options.unlockedLevels || getUnlockedLevelsForLevel(level);

  const user = new User({
    name,
    email,
    role,
    level,
    onboardingCompleted,
    unlockedLevels,
    xp,
    department: options.department !== undefined ? options.department : 'Computer Science',
    batch: options.batch !== undefined ? options.batch : '2024-2028',
    section: options.section !== undefined ? options.section : 'A',
    assignedClasses: options.assignedClasses || [],
    legacyLevel: options.legacyLevel || null,
    levelSource: options.levelSource || null,
    placementScore: options.placementScore ?? null,
    placementSpeechScore: options.placementSpeechScore ?? null,
    levelAssignedAt: options.levelAssignedAt || null,
    status: options.status || 'Active',
    emailVerified: options.emailVerified !== undefined ? options.emailVerified : true,
    createdByAdmin: options.createdByAdmin !== undefined ? options.createdByAdmin : true,
  });

  await user.setPassword(password);
  await user.save();

  const token = signAccessToken(user);

  return {
    user,
    token,
    authHeader: { Authorization: `Bearer ${token}` },
    rawPassword: password,
  };
}

module.exports = {
  createTestUser,
  createUser: createTestUser,
};
