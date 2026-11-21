'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PlacementAttempt = require('../models/PlacementAttempt');
const { requireAuth } = require('../middleware/auth');
const { LEVELS, PLACEMENT_CONFIG } = require('../config/levelAccess');
const {
  generatePlacementSession,
  scorePlacementTest,
  PLACEMENT_QUESTIONS,
  READ_ALOUD_SENTENCE,
} = require('../config/placementBank');

/**
 * POST /api/onboarding/placement/start
 * Starts or resumes a placement test attempt for a student.
 * Enforces a 24-hour cooldown between submitted attempts.
 * Returns shuffled options with no correct keys.
 */
router.post('/placement/start', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Placement trials are for student accounts only' });
    }

    const now = Date.now();
    const cooldownMs = PLACEMENT_CONFIG.cooldownMs || 24 * 60 * 60 * 1000;

    // 1. Check cooldown from the last submitted attempt
    const lastSubmitted = await PlacementAttempt.findOne({
      userId: req.user._id,
      submittedAt: { $ne: null },
    }).sort({ submittedAt: -1 });

    if (lastSubmitted && lastSubmitted.submittedAt) {
      const elapsed = now - lastSubmitted.submittedAt.getTime();
      if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        const nextAvailableAt = new Date(lastSubmitted.submittedAt.getTime() + cooldownMs);
        return res.status(429).json({
          error: 'Placement trial cooldown active. You can attempt again later.',
          cooldownRemainingMs: remainingMs,
          nextAvailableAt,
        });
      }
    }

    // 2. Clean up any stale activeKey on submitted, consumed, or expired attempts for this user
    await PlacementAttempt.updateMany(
      {
        userId: req.user._id,
        activeKey: { $ne: null },
        $or: [
          { submittedAt: { $ne: null } },
          { consumedAt: { $ne: null } },
          { expiresAt: { $lte: new Date(now) } },
        ],
      },
      { $set: { activeKey: null } }
    );

    // 3. Check for active unexpired, unsubmitted attempt to resume
    const activeAttempt = await PlacementAttempt.findOne({
      userId: req.user._id,
      submittedAt: null,
      expiresAt: { $gt: new Date(now) },
    }).sort({ createdAt: -1 });

    if (activeAttempt) {
      // Reconstruct shuffled questions using the attempt's saved permutations
      const questions = PLACEMENT_QUESTIONS.map((q) => {
        const perm = activeAttempt.permutations && activeAttempt.permutations[q.id];
        const options = Array.isArray(perm) ? perm.map((idx) => q.options[idx]) : [...q.options];
        return {
          id: q.id,
          section: q.section,
          prompt: q.prompt,
          options,
        };
      });

      return res.json({
        attemptId: activeAttempt._id,
        resumed: true,
        issuedAt: activeAttempt.issuedAt,
        expiresAt: activeAttempt.expiresAt,
        questions,
        readAloudSentence: {
          id: READ_ALOUD_SENTENCE.id,
          sentence: READ_ALOUD_SENTENCE.sentence,
        },
      });
    }

    // 4. Rate-limit: at most 2 new attempts per 24 hours counting expired unsubmitted ones
    const twentyFourHoursAgo = new Date(now - cooldownMs);
    const attemptsLast24h = await PlacementAttempt.countDocuments({
      userId: req.user._id,
      createdAt: { $gte: twentyFourHoursAgo },
    });
    if (attemptsLast24h >= 2) {
      return res.status(429).json({
        error: 'Placement trial attempt limit reached (maximum 2 attempts per 24 hours, including expired attempts).',
        code: 'PLACEMENT_ATTEMPTS_RATE_LIMIT_EXCEEDED',
        attemptsLast24h,
        maxAttemptsPer24h: 2,
      });
    }

    // 5. Issue new Placement Attempt atomically (concurrency-safe via activeKey unique index)
    const session = generatePlacementSession();
    const expiryMs = PLACEMENT_CONFIG.expiryMs || 30 * 60 * 1000;

    let newAttempt;
    try {
      newAttempt = await PlacementAttempt.create({
        userId: req.user._id,
        activeKey: req.user._id.toString(),
        questionIds: session.questions.map((q) => q.id),
        permutations: session.permutations,
        issuedAt: new Date(now),
        expiresAt: new Date(now + expiryMs),
        submittedAt: null,
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Parallel call created an active attempt concurrently; retrieve and return it
        const existing = await PlacementAttempt.findOne({
          userId: req.user._id,
          submittedAt: null,
          expiresAt: { $gt: new Date(now) },
        });
        if (existing) {
          const questions = PLACEMENT_QUESTIONS.map((q) => {
            const perm = existing.permutations && existing.permutations[q.id];
            const options = Array.isArray(perm) ? perm.map((idx) => q.options[idx]) : [...q.options];
            return {
              id: q.id,
              section: q.section,
              prompt: q.prompt,
              options,
            };
          });
          return res.status(200).json({
            attemptId: existing._id,
            resumed: true,
            issuedAt: existing.issuedAt,
            expiresAt: existing.expiresAt,
            questions,
            readAloudSentence: {
              id: READ_ALOUD_SENTENCE.id,
              sentence: READ_ALOUD_SENTENCE.sentence,
            },
          });
        }
      }
      throw createErr;
    }

    res.status(201).json({
      attemptId: newAttempt._id,
      resumed: false,
      issuedAt: newAttempt.issuedAt,
      expiresAt: newAttempt.expiresAt,
      questions: session.questions,
      readAloudSentence: session.readAloudSentence,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/onboarding/placement/submit
 * Submits answers for an issued, unexpired attempt.
 * Evaluates written score server-side and scores speech via deterministic word-diff.
 */
router.post('/placement/submit', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Placement trials are for student accounts only' });
    }

    const { attemptId, answers, speechTranscript, speechSeconds } = req.body;
    if (!attemptId) {
      return res.status(400).json({ error: 'attemptId is required' });
    }

    const attempt = await PlacementAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ error: 'Placement attempt not found' });
    }

    if (attempt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: You cannot submit another student\'s attempt' });
    }

    if (attempt.submittedAt !== null) {
      return res.status(400).json({ error: 'This placement attempt has already been submitted' });
    }

    if (attempt.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'This placement attempt has expired' });
    }

    const result = await scorePlacementTest({
      answers: Array.isArray(answers) ? answers : [],
      speechTranscript,
      speechSeconds,
      permutations: attempt.permutations,
    });

    const now = new Date();
    // Atomic submission using precondition filter (submittedAt: null)
    const updatedAttempt = await PlacementAttempt.findOneAndUpdate(
      {
        _id: attemptId,
        userId: req.user._id,
        submittedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          submittedAt: now,
          activeKey: null,
          writtenScore: result.writtenScore,
          advancedCorrect: result.advancedCorrect,
          placementSpeechScore: result.placementSpeechScore,
          recommendedLevel: result.recommendedLevel,
        },
      },
      { new: true }
    );

    if (!updatedAttempt) {
      const check = await PlacementAttempt.findById(attemptId);
      if (!check) return res.status(404).json({ error: 'Placement attempt not found' });
      if (check.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: You cannot submit another student\'s attempt' });
      }
      if (check.submittedAt !== null) {
        return res.status(400).json({ error: 'This placement attempt has already been submitted' });
      }
      if (check.expiresAt.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'This placement attempt has expired' });
      }
      return res.status(400).json({ error: 'Unable to submit placement attempt' });
    }

    res.json({
      attemptId: updatedAttempt._id,
      score: updatedAttempt.writtenScore,
      writtenScore: updatedAttempt.writtenScore,
      advancedCorrect: updatedAttempt.advancedCorrect,
      placementSpeechScore: updatedAttempt.placementSpeechScore,
      recommendedLevel: updatedAttempt.recommendedLevel,
      submittedAt: updatedAttempt.submittedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/onboarding/select-level
 * Finalizes student level selection.
 * Only allowed when onboardingCompleted is false; otherwise returns 409 Conflict.
 * - Placement path: requires submitted unconsumed attempt; student may choose recommendedLevel or 1 below, never higher.
 * - Self path: student may select Beginner or Intermediate only; Advanced is rejected.
 */
router.post('/select-level', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Level onboarding is for student accounts only' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.onboardingCompleted) {
      return res.status(409).json({
        error: 'Onboarding has already been completed for this account',
        code: 'ONBOARDING_ALREADY_COMPLETED',
        level: user.level,
      });
    }

    const { path, level, attemptId } = req.body;
    if (!path || !['placement', 'self'].includes(path)) {
      return res.status(400).json({ error: 'path must be either "placement" or "self"' });
    }

    if (!level || ![LEVELS.BEGINNER, LEVELS.INTERMEDIATE, LEVELS.ADVANCED].includes(level)) {
      return res.status(400).json({ error: `level must be one of: ${LEVELS.BEGINNER}, ${LEVELS.INTERMEDIATE}, ${LEVELS.ADVANCED}` });
    }

    const now = new Date();

    if (path === 'self') {
      // Deliberate constraint: Advanced cannot be self-selected; placement trial or teacher override required
      if (level === LEVELS.ADVANCED) {
        return res.status(400).json({
          error: 'Advanced rank cannot be self-selected. You must earn it via the Dragon Egg Trial placement test or receive a teacher override.',
          code: 'ADVANCED_SELF_SELECT_PROHIBITED',
        });
      }

      // Atomic update with precondition filter (onboardingCompleted: false)
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: req.user._id,
          onboardingCompleted: false,
        },
        {
          $set: {
            level,
            levelSource: 'self',
            levelAssignedAt: now,
            onboardingCompleted: true,
          },
          $push: {
            levelAuditLog: {
              changedBy: req.user._id,
              previousLevel: user.legacyLevel || null,
              newLevel: level,
              source: 'self',
              reason: 'Student self-selection during onboarding',
              changedAt: now,
            },
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(409).json({
          error: 'Onboarding has already been completed for this account',
          code: 'ONBOARDING_ALREADY_COMPLETED',
          level: user.level,
        });
      }

      return res.json({ ok: true, user: updatedUser.toSafeJSON() });
    }

    if (path === 'placement') {
      if (!attemptId) {
        return res.status(400).json({ error: 'attemptId is required for placement level confirmation' });
      }

      const attempt = await PlacementAttempt.findById(attemptId);
      if (!attempt) {
        return res.status(404).json({ error: 'Placement attempt not found' });
      }

      if (attempt.userId.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: You cannot confirm using another student\'s attempt' });
      }

      if (!attempt.submittedAt) {
        return res.status(400).json({ error: 'Placement attempt has not been submitted yet' });
      }

      if (attempt.consumedAt !== null) {
        return res.status(400).json({ error: 'This placement attempt has already been consumed' });
      }

      // Cap Rule (Amendment 5):
      // Allowed = recommendedLevel or one level below, never higher
      const allowedLevels = [];
      if (attempt.recommendedLevel === LEVELS.ADVANCED) {
        allowedLevels.push(LEVELS.ADVANCED, LEVELS.INTERMEDIATE);
      } else if (attempt.recommendedLevel === LEVELS.INTERMEDIATE) {
        allowedLevels.push(LEVELS.INTERMEDIATE, LEVELS.BEGINNER);
      } else {
        allowedLevels.push(LEVELS.BEGINNER);
      }

      if (!allowedLevels.includes(level)) {
        return res.status(400).json({
          error: `Invalid level selection. Based on your recommendation (${attempt.recommendedLevel}), you may choose ${allowedLevels.join(' or ')}. You cannot select a higher rank.`,
          code: 'LEVEL_CAP_EXCEEDED',
          recommendedLevel: attempt.recommendedLevel,
          allowedLevels,
        });
      }

      // Step 1: Update the user FIRST with precondition filter (onboardingCompleted: false)
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          onboardingCompleted: false,
        },
        {
          $set: {
            level,
            levelSource: 'placement',
            placementScore: attempt.writtenScore,
            placementSpeechScore: attempt.placementSpeechScore,
            levelAssignedAt: now,
            onboardingCompleted: true,
          },
          $push: {
            levelAuditLog: {
              changedBy: user._id,
              previousLevel: user.legacyLevel || null,
              newLevel: level,
              source: 'placement',
              reason: `Dragon Egg Trial placement confirmed (recommended: ${attempt.recommendedLevel}, selected: ${level})`,
              changedAt: now,
            },
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(409).json({
          error: 'Onboarding has already been completed for this account',
          code: 'ONBOARDING_ALREADY_COMPLETED',
          level: user.level,
        });
      }

      // Step 2: Mark the attempt consumed (if this fails, user is already onboarded and nothing is stranded)
      try {
        await PlacementAttempt.findOneAndUpdate(
          {
            _id: attemptId,
            consumedAt: null,
          },
          {
            $set: { consumedAt: now, activeKey: null },
          }
        );
      } catch (consumeErr) {
        console.error(`[onboarding] Warning: Failed to mark attempt ${attemptId} consumed after user onboarding:`, consumeErr);
      }

      return res.json({ ok: true, user: updatedUser.toSafeJSON() });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

