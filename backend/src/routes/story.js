const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const StoryPrompt = require('../models/StoryPrompt');
const StoryAttempt = require('../models/StoryAttempt');
const { scoreStory } = require('../services/llmService');
const { awardXP } = require('../services/progressService');

router.get('/prompts', requireAuth, requireMinXP(500, 'Story Continuation'), async (req, res) => {
  res.json(await StoryPrompt.find().sort({ createdAt: 1 }));
});

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

    await awardXP(req.user, Math.round(15 + result.scores.overall / 5));
    res.status(201).json({ attempt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attempts/me', requireAuth, async (req, res) => {
  res.json(await StoryAttempt.find({ user: req.user._id }).populate('prompt').sort({ createdAt: -1 }).limit(50));
});

module.exports = router;
