const SimulationScenario = require('../models/SimulationScenario');
const { chatCompletion } = require('./ollamaClient');

/**
 * AI Real-World Communication Simulator Engine
 * Provides scenario seeding, multi-turn character conversation,
 * in-turn learning feedback, hint generation, and 100-point performance evaluation.
 */

const DEFAULT_SCENARIOS = [
  // ----------------------- A. AI JOB INTERVIEW SIMULATOR -----------------------
  {
    environment: 'interview',
    scenarioId: 'interview-hr-intro',
    title: 'HR Screening & Self-Introduction',
    description: 'Practice introducing yourself, explaining your background, and answering core behavioral questions with a friendly corporate HR recruiter.',
    icon: 'user-check',
    level: 'All Levels',
    defaultDurationMinutes: 10,
    learningObjectives: [
      'Deliver a concise 90-second professional elevator pitch',
      'Explain career background and motivations naturally',
      'Handle common icebreaker and behavioral questions with poise',
    ],
    characters: [
      {
        characterId: 'sarah-hr',
        name: 'Sarah Jenkins',
        role: 'Senior Talent Acquisition Specialist',
        avatar: 'sarah',
        personality: 'Warm, encouraging, but keenly attentive to clarity and structure.',
        communicationStyle: 'Professional, welcoming, uses clear open-ended questions.',
        difficulty: 'Beginner',
        conversationObjectives: [
          'Greet candidate and establish rapport',
          'Ask for self-introduction',
          'Explore why the candidate applied for the role',
          'Inquire about top strengths and a past challenge',
        ],
      },
    ],
    initialPrompt: "Good morning! Thank you for joining me today. I've been reviewing your profile and was really looking forward to speaking with you. To start us off, could you briefly introduce yourself and share what inspired you to pursue this field?",
    systemPrompt: `You are Sarah Jenkins, a friendly and experienced Senior Talent Acquisition Specialist at a top global technology firm.
You are conducting a preliminary HR interview.
Your goal is to evaluate the candidate's communication clarity, professional self-introduction, enthusiasm, and career motivations.
Guidelines:
1. Be polite, encouraging, and natural.
2. Ask one focused question at a time.
3. Reference specific details the candidate mentioned in their previous response.
4. If their answer is too brief (e.g. fewer than 10 words), gently encourage them to elaborate with an example.
5. If their answer is clear, ask a natural follow-up about their past projects, teamwork experience, or motivations.
6. Keep your responses between 2 to 4 sentences.`,
    tips: [
      'Structure your intro: Present role -> Past achievements -> Future goals.',
      'Speak at an even pace; avoid one-word answers.',
      'Show genuine passion for continuous learning.',
    ],
  },
  {
    environment: 'interview',
    scenarioId: 'interview-tech-lead',
    title: 'Technical Deep-Dive & Project Explanation',
    description: 'Explain a technical project, architectural trade-offs, and how you solved a challenging software or engineering bug.',
    icon: 'code',
    level: 'Intermediate',
    defaultDurationMinutes: 10,
    learningObjectives: [
      'Articulate technical concepts clearly to peers and leads',
      'Explain problem-solving methodology and debugging steps',
      'Justify architectural choices and trade-offs under questioning',
    ],
    characters: [
      {
        characterId: 'david-tech',
        name: 'David Chen',
        role: 'Staff Software Architect',
        avatar: 'david',
        personality: 'Analytical, pragmatic, values precision, logic, and deep technical ownership.',
        communicationStyle: 'Direct, intellectually curious, asks sharp follow-ups about bottlenecks and trade-offs.',
        difficulty: 'Intermediate',
        conversationObjectives: [
          'Ask candidate to describe their most impactful project',
          'Drill down into architectural decisions and database/API design',
          'Probe how they diagnosed and fixed a production bug or performance bottleneck',
        ],
      },
    ],
    initialPrompt: "Hi there. Thanks for making time. Today I'd like to dive into your technical background and engineering approach. Could you walk me through the most challenging project you've worked on recently? Tell me about the architecture and your specific role in it.",
    systemPrompt: `You are David Chen, a Staff Software Architect interviewing a software engineer.
You care about real engineering rigor: system architecture, API design, scalability, and handling failures.
Guidelines:
1. Listen closely to the technologies and architectural patterns the candidate mentions.
2. Follow up with targeted technical questions: e.g. "Why did you choose that database?", "How did you handle race conditions or latency?", "How did you monitor system health?"
3. Challenge ambiguous claims politely (e.g., "Could you give me an example of how you profiled that slow query?").
4. Keep your responses crisp (2 to 4 sentences) and maintain an authentic senior engineering persona.`,
    tips: [
      'Use the STAR method: Situation, Task, Action, Result.',
      'State specific metrics if possible (e.g., reduced latency by 35%).',
      'Acknowledge trade-offs rather than claiming a solution was 100% flawless.',
    ],
  },
  {
    environment: 'interview',
    scenarioId: 'interview-behavioral-star',
    title: 'Behavioral & Leadership Conflict Scenarios',
    description: 'Navigate unexpected behavioral questions, handling disagreements with teammates, and demonstrating resilience.',
    icon: 'briefcase',
    level: 'Advanced',
    defaultDurationMinutes: 10,
    learningObjectives: [
      'Demonstrate emotional intelligence and constructive conflict resolution',
      'Answer unexpected probing questions without hesitation',
      'Frame setbacks as structured learning experiences',
    ],
    characters: [
      {
        characterId: 'marcus-vp',
        name: 'Marcus Vance',
        role: 'VP of Engineering',
        avatar: 'marcus',
        personality: 'Thoughtful, perceptive, observant of interpersonal maturity and culture fit.',
        communicationStyle: 'Calm, executive tone, asks nuanced behavioral questions.',
        difficulty: 'Advanced',
        conversationObjectives: [
          'Ask how the candidate resolved a serious disagreement with a colleague or manager',
          'Evaluate how they prioritize competing deadlines',
          'Test self-awareness regarding their biggest professional weakness',
        ],
      },
    ],
    initialPrompt: "Welcome. Technical skills are crucial, but what truly distinguishes great team members is how they collaborate under pressure. Could you tell me about a time when you strongly disagreed with a team member or manager on an important decision? How did you handle it?",
    systemPrompt: `You are Marcus Vance, Vice President of Engineering.
You are evaluating behavioral maturity, collaborative conflict resolution, and leadership mindset.
Guidelines:
1. Ask probing behavioral questions that require genuine storytelling.
2. Probe into what the candidate actually felt and said during the disagreement.
3. Verify if they reached a win-win compromise or simply surrendered/escalated.
4. Keep your tone executive, thoughtful, and professional (2 to 3 sentences).`,
    tips: [
      'Focus on the shared goal of the project, not personal friction.',
      'Highlight active listening and data-driven discussions.',
      'Conclude with the positive outcome and what you learned.',
    ],
  },

  // ----------------------- B. AI OFFICE SIMULATOR -----------------------
  {
    environment: 'office',
    scenarioId: 'office-daily-standup',
    title: 'Agile Team Standup & Sprint Status',
    description: 'Participate in a brisk daily scrum standup: report what you achieved yesterday, your plan for today, and any blocking issues.',
    icon: 'users',
    level: 'All Levels',
    defaultDurationMinutes: 5,
    learningObjectives: [
      'Structure a concise standup update (Yesterday, Today, Blockers)',
      'Communicate cross-functional dependencies clearly',
      'Ask team members for timely assistance professionally',
    ],
    characters: [
      {
        characterId: 'priya-scrum',
        name: 'Priya Sharma',
        role: 'Engineering Team Lead & Scrum Master',
        avatar: 'priya',
        personality: 'Energetic, efficient, organized, supportive of unblocking teammates.',
        communicationStyle: 'Brisk, upbeat, asks practical questions about delivery deadlines and dependencies.',
        difficulty: 'Beginner',
        conversationObjectives: [
          'Open daily standup',
          'Get candidate sprint update',
          'Clarify any blockers or coordination needed with backend/QA teams',
        ],
      },
    ],
    initialPrompt: "Morning everyone! Let's kick off our 10-minute standup. Who wants to go first? How about you? What did you wrap up yesterday, what are you tackling today, and are there any blockers slowing you down?",
    systemPrompt: `You are Priya Sharma, Team Lead and Scrum Master at a high-growth tech company.
You run fast-paced, collaborative daily standups.
Guidelines:
1. Listen to the user's three-part update: Yesterday, Today, Blockers.
2. If they forget to mention blockers or next steps, politely prompt them.
3. If they mention a blocker, ask how the team can help unblock them or who needs to coordinate.
4. Keep it friendly, quick, and conversational (1 to 3 sentences).`,
    tips: [
      'Keep it under 60 seconds: 1 bullet on yesterday, 1 on today, 1 on blockers.',
      'Use active verbs: "deployed", "refactored", "investigated".',
      'Explicitly name colleagues or services you depend on.',
    ],
  },
  {
    environment: 'office',
    scenarioId: 'office-delay-explanation',
    title: 'Explaining a Project Deadline Delay',
    description: 'Inform a busy department head that a crucial project milestone will slip by two weeks, present root causes, and propose a mitigation plan.',
    icon: 'alert-triangle',
    level: 'Intermediate',
    defaultDurationMinutes: 10,
    learningObjectives: [
      'Deliver bad news professionally without being defensive',
      'Articulate technical root causes in plain business terms',
      'Present viable recovery options and revised milestones',
    ],
    characters: [
      {
        characterId: 'jennifer-vp',
        name: 'Jennifer Wu',
        role: 'Director of Product & Operations',
        avatar: 'jennifer',
        personality: 'Results-oriented, demanding, values transparency and solution-first proposals.',
        communicationStyle: 'Direct, focused on customer impact, timeline consequences, and mitigation.',
        difficulty: 'Intermediate',
        conversationObjectives: [
          'Hear the project delay status',
          'Understand why the risk was not raised earlier',
          'Demand a concrete mitigation and revised delivery schedule',
        ],
      },
    ],
    initialPrompt: "Thanks for stopping by. I saw your calendar invite regarding the Q3 product release timeline. We have client demos scheduled for next Friday. What's the situation with the delivery?",
    systemPrompt: `You are Jennifer Wu, Director of Product. You have high expectations and clients waiting.
The user is telling you about a project delay.
Guidelines:
1. React with realistic concern: inquire about the root cause and the impact on customers.
2. Ask why this wasn't flagged at last week's checkpoint.
3. Push for actionable solutions: e.g. "Can we descope secondary features?", "Do you need extra engineering resources?", "What is the new hard date?"
4. Be professional, firm, yet fair when the user proposes a sound recovery plan (2 to 3 sentences).`,
    tips: [
      'Take accountability early: do not blame others or make excuses.',
      'Come prepared with at least two mitigation options.',
      'Offer revised timelines with confidence intervals.',
    ],
  },
  {
    environment: 'office',
    scenarioId: 'office-leave-handover',
    title: 'Professional Leave Request & Workload Handover',
    description: 'Formally request personal leave from your manager, explain coverage for your ongoing tasks, and ensure smooth continuity.',
    icon: 'calendar',
    level: 'Beginner',
    defaultDurationMinutes: 5,
    learningObjectives: [
      'Request planned time off respectfully and formally',
      'Detail task delegations and emergency contact boundaries',
      'Confirm documentation and pre-leave commitments',
    ],
    characters: [
      {
        characterId: 'amanda-mgr',
        name: 'Amanda Ross',
        role: 'Engineering Operations Manager',
        avatar: 'amanda',
        personality: 'Empathetic, organized, wants to ensure work-life balance while safeguarding project deliverables.',
        communicationStyle: 'Warm, supportive, checks documentation and handover details.',
        difficulty: 'Beginner',
        conversationObjectives: [
          'Acknowledge leave request',
          'Review handover arrangements',
          'Confirm return date and critical escalation contact',
        ],
      },
    ],
    initialPrompt: "Hi! Good to see you. I got your note mentioning you wanted to discuss some upcoming time off. Let's talk through your planned dates and how your current sprint tasks will be covered.",
    systemPrompt: `You are Amanda Ross, a supportive Engineering Operations Manager.
Guidelines:
1. Welcome the user's request for leave warmly.
2. Ask for the specific dates, the reason (if they feel comfortable sharing), and who will cover their urgent tasks.
3. Ask if their code reviews and Jira tickets are updated.
4. Keep the conversation constructive, pleasant, and organized (2 to 3 sentences).`,
    tips: [
      'State your departure and return dates clearly upfront.',
      'Name the specific teammate who agreed to cover urgent issues.',
      'Promise a written handover summary before you depart.',
    ],
  },

  // ----------------------- C. AI TRAVEL COMPANION -----------------------
  {
    environment: 'travel',
    scenarioId: 'travel-airport-immigration',
    title: 'Airport Immigration & Border Control',
    description: 'Answer formal questions at international border control regarding your travel purpose, stay duration, accommodation, and return ticket.',
    icon: 'compass',
    level: 'Intermediate',
    defaultDurationMinutes: 5,
    learningObjectives: [
      'Answer official border control queries with clarity and confidence',
      'State travel purpose, lodging, and financial arrangements succinctly',
      'Understand formal official English questions under slight pressure',
    ],
    characters: [
      {
        characterId: 'officer-davies',
        name: 'Officer Davies',
        role: 'Border & Immigration Control Officer',
        avatar: 'davies',
        personality: 'Vigilant, formal, meticulous, professional.',
        communicationStyle: 'Direct, neutral, official questioning tone.',
        difficulty: 'Intermediate',
        conversationObjectives: [
          'Inspect passport and purpose of visit',
          'Verify duration of stay and accommodation location',
          'Confirm return flight details and sufficient funds',
        ],
      },
    ],
    initialPrompt: "Passport and landing card, please. Good afternoon. What is the primary purpose of your visit to the country?",
    systemPrompt: `You are Officer Davies, a Border Control and Immigration Officer at an international airport terminal.
You speak clearly, formally, and authoritatively.
Guidelines:
1. Inspect the traveler's stated purpose of visit (business, tourism, conference, or study).
2. Ask standard follow-up questions: "How long do you intend to stay?", "Where will you be staying?", "Do you have a return ticket booked?"
3. If their answers are vague, ask for specific details (e.g. hotel name, conference venue).
4. If satisfied, conclude by wishing them a pleasant stay and stamping their passport.
5. Keep your replies concise and official (1 to 3 sentences).`,
    tips: [
      'Answer directly: "I am here for tourism / a business conference for 7 days."',
      'Keep your documentation details ready (hotel address, return date).',
      'Use polite formal terms: "Yes, Officer", "Certainly".',
    ],
  },
  {
    environment: 'travel',
    scenarioId: 'travel-hotel-checkin',
    title: 'Hotel Check-In & Room Preferences',
    description: 'Check in to a boutique hotel, inquire about breakfast timings and amenities, and request a high-floor quiet room.',
    icon: 'home',
    level: 'Beginner',
    defaultDurationMinutes: 5,
    learningObjectives: [
      'Confirm reservation details and payment/deposit formalities',
      'Make polite special requests (quiet room, late checkout, dietary needs)',
      'Understand hotel services, Wi-Fi details, and key amenities',
    ],
    characters: [
      {
        characterId: 'mateo-concierge',
        name: 'Mateo Rossi',
        role: 'Front Desk Concierge',
        avatar: 'mateo',
        personality: 'Hospitable, charming, courteous, attentive to guest comfort.',
        communicationStyle: 'Polite, enthusiastic, speaks with refined hospitality warmth.',
        difficulty: 'Beginner',
        conversationObjectives: [
          'Welcome the guest and retrieve reservation',
          'Confirm room specifications and handle any preferences',
          'Explain breakfast, Wi-Fi, and elevator access',
        ],
      },
    ],
    initialPrompt: "Good afternoon and welcome to The Grandview Hotel! How was your journey today? May I please have your name or booking confirmation number to pull up your reservation?",
    systemPrompt: `You are Mateo Rossi, a welcoming and refined Front Desk Concierge at The Grandview Hotel.
Guidelines:
1. Greet the guest warmly and confirm their reservation.
2. Respond attentively to any room requests (e.g., non-smoking, high floor, quiet view, extra pillows).
3. Explain hotel amenities: complimentary breakfast from 7:00 AM to 10:30 AM, high-speed Wi-Fi, fitness center on the 3rd floor.
4. Keep the tone warm, welcoming, and hospitable (2 to 3 sentences).`,
    tips: [
      'Use polite request structures: "Could I please request...?", "Would it be possible to...?"',
      'Ask about key details: "What time is checkout?", "Is breakfast included?"',
      'Say thank you and address the staff politely.',
    ],
  },
  {
    environment: 'travel',
    scenarioId: 'travel-lost-luggage',
    title: 'Airline Baggage Claim & Lost Luggage',
    description: 'Report delayed or missing baggage at the airport baggage service counter, provide bag descriptions, and organize delivery.',
    icon: 'package',
    level: 'Intermediate',
    defaultDurationMinutes: 10,
    learningObjectives: [
      'Describe physical objects accurately (color, material, brand, tags)',
      'File a formal Property Irregularity Report (PIR) with flight details',
      'Provide delivery contact details and track status confidently',
    ],
    characters: [
      {
        characterId: 'elena-baggage',
        name: 'Elena Gomez',
        role: 'Baggage Services Agent',
        avatar: 'elena',
        personality: 'Systematic, reassuring, helpful, problem solver.',
        communicationStyle: 'Empathetic, clear, takes structured notes for official tracking.',
        difficulty: 'Intermediate',
        conversationObjectives: [
          'Acknowledge the missing bag issue with empathy',
          'Collect baggage claim receipt and flight number',
          'Get a detailed physical description of the bag',
          'Record hotel/home delivery address and contact phone number',
        ],
      },
    ],
    initialPrompt: "Hello, I understand your flight from London just arrived and your luggage didn't appear on the carousel. I'm very sorry for the frustration. Let's get a report filed right away. Could you share your boarding pass and luggage claim tag?",
    systemPrompt: `You are Elena Gomez, an airline Baggage Services Agent at an airport terminal.
A passenger's checked bag hasn't arrived.
Guidelines:
1. Show empathy and assure the passenger you will track it down.
2. Ask for their flight number, baggage claim stub number, and a physical description (color, size, hard/soft shell, wheels, unique tags).
3. Ask for their local address and phone number for courier delivery once located.
4. Keep your responses clear, helpful, and reassuring (2 to 3 sentences).`,
    tips: [
      'Describe distinctive features: "Navy blue hard-case Samsonite with a red ribbon on the handle."',
      'Provide your full local address and reachable mobile number.',
      'Ask for the reference claim number and courier tracking link.',
    ],
  },

  // ----------------------- D. AI EMERGENCY COMMUNICATION -----------------------
  {
    environment: 'emergency',
    scenarioId: 'emergency-roadside-accident',
    title: 'Reporting a Roadside Accident',
    description: 'Communicate with an emergency dispatcher to report a vehicle collision, specify exact location details, hazards, and injury status.',
    icon: 'alert-octagon',
    level: 'Intermediate',
    defaultDurationMinutes: 5,
    learningObjectives: [
      'Provide location information clearly under simulated urgent pressure',
      'Describe injuries and hazards without panic',
      'Follow instructions from an emergency operator systematically',
    ],
    disclaimer: 'EDUCATIONAL SIMULATION ONLY: This practice tool does NOT contact real emergency services or 911/112. In a real emergency, immediately dial your local emergency number.',
    characters: [
      {
        characterId: 'dispatcher-harris',
        name: 'Dispatcher Harris',
        role: 'Emergency Services Dispatcher',
        avatar: 'harris',
        personality: 'Calm, authoritative, rapid, safety-focused, reassuring.',
        communicationStyle: 'Direct, clear, uses short directive questions to extract life-saving information.',
        difficulty: 'Intermediate',
        conversationObjectives: [
          'Confirm exact location of the incident',
          'Determine number of vehicles and people involved',
          'Assess injuries and active hazards (fire, traffic, fuel leaks)',
          'Provide safety instructions while units are en route',
        ],
      },
    ],
    initialPrompt: "Emergency Services, Dispatcher 402. Where is your emergency, and what is happening right now?",
    systemPrompt: `You are Dispatcher Harris, a highly trained emergency services dispatcher.
DISCLAIMER: This is strictly an educational English practice simulation for students.
Guidelines:
1. Speak in a calm, controlled, urgent, and authoritative manner.
2. Your top priority is location: "What is the street name, cross street, or nearest landmark?"
3. Ask about injuries: "Is anyone trapped, bleeding, or unconscious?"
4. Ask about hazards: "Are there any flames, downed power lines, or leaking fuel?"
5. Give safety instructions: "Stay back from the roadway; keep your hazard lights on."
6. Keep sentences crisp and unambiguous (1 to 3 short sentences).`,
    tips: [
      'State location first: "I am at the intersection of Main Street and 5th Avenue."',
      'State what happened clearly: "Two cars collided at the intersection."',
      'Answer yes/no questions directly without rambling.',
    ],
  },
  {
    environment: 'emergency',
    scenarioId: 'emergency-medical-triage',
    title: 'Urgent Medical Distress & First-Aid Guidance',
    description: 'Report an urgent medical incident involving a colleague experiencing sudden chest pains and shortness of breath.',
    icon: 'heart',
    level: 'All Levels',
    defaultDurationMinutes: 5,
    learningObjectives: [
      'Describe physical symptoms accurately in English',
      'Follow step-by-step first-aid and positioning instructions',
      'Communicate patient consciousness and breathing status',
    ],
    disclaimer: 'EDUCATIONAL SIMULATION ONLY: This practice tool does NOT contact real emergency services or medical personnel. If anyone is in medical distress, immediately call your local emergency services.',
    characters: [
      {
        characterId: 'nurse-patricia',
        name: 'Nurse Patricia',
        role: 'Emergency Medical Triage Specialist',
        avatar: 'patricia',
        personality: 'Gentle, steady, directive, reassuring.',
        communicationStyle: 'Clear, steady, asks symptom-specific questions, guides actions step by step.',
        difficulty: 'Intermediate',
        conversationObjectives: [
          'Verify patient responsiveness and breathing',
          'Identify specific symptoms (chest pain, numbness, sweating)',
          'Instruct caller on positioning the patient comfortably',
        ],
      },
    ],
    initialPrompt: "Medical Emergency Dispatch, Nurse Patricia speaking. I'm dispatching paramedics now. Tell me, is the patient conscious and breathing normally right now?",
    systemPrompt: `You are Nurse Patricia, a medical emergency triage operator.
DISCLAIMER: This is strictly an educational English practice simulation for students.
Guidelines:
1. Stay calm and keep the caller grounded.
2. Ask clear, direct medical triage questions: "Is the patient awake?", "Are they able to speak in full sentences?", "Do they have a history of heart conditions?"
3. Instruct caller: "Loosen any tight clothing around their neck", "Do not give them food or drink", "Stay right by their side."
4. Keep sentences concise, reassuring, and directive (1 to 3 sentences).`,
    tips: [
      'Use clear symptom words: "short of breath", "dizzy", "sharp pain in chest".',
      'Confirm your actions aloud: "Yes, I have helped them sit down."',
      'Stay on the line and listen carefully.',
    ],
  },

  // ----------------------- E. AI NEGOTIATION TRAINER -----------------------
  {
    environment: 'negotiation',
    scenarioId: 'negotiation-salary-raise',
    title: 'Annual Performance Review & Salary Negotiation',
    description: 'Negotiate a salary increase and promotion with your business unit head by presenting concrete metrics and market benchmarking.',
    icon: 'dollar-sign',
    level: 'Advanced',
    defaultDurationMinutes: 10,
    learningObjectives: [
      'Quantify past performance impact and revenue/efficiency gains',
      'Anchor negotiations diplomatically using market data',
      'Handle pushback and negotiate non-monetary perks (equity, remote flexibility)',
    ],
    characters: [
      {
        characterId: 'director-henderson',
        name: 'Director Henderson',
        role: 'Business Unit Managing Director',
        avatar: 'henderson',
        personality: 'Sharp, business-savvy, respectful, but guards the department budget tightly.',
        communicationStyle: 'Analytical, values quantifiable ROI, respectful but makes strategic counteroffers.',
        difficulty: 'Advanced',
        conversationObjectives: [
          'Acknowledge the employee achievements over the past year',
          'Challenge the proposed salary percentage increase based on budget constraints',
          'Explore compromise: performance bonuses, title elevation, or staggered reviews',
        ],
      },
    ],
    initialPrompt: "Good afternoon. I reviewed your self-assessment before our meeting today, and you've certainly delivered solid work on the platform rollout this year. You mentioned wanting to revisit your compensation package. What figure or adjustment did you have in mind, and what's your rationale?",
    systemPrompt: `You are Director Henderson, a seasoned Business Unit Managing Director.
You appreciate strong talent, but you have a strict corporate budget to manage.
Guidelines:
1. Listen to the employee's justification and proposed percentage/amount.
2. If they just say "I worked hard", push back politely: ask for specific business impact, revenue preserved, or client satisfaction scores.
3. If they give strong data, respond with realistic corporate friction: "Our department budget cap is around 6-8%, whereas you are asking for 15%."
4. Test their negotiation flexibility: offer alternative incentives like a performance-based quarterly bonus, expanded stock grants, or leadership training.
5. Keep your tone professional, diplomatic, and pragmatic (2 to 4 sentences).`,
    tips: [
      'Anchor with data: "Over the last year, my team delivered $200k in cost savings..."',
      'Frame it as mutual value rather than personal entitlement.',
      'Be ready with counteroffers: "If the base cannot move 12%, could we consider an annual bonus structure?"',
    ],
  },
  {
    environment: 'negotiation',
    scenarioId: 'negotiation-vendor-price',
    title: 'Supplier Contract & Pricing Negotiation',
    description: 'Negotiate software licensing terms and tier pricing with a vendor account executive to achieve a 20% cost reduction for your company.',
    icon: 'trending-up',
    level: 'Intermediate',
    defaultDurationMinutes: 10,
    learningObjectives: [
      'Employ tactical negotiation phrases (bundling, multi-year commitments, payment terms)',
      'Leverage competitor alternatives credibly without being adversarial',
      'Reach an equitable win-win contract compromise',
    ],
    characters: [
      {
        characterId: 'robert-vendor',
        name: 'Robert Zhang',
        role: 'Enterprise Account Executive',
        avatar: 'robert',
        personality: 'Friendly, persuasive, commercial-minded, focused on closing multi-year commitments.',
        communicationStyle: 'Polite, persuasive, uses conditional bargaining ("If you... then we can...").',
        difficulty: 'Intermediate',
        conversationObjectives: [
          'Defend list price value proposition',
          'Offer volume tiering or multi-year contract discounts',
          'Negotiate on payment terms and support SLAs',
        ],
      },
    ],
    initialPrompt: "Thanks for meeting today! We're thrilled your organization is looking to renew and expand your seats on our enterprise cloud platform. We sent over the proposed renewal quote for 150 seats at $85 per user per month. How did that look to your team?",
    systemPrompt: `You are Robert Zhang, an Enterprise Account Executive for a cloud software vendor.
You want to maximize deal value and lock in multi-year renewals.
Guidelines:
1. The client will try to negotiate down the $85/user/month rate.
2. Do not immediately drop your price without getting something in return.
3. Propose conditional trade-offs: e.g. "If you sign a 2-year contract or pay upfront annually, I can speak with finance about a 15% concession."
4. Highlight value, uptime, and premium support.
5. Keep your tone commercially polished, polite, and persuasive (2 to 3 sentences).`,
    tips: [
      'Never accept the first price: ask for tier discounts or volume breaks.',
      'Use conditional phrasing: "If we commit to upfront annual billing, what discount can you offer?"',
      'Keep the tone collaborative: "We want a long-term partnership, so let us find a structure that works for both sides."',
    ],
  },
];

/**
 * Seed default scenarios if database collection is empty
 */
async function seedScenariosIfEmpty() {
  try {
    const count = await SimulationScenario.countDocuments();
    if (count === 0) {
      await SimulationScenario.insertMany(DEFAULT_SCENARIOS);
      return { seeded: true, count: DEFAULT_SCENARIOS.length };
    }
    // Update or insert any newly added scenario definitions
    for (const s of DEFAULT_SCENARIOS) {
      await SimulationScenario.findOneAndUpdate(
        { scenarioId: s.scenarioId },
        { $setOnInsert: s },
        { upsert: true }
      );
    }
    return { seeded: false, count };
  } catch (err) {
    console.error('[simulationEngine] Error seeding scenarios:', err.message);
    return { error: err.message };
  }
}

/**
 * Rule-based grammar and vocabulary analyzer for Learning Mode
 */
function analyzeUtteranceForLearning(text, level = 'Intermediate') {
  if (!text || typeof text !== 'string') {
    return {
      originalSentence: '',
      correctedSentence: '',
      grammarMistakes: [],
      vocabularySuggestions: [],
      naturalExpressions: [],
      alternativeResponses: [],
    };
  }

  const clean = text.trim();
  const lower = clean.toLowerCase();
  const mistakes = [];
  let corrected = clean;
  const vocabTips = [];
  const alternatives = [];

  // 1. Common English grammar patterns
  if (/\bi\s+am\s+agree\b/i.test(clean)) {
    mistakes.push("'I am agree' is incorrect. In English, 'agree' is a verb: say 'I agree'.");
    corrected = corrected.replace(/\bi\s+am\s+agree\b/gi, 'I agree');
  }
  if (/\bhe\s+dont\b/i.test(clean)) {
    mistakes.push("Subject-verb agreement: use 'he doesn't' instead of 'he dont'.");
    corrected = corrected.replace(/\bhe\s+dont\b/gi, "he doesn't");
  }
  if (/\bshe\s+dont\b/i.test(clean)) {
    mistakes.push("Subject-verb agreement: use 'she doesn't' instead of 'she dont'.");
    corrected = corrected.replace(/\bshe\s+dont\b/gi, "she doesn't");
  }
  if (/\bi\s+did\s+went\b/i.test(clean)) {
    mistakes.push("Double past tense: after auxiliary 'did', use base verb: 'I went' or 'I did go'.");
    corrected = corrected.replace(/\bi\s+did\s+went\b/gi, 'I went');
  }
  if (/\bwe\s+was\b/i.test(clean)) {
    mistakes.push("Plural agreement: use 'we were' instead of 'we was'.");
    corrected = corrected.replace(/\bwe\s+was\b/gi, 'we were');
  }
  if (/\byou\s+was\b/i.test(clean)) {
    mistakes.push("Pronoun agreement: use 'you were' instead of 'you was'.");
    corrected = corrected.replace(/\byou\s+was\b/gi, 'you were');
  }
  if (/\bexplain\s+me\b/i.test(clean)) {
    mistakes.push("Preposition required: say 'explain to me' or simply 'explain this'.");
    corrected = corrected.replace(/\bexplain\s+me\b/gi, 'explain to me');
  }
  if (/\bi\s+am\s+working\s+since\s+two\s+years\b/i.test(clean)) {
    mistakes.push("Present perfect continuous: say 'I have been working for two years'.");
    corrected = corrected.replace(/\bi\s+am\s+working\s+since\s+two\s+years\b/gi, 'I have been working for two years');
  }
  if (/\bmore\s+better\b/i.test(clean)) {
    mistakes.push("Double comparative: 'better' is already comparative. Say 'much better' or 'better'.");
    corrected = corrected.replace(/\bmore\s+better\b/gi, 'better');
  }
  if (/\bi\s+will\s+can\b/i.test(clean)) {
    mistakes.push("Modal verbs cannot be stacked. Say 'I will be able to'.");
    corrected = corrected.replace(/\bi\s+will\s+can\b/gi, 'I will be able to');
  }

  // 2. Vocabulary elevation suggestions
  if (/\bvery\s+good\b/i.test(clean)) {
    vocabTips.push("Upgrade 'very good' -> 'exceptional', 'outstanding', or 'highly effective'.");
  }
  if (/\bvery\s+big\b/i.test(clean)) {
    vocabTips.push("Upgrade 'very big' -> 'substantial', 'extensive', or 'significant'.");
  }
  if (/\btalk\s+about\b/i.test(clean)) {
    vocabTips.push("In professional settings, replace 'talk about' with 'elaborate on', 'address', or 'outline'.");
  }
  if (/\bmake\s+sure\b/i.test(clean)) {
    vocabTips.push("Try 'ensure', 'guarantee', or 'verify' for a sharper business tone.");
  }
  if (/\bproblem\b/i.test(clean)) {
    vocabTips.push("In interviews and meetings, frame 'problem' as 'challenge', 'bottleneck', or 'impediment'.");
  }

  // 3. Alternative responses & natural phrasing
  if (clean.length < 25) {
    alternatives.push(`"Certainly. To expand on that, ${clean.toLowerCase()}."`);
    alternatives.push(`"Yes, specifically speaking, ${clean.toLowerCase()}."`);
  } else {
    alternatives.push(`"From my perspective, ${clean.charAt(0).toLowerCase() + clean.slice(1)}"`);
    alternatives.push(`"To put it concisely: ${clean.charAt(0).toLowerCase() + clean.slice(1)}"`);
  }

  // Capitalize first letter of corrected sentence
  if (corrected.length > 0) {
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    if (!/[.!?]$/.test(corrected)) corrected += '.';
  }

  return {
    originalSentence: clean,
    correctedSentence: corrected !== clean ? corrected : clean,
    grammarMistakes: mistakes,
    vocabularySuggestions: vocabTips.slice(0, 3),
    naturalExpressions: [
      'Use transition phrases like "Furthermore", "In addition", or "To illustrate".',
      'Maintain an active voice (e.g. "We initiated the rollout" rather than "The rollout was initiated").',
    ],
    alternativeResponses: alternatives.slice(0, 2),
  };
}

/**
 * Intelligent contextual heuristic engine for realistic fallback
 * when Ollama or external LLM is offline.
 */
function generateContextualHeuristicReply({
  scenario,
  character,
  history,
  userUtterance,
  level = 'Intermediate',
}) {
  const text = (userUtterance || '').trim();
  const lower = text.toLowerCase();
  const turnCount = history.filter((m) => m.sender === 'student').length;

  // 1. Handle very short or incomplete responses
  if (text.split(/\s+/).length < 4) {
    if (scenario.environment === 'interview') {
      return `Thank you for starting there. Could you expand a little further and share a specific example from your past work or education to illustrate that?`;
    }
    if (scenario.environment === 'emergency') {
      return `Copy that. Please stay calm and give me more details: exactly where are you right now, and is anyone hurt?`;
    }
    return `Understood. Could you provide a bit more context so I can best assist you with that?`;
  }

  // 2. Environment & Scenario specific contextual branching
  if (scenario.environment === 'interview') {
    if (lower.includes('project') || lower.includes('developed') || lower.includes('built') || lower.includes('created')) {
      return `That sounds like an impactful initiative. When you were developing that solution, what was the biggest technical hurdle or constraint you encountered, and how did you resolve it?`;
    }
    if (lower.includes('team') || lower.includes('colleague') || lower.includes('lead') || lower.includes('manager')) {
      return `Collaboration is vital here. How did you align everyone on the goals, especially when differing opinions or priorities arose?`;
    }
    if (lower.includes('strength') || lower.includes('good at') || lower.includes('skill')) {
      return `That is a valuable strength to bring to the table. Can you tell me about a specific time when that skill directly helped your team hit a tight deadline or overcome a roadblock?`;
    }
    if (lower.includes('salary') || lower.includes('compensation') || lower.includes('dollar') || lower.includes('package')) {
      return `I appreciate you putting those numbers forward with clarity. In addition to base compensation, our organization offers performance incentives, learning stipends, and flexible schedules. How do you weigh those benefits against the base figure?`;
    }
    if (turnCount >= 4) {
      return `That provides a very clear picture of your experience. As we near the end of our discussion today, do you have any questions for me about our team culture, tech stack, or the company roadmap?`;
    }
    return `That's insightful. Could you walk me through the key metrics or outcomes you achieved with that approach? What feedback did you receive from stakeholders?`;
  }

  if (scenario.environment === 'office') {
    if (lower.includes('block') || lower.includes('issue') || lower.includes('bug') || lower.includes('delay')) {
      return `Thanks for raising that blocker immediately. What specific support or resources do you need from me or the other team leads to get this cleared by tomorrow morning?`;
    }
    if (lower.includes('leave') || lower.includes('vacation') || lower.includes('off') || lower.includes('holiday')) {
      return `The dates make sense and your team coverage plan looks well thought out. Please make sure your handover document is linked in the team channel before you head out. Enjoy your time off!`;
    }
    if (lower.includes('done') || lower.includes('completed') || lower.includes('deployed') || lower.includes('finished')) {
      return `Great progress! How did the staging validation go, and are we ready to push the release note out to our stakeholders?`;
    }
    return `Thank you for the update. Let's make sure that aligns with our weekly milestone. Is there any cross-team dependency we should double-check before moving forward?`;
  }

  if (scenario.environment === 'travel') {
    if (lower.includes('tourism') || lower.includes('holiday') || lower.includes('vacation') || lower.includes('visit')) {
      return `Very well. How long do you plan to remain in the country, and where will you be staying during your visit?`;
    }
    if (lower.includes('hotel') || lower.includes('stay') || lower.includes('address') || lower.includes('days')) {
      return `Thank you. Do you have a confirmed return flight booking, and are you carrying any goods or currency that need to be declared?`;
    }
    if (lower.includes('bag') || lower.includes('luggage') || lower.includes('suitcase') || lower.includes('lost')) {
      return `I completely understand your concern. I have logged the preliminary tracking file. Could you please specify the delivery address where our courier should drop off the baggage once located?`;
    }
    return `Thank you for providing those details. Let me verify that in our system right now. Everything looks in order. Is there anything else you require assistance with?`;
  }

  if (scenario.environment === 'emergency') {
    if (lower.includes('street') || lower.includes('road') || lower.includes('avenue') || lower.includes('near')) {
      return `Units are being dispatched to that location immediately. Are there any injuries, smoke, or fire that we should alert the paramedics and fire crew about?`;
    }
    if (lower.includes('hurt') || lower.includes('blood') || lower.includes('pain') || lower.includes('breath') || lower.includes('injured')) {
      return `Medical teams are on their way. Keep the patient still, do not move them unless there is immediate danger, and stay right by their side. Can they hear you speaking to them?`;
    }
    return `Help is en route to you now. Stay on the line with me, keep yourself in a safe spot away from traffic, and tell me if anything changes.`;
  }

  if (scenario.environment === 'negotiation') {
    if (lower.includes('percent') || lower.includes('%') || lower.includes('discount') || lower.includes('lower') || lower.includes('reduce')) {
      return `I understand you are aiming for that figure. However, given our high standard of service and feature roadmap, a direct reduction of that size is challenging. If we commit to an annual upfront contract, would a 10% adjustment work for your team?`;
    }
    if (lower.includes('budget') || lower.includes('cost') || lower.includes('expensive') || lower.includes('price')) {
      return `Budget constraints are certainly understandable. Let's explore flexible options: we could stage the onboarding over two phases or tailor the user tier so your immediate costs stay well within bounds. How does that sound?`;
    }
    return `You make a reasonable argument on those points. If we can agree on these milestone deliverables, I am willing to adjust the terms in your favor. What would be the next step for your sign-off?`;
  }

  // Default fallback
  return `I understand your point regarding "${text.slice(0, 40)}...". That is quite relevant to our discussion. Could you tell me more about how you plan to follow up on this?`;
}

/**
 * Generate AI Character reply for a turn
 */
async function generateCharacterReply({
  session,
  scenario,
  userUtterance,
  audioDurationSeconds = 0,
  measuredDuration = false,
}) {
  const character = session.character || scenario.characters[0];
  const level = session.level || 'Intermediate';
  const history = session.messages || [];

  // Determine feedback if in Learning Mode
  let inTurnFeedback = null;
  if (session.feedbackMode === 'learning') {
    inTurnFeedback = analyzeUtteranceForLearning(userUtterance, level);
  }

  let aiReplyText = '';
  let evaluator = 'heuristic';

  // Construct conversation message history for LLM
  const messagesForLLM = [
    {
      role: 'system',
      content: `${scenario.systemPrompt}
Character Name: ${character.name}
Role: ${character.role}
Personality: ${character.personality}
Communication Style: ${character.communicationStyle}
Student Proficiency Level: ${level}
Environment: ${scenario.environment}
Mission Objective: ${session.learningObjective || scenario.learningObjectives[0] || 'Realistic communication practice'}

Rules:
1. Respond strictly in character.
2. Reply in 2 to 4 conversational sentences.
3. Advance the dialogue naturally and ask a contextual follow-up question.
4. If this is the Emergency environment, maintain professional urgency while knowing it is an educational drill.`,
    },
  ];

  // Append recent dialogue turns
  for (const msg of history.slice(-8)) {
    if (msg.sender === 'student') {
      messagesForLLM.push({ role: 'user', content: msg.text });
    } else if (msg.sender === 'ai') {
      messagesForLLM.push({ role: 'assistant', content: msg.text });
    }
  }

  // Append latest student turn
  messagesForLLM.push({ role: 'user', content: userUtterance });

  // Attempt Ollama completion with timeout
  try {
    const res = await chatCompletion({
      messages: messagesForLLM,
      temperature: 0.7,
      numPredict: 250,
      timeoutMs: 12000,
    });

    if (res && res.content && res.content.trim()) {
      aiReplyText = res.content.trim();
      evaluator = 'llm';
    }
  } catch (err) {
    // Graceful fallback to rich contextual heuristic engine
  }

  if (!aiReplyText) {
    aiReplyText = generateContextualHeuristicReply({
      scenario,
      character,
      history,
      userUtterance,
      level,
    });
    evaluator = 'heuristic';
  }

  return {
    replyText: aiReplyText,
    evaluator,
    feedback: inTurnFeedback,
  };
}

/**
 * Generate contextual hint for student during simulation
 */
async function generateSimulationHint({ session, scenario }) {
  const history = session.messages || [];
  const lastAiMessage = [...history].reverse().find((m) => m.sender === 'ai');
  const contextText = lastAiMessage ? lastAiMessage.text : scenario.initialPrompt;
  const env = session.environment;

  // Domain-specific tailored hints
  if (env === 'interview') {
    return {
      hint: "Use the STAR framework (Situation, Task, Action, Result). Start by stating: 'In my previous project, we faced a situation where...'",
      suggestedStarters: [
        "In my experience with that, the most effective approach was...",
        "A key example of this occurred when our team needed to...",
        "I believe my biggest strength in this area is...",
      ],
      keyKeywords: ['leadership', 'scalability', 'initiative', 'measurable outcome'],
    };
  }

  if (env === 'office') {
    return {
      hint: "Be concise and proactive. State the current status, the reason for any delay, and the specific mitigation plan.",
      suggestedStarters: [
        "To give you a quick status update on that...",
        "We are currently tracking well, but our primary dependency is...",
        "I have arranged for coverage during my absence by...",
      ],
      keyKeywords: ['deliverable', 'blocker', 'handover', 'action item'],
    };
  }

  if (env === 'travel') {
    return {
      hint: "Speak clearly and state specific details: dates, numbers, hotel names, or item descriptions.",
      suggestedStarters: [
        "I will be staying for 7 days at the Grandview Hotel for...",
        "Could you please confirm if breakfast is included in the booking?",
        "My luggage is a dark navy blue hard-case suitcase with...",
      ],
      keyKeywords: ['confirmation', 'reservation', 'itinerary', 'terminal'],
    };
  }

  if (env === 'emergency') {
    return {
      hint: "Keep your response brief and factual: give your exact location first, then describe what happened and if anyone is hurt.",
      suggestedStarters: [
        "I am at the corner of Main Street and 4th Avenue...",
        "There is a two-car accident, and one person appears dizzy...",
        "The patient is conscious and breathing, but has chest tightness...",
      ],
      keyKeywords: ['intersection', 'landmark', 'conscious', 'injuries'],
    };
  }

  if (env === 'negotiation') {
    return {
      hint: "Anchor your position with data and propose a win-win compromise. Use conditional phrases ('If you can... then we can...').",
      suggestedStarters: [
        "Based on the value delivered and current market benchmarking...",
        "If we commit to an annual upfront contract, would you consider...",
        "Could we explore a performance-based bonus structure to bridge the difference?",
      ],
      keyKeywords: ['concession', 'benchmark', 'ROI', 'mutually beneficial'],
    };
  }

  return {
    hint: "Listen to the character's question and address the main point directly before adding an example.",
    suggestedStarters: [
      "To address your question directly...",
      "From my perspective...",
    ],
    keyKeywords: ['clarity', 'example', 'detail'],
  };
}

/**
 * 100-Point Performance Evaluation Engine
 * Evaluates student responses across 6 weighted categories:
 * - Grammar Accuracy: 20%
 * - Vocabulary Usage: 15%
 * - Sentence Formation: 15%
 * - Communication Clarity: 15%
 * - Response Relevance: 15%
 * - Fluency & Delivery: 20%
 */
function evaluateSimulationSession({ session, scenario }) {
  const studentMessages = (session.messages || []).filter((m) => m.sender === 'student');
  const totalTurns = studentMessages.length;

  if (totalTurns === 0) {
    return {
      overallScore: 0,
      categoryScores: {
        grammar: 0,
        vocabulary: 0,
        sentenceFormation: 0,
        clarity: 0,
        relevance: 0,
        fluencyAndDelivery: 0,
      },
      identifiedMistakes: [],
      strengths: ['Started the simulation session.'],
      areasForImprovement: ['Complete at least 3-4 conversation turns to receive a full evaluation.'],
      personalizedRecommendations: ['Select a scenario and practice speaking in complete sentences.'],
      suggestedNextScenario: {
        scenarioId: scenario.scenarioId,
        title: scenario.title,
        reason: 'Repeat this scenario and complete at least 3 turns.',
      },
      deliveryMetrics: {
        measuredWpm: 0,
        speechDurationSeconds: 0,
        isMeasured: false,
        fillerWordsDetected: [],
        fillerCount: 0,
        pauseEstimate: 'No speech recorded',
      },
      evaluator: 'heuristic',
      evaluatedAt: new Date(),
    };
  }

  const allText = studentMessages.map((m) => m.text).join(' ');
  const words = allText.split(/\s+/).filter(Boolean);
  const totalWordCount = words.length;

  // 1. Delivery & Audio Metrics (Verified vs Estimated)
  let totalAudioSeconds = 0;
  let hasMeasuredDuration = false;

  studentMessages.forEach((m) => {
    if (m.audioDurationSeconds && m.audioDurationSeconds > 0) {
      totalAudioSeconds += m.audioDurationSeconds;
      if (m.measuredDuration) hasMeasuredDuration = true;
    }
  });

  const fillerRegex = /\b(um|uh|er|ah|like|you\s+know|sort\s+of|kind\s+of)\b/gi;
  const fillerMatches = allText.match(fillerRegex) || [];
  const fillerCount = fillerMatches.length;
  const uniqueFillers = [...new Set(fillerMatches.map((f) => f.toLowerCase()))];

  let measuredWpm = 0;
  if (totalAudioSeconds > 5) {
    measuredWpm = Math.round((totalWordCount / totalAudioSeconds) * 60);
  } else {
    // Estimated WPM based on average speaking pace (~130 WPM)
    measuredWpm = Math.min(180, Math.max(90, Math.round(totalWordCount / Math.max(1, totalTurns * 0.5))));
  }

  // 2. Identify grammar mistakes across student utterances
  const identifiedMistakes = [];
  studentMessages.forEach((m) => {
    const analysis = analyzeUtteranceForLearning(m.text, session.level);
    if (analysis.grammarMistakes && analysis.grammarMistakes.length > 0) {
      analysis.grammarMistakes.forEach((err) => {
        identifiedMistakes.push({
          sentence: m.text,
          correction: analysis.correctedSentence,
          explanation: err,
          type: 'grammar',
        });
      });
    }
  });

  // 3. Category Scoring Algorithm (100-point total)
  // A. Grammar Accuracy (20 pts):
  const grammarPenalty = Math.min(14, identifiedMistakes.length * 3);
  const grammarScore = Math.max(6, Math.min(20, Math.round(20 - grammarPenalty)));

  // B. Vocabulary Usage (15 pts):
  const advancedVocabWords = [
    'exceptional', 'collaborate', 'bottleneck', 'initiative', 'substantial',
    'implement', 'optimize', 'mitigate', 'benchmark', 'deliberate', 'pragmatic',
    'escalate', 'seamlessly', 'objective', 'architecture', 'compromise', 'negotiate',
  ];
  const advancedFound = advancedVocabWords.filter((w) => allText.toLowerCase().includes(w));
  let vocabScore = 9;
  if (totalWordCount > 50) vocabScore += 2;
  if (totalWordCount > 100) vocabScore += 2;
  vocabScore += Math.min(2, advancedFound.length);
  vocabScore = Math.min(15, Math.max(5, vocabScore));

  // C. Sentence Formation (15 pts):
  const avgWordsPerTurn = totalWordCount / Math.max(1, totalTurns);
  let sentenceScore = 9;
  if (avgWordsPerTurn >= 12) sentenceScore += 3;
  else if (avgWordsPerTurn >= 7) sentenceScore += 2;
  if (identifiedMistakes.length === 0) sentenceScore += 3;
  else if (identifiedMistakes.length <= 2) sentenceScore += 1;
  sentenceScore = Math.min(15, Math.max(5, sentenceScore));

  // D. Communication Clarity (15 pts):
  let clarityScore = 11;
  if (fillerCount > 5) clarityScore -= 2;
  if (totalWordCount >= 30) clarityScore += 2;
  if (allText.includes('?')) clarityScore += 1;
  clarityScore = Math.min(15, Math.max(5, clarityScore));

  // E. Response Relevance (15 pts):
  let relevanceScore = 12;
  if (totalTurns >= 3) relevanceScore += 2;
  if (totalWordCount < 20) relevanceScore -= 4;
  relevanceScore = Math.min(15, Math.max(4, relevanceScore));

  // F. Fluency and Delivery (20 pts):
  let fluencyScore = 14;
  if (hasMeasuredDuration) {
    // Ideal conversational speech is 110 - 160 WPM
    if (measuredWpm >= 110 && measuredWpm <= 165) fluencyScore += 5;
    else if (measuredWpm >= 80 && measuredWpm <= 190) fluencyScore += 3;
    else fluencyScore += 1;
    if (fillerCount === 0) fluencyScore += 1;
  } else {
    // Text mode delivery
    if (totalWordCount >= 60) fluencyScore += 4;
    else if (totalWordCount >= 30) fluencyScore += 2;
  }
  fluencyScore = Math.min(20, Math.max(6, fluencyScore));

  const overallScore = Math.min(100, grammarScore + vocabScore + sentenceScore + clarityScore + relevanceScore + fluencyScore);

  // 4. Strengths, Improvements, and Recommendations
  const strengths = [];
  const improvements = [];
  const recommendations = [];

  if (overallScore >= 75) {
    strengths.push('Demonstrated strong conversational flow and natural multi-turn engagement.');
  } else {
    strengths.push('Maintained focus on the scenario topic and completed multiple turns.');
  }

  if (identifiedMistakes.length === 0) {
    strengths.push('Clean grammatical accuracy with no prominent subject-verb or tense errors.');
  } else {
    improvements.push(`Review ${identifiedMistakes.length} flagged grammatical slips (e.g. subject agreement and prepositions).`);
  }

  if (avgWordsPerTurn < 10) {
    improvements.push('Elaborate with more supporting context rather than brief answers.');
    recommendations.push('Aim for 2 to 3 complete sentences per turn using "Because...", "For example...", or "Additionally...".');
  } else {
    strengths.push('Provided substantial, well-elaborated answers for each turn.');
  }

  if (fillerCount > 3) {
    improvements.push(`Reduce filler words (${fillerCount} detected: ${uniqueFillers.join(', ')}).`);
    recommendations.push('Pause silently for 1 second instead of saying "um" or "like" while formulating your next phrase.');
  }

  recommendations.push(`Practice in Challenge Mode to build natural speaking speed under real-world pressure.`);

  // Suggest next scenario
  let nextScenarioId = 'office-daily-standup';
  let nextTitle = 'Agile Team Standup & Sprint Status';
  let nextReason = 'Build agile workplace status reporting confidence.';

  if (scenario.environment === 'interview') {
    nextScenarioId = 'interview-behavioral-star';
    nextTitle = 'Behavioral & Leadership Conflict Scenarios';
    nextReason = 'Deepen your behavioral storytelling using the STAR method.';
  } else if (scenario.environment === 'travel') {
    nextScenarioId = 'travel-airport-immigration';
    nextTitle = 'Airport Immigration & Border Control';
    nextReason = 'Practice formal official communication under scrutiny.';
  } else if (scenario.environment === 'emergency') {
    nextScenarioId = 'emergency-medical-triage';
    nextTitle = 'Urgent Medical Distress & First-Aid Guidance';
    nextReason = 'Practice explaining physical symptoms and emergency details.';
  } else if (scenario.environment === 'negotiation') {
    nextScenarioId = 'negotiation-salary-raise';
    nextTitle = 'Annual Performance Review & Salary Negotiation';
    nextReason = 'Practice quantitative value anchoring and counteroffers.';
  }

  return {
    overallScore,
    categoryScores: {
      grammar: grammarScore,
      vocabulary: vocabScore,
      sentenceFormation: sentenceScore,
      clarity: clarityScore,
      relevance: relevanceScore,
      fluencyAndDelivery: fluencyScore,
    },
    identifiedMistakes: identifiedMistakes.slice(0, 5),
    strengths: strengths.slice(0, 3),
    areasForImprovement: improvements.slice(0, 3),
    personalizedRecommendations: recommendations.slice(0, 3),
    suggestedNextScenario: {
      scenarioId: nextScenarioId,
      title: nextTitle,
      reason: nextReason,
    },
    deliveryMetrics: {
      measuredWpm,
      speechDurationSeconds: Math.round(totalAudioSeconds),
      isMeasured: hasMeasuredDuration,
      fillerWordsDetected: uniqueFillers,
      fillerCount,
      pauseEstimate: hasMeasuredDuration ? (measuredWpm < 100 ? 'Slightly slow / hesitant' : measuredWpm > 170 ? 'Very rapid' : 'Natural conversational rhythm') : 'Estimated based on transcript length',
    },
    evaluator: 'heuristic',
    evaluatedAt: new Date(),
  };
}

module.exports = {
  DEFAULT_SCENARIOS,
  seedScenariosIfEmpty,
  analyzeUtteranceForLearning,
  generateCharacterReply,
  generateSimulationHint,
  evaluateSimulationSession,
};
