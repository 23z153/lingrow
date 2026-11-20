const router = require('express').Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { requireMinXP, requireOnboarded, requireModuleAccess } = require('../middleware/levelGate');
const DebateTopic = require('../models/DebateTopic');
const DebateAttempt = require('../models/DebateAttempt');
const DebateRebuttal = require('../models/DebateRebuttal');
const {
  scoreDebate,
  generateDebateCounter,
  scoreDebateRebuttal,
  stripTranscriptTags,
} = require('../services/llmService');
const { awardXP, maybeAwardBadge } = require('../services/progressService');
const { canUserAccessLevel, recordActivityCompletion } = require('../services/progressionEngine');

// Rate limiter for debate attempts (max 25 attempts per 10 minutes, keyed by User ID with IP fallback)
const debateAttemptLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user._id ? String(req.user._id) : (req.ip || 'anonymous')),
  message: { error: 'Too many debate attempts submitted. Please take a brief break before submitting again.' },
});

// Dedicated rate limiter for rebuttal start/resume (separate bucket from /attempts, max 30 starts per 10 minutes)
const rebuttalStartLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user._id ? String(req.user._id) : (req.ip || 'anonymous')),
  message: { error: 'Too many rebuttal rounds started. Please take a brief break before starting again.' },
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
 * Returns YYYY-MM-DD string for a date in a given timezone (defaults to Asia/Kolkata)
 */
function getDateInTimezone(date, timezone = 'Asia/Kolkata') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date(date));
  } catch (e) {
    return new Date(date).toISOString().slice(0, 10);
  }
}

/**
 * Generates signed HMAC token for a rebuttal round with 10-minute expiry
 */
function generateRebuttalToken(userId, openingAttemptId, rebuttalId, customExpiresAt = null) {
  const secret = getDebateSecret();
  const expiresAt = customExpiresAt || Date.now() + 10 * 60 * 1000;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${String(userId)}:${String(openingAttemptId)}:${String(rebuttalId)}:${expiresAt}`)
    .digest('hex');
  return `${rebuttalId}.${expiresAt}.${signature}`;
}

/**
 * Verifies rebuttal token authenticity, user binding, and expiry
 */
function verifyRebuttalToken(userId, openingAttemptId, rebuttalId, token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tokenRebuttalId, expiresAtStr, sig] = parts;
  if (tokenRebuttalId !== String(rebuttalId)) return false;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const secret = getDebateSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${String(userId)}:${String(openingAttemptId)}:${String(rebuttalId)}:${expiresAt}`)
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
router.get('/topics', requireAuth, requireOnboarded, requireModuleAccess('debate'), requireMinXP(0, 'Debate Practice'), async (req, res) => {
  try {
    const topics = await DebateTopic.find({ active: { $ne: false } }).sort({ createdAt: -1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debate/topics/next — Intelligent 3-Pool Topic Rotation with difficulty matching & pool exhaustion
router.get('/topics/next', requireAuth, requireOnboarded, requireModuleAccess('debate'), requireMinXP(0, 'Debate Practice'), async (req, res) => {
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
router.post('/attempts', requireAuth, requireOnboarded, requireModuleAccess('debate'), debateAttemptLimiter, async (req, res) => {
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

    if (req.user && req.user.role === 'student' && !canUserAccessLevel(req.user, topic.level)) {
      return res.status(403).json({
        error: `This debate topic is in the ${topic.level} tier, which is currently locked. Complete previous level activities to unlock.`,
        locked: true,
        requiredLevel: topic.level,
        unlockedLevels: req.user.getUnlockedLevels ? req.user.getUnlockedLevels() : ['Beginner'],
      });
    }

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

    // Calculate XP with personal best improvement, repeat diminishing returns & daily cap
    const xpBreakdown = await calculateDebateXP({
      overallScore: result.scores.overall,
      userId: req.user._id,
      topicId: topic._id,
      stance: normalizedStance,
      isAssigned,
      isTyped: isTypedMode,
      userTimezone: req.user.timezone || 'Asia/Kolkata',
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
      xpAwarded: xpBreakdown.total,
    });

    await awardXP(req.user, xpBreakdown.total);
    const newBadges = await evaluateDebateBadges(req.user, topic._id, normalizedStance, result.scores.overall);

    const prog = await recordActivityCompletion({
      user: req.user,
      activityId: topic._id.toString(),
      activityType: 'debate',
      level: topic.level || 'Advanced',
      category: topic.department || 'Debate',
      score: result.scores.overall,
      xp: xpBreakdown.total,
    }).catch((e) => {
      console.warn('[progression] Debate record error:', e);
      return null;
    });

    res.status(201).json({ attempt, xpBreakdown, newBadges, progression: prog });
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
 * Calculates XP with personal-best improvement, stance agility bonuses, repeat diminishing returns,
 * and daily debate XP cap (150 max).
 * - Improvement bonus is measured against the user's PERSONAL BEST overall on the same topic+stance (not latest attempt).
 * - Anti-farming: Overall score must be >= 40 to qualify for any bonuses.
 * - Repeat attempts on same topic+stance: 1st full XP, 2nd half, 3rd+ flat 5 XP.
 * - Typed mode: receives only base XP (no improvement or stance bonuses).
 */
async function calculateDebateXP({
  overallScore,
  userId,
  topicId,
  stance,
  isAssigned,
  isTyped = false,
  mode,
  userTimezone = 'Asia/Kolkata',
}) {
  const typedMode = Boolean(isTyped || String(mode).toLowerCase() === 'typed');
  const baseXp = Math.round(15 + overallScore / 5);
  let improvementBonus = 0;
  let stanceBonus = 0;

  // Query all previous attempts on same topic + stance to check personal best and attempt count
  const prevSameAttempts = await DebateAttempt.find({
    user: userId,
    topic: topicId,
    stance,
  }).select('scores.overall xpAwarded createdAt');

  const priorCount = prevSameAttempts.length;

  const validScores = prevSameAttempts
    .map((a) => a.scores?.overall)
    .filter((s) => typeof s === 'number' && !isNaN(s));

  const personalBest = validScores.length > 0 ? Math.max(...validScores) : null;

  // Anti-farming check: require overall >= 40 and non-typed mode for bonuses
  if (!typedMode && overallScore >= 40) {
    // 1. Improvement bonus measured strictly against PERSONAL BEST (+5 per 5 pts, max +15)
    if (personalBest !== null && overallScore > personalBest) {
      const diff = overallScore - personalBest;
      improvementBonus = Math.min(15, Math.floor(diff / 5) * 5);
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

  const uncappedSubtotal = baseXp + improvementBonus + stanceBonus;
  const subtotalBeforeDiminishing = Math.min(50, uncappedSubtotal);

  // 3. Diminishing returns on repeat attempts on same topic+stance:
  // 1st attempt (priorCount === 0): full XP
  // 2nd attempt (priorCount === 1): half XP
  // 3rd and later (priorCount >= 2): flat 5 XP
  let diminishedTotal = subtotalBeforeDiminishing;
  let diminishingCategory = 'full';

  if (priorCount === 1) {
    diminishedTotal = Math.round(subtotalBeforeDiminishing * 0.5);
    diminishingCategory = 'half';
  } else if (priorCount >= 2) {
    diminishedTotal = 5;
    diminishingCategory = 'flat5';
  }

  // 4. Daily debate XP cap (150 XP per day in user's timezone)
  const todayStr = getDateInTimezone(new Date(), userTimezone);
  const lookbackCutoff = new Date(Date.now() - 36 * 3600 * 1000);

  const [recentAttempts, recentRebuttals] = await Promise.all([
    DebateAttempt.find({ user: userId, createdAt: { $gte: lookbackCutoff } }).select('createdAt xpAwarded'),
    DebateRebuttal.find({ user: userId, createdAt: { $gte: lookbackCutoff } }).select('createdAt xpAwarded'),
  ]);

  const dailyAttemptXp = recentAttempts
    .filter((a) => getDateInTimezone(a.createdAt, userTimezone) === todayStr)
    .reduce((sum, a) => sum + (a.xpAwarded || 0), 0);

  const dailyRebuttalXp = recentRebuttals
    .filter((r) => getDateInTimezone(r.createdAt, userTimezone) === todayStr)
    .reduce((sum, r) => sum + (r.xpAwarded || 0), 0);

  const totalDailyDebateXpEarned = dailyAttemptXp + dailyRebuttalXp;
  const dailyCapRemaining = Math.max(0, 150 - totalDailyDebateXpEarned);
  const finalTotal = Math.min(diminishedTotal, dailyCapRemaining);

  return {
    base: baseXp,
    improvementBonus,
    stanceBonus,
    uncappedTotal: uncappedSubtotal,
    subtotal: subtotalBeforeDiminishing,
    total: finalTotal,
    capped: uncappedSubtotal > 50,
    repeatAttemptCount: priorCount,
    diminishingCategory,
    personalBestBefore: personalBest,
    dailyDebateXpEarnedBefore: totalDailyDebateXpEarned,
    dailyCapRemaining,
    dailyCapReached: dailyCapRemaining <= 0,
    typedModeNoBonuses: Boolean(typedMode),
  };
}

/**
 * Evaluates and atomically awards debate badges:
 * - first_debate
 * - debate_champion (overall >= 85)
 * - both_sides (same topic argued FOR and AGAINST)
 * - consistent_debater (3 consecutive attempts with overall >= 70)
 * - debate_streak_5 (5 consecutive days with >= 1 attempt scoring overall >= 40 in user's timezone)
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

  // 5. debate_streak_5: 5 consecutive days with at least one attempt with overall >= 40
  const userTz = (user && user.timezone) || 'Asia/Kolkata';
  const recentAttempts = await DebateAttempt.find({
    user: user._id,
    'scores.overall': { $gte: 40 },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('createdAt scores.overall');

  const dayStrings = [
    ...new Set(recentAttempts.map((a) => getDateInTimezone(a.createdAt, userTz))),
  ].sort().reverse();

  if (dayStrings.length >= 5) {
    let consecutiveCount = 1;
    for (let i = 0; i < dayStrings.length - 1; i++) {
      const d1 = new Date(dayStrings[i] + 'T00:00:00Z');
      const d2 = new Date(dayStrings[i + 1] + 'T00:00:00Z');
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
router.get('/history', requireAuth, requireOnboarded, requireModuleAccess('debate'), async (req, res) => {
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
        typeof a.scores?.structure === 'number' && a.scores.structure > 0 ? a.scores.structure : null
      ),
      overall: chronological.map((a) =>
        (a.scores?.overall && a.scores.overall > 0) ? a.scores.overall : 70
      ),
    };

    const count = chronological.length;
    const calcAvg = (arr) => {
      const valid = arr.filter((v) => typeof v === 'number' && !isNaN(v));
      return valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
    };

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
      if (averages[k] !== null && averages[k] !== undefined && averages[k] < lowestVal) {
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
      count > 0 && lowestVal !== Infinity
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

// GET /api/debate/attempts/me — Returns user's debate history
router.get('/attempts/me', requireAuth, requireOnboarded, requireModuleAccess('debate'), async (req, res) => {
  res.json(await DebateAttempt.find({ user: req.user._id }).populate('topic').sort({ createdAt: -1 }).limit(50));
});

// POST /api/debate/rebuttal/start — Generates AI counter-argument and returns rebuttal token
router.post('/rebuttal/start', requireAuth, requireOnboarded, requireModuleAccess('debate'), rebuttalStartLimiter, async (req, res) => {
  try {
    const { openingAttemptId } = req.body;
    if (!openingAttemptId || !mongoose.Types.ObjectId.isValid(openingAttemptId)) {
      return res.status(400).json({ error: 'Valid openingAttemptId is required.' });
    }

    const openingAttempt = await DebateAttempt.findOne({
      _id: openingAttemptId,
      user: req.user._id,
    }).populate('topic');

    if (!openingAttempt) {
      return res.status(404).json({ error: 'Opening debate attempt not found or unauthorized.' });
    }

    // Allow only one counter per opening attempt (no re-rolling)
    const existingRebuttal = await DebateRebuttal.findOne({ openingAttempt: openingAttempt._id });
    if (existingRebuttal) {
      if (existingRebuttal.status === 'completed') {
        return res.status(409).json({
          error: 'Rebuttal round already completed for this speech.',
          code: 'REBUTTAL_ALREADY_COMPLETED',
          rebuttalId: existingRebuttal._id,
        });
      }

      // Rebuttal is in 'started' status: update counterShownAt and resume with the SAME stored counter
      existingRebuttal.counterShownAt = new Date();
      await existingRebuttal.save();

      const freshToken = generateRebuttalToken(req.user._id, openingAttempt._id, existingRebuttal._id);
      return res.status(200).json({
        rebuttalId: existingRebuttal._id,
        counterArgument: existingRebuttal.counterArgument,
        counterKeyPoints: existingRebuttal.counterKeyPoints,
        keyPoints: existingRebuttal.counterKeyPoints,
        counterStance: existingRebuttal.counterStance,
        evaluator: existingRebuttal.evaluator,
        rebuttalToken: freshToken,
        expiresInSeconds: 600,
        resumed: true,
      });
    }

    const topic = openingAttempt.topic;
    const openingStance = openingAttempt.stance;
    const counterStance = openingStance === 'for' ? 'against' : 'for';
    const opposingKeyPoints = counterStance === 'for'
      ? (topic.forKeyPoints || [])
      : (topic.againstKeyPoints || []);

    const sanitizedOpeningTranscript = stripTranscriptTags(openingAttempt.transcript || '').slice(0, 5000);

    const aiCounter = await generateDebateCounter({
      topic: topic.topic,
      openingStance,
      counterStance,
      studentTranscript: sanitizedOpeningTranscript,
      opposingKeyPoints,
    });

    const now = new Date();
    const rebuttal = await DebateRebuttal.create({
      user: req.user._id,
      topic: topic._id,
      openingAttempt: openingAttempt._id,
      openingStance,
      counterStance,
      counterArgument: aiCounter.counterArgument,
      counterKeyPoints: aiCounter.keyPoints,
      evaluator: aiCounter.evaluator,
      confidence: aiCounter.confidence,
      modelName: aiCounter.modelName || '',
      status: 'started',
      startedAt: now,
      counterShownAt: now,
    });

    const token = generateRebuttalToken(req.user._id, openingAttempt._id, rebuttal._id);

    res.status(200).json({
      rebuttalId: rebuttal._id,
      counterArgument: rebuttal.counterArgument,
      counterKeyPoints: rebuttal.counterKeyPoints,
      keyPoints: rebuttal.counterKeyPoints,
      counterStance,
      evaluator: rebuttal.evaluator,
      rebuttalToken: token,
      expiresInSeconds: 600,
    });
  } catch (err) {
    if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
      // Safe concurrent execution: load and return the existing session as a resume
      const existing = await DebateRebuttal.findOne({ openingAttempt: req.body.openingAttemptId });
      if (existing) {
        if (existing.status === 'completed') {
          return res.status(409).json({
            error: 'Rebuttal round already completed for this speech.',
            code: 'REBUTTAL_ALREADY_COMPLETED',
            rebuttalId: existing._id,
          });
        }
        existing.counterShownAt = new Date();
        await existing.save();
        const freshToken = generateRebuttalToken(req.user._id, existing.openingAttempt, existing._id);
        return res.status(200).json({
          rebuttalId: existing._id,
          counterArgument: existing.counterArgument,
          counterKeyPoints: existing.counterKeyPoints,
          keyPoints: existing.counterKeyPoints,
          counterStance: existing.counterStance,
          evaluator: existing.evaluator,
          rebuttalToken: freshToken,
          expiresInSeconds: 600,
          resumed: true,
        });
      }
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/debate/rebuttal/submit — Submits 60s student rebuttal and scores against counter
router.post('/rebuttal/submit', requireAuth, requireOnboarded, requireModuleAccess('debate'), debateAttemptLimiter, async (req, res) => {
  try {
    const { rebuttalToken, transcript, durationSeconds, mode, idempotencyKey } = req.body;

    if (!rebuttalToken || typeof rebuttalToken !== 'string') {
      return res.status(400).json({ error: 'rebuttalToken is required.', code: 'MISSING_REBUTTAL_TOKEN' });
    }

    const parts = rebuttalToken.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Malformed rebuttal token.', code: 'INVALID_REBUTTAL_TOKEN' });
    }

    const [rebuttalId] = parts;
    if (!mongoose.Types.ObjectId.isValid(rebuttalId)) {
      return res.status(400).json({ error: 'Invalid rebuttal ID in token.', code: 'INVALID_REBUTTAL_TOKEN' });
    }

    const rebuttal = await DebateRebuttal.findById(rebuttalId).populate('topic openingAttempt');
    if (!rebuttal) {
      return res.status(404).json({ error: 'Rebuttal session not found.' });
    }

    const isOwner = String(rebuttal.user) === String(req.user._id);
    const isValidToken = isOwner && verifyRebuttalToken(req.user._id, rebuttal.openingAttempt._id, rebuttal._id, rebuttalToken);
    if (!isValidToken) {
      return res.status(400).json({
        error: 'Rebuttal token is invalid, forged, belongs to another user, or has expired.',
        code: 'EXPIRED_OR_INVALID_TOKEN',
      });
    }

    // Allow only one rebuttal per counter (no duplicate submissions)
    if (rebuttal.status === 'completed') {
      return res.status(409).json({
        error: 'Rebuttal already submitted and scored.',
        code: 'REBUTTAL_ALREADY_COMPLETED',
        rebuttal,
      });
    }

    // Check submission window: reject if > 5 minutes after latest counterShownAt
    const shownAt = rebuttal.counterShownAt || rebuttal.startedAt || rebuttal.createdAt || new Date();
    const elapsedSinceShownMs = Date.now() - new Date(shownAt).getTime();
    if (elapsedSinceShownMs > 5 * 60 * 1000) {
      return res.status(400).json({
        error: 'Rebuttal submission window expired (> 5 minutes since counter was shown). Please resume the rebuttal to get a fresh window.',
        code: 'REBUTTAL_WINDOW_EXPIRED',
        elapsedSeconds: Math.round(elapsedSinceShownMs / 1000),
      });
    }

    // Transcript sanitization & length checks
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript is required.', code: 'MISSING_TRANSCRIPT' });
    }

    const sanitized = stripTranscriptTags(transcript).trim().slice(0, 5000);
    const words = sanitized.split(/\s+/).filter(Boolean);
    if (words.length < 20) {
      return res.status(400).json({
        error: `Rebuttal speech too short (${words.length} words). Minimum 20 words required.`,
        code: 'REBUTTAL_TOO_SHORT',
        wordCount: words.length,
      });
    }

    const isTyped = String(mode).toLowerCase() === 'typed';

    // Server timing check: reject submits less than 5 seconds after start (timed mode)
    if (!isTyped) {
      const startTime = rebuttal.startedAt || rebuttal.createdAt || new Date();
      const elapsedMs = Date.now() - new Date(startTime).getTime();
      const clientDuration = Number(durationSeconds);
      if (elapsedMs < 5000 || (Number.isFinite(clientDuration) && clientDuration < 5)) {
        return res.status(400).json({
          error: 'Rebuttal submitted too quickly (< 5 seconds). Must take time to speak and refute the counter.',
          code: 'SUBMISSION_TOO_FAST',
          elapsedSeconds: Math.round(elapsedMs / 1000),
        });
      }
    }

    const scoredResult = await scoreDebateRebuttal({
      topic: rebuttal.topic.topic,
      counterStance: rebuttal.counterStance,
      studentStance: rebuttal.openingStance,
      counterArgument: rebuttal.counterArgument,
      rebuttalTranscript: sanitized,
      openingTranscript: rebuttal.openingAttempt?.transcript || '',
    });

    // XP Calculation for rebuttal: flat bonus up to 20 XP
    let rebuttalXp = 0;
    const overallScore = scoredResult.scores.overall;
    if (overallScore >= 40) {
      let rawBonus = Math.round((overallScore / 100) * 20);

      // Reduced XP for repeated rebuttals on the same topic:
      // 1st rebuttal on topic: 100%
      // 2nd rebuttal on topic: 50%
      // 3rd+ rebuttal on topic: flat 5 max
      const priorTopicRebuttals = await DebateRebuttal.countDocuments({
        user: req.user._id,
        topic: rebuttal.topic._id,
        status: 'completed',
      });

      if (priorTopicRebuttals === 1) {
        rawBonus = Math.round(rawBonus * 0.5);
      } else if (priorTopicRebuttals >= 2) {
        rawBonus = Math.min(5, rawBonus);
      }

      // Check user's daily debate cap
      const userTz = (req.user && req.user.timezone) || 'Asia/Kolkata';
      const todayStr = getDateInTimezone(new Date(), userTz);

      const recentAttempts = await DebateAttempt.find({
        user: req.user._id,
        createdAt: { $gte: new Date(Date.now() - 36 * 3600 * 1000) },
      }).select('createdAt xpAwarded');
      const dailyAttemptXp = recentAttempts
        .filter((a) => getDateInTimezone(a.createdAt, userTz) === todayStr)
        .reduce((sum, a) => sum + (a.xpAwarded || 0), 0);

      const recentRebuttals = await DebateRebuttal.find({
        user: req.user._id,
        createdAt: { $gte: new Date(Date.now() - 36 * 3600 * 1000) },
      }).select('createdAt xpAwarded');
      const dailyRebuttalXp = recentRebuttals
        .filter((r) => getDateInTimezone(r.createdAt, userTz) === todayStr)
        .reduce((sum, r) => sum + (r.xpAwarded || 0), 0);

      const dailyTotal = dailyAttemptXp + dailyRebuttalXp;
      const remainingCap = Math.max(0, 150 - dailyTotal);
      rebuttalXp = Math.min(rawBonus, remainingCap);
    }

    rebuttal.rebuttalTranscript = sanitized;
    rebuttal.durationSeconds = isTyped ? 0 : Math.max(0, Number(durationSeconds) || 0);
    rebuttal.mode = isTyped ? 'typed' : 'timed';
    rebuttal.deliveryMetrics = undefined; // Typed gets no timing metrics
    rebuttal.scores = scoredResult.scores;
    rebuttal.feedback = scoredResult.feedback;
    rebuttal.evaluator = scoredResult.evaluator;
    rebuttal.confidence = scoredResult.confidence;
    rebuttal.modelName = scoredResult.modelName || '';
    rebuttal.xpAwarded = rebuttalXp;
    rebuttal.status = 'completed';
    rebuttal.idempotencyKey = idempotencyKey ? String(idempotencyKey) : undefined;
    await rebuttal.save();

    if (rebuttalXp > 0) {
      await awardXP(req.user, rebuttalXp);
    }

    // Check rebuttal_ready badge: 3 completed rebuttals with overall >= 70
    const newBadges = [];
    const highScoringRebuttals = await DebateRebuttal.countDocuments({
      user: req.user._id,
      status: 'completed',
      'scores.overall': { $gte: 70 },
    });
    if (highScoringRebuttals >= 3) {
      const badge = await maybeAwardBadge(req.user, 'rebuttal_ready');
      if (badge) newBadges.push(badge);
    }

    res.status(200).json({
      rebuttal,
      xpAwarded: rebuttalXp,
      xpBreakdown: {
        rebuttalXp,
        qualifiesForBonus: overallScore >= 40,
        overallScore,
      },
      newBadges,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.generateAssignedStanceToken = generateAssignedStanceToken;
router.verifyAssignedStanceToken = verifyAssignedStanceToken;
router.getDeterministicAssignedStance = getDeterministicAssignedStance;
router.calculateDebateDeliveryMetrics = calculateDebateDeliveryMetrics;
router.calculateDebateXP = calculateDebateXP;
router.evaluateDebateBadges = evaluateDebateBadges;
router.getDateInTimezone = getDateInTimezone;
router.generateRebuttalToken = generateRebuttalToken;
router.verifyRebuttalToken = verifyRebuttalToken;

module.exports = router;
