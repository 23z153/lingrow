const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const StoryPrompt = require('../models/StoryPrompt');
const StoryAttempt = require('../models/StoryAttempt');
const { scoreStory } = require('../services/llmService');
const { awardXP } = require('../services/progressService');

// GET /api/story/prompts - Fetch active general English stories (no department filter)
router.get('/prompts', requireAuth, requireMinXP(500, 'Story Continuation'), async (req, res) => {
  try {
    // Exclude inactive legacy department stories
    const query = { active: { $ne: false } };
    const { level } = req.query;
    if (level && ['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
      query.level = level;
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

    res.status(201).json({ attempt, xpEarned });
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
