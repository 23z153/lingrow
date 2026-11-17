const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const ListeningClip = require('../models/ListeningClip');
const ListeningAttempt = require('../models/ListeningAttempt');
const { scoreListening } = require('../services/llmService');
const { awardXP } = require('../services/progressService');
const { canUserAccessLevel, recordActivityCompletion } = require('../services/progressionEngine');

// GET /api/listening/clips — Returns general listening comprehension audio clips
router.get('/clips', requireAuth, requireMinXP(0, 'Listening Comprehension'), async (req, res) => {
  try {
    const unlocked = req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'];
    const highestUnlocked = unlocked.includes('Advanced') ? 'Advanced' : unlocked.includes('Intermediate') ? 'Intermediate' : 'Beginner';
    const rawLevel = req.query.level || highestUnlocked;
    const targetLevel = rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase();

    if (req.user.role === 'student' && !canUserAccessLevel(req.user, targetLevel)) {
      return res.status(403).json({
        error: `The ${targetLevel} tier is currently locked. Complete previous level activities to unlock.`,
        locked: true,
        requiredLevel: targetLevel,
        unlockedLevels: unlocked,
      });
    }

    // Query active general clips
    let clips = await ListeningClip.aggregate([
      { $match: { active: { $ne: false }, level: targetLevel } },
      { $sample: { size: 5 } },
    ]);

    if (!clips.length) {
      clips = await ListeningClip.aggregate([
        { $match: { active: { $ne: false } } },
        { $sample: { size: 5 } },
      ]);
    }

    if (!clips.length) {
      clips = await ListeningClip.find().limit(5);
    }

    res.json(clips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/attempts', requireAuth, async (req, res) => {
  try {
    const { clipId, answerTranscript } = req.body;
    const clip = await ListeningClip.findById(clipId);
    if (!clip) return res.status(404).json({ error: 'Clip not found' });

    if (req.user.role === 'student' && !canUserAccessLevel(req.user, clip.level)) {
      return res.status(403).json({
        error: `This listening clip is in the ${clip.level} tier, which is currently locked. Complete previous level activities to unlock.`,
        locked: true,
        requiredLevel: clip.level,
        unlockedLevels: req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'],
      });
    }

    const result = await scoreListening({ question: clip.question, script: clip.script, answerTranscript });
    const attempt = await ListeningAttempt.create({ user: req.user._id, clip: clip._id, answerTranscript, score: result.score, feedback: result.feedback });

    const xpGain = Math.round(5 + result.score / 10);
    await awardXP(req.user, xpGain);

    const prog = await recordActivityCompletion({
      user: req.user,
      activityId: clip._id.toString(),
      activityType: 'listening',
      level: clip.level || 'Beginner',
      category: 'listening',
      score: result.score,
      xp: xpGain,
    }).catch((e) => {
      console.warn('[progression] Error recording listening completion:', e);
      return null;
    });

    res.status(201).json({ attempt, progression: prog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
