const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const StoryPrompt = require('../models/StoryPrompt');
const StoryAttempt = require('../models/StoryAttempt');
const { scoreStory } = require('../services/llmService');
const { awardXP } = require('../services/progressService');
const { canUserAccessLevel, recordActivityCompletion } = require('../services/progressionEngine');

// GET /api/story/prompts - Fetch active general English stories
router.get('/prompts', requireAuth, requireMinXP(0, 'Story Continuation'), async (req, res) => {
  try {
    const unlocked = req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'];
    // Exclude inactive legacy department stories
    const query = { active: { $ne: false } };
    const { level } = req.query;

    if (level && ['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
      if (req.user.role === 'student' && !canUserAccessLevel(req.user, level)) {
        return res.status(403).json({
          error: `The ${level} tier is currently locked. Complete previous level activities to unlock.`,
          locked: true,
          requiredLevel: level,
          unlockedLevels: unlocked,
        });
      }
      query.level = level;
    } else if (req.user.role === 'student') {
      // By default, only return stories matching student's unlocked tiers
      query.level = { $in: unlocked };
    }

    // Fetch active general stories
    let prompts = await StoryPrompt.find(query).sort({ level: 1, createdAt: 1 }).lean();

    // If student has recent attempts, sort to prioritize unattempted / least recent stories
    if (req.user && prompts.length) {
      const recentAttempts = await StoryAttempt.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .select('prompt')
        .lean();

      const recentPromptIds = new Set(recentAttempts.map((a) => (a.prompt ? a.prompt.toString() : '')));
      prompts.sort((a, b) => {
        const aRecent = recentPromptIds.has(a._id.toString()) ? 1 : 0;
        const bRecent = recentPromptIds.has(b._id.toString()) ? 1 : 0;
        return aRecent - bRecent;
      });
    }

    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/story/attempts - Submit student's continuation speech and evaluate
router.post('/attempts', requireAuth, async (req, res) => {
  try {
    const { promptId, transcript } = req.body;
    if (!promptId || !transcript) return res.status(400).json({ error: 'promptId and transcript are required' });

    const prompt = await StoryPrompt.findById(promptId);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    if (req.user.role === 'student' && !canUserAccessLevel(req.user, prompt.level)) {
      return res.status(403).json({
        error: `This story is in the ${prompt.level} tier, which is currently locked. Complete previous level activities to unlock.`,
        locked: true,
        requiredLevel: prompt.level,
        unlockedLevels: req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'],
      });
    }

    const result = await scoreStory({ prompt: prompt.prompt, transcript });

    const attempt = await StoryAttempt.create({
      user: req.user._id,
      prompt: prompt._id,
      transcript,
      scores: result.scores,
      feedback: result.feedback,
    });

    const xpEarned = Math.round(15 + result.scores.overall / 5);
    await awardXP(req.user, xpEarned);

    const prog = await recordActivityCompletion({
      user: req.user,
      activityId: prompt._id.toString(),
      activityType: 'story',
      level: prompt.level || 'Beginner',
      category: 'story',
      score: result.scores.overall,
      xp: xpEarned,
    }).catch((e) => {
      console.warn('[progression] Story record error:', e);
      return null;
    });

    res.status(201).json({ attempt, xpEarned, progression: prog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/story/attempts/me - Student's story attempts history
router.get('/attempts/me', requireAuth, async (req, res) => {
  try {
    const attempts = await StoryAttempt.find({ user: req.user._id })
      .populate('prompt', 'title theme level prompt')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
