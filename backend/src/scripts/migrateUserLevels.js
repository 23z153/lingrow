'use strict';

/**
 * Migration Script: 3-Tier Learner Level System Initialization
 *
 * Requirements:
 * - Dry run by default. Pass --apply to write changes.
 * - Idempotent: safe to execute repeatedly without duplicating state or overwriting already-migrated accounts.
 * - For existing students:
 *     legacyLevel = current level
 *     level = null
 *     onboardingCompleted = false
 * - Teachers and Admins are exempt.
 * - XP, streaks, challenges, and user progress are completely untouched.
 * - Prints summary counts: scanned, toMigrate, alreadyMigrated, exempt.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function migrateUserLevels({ apply = false, confirmBackup = false, silent = false } = {}) {
  const isApply = apply || process.argv.includes('--apply');
  const isConfirmed = confirmBackup || process.argv.includes('--confirm-backup');

  if (isApply && !isConfirmed) {
    throw new Error('Safety check failed: Refusing to run --apply without --confirm-backup flag.');
  }

  const stats = {
    scanned: 0,
    toMigrate: 0,
    alreadyMigrated: 0,
    exempt: 0,
  };

  const users = await User.find({}).sort({ createdAt: 1 });
  stats.scanned = users.length;

  const updates = [];

  for (const user of users) {
    if (user.role !== 'student') {
      stats.exempt++;
      continue;
    }

    // Check if already migrated:
    // A student is considered migrated if legacyLevel is already populated OR (level === null and onboardingCompleted === false)
    const alreadyMigrated = Boolean(user.legacyLevel) || (user.level === null && user.onboardingCompleted === false);

    if (alreadyMigrated) {
      stats.alreadyMigrated++;
      continue;
    }

    // Candidate for migration
    stats.toMigrate++;

    const currentLevel = user.level || 'Beginner';
    updates.push({
      id: user._id,
      name: user.name,
      email: user.email,
      currentLevel,
      newLevel: null,
      legacyLevel: currentLevel,
      onboardingCompleted: false,
    });
  }

  if (isApply && updates.length > 0) {
    for (const update of updates) {
      await User.updateOne(
        { _id: update.id },
        {
          $set: {
            legacyLevel: update.legacyLevel,
            level: null,
            onboardingCompleted: false,
          },
        }
      );
    }
  }

  const result = {
    mode: isApply ? 'APPLY (Committed)' : 'DRY RUN (No writes performed)',
    stats,
    sampleUpdates: updates.slice(0, 5).map((u) => ({
      email: u.email,
      from: { level: u.currentLevel, legacyLevel: null, onboardingCompleted: true },
      to: { level: null, legacyLevel: u.legacyLevel, onboardingCompleted: false },
    })),
  };

  if (!silent) {
    console.log('====================================================');
    console.log(` LinGrow AI - Learner Level Migration [${result.mode}]`);
    console.log('====================================================');
    console.log(` Total Users Scanned    : ${stats.scanned}`);
    console.log(` Students to Migrate    : ${stats.toMigrate}`);
    console.log(` Already Migrated       : ${stats.alreadyMigrated}`);
    console.log(` Exempt (Teacher/Admin) : ${stats.exempt}`);
    console.log('----------------------------------------------------');
    if (!isApply) {
      console.log(' NOTE: This was a DRY RUN. Pass --apply to execute.');
    } else {
      console.log(` Successfully migrated ${updates.length} student records.`);
    }
    console.log('====================================================');
  }

  return result;
}

if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lingrow_ai';
  mongoose
    .connect(mongoUri)
    .then(async () => {
      await migrateUserLevels();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration connection error:', err);
      process.exit(1);
    });
}

module.exports = { migrateUserLevels };

