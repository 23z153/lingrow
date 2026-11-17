/**
 * worldStageEngine.js — World Stage Central Orchestration Engine
 * Coordinates stage catalogs, session creation, speech ingestion,
 * live audience interactions, and final performance evaluations.
 */

const WorldStageScenario = require('../models/WorldStageScenario');
const WorldStageSession = require('../models/WorldStageSession');
const { generateAudiencePool, generateLiveAudienceReactions, generateAudienceQuestion, evaluateAudienceAnswer } = require('./audienceEngine');
const { evaluateWorldStageSpeech } = require('./performanceEvaluator');
const { awardXP, maybeAwardBadge } = require('./progressService');

const DEFAULT_STAGES = [
  {
    stageId: 'ted-talk',
    name: 'TED Talk Stage',
    subtitle: 'Ideas Worth Spreading',
    description: 'Stand on the iconic circular red carpet before a captivated audience of innovators, design thinkers, and passionate learners.',
    atmosphere: {
      lighting: 'Warm overhead spotlight on red carpet, darkened auditorium',
      backdrop: 'High-contrast curved LED display with inspirational themes',
      audioAmbience: 'Attentive silence with bursts of enthusiastic applause',
    },
    icon: 'mic',
    badge: 'Iconic',
    suggestedTopics: [
      {
        topicId: 'ted-1',
        title: 'Why Failure is the Best Learning Algorithm',
        category: 'Personal Growth',
        difficulty: 'All Levels',
        prompt: 'Share a compelling narrative on how embracing setbacks cultivates genuine innovation and resilience.',
        talkingPoints: ['The myth of overnight success', 'Reframing mistakes as iterative data', 'A personal moment of turning defeat into growth'],
      },
      {
        topicId: 'ted-2',
        title: 'Redesigning Education for the AI Century',
        category: 'Technology & Society',
        difficulty: 'Intermediate',
        prompt: 'Argue why standard memorization is obsolete and how creative problem-solving must lead tomorrow’s curricula.',
        talkingPoints: ['The shift from information recall to critical synthesis', 'Human-AI collaborative learning models', 'Fostering lifelong curiosity'],
      },
      {
        topicId: 'ted-3',
        title: 'The Invisible Superpower of Everyday Empathy',
        category: 'Human Connection',
        difficulty: 'Beginner',
        prompt: 'Explore how deep active listening transforms workplace leadership and cross-cultural understanding.',
        talkingPoints: ['Listening to understand versus listening to reply', 'Empathy as an engineering asset', 'Breaking down polarization'],
      },
    ],
  },
  {
    stageId: 'college-seminar',
    name: 'College Seminar Hall',
    subtitle: 'Academic Research & Peer Defense',
    description: 'Present your thesis, engineering research, or case study before academic professors, research scholars, and curious students.',
    atmosphere: {
      lighting: 'Bright amphitheater illumination, tiered wooden lecture seating',
      backdrop: 'Dual high-resolution research slide projectors',
      audioAmbience: 'Rustling of notebooks, thoughtful murmurs, academic note-taking',
    },
    icon: 'book',
    badge: 'Academic',
    suggestedTopics: [
      {
        topicId: 'col-1',
        title: 'Ethics and Accountability in Autonomous AI Systems',
        category: 'Computer Science & Ethics',
        difficulty: 'Intermediate',
        prompt: 'Defend a framework for algorithmic transparency and explainability in high-stakes automated decisions.',
        talkingPoints: ['Algorithmic bias in training data', 'The black-box problem in neural networks', 'Institutional liability and oversight'],
      },
      {
        topicId: 'col-2',
        title: 'Accelerating the Renewable Energy Grid Transition',
        category: 'Environmental Engineering',
        difficulty: 'Advanced',
        prompt: 'Analyze grid modernization trade-offs between battery storage, decentralized solar, and baseload stability.',
        talkingPoints: ['Grid intermittency challenges', 'Next-generation battery chemistries', 'Policy incentives and economic parity'],
      },
      {
        topicId: 'col-3',
        title: 'The Cognitive Impact of Micro-Habits on Academic Focus',
        category: 'Cognitive Science',
        difficulty: 'Beginner',
        prompt: 'Explain the neuroscience of attention spans and how small deliberate daily rituals enhance deep work.',
        talkingPoints: ['Dopamine loops and notification fatigue', 'The 25-minute Pomodoro neurochemistry', 'Building sustainable study rituals'],
      },
    ],
  },
  {
    stageId: 'corporate-conference',
    name: 'Corporate Conference',
    subtitle: 'Executive Keynotes & Industry Summits',
    description: 'Deliver strategic presentations to corporate executives, department heads, venture investors, and industry analysts.',
    atmosphere: {
      lighting: 'Sleek corporate blue and purple stage washes, dual podium monitors',
      backdrop: 'Wide widescreen presentation panels with animated data visuals',
      audioAmbience: 'Professional murmur, camera flashes, focused executive attention',
    },
    icon: 'briefcase',
    badge: 'Executive',
    suggestedTopics: [
      {
        topicId: 'corp-1',
        title: 'Building Resilient and Scalable Cloud Architectures',
        category: 'Enterprise Engineering',
        difficulty: 'Advanced',
        prompt: 'Present a strategic migration roadmap that reduces cloud expenditure while maintaining 99.99% uptime.',
        talkingPoints: ['Decoupling monolithic dependencies', 'Automated failover and disaster recovery', 'Balancing cloud cost optimization with latency'],
      },
      {
        topicId: 'corp-2',
        title: 'Cultivating Cross-Functional Alignment in Remote Teams',
        category: 'Organizational Leadership',
        difficulty: 'Intermediate',
        prompt: 'Outline modern communication protocols that maintain momentum and transparent accountability across distributed teams.',
        talkingPoints: ['Asynchronous documentation over meeting overload', 'KPI transparency via dashboards', 'Psychological safety in digital workspaces'],
      },
      {
        topicId: 'corp-3',
        title: 'Customer-Centric Product Strategy in Volatile Markets',
        category: 'Product & Growth',
        difficulty: 'Beginner',
        prompt: 'Explain how rapid user feedback loops enable companies to adapt products ahead of market downturns.',
        talkingPoints: ['Continuous user interviewing techniques', 'Feature prioritization using RICE scoring', 'Aligning product roadmap with core retention'],
      },
    ],
  },
  {
    stageId: 'debate-arena',
    name: 'Debate Arena',
    subtitle: 'Competitive Rhetoric & Argumentation',
    description: 'Face tough adjudicators, opposing debaters, and an engaged arena crowd in a high-stakes competitive debate format.',
    atmosphere: {
      lighting: 'Dramatic spotlighting on dual opposing podiums, arena floodlights',
      backdrop: 'Live timer countdown display and audience voting bars',
      audioAmbience: 'Challenger cross-examinations, gasps, and applause for sharp points',
    },
    icon: 'podium',
    badge: 'Competitive',
    suggestedTopics: [
      {
        topicId: 'deb-1',
        title: 'Universal Basic Income in the Era of Automation',
        category: 'Economics & Public Policy',
        difficulty: 'Advanced',
        prompt: 'Defend or oppose the motion: This House would mandate Universal Basic Income to mitigate automation job displacement.',
        talkingPoints: ['Economic productivity vs dependency arguments', 'Inflationary risks and tax restructuring', 'Human dignity and entrepreneurship'],
      },
      {
        topicId: 'deb-2',
        title: 'Prioritizing Earth Climate Restoration Over Mars Colonization',
        category: 'Science & Humanity',
        difficulty: 'Intermediate',
        prompt: 'Argue whether space exploration budgets should be reallocated to urgent planetary climate preservation.',
        talkingPoints: ['Existential risk and multi-planetary survival', 'Immediate return on climate mitigation capital', 'Technological spin-offs from aerospace'],
      },
      {
        topicId: 'deb-3',
        title: 'Standardized Entrance Exams Do More Harm Than Good',
        category: 'Education Policy',
        difficulty: 'Beginner',
        prompt: 'Argue whether university admissions should completely eliminate standardized testing in favor of holistic evaluations.',
        talkingPoints: ['Socioeconomic bias in test prep accessibility', 'Predictive validity of high-stakes testing', 'Holistic portfolio and interview alternatives'],
      },
    ],
  },
  {
    stageId: 'global-summit',
    name: 'Global Summit',
    subtitle: 'International Diplomacy & Multilateral Accords',
    description: 'Address international delegates, foreign ambassadors, and global journalists at a premier multilateral forum.',
    atmosphere: {
      lighting: 'Grand diplomatic hall lighting, semicircular assembly tiers with country flags',
      backdrop: 'Multilingual digital transcription screens and press gallery',
      audioAmbience: 'Simultaneous interpretation whispers, formal diplomatic decorum',
    },
    icon: 'globe',
    badge: 'Global',
    suggestedTopics: [
      {
        topicId: 'sum-1',
        title: 'Multilateral Cyber Warfare Treaties and Digital Sovereignty',
        category: 'International Relations',
        difficulty: 'Advanced',
        prompt: 'Propose a binding international accord governing state-sponsored cyber offensives on critical civil infrastructure.',
        talkingPoints: ['Attribution challenges in cyberspace', 'Protecting hospitals, energy grids, and water supplies', 'Enforcement mechanisms and trade sanctions'],
      },
      {
        topicId: 'sum-2',
        title: 'Equitable Global Distribution of Pandemic Vaccines and Medicine',
        category: 'Global Health',
        difficulty: 'Intermediate',
        prompt: 'Champion an international patent-sharing framework to safeguard developing nations during public health crises.',
        talkingPoints: ['TRIPS patent waiver debates', 'Regional pharmaceutical manufacturing hubs', 'Global supply chain resilience'],
      },
      {
        topicId: 'sum-3',
        title: 'Youth Civic Participation as a Pillar of Democratic Longevity',
        category: 'Civic Engagement',
        difficulty: 'Beginner',
        prompt: 'Advocate for empowering youth representation in legislative and international climate policymaking bodies.',
        talkingPoints: ['Intergenerational justice and climate impact', 'Lowering voting thresholds and youth parliaments', 'Digital civic engagement avenues'],
      },
    ],
  },
];

/**
 * Seeds scenarios collection if empty
 */
async function seedWorldStageScenariosIfEmpty() {
  try {
    const count = await WorldStageScenario.countDocuments();
    if (count === 0) {
      await WorldStageScenario.insertMany(DEFAULT_STAGES);
      return { seeded: true, count: DEFAULT_STAGES.length };
    }
    // Upsert any missing stage definitions
    for (const stage of DEFAULT_STAGES) {
      await WorldStageScenario.findOneAndUpdate(
        { stageId: stage.stageId },
        { $setOnInsert: stage },
        { upsert: true }
      );
    }
    return { seeded: false, count };
  } catch (err) {
    console.error('[worldStageEngine] Error seeding stages:', err.message);
    return { error: err.message };
  }
}

/**
 * Starts a new World Stage session
 */
async function createWorldStageSession({
  user,
  stageId,
  topic,
  difficulty = 'Intermediate',
  audienceSize = 30,
  targetDurationMinutes = 3,
  mode = 'practice',
  inputMode = 'voice',
  feedbackTiming = 'after',
}) {
  await seedWorldStageScenariosIfEmpty();

  const stage = await WorldStageScenario.findOne({ stageId }) || DEFAULT_STAGES.find((s) => s.stageId === stageId);
  const stageName = stage ? stage.name : 'Public Speaking Stage';

  // Generate audience member grid
  const audiencePool = generateAudiencePool({ stageId, audienceSize });

  const session = await WorldStageSession.create({
    user: user._id,
    stageId,
    stageName,
    topic: topic || 'The Future of Public Speaking',
    difficulty,
    audienceSize,
    targetDurationMinutes,
    mode,
    inputMode,
    feedbackTiming,
    status: 'active',
    startedAt: new Date(),
    audienceMembers: audiencePool,
    speechSegments: [],
    recentReactions: [
      {
        reaction: 'Audience waiting attentively',
        emoji: '👀',
        label: 'Ready for speech',
        memberName: audiencePool[0]?.name || 'Audience',
        timestamp: new Date(),
      },
    ],
  });

  return { session, stage };
}

/**
 * Appends a speech segment and triggers live audience reactions
 */
async function appendSpeechSegment({
  session,
  text,
  audioDurationSeconds = 0,
  measuredDuration = false,
}) {
  const cleanText = (text || '').trim();
  if (!cleanText) return { session, newReactions: [] };

  const segment = {
    text: cleanText,
    audioDurationSeconds: Number(audioDurationSeconds) || 0,
    measuredDuration: Boolean(measuredDuration),
    timestamp: new Date(),
  };

  session.speechSegments.push(segment);
  session.fullTranscript = (session.fullTranscript ? session.fullTranscript + ' ' : '') + cleanText;

  if (audioDurationSeconds > 0) {
    session.totalDurationSeconds = (session.totalDurationSeconds || 0) + Number(audioDurationSeconds);
  }

  // Generate live audience reaction
  const newReactions = generateLiveAudienceReactions({
    audiencePool: session.audienceMembers,
    speechText: cleanText,
    stageId: session.stageId,
  });

  if (newReactions.length > 0) {
    session.recentReactions = [...session.recentReactions.slice(-8), ...newReactions];
  }

  await session.save();

  return {
    session,
    newReactions,
  };
}

/**
 * Orchestrates a live audience question during the presentation
 */
async function triggerAudienceQuestion({ session }) {
  const stageScenario = await WorldStageScenario.findOne({ stageId: session.stageId });
  const questionData = await generateAudienceQuestion({
    session,
    stageScenario,
    speechTranscript: session.fullTranscript,
  });

  session.questions.push({
    questionId: questionData.questionId,
    askerId: questionData.askerId,
    askerName: questionData.askerName,
    askerRole: questionData.askerRole,
    askerArchetype: questionData.askerArchetype,
    questionText: questionData.questionText,
    askedAt: new Date(),
  });

  // Add reaction of audience member stepping up
  session.recentReactions.push({
    reaction: `${questionData.askerName} raised a question`,
    emoji: '❓',
    label: 'Asking question',
    memberName: questionData.askerName,
    timestamp: new Date(),
  });

  await session.save();

  return {
    question: questionData,
    session,
  };
}

/**
 * Submits an answer to an audience question
 */
async function submitAudienceAnswer({ session, questionId, answerText }) {
  const q = session.questions.find((item) => item.questionId === questionId);
  if (!q) {
    throw new Error('Question not found in this session');
  }

  q.answerText = (answerText || '').trim();
  q.answeredAt = new Date();

  // Evaluate answer
  const evalResult = await evaluateAudienceAnswer({ question: q, answerText });
  q.feedback = evalResult;

  // Add reaction to the answer
  session.recentReactions.push({
    reaction: `${q.askerName} nodded to your answer`,
    emoji: evalResult.reaction === 'satisfied' ? '👍' : '🤔',
    label: evalResult.reaction === 'satisfied' ? 'Satisfied with answer' : 'Considering reply',
    memberName: q.askerName,
    timestamp: new Date(),
  });

  await session.save();

  return {
    session,
    question: q,
  };
}

/**
 * Ends session and generates 100-point performance report
 */
async function endSessionAndEvaluate({ session, user }) {
  if (session.status === 'completed' && session.evaluation?.overallScore !== undefined) {
    return {
      session,
      evaluation: session.evaluation,
      xpAwarded: session.xpAwarded || 0,
      alreadyCompleted: true,
    };
  }

  session.status = 'completed';
  session.endedAt = new Date();

  // Find previous completed session for comparison
  const previousSession = await WorldStageSession.findOne({
    user: user._id,
    status: 'completed',
    _id: { $ne: session._id },
  }).sort({ createdAt: -1 });

  const evaluation = evaluateWorldStageSpeech({ session, previousSession });
  session.evaluation = evaluation;

  // Calculate XP (30 to 50 XP based on performance & speech duration)
  let xp = 30;
  if (evaluation.overallScore >= 75) xp += 10;
  if (evaluation.overallScore >= 85) xp += 10;
  if (session.targetDurationMinutes >= 5) xp += 5;

  session.xpAwarded = xp;

  if (!session.xpAlreadyClaimed) {
    session.xpAlreadyClaimed = true;
    await session.save();

    // Award XP via progressService
    await awardXP(user, xp);

    // Update streak if score >= 40
    if (evaluation.overallScore >= 40) {
      const now = new Date();
      const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
      if (!last) {
        user.streak = 1;
      } else {
        const diffHours = (now - last) / (1000 * 60 * 60);
        if (diffHours >= 20 && diffHours <= 48) {
          user.streak = (user.streak || 0) + 1;
        } else if (diffHours > 48) {
          user.streak = 1;
        }
      }
      user.lastActiveDate = now;
      await user.save();
    }

    // Award stage badge if score >= 85
    if (evaluation.overallScore >= 85) {
      await maybeAwardBadge(user, 'consistent_debater', 25);
    }
  } else {
    await session.save();
  }

  return {
    session,
    evaluation,
    xpAwarded: xp,
    alreadyCompleted: false,
  };
}

module.exports = {
  DEFAULT_STAGES,
  seedWorldStageScenariosIfEmpty,
  createWorldStageSession,
  appendSpeechSegment,
  triggerAudienceQuestion,
  submitAudienceAnswer,
  endSessionAndEvaluate,
};
