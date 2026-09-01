const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const ReadAloudAttempt = require('../models/ReadAloudAttempt');
const DebateAttempt = require('../models/DebateAttempt');
const StoryAttempt = require('../models/StoryAttempt');

router.use(requireAuth, requireRole('teacher', 'admin'));

// Class overview: every student, with a rollup of their recent activity.
router.get('/students', async (req, res) => {
  const { batch } = req.query;
  const filter = { role: 'student' };
  if (batch) filter.batch = batch;
  const students = await User.find(filter).select('name email level batch xp streak status updatedAt').sort({ name: 1 });
  res.json(students);
});

router.get('/students/:id', async (req, res) => {
  const student = await User.findById(req.params.id).select('name email level batch xp streak status');
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const [readAloud, debates, stories] = await Promise.all([
    ReadAloudAttempt.find({ user: student._id }).populate('passage').sort({ createdAt: -1 }).limit(20),
    DebateAttempt.find({ user: student._id }).populate('topic').sort({ createdAt: -1 }).limit(20),
    StoryAttempt.find({ user: student._id }).populate('prompt').sort({ createdAt: -1 }).limit(20),
  ]);

  res.json({ student, readAloud, debates, stories });
});

router.post('/attempts/:type/:id/comment', async (req, res) => {
  const { type, id } = req.params;
  const { comment } = req.body;
  const Model = { readaloud: ReadAloudAttempt, debate: DebateAttempt }[type];
  if (!Model) return res.status(400).json({ error: 'Unknown attempt type' });

  const attempt = await Model.findByIdAndUpdate(id, { teacherComment: comment }, { new: true });
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  res.json(attempt);
});

module.exports = router;
