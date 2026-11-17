const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const LessonProgress = require('../models/LessonProgress');
const { awardXP } = require('../services/progressService');
const { canUserAccessLevel, recordActivityCompletion } = require('../services/progressionEngine');

router.get('/', requireAuth, async (req, res) => {
  const lessons = await Lesson.find().sort({ createdAt: 1 });
  const progress = await LessonProgress.find({ user: req.user._id });
  const map = Object.fromEntries(progress.map((p) => [p.lesson.toString(), p]));
  const unlocked = req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'];

  res.json(
    lessons.map((l) => {
      const p = map[l._id.toString()];
      const pct = p ? Math.round((p.completedSections.length / l.sections.length) * 100) : 0;
      const isUnlocked = canUserAccessLevel(req.user, l.level);
      return {
        ...l.toObject(),
        progressPct: pct,
        completed: !!p?.completed,
        isLocked: !isUnlocked,
      };
    })
  );
});

router.post('/:id/sections/:index/complete', requireAuth, async (req, res) => {
  const { id, index } = req.params;
  const lesson = await Lesson.findById(id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  if (req.user.role === 'student' && !canUserAccessLevel(req.user, lesson.level)) {
    return res.status(403).json({
      error: `This lesson is in the ${lesson.level} tier, which is currently locked. Complete previous level activities to unlock.`,
      locked: true,
      requiredLevel: lesson.level,
      unlockedLevels: req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'],
    });
  }

  let progress = await LessonProgress.findOne({ user: req.user._id, lesson: id });
  if (!progress) progress = new LessonProgress({ user: req.user._id, lesson: id, completedSections: [] });
  const idx = Number(index);
  if (!progress.completedSections.includes(idx)) progress.completedSections.push(idx);
  progress.completed = progress.completedSections.length >= lesson.sections.length;
  await progress.save();

  let progression = null;
  if (progress.completed) {
    await awardXP(req.user, 20);
    progression = await recordActivityCompletion({
      user: req.user,
      activityId: lesson._id.toString(),
      activityType: 'lesson',
      level: lesson.level || 'Beginner',
      category: 'curriculum',
      score: 100,
      xp: 20,
    }).catch(() => null);
  }

  res.json({ progress, progression });
});

module.exports = router;
