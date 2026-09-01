const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const LessonProgress = require('../models/LessonProgress');
const { awardXP } = require('../services/progressService');

router.get('/', requireAuth, async (req, res) => {
  const lessons = await Lesson.find().sort({ createdAt: 1 });
  const progress = await LessonProgress.find({ user: req.user._id });
  const map = Object.fromEntries(progress.map((p) => [p.lesson.toString(), p]));
  res.json(
    lessons.map((l) => {
      const p = map[l._id.toString()];
      const pct = p ? Math.round((p.completedSections.length / l.sections.length) * 100) : 0;
      return { ...l.toObject(), progressPct: pct, completed: !!p?.completed };
    })
  );
});

router.post('/:id/sections/:index/complete', requireAuth, async (req, res) => {
  const { id, index } = req.params;
  const lesson = await Lesson.findById(id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  let progress = await LessonProgress.findOne({ user: req.user._id, lesson: id });
  if (!progress) progress = new LessonProgress({ user: req.user._id, lesson: id, completedSections: [] });
  const idx = Number(index);
  if (!progress.completedSections.includes(idx)) progress.completedSections.push(idx);
  progress.completed = progress.completedSections.length >= lesson.sections.length;
  await progress.save();
  if (progress.completed) await awardXP(req.user, 20);

  res.json({ progress });
});

module.exports = router;
