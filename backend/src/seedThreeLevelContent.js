const GrammarTopic = require('./models/GrammarTopic');
const SituationalPhrase = require('./models/SituationalPhrase');
const StoryPrompt = require('./models/StoryPrompt');
const VocabWord = require('./models/VocabWord');
const Lesson = require('./models/Lesson');
const Test = require('./models/Test');
const WorldStageScenario = require('./models/WorldStageScenario');
const SimulationScenario = require('./models/SimulationScenario');

async function seedThreeLevelContent() {
  console.log('[progression-seed] Seeding complete 3-level learning content across all kingdoms...');

  // =========================================================================
  // 1. GRAMMAR CASTLE: Intermediate & Advanced Topics
  // =========================================================================
  const grammarTiers = [
    // INTERMEDIATE TOPIC 6: Conditionals
    {
      topicId: 6,
      title: 'Conditionals in Action (Zero, First, Second & Third)',
      category: 'Conditionals',
      unit: 'Intermediate Fluency',
      level: 'Intermediate',
      description: 'Master hypothetical situations, future possibilities, and past regrets using all four conditional structures.',
      ruleSummary: '• Zero Conditional: General truths (If water reaches 100°C, it boils).\n• First Conditional: Real future possibilities (If it rains, we will postpone the match).\n• Second Conditional: Unreal/hypothetical present (If I had a million dollars, I would build a school).\n• Third Conditional: Past regrets (If you had studied, you would have passed).',
      questions: [
        {
          question: 'If she ___ earlier tomorrow, we will catch the express train.',
          options: ['wakes up', 'woke up', 'will wake up', 'had woken up'],
          correctAnswer: 0,
          explanation: 'In the First Conditional, the if-clause takes the simple present tense ("wakes up"), while the main clause takes "will + verb".',
        },
        {
          question: 'If I were you, I ___ that job offer immediately.',
          options: ['accept', 'will accept', 'would accept', 'accepted'],
          correctAnswer: 2,
          explanation: 'Second conditional for hypothetical present advice uses "If I were you, I would accept...".',
        },
        {
          question: 'If the team ___ the bug yesterday, the product launch would not have been delayed.',
          options: ['fixed', 'fixes', 'had fixed', 'has fixed'],
          correctAnswer: 2,
          explanation: 'Third conditional requires past perfect ("had fixed") in the if-clause for an unreal past situation.',
        },
      ],
    },
    // INTERMEDIATE TOPIC 7: Phrasal Verbs
    {
      topicId: 7,
      title: 'Essential Phrasal Verbs for Fluent Speech',
      category: 'Phrasal Verbs',
      unit: 'Intermediate Fluency',
      level: 'Intermediate',
      description: 'Unlock natural spoken English by mastering high-frequency phrasal verbs in professional and academic settings.',
      ruleSummary: '• Look into: Investigate or examine.\n• Bring about: Cause to happen.\n• Put off: Postpone to a later time.\n• Call off: Cancel entirely.\n• Come up with: Produce or suggest an idea.',
      questions: [
        {
          question: 'The management promised to ___ the employee grievance immediately.',
          options: ['look into', 'look down', 'look off', 'look after'],
          correctAnswer: 0,
          explanation: '"Look into" means to investigate or thoroughly examine a problem.',
        },
        {
          question: 'Due to severe weather, the organizers had to ___ the symposium.',
          options: ['put through', 'call off', 'bring about', 'take over'],
          correctAnswer: 1,
          explanation: '"Call off" means to cancel an event that was scheduled.',
        },
        {
          question: 'Our engineering team needs to ___ a creative architectural workaround by Friday.',
          options: ['come up with', 'come around', 'come down to', 'come across'],
          correctAnswer: 0,
          explanation: '"Come up with" means to produce, devise, or propose a solution.',
        },
      ],
    },
    // ADVANCED TOPIC 8: Inversions & Rhetorical Fronting
    {
      topicId: 8,
      title: 'Advanced Negative Inversions & Rhetorical Fronting',
      category: 'Inversions',
      unit: 'Advanced Mastery',
      level: 'Advanced',
      description: 'Master sophisticated English syntax used in formal speeches, executive briefings, and academic literature.',
      ruleSummary: '• Fronted negative adverbs (Never, Rarely, Scarcely, Under no circumstances) require Subject-Auxiliary Inversion: Adverb + Auxiliary + Subject + Main Verb.\n• Example: "Rarely have I seen such dedication." (NOT "Rarely I have seen").\n• Example: "Under no circumstances should you disclose the key."',
      questions: [
        {
          question: 'Under no circumstances ___ the laboratory unattended during the experiment.',
          options: ['students should leave', 'should students leave', 'students leaves', 'shall students to leave'],
          correctAnswer: 1,
          explanation: 'Negative adverbial fronting with "Under no circumstances" strictly mandates subject-auxiliary inversion: "should students leave".',
        },
        {
          question: 'Scarcely ___ the assembly when the fire alarm sounded.',
          options: ['had we entered', 'we had entered', 'did we enter', 'were we entered'],
          correctAnswer: 0,
          explanation: '"Scarcely had + subject + past participle ... when" is the standard inversion formula for closely consecutive past events.',
        },
        {
          question: 'Not only ___ the quarterly target, but our team also set a new industry benchmark.',
          options: ['we achieved', 'did we achieve', 'we did achieve', 'have we achieve'],
          correctAnswer: 1,
          explanation: 'Fronting "Not only" requires inversion with auxiliary "did": "Not only did we achieve...".',
        },
      ],
    },
    // ADVANCED TOPIC 9: Mixed Conditionals & Subjunctive Precision
    {
      topicId: 9,
      title: 'Mixed Conditionals & Subjunctive Precision',
      category: 'Advanced Syntax',
      unit: 'Advanced Mastery',
      level: 'Advanced',
      description: 'Express complex temporal links between past causes and present realities with grammatical precision.',
      ruleSummary: '• Past Condition + Present Consequence: "If you had taken the job last year, you would be living in Tokyo today."\n• Present Condition + Past Consequence: "If she were not so stubborn, she would have accepted their apology yesterday."\n• Subjunctive mood: "I recommend that he be present."',
      questions: [
        {
          question: 'If the founders ___ the patent last year, our company would be the market leader today.',
          options: ['secured', 'had secured', 'secure', 'would secure'],
          correctAnswer: 1,
          explanation: 'Past cause ("had secured" last year) linking to present state ("would be" today) forms a mixed conditional.',
        },
        {
          question: 'The committee demanded that the chairperson ___ an independent inquiry immediately.',
          options: ['appoints', 'appoint', 'appointed', 'is appointing'],
          correctAnswer: 1,
          explanation: 'Subjunctive clauses with verbs of demand/recommendation require the base verb ("appoint").',
        },
        {
          question: 'If I ___ fluent in German, I would have applied for the Berlin fellowship last month.',
          options: ['were', 'was', 'am', 'had been being'],
          correctAnswer: 0,
          explanation: 'Present state ("If I were fluent") with past hypothetical outcome ("would have applied") uses subjunctive "were".',
        },
      ],
    },
  ];

  for (const g of grammarTiers) {
    await GrammarTopic.findOneAndUpdate(
      { topicId: g.topicId },
      { $set: g },
      { upsert: true, new: true }
    );
  }

  // =========================================================================
  // 2. CONVERSATION VILLAGE: Intermediate & Advanced Scenarios
  // =========================================================================
  const situationalTiers = [
    {
      title: 'Participating in an Agile Standup & Communicating Blockers',
      category: 'Professional & Jobs',
      level: 'Intermediate',
      situationContext: 'You are participating in a morning sprint standup with your engineering lead. You need to report what you finished yesterday, your plan for today, and a dependency blocker with a database schema.',
      phrases: [
        {
          speaker: 'Engineer',
          englishText: 'Yesterday I finalized the user authentication middleware. Today I am implementing the profile API.',
          explanation: 'States completed work and immediate plan concisely.',
        },
        {
          speaker: 'Engineer',
          englishText: 'However, I am currently blocked on the updated database schema migration from the backend team.',
          explanation: 'Clearly articulates a blocker without placing personal blame.',
        },
      ],
      interactivePrompts: [
        {
          prompt: 'How should you clearly communicate a blocker during a sprint standup?',
          options: [
            '"Someone broke the database so I am doing nothing today."',
            '"I completed the auth routes yesterday. Today I am on profile APIs, but I am currently blocked on the pending migration script."',
            '"Why hasn\'t the backend team done their job yet?"',
            '"Skip me, I have nothing to say."',
          ],
          correctAnswer: 1,
          explanation: 'Concise, constructive, and directly identifies the blocker.',
        },
      ],
    },
    {
      title: 'Executive Salary & Compensation Package Negotiation',
      category: 'Professional & Jobs',
      level: 'Advanced',
      situationContext: 'You have received an attractive offer for a Senior Engineer role. You want to negotiate a 15% increase in base salary and clarify performance equity incentives.',
      phrases: [
        {
          speaker: 'Candidate',
          englishText: 'I am thrilled about the opportunity to lead this architecture initiative. Based on the market data and my track record in distributed systems, I was hoping we could explore a base salary closer to ninety-five thousand.',
          explanation: 'Anchors negotiation with proven track record and industry metrics.',
        },
      ],
      interactivePrompts: [
        {
          prompt: 'How should you open the compensation negotiation call with the hiring manager?',
          options: [
            '"Your offer is way too low, match my expectations or I walk."',
            '"Thank you for this compelling offer. I am genuinely excited about the role, and I would love to discuss aligning the base compensation with my specialized distributed systems expertise."',
            '"Give me maximum equity right now."',
            '"I will accept whatever you offer without asking questions."',
          ],
          correctAnswer: 1,
          explanation: 'Expresses enthusiasm while professionally introducing the counter-proposal.',
        },
      ],
    },
  ];

  for (const s of situationalTiers) {
    await SituationalPhrase.findOneAndUpdate(
      { title: s.title },
      { $set: s },
      { upsert: true, new: true }
    );
  }

  // =========================================================================
  // 3. READING GRIMOIRES (STORY CONTINUATION): Beginner & Advanced Prompts
  // =========================================================================
  const storyTiers = [
    {
      title: 'A Sunny Morning in the College Courtyard',
      theme: 'Everyday Life',
      level: 'Beginner',
      openingNarration: 'The morning sun cast long golden shadows across the campus courtyard as students gathered near the grand fountain.',
      prompt: 'The morning sun cast long golden shadows across the campus courtyard as students gathered near the grand fountain. Priya held an envelope that had been delivered without a name...',
      suggestedWords: ['curious', 'whispered', 'unfolded', 'smile'],
      active: true,
    },
    {
      title: 'The Syndicate Infiltration',
      theme: 'Mystery & Inversion',
      level: 'Advanced',
      openingNarration: 'Under no circumstances should the vault seal be broken before sunrise, warned the archivist as footsteps echoed through the diplomatic corridor.',
      prompt: 'Under no circumstances should the vault seal be broken before sunrise, warned the archivist as footsteps echoed through the diplomatic corridor. Little did he realize that the council had already signed the warrant...',
      suggestedWords: ['rhetoric', 'treason', 'conspiracy', 'inversion', 'unprecedented'],
      active: true,
    },
  ];

  for (const st of storyTiers) {
    await StoryPrompt.findOneAndUpdate(
      { title: st.title },
      { $set: st },
      { upsert: true, new: true }
    );
  }

  // =========================================================================
  // 4. CURRICULUM SCROLLS (LESSONS): Beginner, Intermediate & Advanced
  // =========================================================================
  const lessonTiers = [
    {
      title: 'Foundations of English Grammar & Sentence Construction',
      level: 'Beginner',
      sections: [
        { heading: 'Subject, Verb, and Object', content: 'Every English sentence requires at least a subject and a verb: "The student reads." Adding an object adds precision: "The student reads the book."' },
        { heading: 'Singular and Plural Agreement', content: 'Singular subjects match with singular verbs: "He writes code." Plural subjects take base verbs: "They write code."' },
      ],
    },
    {
      title: 'Conversational Fluency & Idiomatic Usage',
      level: 'Intermediate',
      sections: [
        { heading: 'Using Natural Transitions', content: 'Connect thoughts using "Furthermore," "On the other hand," and "To put it another way."' },
        { heading: 'Avoiding Unconscious Hesitations', content: 'Replace filler sounds ("um", "uh") with silent deliberate micro-pauses.' },
      ],
    },
    {
      title: 'Executive Public Speaking & Rhetorical Devices',
      level: 'Advanced',
      sections: [
        { heading: 'Tricolon (The Rule of Three)', content: 'Audiences remember three rhythmic points: "We must adapt quickly, execute decisively, and communicate transparently."' },
        { heading: 'Antithesis and Inversion', content: 'Contrasting paired structures ("Not by chance, but by design") elevates executive authority.' },
      ],
    },
  ];

  for (const les of lessonTiers) {
    await Lesson.findOneAndUpdate(
      { title: les.title },
      { $set: les },
      { upsert: true, new: true }
    );
  }

  // =========================================================================
  // 5. ACADEMY TRIALS (TESTS): Beginner, Intermediate & Advanced
  // =========================================================================
  const testTiers = [
    {
      title: 'Beginner Diagnostic Assessment: Tenses & Agreement',
      category: 'Tenses',
      level: 'Beginner',
      durationMinutes: 15,
      status: 'published',
      targetType: 'ALL',
      questions: [
        {
          question: 'The professor ___ in Chennai since 2018.',
          options: ['lives', 'is living', 'has lived', 'lived'],
          correctAnswer: 2,
          explanation: 'Present perfect is used with "since" for ongoing duration.',
        },
        {
          question: 'Neither of the applicants ___ the minimum qualification criteria.',
          options: ['meet', 'meets', 'are meeting', 'have met'],
          correctAnswer: 1,
          explanation: '"Neither of" takes a singular verb ("meets").',
        },
      ],
    },
    {
      title: 'Intermediate Fluency Assessment: Conditionals & Phrasal Verbs',
      category: 'Conditionals',
      level: 'Intermediate',
      durationMinutes: 15,
      status: 'published',
      targetType: 'ALL',
      questions: [
        {
          question: 'If the server crashes, our automated failover script ___ traffic immediately.',
          options: ['reroutes', 'rerouted', 'will reroute', 'would reroute'],
          correctAnswer: 2,
          explanation: 'First conditional for real future possibility: "will reroute".',
        },
        {
          question: 'The engineering lead decided to ___ the release date until testing concludes.',
          options: ['put off', 'put in', 'put through', 'put over'],
          correctAnswer: 0,
          explanation: '"Put off" means to postpone.',
        },
      ],
    },
    {
      title: 'Advanced Mastery Assessment: Inversions & Executive Syntax',
      category: 'Inversions',
      level: 'Advanced',
      durationMinutes: 20,
      status: 'published',
      targetType: 'ALL',
      questions: [
        {
          question: 'Rarely ___ such unanimous consensus among the board members.',
          options: ['we saw', 'have we seen', 'we have seen', 'had we see'],
          correctAnswer: 1,
          explanation: 'Negative fronting with "Rarely" triggers subject-auxiliary inversion ("have we seen").',
        },
        {
          question: 'The CEO insisted that the audit report ___ presented before the shareholders meeting.',
          options: ['is', 'be', 'was', 'being'],
          correctAnswer: 1,
          explanation: 'Subjunctive requirement with "insisted that" takes base verb "be".',
        },
      ],
    },
  ];

  for (const t of testTiers) {
    await Test.findOneAndUpdate(
      { title: t.title },
      { $set: t },
      { upsert: true, new: true }
    );
  }

  // =========================================================================
  // 6. WORLD STAGE: Ensure each stage has explicit level
  // =========================================================================
  await WorldStageScenario.updateMany(
    { stageId: { $in: ['college-seminar'] } },
    { $set: { level: 'Intermediate' } }
  );
  await WorldStageScenario.updateMany(
    { stageId: { $in: ['ted-talk', 'corporate-conference', 'debate-arena', 'global-summit'] } },
    { $set: { level: 'Advanced' } }
  );

  console.log('[progression-seed] 3-level content seeding complete!');
}

module.exports = { seedThreeLevelContent };
