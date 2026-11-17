const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const IdiomPhrase = require('../models/IdiomPhrase');
const IdiomProgress = require('../models/IdiomProgress');
const { awardXP, maybeAwardBadge } = require('../services/progressService');
const { diffWords } = require('../services/llmService');

// Helper: Normalize string for comparison
function normalizeText(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
}

// Helper: Calculate speech accuracy from word diffs
function calculateSpeechAccuracy(wordScores) {
  if (!wordScores || !wordScores.length) return 0;
  const points = wordScores.reduce((sum, w) => sum + (w.status === 'good' ? 1 : w.status === 'ok' ? 0.5 : 0), 0);
  return Math.round((points / wordScores.length) * 100);
}

// GET /api/idioms/stats - Overall user progress stats in the Grove
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const totalExpressions = await IdiomPhrase.countDocuments({ active: true });
    const idiomsCount = await IdiomPhrase.countDocuments({ active: true, type: 'idiom' });
    const phrasalVerbsCount = await IdiomPhrase.countDocuments({ active: true, type: 'phrasal_verb' });

    const progressList = await IdiomProgress.find({ user: req.user._id });
    const progressMap = new Map();
    let masteredCount = 0;
    let familiarCount = 0;
    let reviewDueCount = 0;
    const now = new Date();

    for (const p of progressList) {
      progressMap.set(p.expression.toString(), p.mastery);
      if (p.mastery === 'mastered') masteredCount += 1;
      else if (p.mastery === 'familiar') familiarCount += 1;
      if (p.nextReviewDate && p.nextReviewDate <= now) reviewDueCount += 1;
    }

    const newCount = Math.max(0, totalExpressions - (masteredCount + familiarCount));

    res.json({
      total: totalExpressions,
      mastered: masteredCount,
      familiar: familiarCount,
      new: newCount,
      reviewDue: reviewDueCount,
      idiomsCount,
      phrasalVerbsCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/idioms/grouped-verbs - Grouped phrasal verbs by base verb
router.get('/grouped-verbs', requireAuth, async (req, res) => {
  try {
    const phrasalVerbs = await IdiomPhrase.find({ active: true, type: 'phrasal_verb' }).sort({ baseVerb: 1, expression: 1 });
    const progressList = await IdiomProgress.find({ user: req.user._id });
    const progressMap = new Map(progressList.map((p) => [p.expression.toString(), p]));

    const grouped = {};
    for (const pv of phrasalVerbs) {
      const bVerb = (pv.baseVerb || 'other').toLowerCase();
      if (!grouped[bVerb]) {
        grouped[bVerb] = {
          baseVerb: bVerb,
          total: 0,
          mastered: 0,
          familiar: 0,
          new: 0,
          items: [],
        };
      }
      grouped[bVerb].total += 1;
      const prog = progressMap.get(pv._id.toString());
      const mastery = prog ? prog.mastery : 'new';
      if (mastery === 'mastered') grouped[bVerb].mastered += 1;
      else if (mastery === 'familiar') grouped[bVerb].familiar += 1;
      else grouped[bVerb].new += 1;

      grouped[bVerb].items.push({
        _id: pv._id,
        expression: pv.expression,
        level: pv.level,
        isSeparable: pv.isSeparable,
        separableNote: pv.separableNote,
        mastery,
        multipleMeaningsCount: (pv.multipleMeanings || []).length,
      });
    }

    const result = Object.values(grouped).sort((a, b) => b.total - a.total);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/idioms - List expressions with user mastery & filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type, level, baseVerb, category, search, mastery } = req.query;
    const filter = { active: true };

    if (type && ['idiom', 'phrasal_verb'].includes(type)) {
      filter.type = type;
    }
    if (level && ['Level 4', 'Level 5'].includes(level)) {
      filter.level = level;
    }
    if (baseVerb) {
      filter.baseVerb = baseVerb.toLowerCase();
    }
    if (category) {
      filter.category = category;
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { expression: { $regex: q, $options: 'i' } },
        { 'stage1_discover.figurativeMeaning': { $regex: q, $options: 'i' } },
        { 'stage1_discover.scenarioContext': { $regex: q, $options: 'i' } },
      ];
    }

    const expressions = await IdiomPhrase.find(filter).sort({ level: 1, type: 1, expression: 1 });
    const progressList = await IdiomProgress.find({ user: req.user._id });
    const progressMap = new Map(progressList.map((p) => [p.expression.toString(), p]));

    let items = expressions.map((exp) => {
      const p = progressMap.get(exp._id.toString());
      return {
        _id: exp._id,
        expression: exp.expression,
        type: exp.type,
        level: exp.level,
        category: exp.category,
        baseVerb: exp.baseVerb,
        isSeparable: exp.isSeparable,
        separableNote: exp.separableNote,
        multipleMeanings: exp.multipleMeanings || [],
        stage1_discover: exp.stage1_discover,
        stage2_understand: {
          question: exp.stage2_understand?.question,
          options: exp.stage2_understand?.options,
          // Omitting correctAnswer & explanations until requested/submitted
        },
        stage3_use: {
          fillInBlank: {
            sentence: exp.stage3_use?.fillInBlank?.sentence,
            options: exp.stage3_use?.fillInBlank?.options,
            hint: exp.stage3_use?.fillInBlank?.hint,
          },
          sentenceRewrite: {
            plainSentence: exp.stage3_use?.sentenceRewrite?.plainSentence,
            targetPhrase: exp.stage3_use?.sentenceRewrite?.targetPhrase,
            hint: exp.stage3_use?.sentenceRewrite?.hint,
          },
          speakingPrompt: exp.stage3_use?.speakingPrompt,
        },
        userProgress: {
          mastery: p?.mastery || 'new',
          attempts: p?.attempts || 0,
          stage2Passed: p?.stage2Passed || false,
          stage3Passed: p?.stage3Passed || false,
          lastScore: p?.lastScore || 0,
          nextReviewDate: p?.nextReviewDate || null,
        },
      };
    });

    if (mastery && ['new', 'familiar', 'mastered'].includes(mastery)) {
      items = items.filter((item) => item.userProgress.mastery === mastery);
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/idioms/:id - Single expression full details (including answer keys for practice)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const exp = await IdiomPhrase.findById(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Expression not found' });

    let progress = await IdiomProgress.findOne({ user: req.user._id, expression: exp._id });
    if (!progress) {
      progress = {
        mastery: 'new',
        attempts: 0,
        correctCount: 0,
        stage2Passed: false,
        stage3Passed: false,
        lastScore: 0,
        nextReviewDate: null,
      };
    }

    res.json({ expression: exp, progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/idioms/:id/stage2-understand - Submit Stage 2 MCQ
router.post('/:id/stage2-understand', requireAuth, async (req, res) => {
  try {
    const { selectedOption } = req.body;
    if (selectedOption === undefined || selectedOption === null) {
      return res.status(400).json({ error: 'selectedOption index is required' });
    }

    const exp = await IdiomPhrase.findById(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Expression not found' });

    const isCorrect = Number(selectedOption) === exp.stage2_understand.correctAnswer;
    let progress = await IdiomProgress.findOne({ user: req.user._id, expression: exp._id });
    if (!progress) {
      progress = new IdiomProgress({
        user: req.user._id,
        expression: exp._id,
        mastery: 'new',
        attempts: 0,
      });
    }

    progress.attempts += 1;
    progress.lastPracticed = new Date();
    progress.history.push({
      stage: 'understand',
      passed: isCorrect,
      score: isCorrect ? 100 : 0,
      date: new Date(),
    });

    let xpEarned = 0;
    if (isCorrect) {
      progress.correctCount += 1;
      progress.stage2Passed = true;
      if (progress.mastery === 'new') {
        progress.mastery = 'familiar';
      }
      xpEarned = 10;
      await awardXP(req.user, xpEarned);
      await maybeAwardBadge(req.user);
    }

    await progress.save();

    res.json({
      isCorrect,
      correctAnswer: exp.stage2_understand.correctAnswer,
      explanation: exp.stage2_understand.explanation,
      distractorRationales: exp.stage2_understand.distractorRationales || [],
      mastery: progress.mastery,
      xpEarned,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/idioms/:id/stage3-use - Submit Stage 3 Use (Fill in blank + Rewrite + Speech)
router.post('/:id/stage3-use', requireAuth, async (req, res) => {
  try {
    const { fillInBlankAnswer, sentenceRewriteAnswer, spokenTranscript } = req.body;

    const exp = await IdiomPhrase.findById(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Expression not found' });

    // 1. Evaluate Fill-in-Blank
    const expectedFill = normalizeText(exp.stage3_use?.fillInBlank?.correctAnswer);
    const userFill = normalizeText(fillInBlankAnswer);
    const fillCorrect = userFill === expectedFill || expectedFill.includes(userFill) || userFill.includes(expectedFill);

    // 2. Evaluate Sentence Rewrite
    const targetPhraseNorm = normalizeText(exp.stage3_use?.sentenceRewrite?.targetPhrase || exp.expression);
    const userRewriteNorm = normalizeText(sentenceRewriteAnswer);
    const rewriteContainsPhrase = userRewriteNorm.includes(targetPhraseNorm);
    const rewriteScore = rewriteContainsPhrase && userRewriteNorm.length > targetPhraseNorm.length ? 100 : rewriteContainsPhrase ? 70 : 30;

    // 3. Evaluate Speech Alignment
    let speechAccuracy = 0;
    let wordScores = [];
    if (spokenTranscript && spokenTranscript.trim()) {
      const refText = exp.stage3_use?.speakingPrompt?.referenceText || exp.expression;
      wordScores = diffWords(refText, spokenTranscript);
      speechAccuracy = calculateSpeechAccuracy(wordScores);
    } else {
      speechAccuracy = 75; // Default baseline if audio speech simulation used
    }

    // Composite Score
    const fillWeight = 30;
    const rewriteWeight = 40;
    const speechWeight = 30;
    const totalScore = Math.round(
      (fillCorrect ? 100 : 0) * (fillWeight / 100) +
        rewriteScore * (rewriteWeight / 100) +
        speechAccuracy * (speechWeight / 100)
    );

    const isPassed = totalScore >= 60;

    let progress = await IdiomProgress.findOne({ user: req.user._id, expression: exp._id });
    if (!progress) {
      progress = new IdiomProgress({
        user: req.user._id,
        expression: exp._id,
        mastery: 'new',
        attempts: 0,
      });
    }

    progress.attempts += 1;
    progress.lastPracticed = new Date();
    progress.lastScore = totalScore;
    progress.history.push({
      stage: 'use',
      passed: isPassed,
      score: totalScore,
      date: new Date(),
    });

    let previousMastery = progress.mastery;
    let xpEarned = 0;

    if (isPassed) {
      progress.correctCount += 1;
      progress.stage3Passed = true;

      // Spaced-Repetition State Transitions: New -> Familiar -> Mastered
      if (progress.mastery === 'new') {
        progress.mastery = 'familiar';
        progress.nextReviewDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
      } else if (progress.mastery === 'familiar') {
        if (progress.correctCount >= 2 || totalScore >= 80) {
          progress.mastery = 'mastered';
          progress.nextReviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }
      }

      xpEarned = Math.round(20 + (totalScore / 100) * 10); // 20-30 XP
      await awardXP(req.user, xpEarned);
      await maybeAwardBadge(req.user);
    }

    await progress.save();

    res.json({
      score: totalScore,
      isPassed,
      fillCorrect,
      expectedFill: exp.stage3_use?.fillInBlank?.correctAnswer,
      rewriteScore,
      expectedRewrite: exp.stage3_use?.sentenceRewrite?.expectedSentence,
      speechAccuracy,
      wordScores,
      previousMastery,
      mastery: progress.mastery,
      xpEarned,
      nextReviewDate: progress.nextReviewDate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
