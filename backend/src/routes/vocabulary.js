const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const VocabWord = require('../models/VocabWord');
const VocabProgress = require('../models/VocabProgress');
const { maybeAwardBadge, awardXP } = require('../services/progressService');
const { detectGrammarCorrection } = require('../services/llm2BEngine');

router.get('/', requireAuth, async (req, res) => {
  const { level } = req.query;
  const filter = level ? { level } : {};
  const words = await VocabWord.find(filter).sort({ createdAt: 1 });
  const progress = await VocabProgress.find({ user: req.user._id });
  const progressMap = Object.fromEntries(progress.map((p) => [p.word.toString(), p]));
  res.json(words.map((w) => ({ ...w.toObject(), mastered: progressMap[w._id.toString()]?.mastered || false, timesReviewed: progressMap[w._id.toString()]?.timesReviewed || 0 })));
});

// GET /api/vocabulary/daily — Daily Refreshed Set with Assessment Quizzes
router.get('/daily', requireAuth, async (req, res) => {
  try {
    const allWords = await VocabWord.find();
    if (!allWords.length) return res.json({ dailyWords: [], quizQuestions: [] });

    // Sample 6 random words for daily refresh
    const shuffled = [...allWords].sort(() => 0.5 - Math.random());
    const dailyWords = shuffled.slice(0, Math.min(6, allWords.length));
    const progress = await VocabProgress.find({ user: req.user._id });
    const progressMap = Object.fromEntries(progress.map((p) => [p.word.toString(), p]));

    // Generate assessment quiz questions
    const quizQuestions = dailyWords.map((w) => {
      const distractors = allWords.filter((other) => other._id.toString() !== w._id.toString()).sort(() => 0.5 - Math.random()).slice(0, 3).map((other) => other.meaning);
      const options = [w.meaning, ...distractors].sort(() => 0.5 - Math.random());
      const correctAnswer = options.indexOf(w.meaning);
      return {
        wordId: w._id,
        word: w.word,
        partOfSpeech: w.partOfSpeech,
        example: w.example,
        options,
        correctAnswer,
      };
    });

    res.json({
      dailyWords: dailyWords.map((w) => ({ ...w.toObject(), mastered: progressMap[w._id.toString()]?.mastered || false })),
      quizQuestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vocabulary/quiz — Generate quiz for specific list of word IDs (e.g., after reading flashcards)
router.post('/quiz', requireAuth, async (req, res) => {
  try {
    const { wordIds } = req.body;
    let words = [];
    if (Array.isArray(wordIds) && wordIds.length) {
      words = await VocabWord.find({ _id: { $in: wordIds } });
    }
    if (!words.length) {
      const all = await VocabWord.find();
      words = all.sort(() => 0.5 - Math.random()).slice(0, 5);
    }
    const allWords = await VocabWord.find();

    const quizQuestions = words.map((w) => {
      const distractors = allWords
        .filter((other) => other._id.toString() !== w._id.toString())
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((other) => other.meaning);
      const options = [w.meaning, ...distractors].sort(() => 0.5 - Math.random());
      const correctAnswer = options.indexOf(w.meaning);
      return {
        wordId: w._id,
        word: w.word,
        partOfSpeech: w.partOfSpeech,
        example: w.example,
        options,
        correctAnswer,
      };
    });

    res.json({ quizQuestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vocabulary/assessment — Submit Vocabulary Assessment & Earn XP
router.post('/assessment', requireAuth, async (req, res) => {
  try {
    const { wordId, answerType, selectedOption, spokenSentence } = req.body;
    if (!wordId) return res.status(400).json({ error: 'wordId is required' });

    const word = await VocabWord.findById(wordId);
    if (!word) return res.status(404).json({ error: 'Word not found' });

    let progress = await VocabProgress.findOne({ user: req.user._id, word: wordId });
    if (!progress) progress = new VocabProgress({ user: req.user._id, word: wordId });

    if (answerType === 'spoken') {
      const cleanSentence = (spokenSentence || '').toLowerCase();
      const containsWord = cleanSentence.includes(word.word.toLowerCase());
      const grammarTip = detectGrammarCorrection(spokenSentence || '');

      let score = 70;
      let feedback = `Good attempt using "${word.word}" in a sentence!`;

      if (containsWord) score += 20;
      if (!grammarTip) score += 10;
      else feedback += ` ${grammarTip}`;

      const isPass = score >= 75;
      const xpEarned = isPass ? 15 : 5;

      progress.timesReviewed += 1;
      if (isPass) progress.mastered = true;
      await progress.save();
      await awardXP(req.user, xpEarned);

      const masteredCount = await VocabProgress.countDocuments({ user: req.user._id, mastered: true });
      if (masteredCount >= 20) await maybeAwardBadge(req.user, 'vocab_master');

      return res.json({
        isCorrect: isPass,
        score,
        xpEarned,
        feedback,
        masteredCount,
      });
    }

    // Default MCQ Assessment
    const allWords = await VocabWord.find();
    const correctMeaning = word.meaning;
    const isCorrect = Number(selectedOption) === 0 || selectedOption === correctMeaning;
    const xpEarned = isCorrect ? 10 : 2;

    progress.timesReviewed += 1;
    if (isCorrect) progress.mastered = true;
    await progress.save();

    await awardXP(req.user, xpEarned);
    const masteredCount = await VocabProgress.countDocuments({ user: req.user._id, mastered: true });
    if (masteredCount >= 20) await maybeAwardBadge(req.user, 'vocab_master');

    res.json({
      isCorrect,
      xpEarned,
      feedback: isCorrect ? `Correct! "${word.word}" means: ${word.meaning}` : `Incorrect. The correct meaning of "${word.word}" is: ${word.meaning}`,
      masteredCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/review', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { known } = req.body;
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
