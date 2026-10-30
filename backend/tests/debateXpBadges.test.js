const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const DebateTopic = require('../src/models/DebateTopic');
const DebateAttempt = require('../src/models/DebateAttempt');
const DebateRebuttal = require('../src/models/DebateRebuttal');
const UserBadge = require('../src/models/UserBadge');
const { signAccessToken } = require('../src/utils/tokens');

const app = createApp();

describe('Debate: XP Anti-Exploit Formula, Badges Atomicity & History Trends', () => {
  let token;
  let user;
  let topicA;
  let topicB;
  let topicCSE;

  const validSpeech45Words =
    'Firstly, adopting generative AI tutors creates an unprecedented democratization of collegiate learning by providing real-time responsive guidance to every undergraduate student regardless of economic background. Furthermore, static textbooks cannot adapt to idiosyncratic cognitive roadblocks. On the contrary, interactive models assess comprehension dynamically. Therefore, modern academic institutions must embrace digital pedagogy immediately.';

  beforeEach(async () => {
    await DebateTopic.deleteMany({});
    await DebateAttempt.deleteMany({});
    await DebateRebuttal.deleteMany({});
    await UserBadge.deleteMany({});

    topicA = await DebateTopic.create({
      topic: 'Topic A: Should attendance be mandatory for undergraduates?',
      level: 'Intermediate',
      department: 'General',
      active: true,
      forKeyPoints: ['Ensures regular student engagement', 'Fosters peer discussions'],
      againstKeyPoints: ['Restricts independent study autonomy', 'Encourages passive attendance'],
    });

    topicB = await DebateTopic.create({
      topic: 'Topic B: Is remote work superior to office collaboration?',
      level: 'Advanced',
      department: 'General',
      active: true,
      forKeyPoints: ['Saves commuting hours', 'Expands global hiring'],
      againstKeyPoints: ['Reduces spontaneous mentorship', 'Increases digital fatigue'],
    });

    topicCSE = await DebateTopic.create({
      topic: 'Topic CSE: Should microservices always replace monolithic architectures?',
      level: 'Intermediate',
      department: 'CSE',
      active: true,
      forKeyPoints: ['Independent team scaling', 'Fault isolation across modules'],
      againstKeyPoints: ['Distributed transaction complexity', 'Elevated network latency'],
    });

    user = new User({
      name: 'XP Debater',
      email: `xpdebater.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'student',
      xp: 400,
      level: 'Intermediate',
    });
    await user.setPassword('secret123');
    await user.save();

    token = signAccessToken(user);
  });

  describe('Phase 4: XP Formula, Improvement/Stance Bonuses & Caps', () => {
    test('awards base XP according to 15 + overall/5 without bonuses for first standard attempt', async () => {
      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 80,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });

      expect(xp.base).toBe(31);
      expect(xp.improvementBonus).toBe(0);
      expect(xp.stanceBonus).toBe(0);
      expect(xp.total).toBe(31);
      expect(xp.capped).toBe(false);
    });

    test('awards improvement bonus (+5 per 5 pts, max +15) on re-attempting same topic & stance', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 60 },
      });

      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 78,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });

      expect(xp.base).toBe(31);
      expect(xp.improvementBonus).toBe(15);
      expect(xp.subtotal).toBe(46);
      expect(xp.diminishingCategory).toBe('half');
      expect(xp.total).toBe(23);
    });

    test('anti-exploit: prevents tank-then-recover exploit by comparing strictly against personal best', async () => {
      const debateRouter = require('../src/routes/debate');
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 85 },
      });

      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 45 },
      });

      const xpAttempt3 = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });

      expect(xpAttempt3.personalBestBefore).toBe(85);
      expect(xpAttempt3.improvementBonus).toBe(0);

      const xpAttempt4 = await debateRouter.calculateDebateXP({
        overallScore: 92,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });

      expect(xpAttempt4.personalBestBefore).toBe(85);
      expect(xpAttempt4.improvementBonus).toBe(5);
    });

    test('diminishing returns on repeat attempts on same topic+stance (1st full, 2nd half, 3rd+ flat 5)', async () => {
      const debateRouter = require('../src/routes/debate');
      const xp1 = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });
      expect(xp1.repeatAttemptCount).toBe(0);
      expect(xp1.diminishingCategory).toBe('full');
      expect(xp1.total).toBe(xp1.subtotal);

      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });

      const xp2 = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });
      expect(xp2.repeatAttemptCount).toBe(1);
      expect(xp2.diminishingCategory).toBe('half');
      expect(xp2.total).toBe(Math.round(xp2.subtotal * 0.5));

      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });

      const xp3 = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });
      expect(xp3.repeatAttemptCount).toBe(2);
      expect(xp3.diminishingCategory).toBe('flat5');
      expect(xp3.total).toBe(5);

      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });

      const xp4 = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });
      expect(xp4.repeatAttemptCount).toBe(3);
      expect(xp4.diminishingCategory).toBe('flat5');
      expect(xp4.total).toBe(5);
    });

    test('awards stance agility bonus (+5) for assigned stance attempt', async () => {
      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 70,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: true,
      });

      expect(xp.stanceBonus).toBe(5);
      expect(xp.total).toBe(34);
    });

    test('awards stance agility bonus (+5) when arguing opposite stance on same topic', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });

      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicA._id,
        stance: 'against',
        isAssigned: false,
      });

      expect(xp.stanceBonus).toBe(5);
    });

    test('anti-farming: grants zero bonuses if overall score < 40', async () => {
      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 35,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: true,
      });

      expect(xp.improvementBonus).toBe(0);
      expect(xp.stanceBonus).toBe(0);
      expect(xp.total).toBe(22);
    });

    test('skips improvement and stance bonuses when mode is typed', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 60 },
      });

      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 80,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: true,
        mode: 'typed',
      });

      expect(xp.improvementBonus).toBe(0);
      expect(xp.stanceBonus).toBe(0);
      expect(xp.typedModeNoBonuses).toBe(true);
    });

    test('enforces 150 daily debate XP cap across attempts and rebuttals in user timezone', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
        xpAwarded: 70,
        createdAt: new Date(),
      });
      await DebateRebuttal.create({
        user: user._id,
        openingAttempt: new (require('mongoose').Types.ObjectId)(),
        topic: topicA._id,
        openingStance: 'for',
        counterStance: 'against',
        counterArgument: 'Counter speech',
        rebuttalTranscript: validSpeech45Words,
        scores: { overall: 75 },
        xpAwarded: 70,
        status: 'completed',
        createdAt: new Date(),
      });

      const debateRouter = require('../src/routes/debate');
      const xpClamped = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicB._id,
        stance: 'for',
        isAssigned: false,
      });

      expect(xpClamped.dailyDebateXpEarnedBefore).toBe(140);
      expect(xpClamped.dailyCapRemaining).toBe(10);
      expect(xpClamped.total).toBe(10);

      await DebateAttempt.create({
        user: user._id,
        topic: topicB._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
        xpAwarded: 10,
        createdAt: new Date(),
      });

      const xpCappedOut = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicCSE._id,
        stance: 'for',
        isAssigned: false,
      });

      expect(xpCappedOut.dailyCapRemaining).toBe(0);
      expect(xpCappedOut.total).toBe(0);
      expect(xpCappedOut.dailyCapReached).toBe(true);
    });

    test('caps total XP per attempt at 50 max and flags capped:true', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 60 },
      });

      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 95,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: true,
      });

      expect(xp.subtotal).toBe(50);
      expect(xp.capped).toBe(true);
      expect(xp.total).toBe(25);
    });
  });

  describe('Phase 4: Debate Badges & Atomic Concurrent Awards', () => {
    test('awards first_debate badge on first completed debate', async () => {
      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicA._id, 'for', 75);
      expect(badges.some((b) => b.key === 'first_debate')).toBe(true);
    });

    test('awards debate_champion when overall score >= 85', async () => {
      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicA._id, 'for', 88);
      expect(badges.some((b) => b.key === 'debate_champion')).toBe(true);
    });

    test('awards both_sides badge when user argues both FOR and AGAINST on the same topic', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });

      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicA._id, 'against', 75);
      expect(badges.some((b) => b.key === 'both_sides')).toBe(true);
    });

    test('awards consistent_debater badge after 3 consecutive attempts with overall >= 70', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 72 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicB._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 70 },
      });

      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicB._id, 'for', 70);
      expect(badges.some((b) => b.key === 'consistent_debater')).toBe(true);
    });

    test('awards debate_streak_5 using Asia/Kolkata day boundaries and filters for overall >= 40', async () => {
      const debateRouter = require('../src/routes/debate');

      expect(debateRouter.getDateInTimezone(new Date('2026-10-30T18:29:59.000Z'))).toBe('2026-10-30');
      expect(debateRouter.getDateInTimezone(new Date('2026-10-30T18:30:00.000Z'))).toBe('2026-10-31');
      expect(debateRouter.getDateInTimezone(new Date('2026-10-31T00:00:00.000Z'))).toBe('2026-10-31');

      const dates = [
        '2026-10-26T10:00:00.000Z',
        '2026-10-27T10:00:00.000Z',
        '2026-10-28T10:00:00.000Z',
        '2026-10-29T10:00:00.000Z',
      ];

      for (const d of dates) {
        await DebateAttempt.create({
          user: user._id,
          topic: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          scores: { overall: 75 },
          createdAt: new Date(d),
        });
      }

      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 35 },
        createdAt: new Date('2026-10-30T10:00:00.000Z'),
      });

      const badgesFailing = await debateRouter.evaluateDebateBadges(user, topicA._id, 'for', 35);
      expect(badgesFailing.some((b) => b.key === 'debate_streak_5')).toBe(false);

      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
        createdAt: new Date('2026-10-30T12:00:00.000Z'),
      });

      const badgesPassing = await debateRouter.evaluateDebateBadges(user, topicA._id, 'for', 75);
      expect(badgesPassing.some((b) => b.key === 'debate_streak_5')).toBe(true);
    });

    test('awards debate_streak_5 for attempts on 5 consecutive days', async () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      // Seed attempts on 4 previous consecutive days + 1 today
      for (let i = 4; i >= 0; i--) {
        await DebateAttempt.create({
          user: user._id,
          topic: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          scores: { overall: 75 },
          createdAt: new Date(now - i * oneDay),
        });
      }

      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicA._id, 'for', 75);
      expect(badges.some((b) => b.key === 'debate_streak_5')).toBe(true);
    });

    test('atomic protection: does not double award badge even if maybeAwardBadge is called concurrently', async () => {
      const { maybeAwardBadge } = require('../src/services/progressService');
      const [res1, res2] = await Promise.all([
        maybeAwardBadge(user, 'first_debate'),
        maybeAwardBadge(user, 'first_debate'),
      ]);

      // Exactly one succeeds and returns the badge, the other returns null due to atomic unique constraint
      const successes = [res1, res2].filter(Boolean);
      expect(successes.length).toBe(1);
    });

    test('atomic protection: does not double award badge or bonus XP on concurrent calls', async () => {
      const { maybeAwardBadge } = require('../src/services/progressService');
      const startXp = user.xp;

      const [res1, res2] = await Promise.all([
        maybeAwardBadge(user, 'first_debate', 40),
        maybeAwardBadge(user, 'first_debate', 40),
      ]);

      const successes = [res1, res2].filter(Boolean);
      expect(successes.length).toBe(1);

      const freshUser = await User.findById(user._id);
      expect(freshUser.xp).toBe(startXp + 40);
    });
  });

  describe('Phase 4: GET /api/debate/history Trend Series & Weakest Skill Tip', () => {
    test('returns per-metric chronological series, averages, and weakest skill coaching tip', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { logic: 85, persuasion: 60, clarity: 75, vocabulary: 80, structure: 70, overall: 74 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { logic: 90, persuasion: 65, clarity: 80, vocabulary: 85, structure: 75, overall: 79 },
      });

      const res = await request(app)
        .get('/api/debate/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.totalAttempts).toBe(2);
      expect(res.body.series.logic).toEqual([85, 90]);
      expect(res.body.series.persuasion).toEqual([60, 65]);
      expect(res.body.averages.persuasion).toBe(63);
      expect(res.body.weakestSkill.skill).toBe('persuasion');
      expect(typeof res.body.weakestSkill.tip).toBe('string');
      expect(res.body.weakestSkill.tip.length).toBeGreaterThan(10);
    });

    test('gracefully handles legacy attempts without structure/feedback in history series', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { argument: 82, counterargument: 78, clarity: 75, vocabulary: 70, overall: 76 },
      });

      const res = await request(app)
        .get('/api/debate/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.series.logic).toContain(82);
      expect(res.body.series.persuasion).toContain(78);
      expect(res.body.series.structure).toContain(null);
      expect(res.body.averages.structure).toBeNull();
      expect(res.body.weakestSkill.skill).not.toBe('structure');
    });
  });
});
