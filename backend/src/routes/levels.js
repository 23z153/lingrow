'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const {
  LEVELS,
  LEVEL_RANKS,
  THEMED_CARDS,
  TIER_DETAILS,
  MODULE_MIN_LEVEL,
  PLACEMENT_CONFIG,
  getUnlockedLevelsForLevel,
} = require('../config/levelAccess');

/**
 * GET /api/levels/config
 * Client-safe configuration: module-to-level mapping, ranks, tiers, and metadata.
 * MUST NEVER import placementBank or expose answer keys.
 */
router.get('/config', requireAuth, (req, res) => {
  res.json({
    levels: LEVELS,
    ranks: LEVEL_RANKS,
    tiers: TIER_DETAILS,
    themedCards: THEMED_CARDS,
    modules: MODULE_MIN_LEVEL,
    placement: {
      cooldownMs: PLACEMENT_CONFIG.cooldownMs,
      expiryMs: PLACEMENT_CONFIG.expiryMs,
      thresholds: PLACEMENT_CONFIG.thresholds,
    },
  });
});

/**
 * GET /api/levels/me
 * Returns current user's level status, source, and progression overview.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      level: user.level,
      source: user.levelSource,
      onboardingCompleted: user.onboardingCompleted,
      legacyLevel: user.legacyLevel,
      placementScore: user.placementScore,
      placementSpeechScore: user.placementSpeechScore,
      levelAssignedAt: user.levelAssignedAt,
      unlockedLevels: user.getUnlockedLevels(),
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/levels/:userId
 * Teacher and Admin manual level assignment override.
 * - Teachers may only override students in their assigned classes/sections.
 * - Admins may override any student.
 * - Reason is strictly required. Audit log is append-only.
 */
router.patch('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const newLevel = req.body.level || req.body.newLevel;
    const { reason } = req.body;

    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only teachers and administrators can override student levels' });
    }

    if (!newLevel || ![LEVELS.BEGINNER, LEVELS.INTERMEDIATE, LEVELS.ADVANCED].includes(newLevel)) {
      return res.status(400).json({ error: `level must be one of: ${LEVELS.BEGINNER}, ${LEVELS.INTERMEDIATE}, ${LEVELS.ADVANCED}` });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'A valid reason is required for level override' });
    }

    const student = await User.findById(userId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ error: 'Level override can only be applied to student accounts' });
    }

    // Teacher class-scoping enforcement
    if (req.user.role === 'teacher') {
      const assigned = req.user.assignedClasses || [];
      const studentClass = student.section || student.batch || '';
      const hasAccess = assigned.length > 0 && Boolean(studentClass) && assigned.some((cls) => cls && (cls === studentClass || cls === student.section || cls === student.batch));
      if (!hasAccess) {
        return res.status(403).json({
          error: 'You can only override levels for students in your assigned classes',
          assignedClasses: assigned,
          studentClass,
        });
      }
    }

    const previousLevel = student.level || null;
    const now = new Date();

    // Append-only audit log entry
    student.levelAuditLog.push({
      changedBy: req.user._id,
      previousLevel,
      newLevel,
      source: req.user.role,
      reason: reason.trim(),
      changedAt: now,
      date: now,
    });

    student.level = newLevel;
    student.levelSource = req.user.role === 'admin' ? 'admin' : 'teacher';
    student.levelAssignedAt = now;

    await student.save();

    res.json({
      ok: true,
      message: `Student level successfully updated to ${newLevel}`,
      student: student.toSafeJSON(),
      auditLog: student.levelAuditLog,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

