/**
 * audienceEngine.js — AI Audience Orchestration Service
 * Manages audience member generation, collective sentiment & live reactions,
 * and contextual persona-driven Q&A rounds.
 */

const { chatCompletion } = require('./ollamaClient');

// Archetype profiles and character pools
const ARCHETYPE_PROFILES = {
  supportive_listener: {
    avatarPrefix: 'supp',
    roles: ['Community Advocate', 'Design Thinker', 'Fellow Speaker', 'Creative Strategist'],
    personality: 'Encouraging, optimistic, appreciative of personal stories and vision.',
    reactions: [
      { emoji: '👏', label: 'Applauding vision', sentiment: 'positive' },
      { emoji: '✨', label: 'Inspired', sentiment: 'positive' },
      { emoji: '🙌', label: 'Resonating', sentiment: 'positive' },
    ],
    questionStyle: 'Asks about inspiring next steps, community impact, or future possibilities.',
  },
  strict_professor: {
    avatarPrefix: 'prof',
    roles: ['Department Dean', 'Research Chair', 'Academic Fellow', 'Senior Scholar'],
    personality: 'Rigorous, methodology-focused, scrutinizes evidence and logical structure.',
    reactions: [
      { emoji: '📝', label: 'Taking notes', sentiment: 'neutral' },
      { emoji: '🧐', label: 'Evaluating evidence', sentiment: 'neutral' },
      { emoji: '⚖️', label: 'Checking methodology', sentiment: 'neutral' },
    ],
    questionStyle: 'Demands specific citations, methodology clarification, or empirical limits.',
  },
  curious_student: {
    avatarPrefix: 'stud',
    roles: ['Graduate Researcher', 'Undergrad Innovator', 'Tech Enthusiast', 'Curious Learner'],
    personality: 'Enthusiastic, eager to learn practical applications and real-world tips.',
    reactions: [
      { emoji: '💡', label: 'Aha moment', sentiment: 'positive' },
      { emoji: '🙋', label: 'Eager to ask', sentiment: 'positive' },
      { emoji: '🤩', label: 'Fascinated', sentiment: 'positive' },
    ],
    questionStyle: 'Asks how everyday people or beginners can implement the ideas.',
  },
  industry_expert: {
    avatarPrefix: 'exp',
    roles: ['VP of Technology', 'Managing Director', 'Chief Architect', 'Operations Lead'],
    personality: 'Pragmatic, values scalability, unit economics, ROI, and risk management.',
    reactions: [
      { emoji: '📊', label: 'Assessing feasibility', sentiment: 'neutral' },
      { emoji: '🎯', label: 'Noting key takeaway', sentiment: 'positive' },
      { emoji: '📈', label: 'Considering market scale', sentiment: 'positive' },
    ],
    questionStyle: 'Inquires about trade-offs, bottlenecks, financial viability, or scaling challenges.',
  },
  skeptic: {
    avatarPrefix: 'skep',
    roles: ['Independent Critic', 'Debate Adjudicator', 'Risk Analyst', 'Devil’s Advocate'],
    personality: 'Challenging, questions assumptions, seeks contradictions or oversights.',
    reactions: [
      { emoji: '🤨', label: 'Questioning assumption', sentiment: 'negative' },
      { emoji: '⚠️', label: 'Spotted counterexample', sentiment: 'negative' },
      { emoji: '🤔', label: 'Weighing counterargument', sentiment: 'neutral' },
    ],
    questionStyle: 'Raises counter-arguments, worst-case scenarios, or conflicting data.',
  },
  journalist: {
    avatarPrefix: 'jour',
    roles: ['Tech Correspondent', 'Investigative Reporter', 'Editorial Columnist', 'Podcast Host'],
    personality: 'Focused on clarity, public accountability, bold headlines, and ethical implications.',
    reactions: [
      { emoji: '🎙️', label: 'Capturing quote', sentiment: 'neutral' },
      { emoji: '👀', label: 'Tracking controversy', sentiment: 'neutral' },
      { emoji: '🗞️', label: 'Formulating headline', sentiment: 'positive' },
    ],
    questionStyle: 'Asks pointed questions about public trust, ethics, or potential controversies.',
  },
  beginner_listener: {
    avatarPrefix: 'beg',
    roles: ['First-Time Attendee', 'General Public', 'Cross-Disciplinary Peer', 'Curious Novice'],
    personality: 'Appreciates simple metaphors, clear definitions, and relatable analogies.',
    reactions: [
      { emoji: '👍', label: 'Understands clearly', sentiment: 'positive' },
      { emoji: '❓', label: 'Pondering term', sentiment: 'neutral' },
      { emoji: '😊', label: 'Engaged', sentiment: 'positive' },
    ],
    questionStyle: 'Asks for a simpler analogy or what the concept means in daily life.',
  },
};

const SAMPLE_NAMES = [
  'Dr. Eleanor Wright', 'Marcus Sterling', 'Maya Lin', 'Alex Rivera',
  'Prof. Arthur Vance', 'Samira Patel', 'Viktor Novak', 'Chloe Bennett',
  'Dr. Sanjay Rao', 'Tara Gomez', 'Liam O’Connor', 'Elena Rostova',
  'Jordan Hayes', 'Kevin Park', 'Dr. Miriam Campbell', 'David Kalu',
  'Rachel Zhao', 'Julian Alvarez', 'Nadia Benali', 'Gabriel Rossi',
];

/**
 * Generates an audience pool tailored to the selected stage and audience size
 */
function generateAudiencePool({ stageId, audienceSize = 30 }) {
  const archetypes = Object.keys(ARCHETYPE_PROFILES);
  const pool = [];

  // Guarantee balanced representation of archetypes
  for (let i = 0; i < audienceSize; i++) {
    const archetypeKey = archetypes[i % archetypes.length];
    const profile = ARCHETYPE_PROFILES[archetypeKey];
    const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length] + (i >= SAMPLE_NAMES.length ? ` ${Math.floor(i / SAMPLE_NAMES.length) + 1}` : '');
    const role = profile.roles[i % profile.roles.length];

    pool.push({
      memberId: `aud-${i + 1}`,
      name,
      role,
      archetype: archetypeKey,
      personality: profile.personality,
      currentReaction: 'listening',
      avatarSeed: `${profile.avatarPrefix}-${i + 1}`,
    });
  }

  return pool;
}

/**
 * Computes live audience reactions based on speech content and stage environment
 */
function generateLiveAudienceReactions({ audiencePool, speechText, stageId }) {
  const text = (speechText || '').toLowerCase();
  const reactions = [];

  // Pick 3-5 random audience members to trigger visible reactions
  const shuffled = [...audiencePool].sort(() => 0.5 - Math.random());
  const selectedMembers = shuffled.slice(0, Math.min(4, audiencePool.length));

  for (const member of selectedMembers) {
    const profile = ARCHETYPE_PROFILES[member.archetype] || ARCHETYPE_PROFILES.supportive_listener;
    let chosenReaction = profile.reactions[0];

    // Contextual reaction selection
    if (text.includes('future') || text.includes('imagine') || text.includes('vision') || text.includes('together')) {
      if (member.archetype === 'supportive_listener' || member.archetype === 'curious_student') {
        chosenReaction = { emoji: '👏', label: 'Applauding vision', sentiment: 'positive' };
      }
    } else if (text.includes('data') || text.includes('percent') || text.includes('research') || text.includes('evidence')) {
      if (member.archetype === 'strict_professor' || member.archetype === 'industry_expert') {
        chosenReaction = { emoji: '📝', label: 'Taking detailed notes', sentiment: 'neutral' };
      }
    } else if (text.includes('problem') || text.includes('challenge') || text.includes('crisis') || text.includes('risk')) {
      if (member.archetype === 'skeptic' || member.archetype === 'journalist') {
        chosenReaction = { emoji: '🤔', label: 'Analyzing risk', sentiment: 'neutral' };
      }
    } else if (text.includes('simple') || text.includes('example') || text.includes('like')) {
      if (member.archetype === 'beginner_listener') {
        chosenReaction = { emoji: '💡', label: 'Understands clearly', sentiment: 'positive' };
      }
    }

    reactions.push({
      reaction: chosenReaction.label,
      emoji: chosenReaction.emoji,
      label: chosenReaction.label,
      memberName: member.name,
      memberId: member.memberId,
      timestamp: new Date(),
    });
  }

  return reactions;
}

/**
 * Generates an unexpected, contextual audience question using a single orchestrator call
 */
async function generateAudienceQuestion({
  session,
  stageScenario,
  speechTranscript,
}) {
  const audience = session.audienceMembers || [];
  if (audience.length === 0) {
    return generateFallbackQuestion({ topic: session.topic, speechTranscript });
  }

  // Select an appropriate audience member who hasn't asked a question yet
  const askedMemberIds = (session.questions || []).map((q) => q.askerId);
  const eligible = audience.filter((m) => !askedMemberIds.includes(m.memberId));
  const chosenMember = eligible.length > 0
    ? eligible[Math.floor(Math.random() * eligible.length)]
    : audience[Math.floor(Math.random() * audience.length)];

  const profile = ARCHETYPE_PROFILES[chosenMember.archetype] || ARCHETYPE_PROFILES.curious_student;

  const promptMessages = [
    {
      role: 'system',
      content: `You are the Audience Orchestrator for the World Stage public speaking simulator.
Your task is to generate ONE realistic, concise audience question from the perspective of a specific audience member.

Stage: ${session.stageName}
Topic: ${session.topic}
Speaker Difficulty: ${session.difficulty}

Audience Member asking the question:
Name: ${chosenMember.name}
Role: ${chosenMember.role}
Archetype: ${chosenMember.archetype}
Personality: ${chosenMember.personality}
Question Style: ${profile.questionStyle}

Guidelines:
1. Address the speaker respectfully as a member of the audience.
2. Directly reference an argument or theme the speaker mentioned in their speech.
3. Keep the question between 1 to 3 clear sentences.
4. Output strict JSON with format:
{"questionText": "Your question here..."}`,
    },
    {
      role: 'user',
      content: `Here is the speaker's speech so far:
"""
${speechTranscript || 'The speaker is presenting on ' + session.topic}
"""

Generate the audience question in JSON.`,
    },
  ];

  try {
    const res = await chatCompletion({
      messages: promptMessages,
      temperature: 0.7,
      numPredict: 180,
      timeoutMs: 10000,
    });

    if (res && res.content) {
      const cleaned = res.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.questionText && parsed.questionText.trim()) {
        return {
          questionId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          askerId: chosenMember.memberId,
          askerName: chosenMember.name,
          askerRole: chosenMember.role,
          askerArchetype: chosenMember.archetype,
          questionText: parsed.questionText.trim(),
        };
      }
    }
  } catch (err) {
    // Graceful fallback to heuristic question generator
  }

  return generateFallbackQuestion({
    member: chosenMember,
    topic: session.topic,
    speechTranscript,
  });
}

/**
 * Intelligent deterministic fallback question generator when LLM is offline
 */
function generateFallbackQuestion({ member, topic, speechTranscript }) {
  const chosenMember = member || {
    memberId: 'aud-1',
    name: 'Dr. Eleanor Wright',
    role: 'Research Chair',
    archetype: 'strict_professor',
  };

  const text = (speechTranscript || '').toLowerCase();
  let question = `Thank you for sharing your thoughts on ${topic}. How do you plan to address the most critical bottleneck when putting these ideas into practice?`;

  switch (chosenMember.archetype) {
    case 'supportive_listener':
      question = `Thank you for such an inspiring talk on "${topic}". What first motivated you to advocate for this, and how can the audience best support your vision?`;
      break;
    case 'strict_professor':
      if (text.includes('data') || text.includes('research')) {
        question = `You mentioned key data points in your speech. What sample size or empirical methodology supports that conclusion, and are there limitations we should keep in mind?`;
      } else {
        question = `You made a compelling assertion regarding "${topic}". Could you provide concrete empirical evidence or case studies to reinforce that theoretical claim?`;
      }
      break;
    case 'curious_student':
      question = `As a student eager to learn more about this, what is the single most practical step or tool you would recommend we begin with tomorrow?`;
      break;
    case 'industry_expert':
      question = `From a commercial and scalability perspective, how does your approach on "${topic}" compete against established industry standards and financial trade-offs?`;
      break;
    case 'skeptic':
      question = `While your proposal sounds appealing, critics often argue that unforeseen side-effects could emerge. How would you respond to someone who says this approach is too risky or unviable?`;
      break;
    case 'journalist':
      question = `If our headline tomorrow reads that your plan for "${topic}" represents a major shift, what would be your key message to stakeholders who might be skeptical?`;
      break;
    case 'beginner_listener':
      question = `Could you share a simple real-life analogy that illustrates how this idea impacts ordinary individuals on a day-to-day basis?`;
      break;
  }

  return {
    questionId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    askerId: chosenMember.memberId,
    askerName: chosenMember.name,
    askerRole: chosenMember.role,
    askerArchetype: chosenMember.archetype,
    questionText: question,
  };
}

/**
 * Evaluates the speaker's answer to an audience question
 */
async function evaluateAudienceAnswer({ question, answerText }) {
  const text = (answerText || '').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount < 6) {
    return {
      reaction: 'partially_satisfied',
      comment: 'The response was quite brief. Elaborating with a specific example would address the question more thoroughly.',
    };
  }

  return {
    reaction: 'satisfied',
    comment: 'The speaker addressed the inquiry with conviction and directly tackled the core premise.',
  };
}

module.exports = {
  ARCHETYPE_PROFILES,
  generateAudiencePool,
  generateLiveAudienceReactions,
  generateAudienceQuestion,
  evaluateAudienceAnswer,
};
