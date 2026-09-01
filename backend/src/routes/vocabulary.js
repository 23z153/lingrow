const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const VocabWord = require('../models/VocabWord');
const VocabProgress = require('../models/VocabProgress');
const { maybeAwardBadge, awardXP } = require('../services/progressService');

router.get('/', requireAuth, requireMinXP(150, 'Vocabulary'), async (req, res) => {
  const { level } = req.query;
  const filter = level ? { level } : {};
  const words = await VocabWord.find(filter).sort({ createdAt: 1 });
  const progress = await VocabProgress.find({ user: req.user._id });
  const progressMap = Object.fromEntries(progress.map((p) => [p.word.toString(), p]));
  res.json(words.map((w) => ({ ...w.toObject(), mastered: progressMap[w._id.toString()]?.mastered || false, timesReviewed: progressMap[w._id.toString()]?.timesReviewed || 0 })));
});

router.post('/:id/review', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { known } = req.body; // true if the student marked it "I know this"
  const word = await VocabWord.findById(id);
  if (!word) return res.status(404).json({ error: 'Word not found' });

  let progress = await VocabProgress.findOne({ user: req.user._id, word: id });
  if (!progress) progress = new VocabProgress({ user: req.user._id, word: id });
  progress.timesReviewed += 1;
  if (known) progress.mastered = true;
  await progress.save();
  await awardXP(req.user, known ? 5 : 2);

  const masteredCount = await VocabProgress.countDocuments({ user: req.user._id, mastered: true });
  if (masteredCount >= 20) await maybeAwardBadge(req.user, 'vocab_master');

  res.json({ progress, masteredCount });
});

module.exports = router;
