const router = require('express').Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const DebateTopic = require('../models/DebateTopic');
const DebateAttempt = require('../models/DebateAttempt');
const { scoreDebate, stripTranscriptTags } = require('../services/llmService');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

// Rate limiter for debate attempts (max 25 attempts per 10 minutes, keyed by User ID with IP fallback)
const debateAttemptLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user._id ? String(req.user._id) : (req.ip || 'anonymous')),
  message: { error: 'Too many debate attempts submitted. Please take a brief break before submitting again.' },
});

function getDebateSecret() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }
  return process.env.JWT_SECRET || 'lingrow_debate_secret_key_2026';
}

/**
 * Deterministically derives assigned debate stance from HMAC(userId + topicId)
 */
function getDeterministicAssignedStance(userId, topicId) {
  const secret = getDebateSecret();
  const hash = crypto
    .createHmac('sha256', secret)
    .update(`${String(userId)}:${String(topicId)}:deterministic_stance`)
    .digest();
  return hash[0] % 2 === 0 ? 'for' : 'against';
}

/**
 * Generate HMAC token for assigned stance validation with 30-minute expiry
 * Format: `${expiresAt}.${hmacSignature}`
 */
function generateAssignedStanceToken(userId, topicId, stance, customExpiresAt = null) {
  const secret = getDebateSecret();
  const expiresAt = customExpiresAt || Date.now() + 30 * 60 * 1000; // 30 min expiry
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${String(userId)}:${String(topicId)}:${String(stance).toLowerCase()}:${expiresAt}`)
    .digest('hex');
  return `${expiresAt}.${signature}`;
}

/**
 * Verify HMAC token for assigned stance validation
 */
function verifyAssignedStanceToken(userId, topicId, stance, token) {
  if (!token || typeof token !== 'string') return false;
  if (!token.includes('.')) return false; // Strict: expiring signed tokens required
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    // Expired token or malformed timestamp
    return false;
  }
  const secret = getDebateSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${String(userId)}:${String(topicId)}:${String(stance).toLowerCase()}:${expiresAt}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch (e) {
    return false;
  }
}

/**
 * Calculates objective delivery metrics from transcript and timing
 * Plausibility check: flags fast speech (> 250 WPM) or slow speech (< 40 WPM ONLY when wordCount > 150)
 */
function calculateDebateDeliveryMetrics({ transcript, durationSeconds, targetDurationSeconds = 120 }) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const durationSupplied = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0;
  let durationEstimated = !durationSupplied;
  let durationSuspect = false;
  let speechDurationSeconds = 0;

  if (durationSupplied) {
    const rawDuration = Math.max(1, Math.round(Number(durationSeconds)));
    const impliedWpm = rawDuration > 0 ? Math.round((wordCount / rawDuration) * 60) : 0;
    const isTooFast = impliedWpm > 250;
    const isTooSlow = wordCount > 150 && impliedWpm < 40;

    if (isTooFast || isTooSlow) {
      durationSuspect = true;
      durationEstimated = true;
      // Fallback to estimated duration (based on average collegiate speaking rate 130 WPM ~ 2.16 words/sec)
      speechDurationSeconds = Math.max(1, Math.round(wordCount / 2.16));
    } else {
      speechDurationSeconds = rawDuration;
    }
  } else {
    speechDurationSeconds = Math.max(1, Math.round(wordCount / 2.16));
  }

  const wpm = speechDurationSeconds > 0 ? Math.round((wordCount / speechDurationSeconds) * 60) : 0;

  // Clear verbal crutches (always hesitation fillers)
  const clearFillers = [
    { word: 'um', regex: /\bum+\b/gi },
    { word: 'uh', regex: /\buh+\b/gi },
    { word: 'you know', regex: /\byou\s+know\b/gi },
  ];

  // Ambiguous fillers: only counted when repeated (> 1 occurrence) in the speech
  const ambiguousFillers = [
    { word: 'like', regex: /\blike\b/gi },
    { word: 'basically', regex: /\bbasically\b/gi },
    { word: 'actually', regex: /\bactually\b/gi },
  ];

  const fillerWords = [];
  let fillerCount = 0;

  for (const { word, regex } of clearFillers) {
    const matches = transcript.match(regex);
    if (matches && matches.length > 0) {
      fillerWords.push(`${word} (×${matches.length})`);
      fillerCount += matches.length;
    }
  }

  for (const { word, regex } of ambiguousFillers) {
    const matches = transcript.match(regex);
    if (matches && matches.length > 1) {
      const repeatedCount = matches.length - 1; // treat the first usage as natural vocabulary
      fillerWords.push(`${word} (repeated ×${matches.length})`);
      fillerCount += repeatedCount;
    }
  }

  const targetSec = Number(targetDurationSeconds) > 0 ? Number(targetDurationSeconds) : 120;
  const deviation = Math.abs(speechDurationSeconds - targetSec);
  const targetAdherencePercent = Math.max(0, Math.min(100, Math.round(100 - (deviation / targetSec) * 100)));

  return {
    wpm,
    fillerWords,
    fillerCount,
    speechDurationSeconds,
    durationEstimated,
    durationSuspect,
    targetDurationSeconds: targetSec,
    targetAdherencePercent,
  };
}

// GET /api/debate/topics — All active debate topics
router.get('/topics', requireAuth, requireMinXP(0, 'Debate Practice'), async (req, res) => {
  try {
    const topics = await DebateTopic.find({ active: { $ne: false } }).sort({ createdAt: -1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debate/topics/next — Intelligent 3-Pool Topic Rotation with difficulty matching & pool exhaustion
router.get('/topics/next', requireAuth, requireMinXP(0, 'Debate Practice'), async (req, res) => {
  try {
    const requestedDept = req.query.department || req.user.selectedDebateDept || '';
    const assignStance = req.query.assignStance === 'true';

    // Department filter: prefer exact department match, fallback to General if none exist
    let allMatchingTopics = [];
    if (requestedDept && requestedDept !== 'All' && requestedDept !== '') {
      allMatchingTopics = await DebateTopic.find({
        active: { $ne: false },
        department: requestedDept.toUpperCase(),
      }).sort({ createdAt: -1 });
    }

    if (!allMatchingTopics || allMatchingTopics.length === 0) {
      const fallbackFilter = { active: { $ne: false } };
      if (requestedDept && requestedDept !== 'All' && requestedDept !== '') {
        fallbackFilter.$or = [
          { department: 'General' },
          { department: '' },
          { department: { $exists: false } },
        ];
      }
      allMatchingTopics = await DebateTopic.find(fallbackFilter).sort({ createdAt: -1 });
      if (!allMatchingTopics || allMatchingTopics.length === 0) {
        allMatchingTopics = await DebateTopic.find({ active: { $ne: false } }).sort({ createdAt: -1 });
        if (!allMatchingTopics || allMatchingTopics.length === 0) {
          return res.status(404).json({ error: 'No debate topics currently available.' });
        }
      }
    }

    const userLevel = (req.user.level || 'Intermediate').toLowerCase();

    // Fetch all attempts by this user to identify which stances have been completed
    const userAttempts = await DebateAttempt.find({ user: req.user._id })
      .select('topic stance scores.overall')
      .lean();

    // Map each topic to attempted stances and best/lowest overall score
    const topicStatsMap = new Map();
    for (const att of userAttempts) {
      const tid = String(att.topic);
      if (!topicStatsMap.has(tid)) {
        topicStatsMap.set(tid, {
          stances: new Set(),
          lowestScore: att.scores?.overall ?? 70,
          bestScore: att.scores?.overall ?? 70,
        });
      }
      const item = topicStatsMap.get(tid);
      if (att.stance) item.stances.add(att.stance.toLowerCase());
      const sc = att.scores?.overall ?? 70;
      if (sc < item.lowestScore) item.lowestScore = sc;
      if (sc > item.bestScore) item.bestScore = sc;
    }

    // Partition topics into 3 distinct pools:
    // Pool 1: Zero attempts (completely unseen)
    // Pool 2: One stance attempted (prompt to argue the opposite side)
    // Pool 3: Both stances attempted (fully practiced)
    const poolZero = [];
    const poolOne = [];
    const poolBoth = [];

    for (const t of allMatchingTopics) {
      const stats = topicStatsMap.get(String(t._id));
      if (!stats || stats.stances.size === 0) {
        poolZero.push(t);
      } else if (stats.stances.size === 1) {
        poolOne.push({ topic: t, attemptedStances: Array.from(stats.stances) });
      } else {
        poolBoth.push({
          topic: t,
          lowestScore: stats.lowestScore,
          bestScore: stats.bestScore,
          attemptedStances: Array.from(stats.stances),
        });
      }
    }

    let pickedTopic = null;
    let suggestedStance = null;
    let isRetry = false;
    let previousBestScore = null;
    let attemptedStancesForTopic = [];

    // Helper: Level preference score (0 if exact match, 1 otherwise)
    const getLevelDistance = (t) => {
      const diff = (t.difficulty || t.level || 'intermediate').toLowerCase();
      return diff === userLevel ? 0 : 1;
    };

    if (poolZero.length > 0) {
      // 1. Zero attempts pool: prefer matching student level
      poolZero.sort((a, b) => getLevelDistance(a) - getLevelDistance(b));
      const topCandidates = poolZero.filter((t) => getLevelDistance(t) === 0);
      const candidates = topCandidates.length > 0 ? topCandidates : poolZero;
      pickedTopic = candidates[Math.floor(Math.random() * candidates.length)];
      attemptedStancesForTopic = [];
    } else if (poolOne.length > 0) {
      // 2. One stance attempted pool: suggest opposite stance
      poolOne.sort((a, b) => getLevelDistance(a.topic) - getLevelDistance(b.topic));
      const chosen = poolOne[Math.floor(Math.random() * poolOne.length)];
      pickedTopic = chosen.topic;
      attemptedStancesForTopic = chosen.attemptedStances;
      suggestedStance = attemptedStancesForTopic.includes('for') ? 'against' : 'for';
    } else {
      // 3. Pool Exhaustion: All topics practiced on both stances!
      // Pick the topic with the lowest past overall score
      poolBoth.sort((a, b) => a.lowestScore - b.lowestScore);
      const lowestScoring = poolBoth[0];
      pickedTopic = lowestScoring.topic;
      isRetry = true;
      previousBestScore = lowestScoring.bestScore;
      attemptedStancesForTopic = lowestScoring.attemptedStances;
      suggestedStance = getDeterministicAssignedStance(req.user._id, pickedTopic._id);
    }

    // Determine assigned stance deterministically based on HMAC(userId + topicId)
    let assignedStance = null;
    let assignedStanceToken = null;

    if (suggestedStance) {
      assignedStance = suggestedStance;
    } else {
      assignedStance = getDeterministicAssignedStance(req.user._id, pickedTopic._id);
    }
    assignedStanceToken = generateAssignedStanceToken(req.user._id, pickedTopic._id, assignedStance);

    // Check user's best previous score on this topic
    let bestScoreOnTopic = null;
    const pastUserAttemptsOnTopic = await DebateAttempt.find({
      user: req.user._id,
      topic: pickedTopic._id,
    }).select('scores.overall');
    if (pastUserAttemptsOnTopic.length > 0) {
      bestScoreOnTopic = Math.max(...pastUserAttemptsOnTopic.map((a) => a.scores?.overall || 0));
    }

    res.json({
      topic: pickedTopic,
      suggestedStance,
      assignedStance,
      assignedStanceToken,
      attemptedStances: attemptedStancesForTopic,
      unattemptedRemaining: poolZero.length + poolOne.length,
      fullyPracticedCount: poolBoth.length,
      totalTopicsCount: allMatchingTopics.length,
      retry: isRetry,
      previousBestScore,
      bestScoreOnTopic,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/debate/preferences — Persist student's debate department filter
router.put('/preferences', requireAuth, async (req, res) => {
  try {
    const { department } = req.body;
    req.user.selectedDebateDept = typeof department === 'string' ? department.trim() : '';
    await req.user.save();
    res.json({ success: true, selectedDebateDept: req.user.selectedDebateDept });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/debate/attempts — Submit a debate attempt for scoring
router.post('/attempts', requireAuth, debateAttemptLimiter, async (req, res) => {
  try {
    const {
      topicId,
      stance,
      transcript,
      durationSeconds,
      targetDurationSeconds,
      mode,
      stanceAssigned,
      assignedStanceToken,
      idempotencyKey,
    } = req.body;

    if (!topicId || !stance || !transcript) {
      return res.status(400).json({ error: 'topicId, stance and transcript are required' });
    }

    const normalizedStance = String(stance).toLowerCase().trim();
    if (normalizedStance !== 'for' && normalizedStance !== 'against') {
      return res.status(400).json({ error: 'stance must be either "for" or "against"' });
    }

    // 1. Duration range validation
    if (durationSeconds !== undefined && durationSeconds !== null) {
      const durNum = Number(durationSeconds);
      if (!Number.isFinite(durNum) || durNum <= 0) {
        return res.status(400).json({
          error: 'durationSeconds must be a positive number of seconds.',
          code: 'INVALID_DURATION',
        });
      }
      if (durNum > 600) {
        return res.status(400).json({
          error: 'Speech duration exceeds 10 minutes limit (600s).',
          code: 'DURATION_TOO_LONG',
        });
      }
    }

    // 2. Target duration validation (60, 120, or 180s)
    if (targetDurationSeconds !== undefined && targetDurationSeconds !== null) {
      const tDur = Number(targetDurationSeconds);
      if (![60, 120, 180].includes(tDur)) {
        return res.status(400).json({
          error: 'targetDurationSeconds must be either 60, 120, or 180 seconds.',
          code: 'INVALID_TARGET_DURATION',
        });
      }
    }

    // 3. Trim and sanitize input, looping to strip any split/nested transcript tags
    const sanitizedTranscript = stripTranscriptTags(String(transcript))
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 4. Maximum transcript length cap (5000 characters)
    if (sanitizedTranscript.length > 5000) {
      return res.status(400).json({
        error: 'Transcript exceeds maximum allowed length of 5000 characters.',
        code: 'TRANSCRIPT_TOO_LONG',
      });
    }

    // 5. Minimum 40 words check
    const words = sanitizedTranscript.split(/\s+/).filter(Boolean);
    if (words.length < 40) {
      return res.status(400).json({
        error: `Debate argument is too short (${words.length} words). Minimum 40 words required for collegiate debate scoring.`,
        code: 'TRANSCRIPT_TOO_SHORT',
        wordCount: words.length,
        minWords: 40,
      });
    }

    const topic = await DebateTopic.findById(topicId);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    // 6. Assigned stance validation: prevent stance forgery/cheating
    const isAssigned = stanceAssigned === true || stanceAssigned === 'true';
    if (isAssigned) {
      const isValidAssignment = verifyAssignedStanceToken(
        req.user._id,
        topic._id,
        normalizedStance,
        assignedStanceToken
      );
      if (!isValidAssignment) {
        return res.status(400).json({
          error: 'Assigned stance validation failed. You must deliver your speech for the assigned stance.',
          code: 'ASSIGNED_STANCE_MISMATCH',
        });
      }
    }

    // 7. Duplicate submission check (idempotency key or 60-second duplicate window)
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const duplicateQuery = {
      user: req.user._id,
      topic: topic._id,
      stance: normalizedStance,
      createdAt: { $gte: sixtySecondsAgo },
    };

    if (idempotencyKey) {
      duplicateQuery.$or = [{ idempotencyKey: String(idempotencyKey) }, { transcript: sanitizedTranscript }];
    } else {
      duplicateQuery.transcript = sanitizedTranscript;
    }

    const recentDuplicate = await DebateAttempt.findOne(duplicateQuery);
    if (recentDuplicate) {
      return res.status(409).json({
        error: 'Duplicate debate attempt detected. This argument was already submitted recently.',
        attempt: recentDuplicate,
        isDuplicate: true,
      });
    }

    // 8. Compute objective delivery metrics
    const isTypedMode = String(mode).toLowerCase() === 'typed';
    const effectiveDurationSeconds = isTypedMode ? undefined : durationSeconds;

    const deliveryMetrics = calculateDebateDeliveryMetrics({
      transcript: sanitizedTranscript,
      durationSeconds: effectiveDurationSeconds,
      targetDurationSeconds: targetDurationSeconds || 120,
    });

    // 9. Score argument using LLM with anchor rubric and heuristic fallback
    const result = await scoreDebate({
      topic: topic.topic,
      stance: normalizedStance,
      transcript: sanitizedTranscript,
    });

    // 10. Persist attempt with complete metrics and metadata
    const validModes = ['manual', 'assigned', 'timed', 'typed'];
    const resolvedMode = validModes.includes(String(mode).toLowerCase())
      ? String(mode).toLowerCase()
      : isAssigned
      ? 'assigned'
      : 'manual';

    // Calculate XP with improvement & stance bonuses, capped at 50 XP
    const xpBreakdown = await calculateDebateXP({
      overallScore: result.scores.overall,
      userId: req.user._id,
      topicId: topic._id,
      stance: normalizedStance,
      isAssigned,
    });

    const attempt = await DebateAttempt.create({
      user: req.user._id,
      topic: topic._id,
      stance: normalizedStance,
      transcript: sanitizedTranscript,
      scores: result.scores,
      feedback: result.feedback,
      deliveryMetrics,
      evaluator: result.evaluator || 'heuristic',
      confidence: result.confidence ?? 1.0,
      modelName: result.modelName || '',
      durationSeconds:
        !isTypedMode && durationSeconds !== undefined && durationSeconds !== null && Number(durationSeconds) > 0
          ? Math.round(Number(durationSeconds))
          : deliveryMetrics.speechDurationSeconds,
      mode: resolvedMode,
      stanceAssigned: isAssigned,
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
    });

    await awardXP(req.user, xpBreakdown.total);
    const newBadges = await evaluateDebateBadges(req.user, topic._id, normalizedStance, result.scores.overall);

    res.status(201).json({ attempt, xpBreakdown, newBadges });
  } catch (err) {
    if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
      const existing = await DebateAttempt.findOne({
        user: req.user._id,
        idempotencyKey: String(req.body.idempotencyKey),
      }).populate('topic');
      return res.status(409).json({
        error: 'Duplicate debate attempt with this idempotency key already exists.',
        attempt: existing,
        isDuplicate: true,
      });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * Calculates XP with improvement and stance agility bonuses, capped at 50 XP.
 * Anti-farming: Overall score must be >= 40 to qualify for any bonuses.
 */
async function calculateDebateXP({ overallScore, userId, topicId, stance, isAssigned }) {
  const baseXp = Math.round(15 + overallScore / 5);
  let improvementBonus = 0;
  let stanceBonus = 0;

  // Anti-farming check: require overall >= 40 for any bonus
  if (overallScore >= 40) {
    // 1. Improvement bonus (+5 per 5 points improved vs previous attempt on same topic & stance, max +15)
    const prevSameAttempt = await DebateAttempt.findOne({
      user: userId,
      topic: topicId,
      stance,
    }).sort({ createdAt: -1 });

    if (prevSameAttempt && prevSameAttempt.scores && Number.isFinite(prevSameAttempt.scores.overall)) {
      const prevScore = prevSameAttempt.scores.overall;
      if (overallScore > prevScore) {
        const diff = overallScore - prevScore;
        improvementBonus = Math.min(15, Math.floor(diff / 5) * 5);
      }
    }

    // 2. Stance bonus (+5 for assigned stance or if opposite stance already attempted)
    if (isAssigned) {
      stanceBonus = 5;
    } else {
      const oppositeStance = stance === 'for' ? 'against' : 'for';
      const hasArguedOpposite = await DebateAttempt.exists({
        user: userId,
        topic: topicId,
        stance: oppositeStance,
      });
      if (hasArguedOpposite) {
        stanceBonus = 5;
      }
    }
  }

  const uncappedTotal = baseXp + improvementBonus + stanceBonus;
  const total = Math.min(50, uncappedTotal);
  const capped = uncappedTotal > 50;

  return {
    base: baseXp,
    improvementBonus,
    stanceBonus,
    total,
    capped,
  };
}

/**
 * Evaluates and atomically awards debate badges:
 * - first_debate
 * - debate_champion (overall >= 85)
 * - both_sides (same topic argued FOR and AGAINST)
 * - consistent_debater (3 consecutive attempts with overall >= 70)
 * - debate_streak_5 (5 consecutive days with >= 1 debate attempt)
 */
async function evaluateDebateBadges(user, topicId, stance, overallScore) {
  const newlyEarned = [];

  // 1. first_debate
  const firstBadge = await maybeAwardBadge(user, 'first_debate');
  if (firstBadge) newlyEarned.push(firstBadge);

  // 2. debate_champion: overall >= 85
  if (overallScore >= 85) {
    const champBadge = await maybeAwardBadge(user, 'debate_champion');
    if (champBadge) newlyEarned.push(champBadge);
  }

  // 3. both_sides: argued both FOR and AGAINST on the same topic
  const opposite = stance === 'for' ? 'against' : 'for';
  const hasOpposite = await DebateAttempt.exists({ user: user._id, topic: topicId, stance: opposite });
  if (hasOpposite) {
    const bothBadge = await maybeAwardBadge(user, 'both_sides');
    if (bothBadge) newlyEarned.push(bothBadge);
  }

  // 4. consistent_debater: 3 consecutive attempts with overall >= 70
  const recent3 = await DebateAttempt.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('scores.overall');

  if (recent3.length === 3 && recent3.every((a) => (a.scores?.overall || 0) >= 70)) {
    const consBadge = await maybeAwardBadge(user, 'consistent_debater');
    if (consBadge) newlyEarned.push(consBadge);
  }

  // 5. debate_streak_5: 5 consecutive days with at least one attempt
  const recentAttempts = await DebateAttempt.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('createdAt');

  const dayStrings = [...new Set(recentAttempts.map((a) => a.createdAt.toISOString().slice(0, 10)))].sort().reverse();
  if (dayStrings.length >= 5) {
    let consecutiveCount = 1;
    for (let i = 0; i < dayStrings.length - 1; i++) {
      const d1 = new Date(dayStrings[i]);
      const d2 = new Date(dayStrings[i + 1]);
      const diffDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        consecutiveCount++;
        if (consecutiveCount >= 5) break;
      } else {
        break;
      }
    }
    if (consecutiveCount >= 5) {
      const streakBadge = await maybeAwardBadge(user, 'debate_streak_5');
      if (streakBadge) newlyEarned.push(streakBadge);
    }
  }

  return newlyEarned;
}

// GET /api/debate/history — Returns per-metric trend series and weakest skill coaching tip
router.get('/history', requireAuth, async (req, res) => {
  try {
    const attempts = await DebateAttempt.find({ user: req.user._id })
      .populate('topic', 'topic department level')
      .sort({ createdAt: -1 })
      .limit(20);

    // Oldest to newest for trend series
    const chronological = [...attempts].reverse();

    const series = {
      labels: chronological.map((a, idx) => `Speech ${idx + 1}`),
      dates: chronological.map((a) => a.createdAt),
      logic: chronological.map((a) =>
        (a.scores?.logic && a.scores.logic > 0) ? a.scores.logic : (a.scores?.argument || 70)
      ),
      persuasion: chronological.map((a) =>
        (a.scores?.persuasion && a.scores.persuasion > 0)
          ? a.scores.persuasion
          : (a.scores?.counterargument || a.scores?.persuasiveness || 70)
      ),
      clarity: chronological.map((a) =>
        (a.scores?.clarity && a.scores.clarity > 0) ? a.scores.clarity : 70
      ),
      vocabulary: chronological.map((a) =>
        (a.scores?.vocabulary && a.scores.vocabulary > 0) ? a.scores.vocabulary : 70
      ),
      structure: chronological.map((a) =>
        (a.scores?.structure && a.scores.structure > 0) ? a.scores.structure : 70
      ),
      overall: chronological.map((a) =>
        (a.scores?.overall && a.scores.overall > 0) ? a.scores.overall : 70
      ),
    };

    const count = chronological.length;
    const calcAvg = (arr) => (count > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / count) : 0);

    const averages = {
      logic: calcAvg(series.logic),
      persuasion: calcAvg(series.persuasion),
      clarity: calcAvg(series.clarity),
      vocabulary: calcAvg(series.vocabulary),
      structure: calcAvg(series.structure),
      overall: calcAvg(series.overall),
    };

    const skillKeys = ['logic', 'persuasion', 'clarity', 'vocabulary', 'structure'];
    let lowestSkill = 'logic';
    let lowestVal = Infinity;

    for (const k of skillKeys) {
      if (averages[k] < lowestVal) {
        lowestVal = averages[k];
        lowestSkill = k;
      }
    }

    const TIPS = {
      logic: 'Support claims with explicit premise-conclusion chains and empirical evidence.',
      persuasion: 'Directly address opposing perspectives and highlight human or systemic impacts.',
      clarity: 'Use active voice, articulate transitions, and avoid over-long complex sentences.',
      vocabulary: 'Incorporate precise collegiate debate idioms and topic-specific vocabulary.',
      structure: 'Open with a hook, number your arguments (First, Second), and close with a punchy conclusion.',
    };

    const weakestSkill =
      count > 0
        ? {
            skill: lowestSkill,
            average: lowestVal,
            tip: TIPS[lowestSkill] || TIPS.logic,
          }
        : null;

    res.json({
      totalAttempts: attempts.length,
      attempts,
      series,
      averages,
      weakestSkill,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attempts/me', requireAuth, async (req, res) => {
  res.json(await DebateAttempt.find({ user: req.user._id }).populate('topic').sort({ createdAt: -1 }).limit(50));
});

router.generateAssignedStanceToken = generateAssignedStanceToken;
router.verifyAssignedStanceToken = verifyAssignedStanceToken;
router.getDeterministicAssignedStance = getDeterministicAssignedStance;
router.calculateDebateDeliveryMetrics = calculateDebateDeliveryMetrics;
router.calculateDebateXP = calculateDebateXP;
router.evaluateDebateBadges = evaluateDebateBadges;

module.exports = router;
