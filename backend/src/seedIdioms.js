const IdiomPhrase = require('./models/IdiomPhrase');

const SEED_IDIOMS_DATA = [
  // ==================== IDIOMS (LEVEL 4 & 5) ====================
  {
    expression: 'Burn the midnight oil',
    type: 'idiom',
    level: 'Level 4',
    category: 'Campus & Academics',
    baseVerb: null,
    isSeparable: false,
    separableNote: 'Idiom: Fixed phrase, cannot be separated or split.',
    multipleMeanings: [],
    stage1_discover: {
      scenarioContext: 'An engineering student is preparing for tomorrow morning’s final campus placement test.',
      dialogue: [
        { speaker: 'Priya', text: 'Are you coming down to the cafeteria for dinner tonight?' },
        { speaker: 'Rohan', text: 'I wish I could, but I really have to burn the midnight oil tonight to finish this compiler project.' },
        { speaker: 'Priya', text: 'Don’t overwork yourself! Make sure you get at least a few hours of sleep before the interview.' },
      ],
      literalMeaning: 'To literally burn oil in a lamp or lantern late at night for lighting.',
      figurativeMeaning: 'To work, study, or prepare intensely late into the night.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Widely used in American, British, and Indian English academic & corporate environments.',
    },
    stage2_understand: {
      question: 'In the dialogue, what does Rohan mean when he says he has to "burn the midnight oil"?',
      options: [
        'He needs to refuel the campus laboratory heating equipment.',
        'He has to stay awake and work late into the night on his compiler project.',
        'He is planning to cook an elaborate midnight meal in the hostel.',
        'He needs to complain to the warden about power cuts during exams.',
      ],
      correctAnswer: 1,
      explanation: '"Burn the midnight oil" is an idiom originating from historical oil lamps, used metaphorically to mean working or studying late into the night.',
      distractorRationales: [
        'Incorrect: This interprets "oil" literally as fuel for machinery, missing the figurative academic context.',
        'Correct: "Burn the midnight oil" means putting in long hours of study or work late at night.',
        'Incorrect: This is a literal misunderstanding connecting "cooking oil" and "midnight meal".',
        'Incorrect: Unrelated distractor that confuses campus issues with the student’s study effort.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'With the semester exams starting on Monday, most students in the library were ___ to cover the remaining chapters.',
        options: ['burning the midnight oil', 'cutting corners', 'throwing in the towel', 'beating around the bush'],
        correctAnswer: 'burning the midnight oil',
        hint: 'Think of working or studying late into the night.',
      },
      sentenceRewrite: {
        plainSentence: 'We had to work late into the night to meet the client deployment deadline.',
        targetPhrase: 'burn the midnight oil',
        expectedSentence: 'We had to burn the midnight oil to meet the client deployment deadline.',
        hint: 'Replace "work late into the night" with "burn the midnight oil".',
      },
      speakingPrompt: {
        prompt: 'Explain to your project manager why your team had to put in extra overnight effort to deliver the software release.',
        referenceText: 'We had to burn the midnight oil this week to fix all critical bugs before the product launch.',
        contextTip: 'Speak with confidence and emphasize "burn the midnight oil" naturally without pausing between the words.',
      },
    },
  },

  {
    expression: 'Bite the bullet',
    type: 'idiom',
    level: 'Level 4',
    category: 'Workplace & Corporate',
    baseVerb: null,
    isSeparable: false,
    separableNote: 'Idiom: Fixed phrase.',
    multipleMeanings: [],
    stage1_discover: {
      scenarioContext: 'A tech startup team discussing whether to scrap legacy code and rewrite the backend in modern Node.js.',
      dialogue: [
        { speaker: 'Tech Lead', text: 'Refactoring this legacy monolithic system is going to take three full weeks of downtime.' },
        { speaker: 'Product Manager', text: 'I know it’s painful and risky, but we just have to bite the bullet now before customer scale doubles.' },
        { speaker: 'Tech Lead', text: 'Agreed. Let’s schedule the migration sprint for this weekend.' },
      ],
      literalMeaning: 'Biting on a lead bullet during historical battlefield surgery without anesthesia to endure extreme pain.',
      figurativeMeaning: 'To face an inevitable, difficult, or unpleasant situation with courage and resolve.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Standard executive and managerial English across US, UK, and multinational corporate teams.',
    },
    stage2_understand: {
      question: 'What does the Product Manager mean by advising the team to "bite the bullet"?',
      options: [
        'Take an aggressive and hostile stance against competitor software companies.',
        'Delay the software refactoring indefinitely to avoid taking any technical risks.',
        'Endure a painful but necessary decision now rather than postponing the inevitable.',
        'Purchase expensive specialized hardware to force the outdated code to run faster.',
      ],
      correctAnswer: 2,
      explanation: '"Bite the bullet" means accepting and confronting a difficult, unpleasant, or painful reality with determination because delaying it will only make it worse.',
      distractorRationales: [
        'Incorrect: "Bite the bullet" does not imply aggression toward competitors; it refers to stoic endurance of a hard choice.',
        'Incorrect: This is the exact opposite; the phrase urges immediate action rather than delay.',
        'Correct: It means making a hard, uncomfortable decision now to prevent greater future failure.',
        'Incorrect: Confuses metaphorical pain with hardware procurement.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'After postponing his dental surgery for six months, Kartik finally decided to ___ and book the appointment.',
        options: ['bite the bullet', 'touch base', 'cut corners', 'see eye to eye'],
        correctAnswer: 'bite the bullet',
        hint: 'Choose the idiom that means facing a painful but necessary task with courage.',
      },
      sentenceRewrite: {
        plainSentence: 'We must face this difficult problem and tell the investors about the budget shortfall.',
        targetPhrase: 'bite the bullet',
        expectedSentence: 'We must bite the bullet and tell the investors about the budget shortfall.',
        hint: 'Substitute "face this difficult problem" with "bite the bullet".',
      },
      speakingPrompt: {
        prompt: 'State your decision in a team meeting to take on a challenging client assignment that others have avoided.',
        referenceText: 'I think it is time for us to bite the bullet and address the performance issues directly.',
        contextTip: 'Deliver the phrase with a decisive, professional executive tone.',
      },
    },
  },

  {
    expression: 'Hit the ground running',
    type: 'idiom',
    level: 'Level 4',
    category: 'Placement & Interviews',
    baseVerb: null,
    isSeparable: false,
    separableNote: 'Idiom: Fixed phrase.',
    multipleMeanings: [],
    stage1_discover: {
      scenarioContext: 'A campus placement interview where the recruiter is evaluating a candidate’s onboarding readiness.',
      dialogue: [
        { speaker: 'Interviewer', text: 'Our engineering teams work in fast two-week sprints. What can we expect in your first month?' },
        { speaker: 'Candidate', text: 'Because I already have practical hands-on experience with your tech stack, I can hit the ground running from day one.' },
        { speaker: 'Interviewer', text: 'That is wonderful to hear. We value quick onboarding.' },
      ],
      literalMeaning: 'Troopers or parachutists sprinting the exact instant their boots touch the ground upon landing.',
      figurativeMeaning: 'To start a new job, project, or role immediately with full energy, speed, and minimal ramp-up time.',
      register: 'Semi-Formal / Professional',
      regionNote: 'A high-impact, sought-after phrase in modern campus recruitment and corporate job interviews worldwide.',
    },
    stage2_understand: {
      question: 'In an interview context, what does a candidate promise by claiming they will "hit the ground running"?',
      options: [
        'They are willing to complete daily athletic physical training before reporting to work.',
        'They will be productive immediately without requiring prolonged training or hand-holding.',
        'They intend to leave the company quickly if they find a higher-paying competitor offer.',
        'They will physically run between different office conference rooms to save time.',
      ],
      correctAnswer: 1,
      explanation: 'In professional and placement contexts, "hit the ground running" signifies that the candidate has the skills to contribute actively from their very first day.',
      distractorRationales: [
        'Incorrect: Takes "running" literally as exercise, which makes no sense in a corporate job.',
        'Correct: Signifies instant productivity and high adaptability in a new work environment.',
        'Incorrect: Misinterprets "running" as running away from the company.',
        'Incorrect: A comedic literal interpretation of physical running inside an office.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'Thanks to her prior internship experience, Ananya was able to ___ as a full-time associate engineer.',
        options: ['hit the ground running', 'play devil’s advocate', 'throw in the towel', 'burn the midnight oil'],
        correctAnswer: 'hit the ground running',
        hint: 'Look for the phrase meaning to be immediately productive in a new role.',
      },
      sentenceRewrite: {
        plainSentence: 'Our new project manager started the project with full momentum and zero delays.',
        targetPhrase: 'hit the ground running',
        expectedSentence: 'Our new project manager hit the ground running with zero delays.',
        hint: 'Replace "started the project with full momentum" with "hit the ground running".',
      },
      speakingPrompt: {
        prompt: 'Answer an interviewer who asks how quickly you can contribute to their active project.',
        referenceText: 'With my background in full-stack web development, I am confident I can hit the ground running from day one.',
        contextTip: 'Speak with enthusiasm and clear pronunciation of "hit the ground running".',
      },
    },
  },

  {
    expression: 'Cut corners',
    type: 'idiom',
    level: 'Level 4',
    category: 'Workplace & Corporate',
    baseVerb: null,
    isSeparable: false,
    separableNote: 'Idiom: Fixed phrase.',
    multipleMeanings: [],
    stage1_discover: {
      scenarioContext: 'A senior civil engineer briefing junior site supervisors on construction safety protocols.',
      dialogue: [
        { speaker: 'Senior Engineer', text: 'We are behind schedule, but nobody is allowed to cut corners on structural testing.' },
        { speaker: 'Junior Supervisor', text: 'Understood, sir. Quality and safety compliance will remain our top priority.' },
        { speaker: 'Senior Engineer', text: 'Good. Taking shortcuts now will cause catastrophic foundation failures later.' },
      ],
      literalMeaning: 'Taking a shorter driving path by cutting diagonally across street corners instead of following the road.',
      figurativeMeaning: 'To do something in the cheapest, quickest, or easiest way, often sacrificing quality or safety.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Universally used across corporate, manufacturing, and tech sectors to discourage risky shortcuts.',
    },
    stage2_understand: {
      question: 'What is the supervisor warning against when stating "nobody is allowed to cut corners"?',
      options: [
        'Refraining from cutting square sheet metal during manufacturing operations.',
        'Compromising on quality or safety standards to save time or money.',
        'Designing sharp 90-degree corners on office architectural blueprints.',
        'Walking in straight diagonal lines across the construction grounds.',
      ],
      correctAnswer: 1,
      explanation: '"Cut corners" means taking risky shortcuts or skimping on diligence to finish faster or cheaper, leading to inferior or hazardous results.',
      distractorRationales: [
        'Incorrect: Literal interpretation about cutting metal sheets.',
        'Correct: It denotes taking illegitimate shortcuts that degrade quality, accuracy, or safety.',
        'Incorrect: Literal confusion with architectural drafting angles.',
        'Incorrect: Literal interpretation about physical walking paths.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'When developing life-critical medical software, developers must never ___ on automated unit testing.',
        options: ['cut corners', 'bite the bullet', 'burn the midnight oil', 'touch base'],
        correctAnswer: 'cut corners',
        hint: 'Choose the expression that means taking shortcuts that compromise quality.',
      },
      sentenceRewrite: {
        plainSentence: 'The construction contractor took risky shortcuts to save money, resulting in roof leaks.',
        targetPhrase: 'cut corners',
        expectedSentence: 'The construction contractor cut corners to save money, resulting in roof leaks.',
        hint: 'Replace "took risky shortcuts" with "cut corners".',
      },
      speakingPrompt: {
        prompt: 'In a group discussion, explain why building durable software requires maintaining high standards without taking shortcuts.',
        referenceText: 'If we cut corners during the initial architecture design, we will pay a heavy price in technical debt later.',
        contextTip: 'Emphasize the contrast between "cut corners" and high technical standards.',
      },
    },
  },

  {
    expression: "Play devil's advocate",
    type: 'idiom',
    level: 'Level 5',
    category: 'Leadership & Negotiation',
    baseVerb: null,
    isSeparable: false,
    separableNote: 'Idiom: Fixed phrase.',
    multipleMeanings: [],
    stage1_discover: {
      scenarioContext: 'An executive strategy meeting where leadership is debating a major merger acquisition.',
      dialogue: [
        { speaker: 'Director', text: 'Everyone in this room seems to agree this acquisition is foolproof.' },
        { speaker: 'VP of Strategy', text: 'Allow me to play devil’s advocate for a moment. What happens if regulatory approval is delayed by twelve months?' },
        { speaker: 'Director', text: 'That is a critical risk we must stress-test. Thank you for raising that counter-argument.' },
      ],
      literalMeaning: 'Historically in the Catholic Church, an official (advocatus diaboli) appointed to argue against canonizing a person as a saint to ensure rigorous examination.',
      figurativeMeaning: 'To argue against an idea or take an opposing stance purely to test its strength and uncover flaws, even if one does not actually disagree.',
      register: 'Formal',
      regionNote: 'A hallmark expression of advanced executive leadership, collegiate debate, and strategic analysis globally.',
    },
    stage2_understand: {
      question: 'Why does the VP of Strategy offer to "play devil’s advocate" during the acquisition meeting?',
      options: [
        'He genuinely despises the acquiring firm and intends to sabotage the entire deal.',
        'He wants to present challenging opposing viewpoints to stress-test the proposal against hidden risks.',
        'He refuses to participate in the meeting and demands that everyone stop talking.',
        'He is practicing legal court defense arguments for an upcoming criminal trial.',
      ],
      correctAnswer: 1,
      explanation: 'Playing devil’s advocate means intentionally adopting a contrary stance to test the validity of an argument and protect against blind groupthink.',
      distractorRationales: [
        'Incorrect: Playing devil’s advocate is a constructive analytical technique, not personal malice or sabotage.',
        'Correct: It stimulates intellectual rigor by surfacing potential vulnerabilities before committing.',
        'Incorrect: It encourages deeper dialogue, rather than halting participation.',
        'Incorrect: Unrelated confusion with formal courtroom defense litigation.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'During our design review, Maya decided to ___ to ensure our security protocols could withstand zero-day attacks.',
        options: ["play devil's advocate", 'throw in the towel', 'cut corners', 'hit the ground running'],
        correctAnswer: "play devil's advocate",
        hint: 'Look for the idiom meaning to present opposing arguments to test an idea.',
      },
      sentenceRewrite: {
        plainSentence: 'Just to test our hypothesis, let me argue the opposing side for a minute.',
        targetPhrase: "play devil's advocate",
        expectedSentence: "Just to test our hypothesis, let me play devil's advocate for a minute.",
        hint: "Replace 'argue the opposing side' with 'play devil's advocate'.",
      },
      speakingPrompt: {
        prompt: 'Introduce an alternative perspective in a collegiate debate or boardroom discussion.',
        referenceText: "Just to play devil's advocate, what if our primary competitor releases a similar feature next month?",
        contextTip: 'Use a thoughtful, constructive tone when introducing the phrase.',
      },
    },
  },

  {
    expression: 'Touch base',
    type: 'idiom',
    level: 'Level 4',
    category: 'Workplace & Corporate',
    baseVerb: null,
    isSeparable: false,
    separableNote: 'Idiom: Fixed phrase.',
    multipleMeanings: [],
    stage1_discover: {
      scenarioContext: 'A cross-functional project manager checking in with a remote frontend developer.',
      dialogue: [
        { speaker: 'PM', text: 'Hi Vikram, let’s touch base tomorrow morning at 10 AM to review the API integration progress.' },
        { speaker: 'Vikram', text: 'Sounds great. I will have the authentication workflow ready for you by then.' },
        { speaker: 'PM', text: 'Perfect. Looking forward to our sync.' },
      ],
      literalMeaning: 'In baseball, a runner physically making brief contact with a base to stay safe from being tagged out.',
      figurativeMeaning: 'To briefly contact someone, check in, or update each other on progress.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Standard American and global corporate English. Note for Indian English speakers: In international teams, "touch base with you" is preferred over outdated colonial phrasing like "do the needful" or "revert back".',
    },
    stage2_understand: {
      question: 'When a manager asks to "touch base" tomorrow morning, what is she asking for?',
      options: [
        'She wants to play an outdoor baseball match before starting office work.',
        'She wants a short check-in meeting to exchange updates and align on progress.',
        'She expects the developer to clean and physically touch all hardware base stations.',
        'She is issuing a formal disciplinary warning regarding code violations.',
      ],
      correctAnswer: 1,
      explanation: '"Touch base" is corporate shorthand for a quick conversation or meeting to stay synchronized and exchange status updates.',
      distractorRationales: [
        'Incorrect: Baseball is the historical origin, but in a work context it is strictly metaphorical.',
        'Correct: "Touch base" means to briefly reconnect or exchange quick status updates.',
        'Incorrect: Humorous literal interpretation about hardware stations.',
        'Incorrect: It is a routine collaboration phrase, not a disciplinary warning.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'I will ___ with the marketing director before finalizing our advertising budget.',
        options: ['touch base', 'bite the bullet', 'burn the midnight oil', 'cut corners'],
        correctAnswer: 'touch base',
        hint: 'Choose the idiom meaning to briefly check in or communicate.',
      },
      sentenceRewrite: {
        plainSentence: 'Let us briefly talk and update each other after your client presentation.',
        targetPhrase: 'touch base',
        expectedSentence: 'Let us touch base after your client presentation.',
        hint: 'Replace "briefly talk and update each other" with "touch base".',
      },
      speakingPrompt: {
        prompt: 'Leave a polite voicemail or message asking a colleague for a brief update call.',
        referenceText: 'Hi Sarah, let us touch base this afternoon to align on the quarterly deliverables.',
        contextTip: 'Keep the tone conversational, professional, and brisk.',
      },
    },
  },

  // ==================== PHRASAL VERBS (LEVEL 4 & 5) ====================
  {
    expression: 'Look into',
    type: 'phrasal_verb',
    level: 'Level 4',
    category: 'Workplace & Corporate',
    baseVerb: 'look',
    isSeparable: false,
    separableNote: 'Inseparable: The preposition "into" cannot be separated from the verb "look". Say "I will look into the issue", never "I will look the issue into".',
    multipleMeanings: [
      {
        meaning: 'To investigate, examine, or research a problem, question, or inquiry.',
        example: 'Our cybersecurity team is looking into the unauthorized login attempts.',
      },
    ],
    stage1_discover: {
      scenarioContext: 'A customer support escalation meeting regarding a recurring payment gateway glitch.',
      dialogue: [
        { speaker: 'Client', text: 'Three of our overseas transactions were declined without any error message.' },
        { speaker: 'Account Manager', text: 'I apologize for the inconvenience. Our engineering team is looking into the issue right now.' },
        { speaker: 'Client', text: 'Thank you. Please let us know as soon as you find the root cause.' },
      ],
      literalMeaning: 'To physically peer or gaze inside a physical container or opening.',
      figurativeMeaning: 'To investigate, research, or examine the facts of an issue or complaint.',
      register: 'Formal',
      regionNote: 'Standard professional English worldwide. Frequently used in client emails and corporate incident handling.',
    },
    stage2_understand: {
      question: 'What does the Account Manager mean by saying the engineers are "looking into" the issue?',
      options: [
        'The engineers are literally staring at the computer monitors without typing.',
        'The engineers are actively investigating and diagnosing the root cause of the bug.',
        'The engineers have decided to ignore the problem and wait for customer complaints to stop.',
        'The engineers are looking through paper printed receipts in physical filing cabinets.',
      ],
      correctAnswer: 1,
      explanation: '"Look into" is an inseparable phrasal verb meaning to investigate, gather facts, or examine a matter thoroughly.',
      distractorRationales: [
        'Incorrect: Literal interpretation of looking with one’s eyes.',
        'Correct: It denotes investigating, researching, and troubleshooting.',
        'Incorrect: Contradicts the proactive intent of customer service.',
        'Incorrect: Unnecessarily literal and outdated.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'The Dean promised to ___ the student council’s request for extended hostel library hours.',
        options: ['look into', 'put off', 'take off', 'turn down'],
        correctAnswer: 'look into',
        hint: 'Choose the phrasal verb meaning to investigate or examine a request.',
      },
      sentenceRewrite: {
        plainSentence: 'Our compliance officers will investigate the discrepancies in the annual financial report.',
        targetPhrase: 'look into',
        expectedSentence: 'Our compliance officers will look into the discrepancies in the annual financial report.',
        hint: 'Replace "investigate" with the phrasal verb "look into".',
      },
      speakingPrompt: {
        prompt: 'Respond professionally to a professor or client who has reported a missing grade or system bug.',
        referenceText: 'Thank you for bringing this to my attention. I will look into the matter immediately.',
        contextTip: 'Pronounce "look into" smoothly without an awkward gap between the words.',
      },
    },
  },

  {
    expression: 'Look up to',
    type: 'phrasal_verb',
    level: 'Level 4',
    category: 'Campus & Academics',
    baseVerb: 'look',
    isSeparable: false,
    separableNote: 'Inseparable three-part phrasal verb: "look + up + to". The prepositional particle chain cannot be broken: "I look up to Dr. Rao".',
    multipleMeanings: [
      {
        meaning: 'To admire, respect, and view someone as a role model.',
        example: 'Junior researchers look up to senior faculty who maintain high research integrity.',
      },
    ],
    stage1_discover: {
      scenarioContext: 'An informal mentorship session between a third-year engineering mentor and a first-year student.',
      dialogue: [
        { speaker: 'Junior', text: 'How did you manage to publish two IEEE research papers while keeping a 9.5 GPA?' },
        { speaker: 'Senior', text: 'I had an incredible lab mentor in my second year who taught me disciplined time management.' },
        { speaker: 'Junior', text: 'I really look up to you and hope to follow in your footsteps!' },
      ],
      literalMeaning: 'To tilt one’s head upward to look at something physically positioned higher up.',
      figurativeMeaning: 'To respect, admire, and hold someone in high esteem as an inspiring role model.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Universally used in English-speaking academic and professional communities.',
    },
    stage2_understand: {
      question: 'What does the junior student express by telling the senior "I really look up to you"?',
      options: [
        'The junior student is physically shorter than the senior student.',
        'The junior student deeply respects and admires the senior student as a role model.',
        'The junior student needs to borrow research books stored on high library shelves.',
        'The junior student is looking at the senior student from a ground floor balcony.',
      ],
      correctAnswer: 1,
      explanation: '"Look up to" is a three-part phrasal verb meaning to respect and admire someone greatly as a role model.',
      distractorRationales: [
        'Incorrect: Takes "look up" literally based on physical height.',
        'Correct: Signifies deep admiration, respect, and seeing someone as a role model.',
        'Incorrect: Literal interpretation of reaching high shelves.',
        'Incorrect: Literal interpretation of architectural heights.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'Throughout her career, Dr. Sunita always ___ Dr. APJ Abdul Kalam as her ultimate scientific inspiration.',
        options: ['looked up to', 'looked into', 'put off', 'turned down'],
        correctAnswer: 'looked up to',
        hint: 'Choose the phrasal verb that means admired and respected as a role model.',
      },
      sentenceRewrite: {
        plainSentence: 'Many aspiring tech entrepreneurs admire and respect successful founders who build sustainable products.',
        targetPhrase: 'look up to',
        expectedSentence: 'Many aspiring tech entrepreneurs look up to successful founders who build sustainable products.',
        hint: 'Replace "admire and respect" with "look up to".',
      },
      speakingPrompt: {
        prompt: 'In an interview, name a mentor, teacher, or leader you admire and explain why.',
        referenceText: 'I have always looked up to my high school physics teacher because she inspired me to pursue computer science.',
        contextTip: 'Keep your delivery sincere and link "looked up to" naturally to the person’s name.',
      },
    },
  },

  {
    expression: 'Take off',
    type: 'phrasal_verb',
    level: 'Level 4',
    category: 'Workplace & Corporate',
    baseVerb: 'take',
    isSeparable: true,
    separableNote: 'Separable when removing clothing ("take your jacket off" / "take off your jacket"). Inseparable when meaning an airplane departing or a business becoming successful ("sales took off").',
    multipleMeanings: [
      {
        meaning: 'For a business, idea, or product: To suddenly become wildly popular, successful, or profitable.',
        example: 'After the viral product demo on LinkedIn, user signups really took off.',
      },
      {
        meaning: 'For an aircraft: To leave the ground and begin flying.',
        example: 'Our flight to Singapore is scheduled to take off at 6 AM.',
      },
      {
        meaning: 'To remove a piece of clothing or accessory.',
        example: 'Please take off your shoes before entering the laboratory.',
      },
    ],
    stage1_discover: {
      scenarioContext: 'Two venture capital investors analyzing the sudden quarterly growth of an AI fintech startup.',
      dialogue: [
        { speaker: 'Investor A', text: 'Their monthly recurring revenue was flat throughout the first two quarters.' },
        { speaker: 'Investor B', text: 'True, but once they integrated automated invoice verification, growth really took off.' },
        { speaker: 'Investor A', text: 'Impressive! They grew by over 300% in the last ninety days.' },
      ],
      literalMeaning: 'To physically lift off the ground (like an aircraft leaving a tarmac).',
      figurativeMeaning: 'To experience rapid, dramatic growth, popularity, or commercial success in a short period.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Extremely popular in tech hubs, startup pitches, and corporate earnings calls globally.',
    },
    stage2_understand: {
      question: 'In the conversation between the investors, what does "took off" mean regarding the startup?',
      options: [
        'The company founders purchased airplane tickets and left the country.',
        'The software application experienced dramatic and rapid exponential growth.',
        'The company removed their terms of service from their public website.',
        'The company ran out of server infrastructure and experienced prolonged outage.',
      ],
      correctAnswer: 1,
      explanation: 'When applied to a business, product, or career, "take off" means to experience rapid, remarkable growth and success.',
      distractorRationales: [
        'Incorrect: Confuses the business metaphor with airplane travel.',
        'Correct: "Take off" in commercial contexts denotes skyrocketing growth or rapid adoption.',
        'Incorrect: Confuses "take off" with removing a document or article of clothing.',
        'Incorrect: Opposite meaning; "take off" implies soaring success, not system failure.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'Once the mobile application added UPI instant payments, downloads began to ___ across Tier 2 cities.',
        options: ['take off', 'look into', 'put off', 'turn down'],
        correctAnswer: 'take off',
        hint: 'Choose the phrasal verb meaning to experience rapid popularity and growth.',
      },
      sentenceRewrite: {
        plainSentence: 'Her career as a freelance UI/UX consultant became very successful after she published her design portfolio.',
        targetPhrase: 'took off',
        expectedSentence: 'Her career as a freelance UI/UX consultant took off after she published her design portfolio.',
        hint: 'Replace "became very successful" with "took off".',
      },
      speakingPrompt: {
        prompt: 'Present the growth trajectory of a successful open-source project or startup during a presentation.',
        referenceText: 'After our team released the open-source repository on GitHub, adoption really took off across the developer community.',
        contextTip: 'Stress the word "off" with positive upward inflection.',
      },
    },
  },

  {
    expression: 'Put off',
    type: 'phrasal_verb',
    level: 'Level 4',
    category: 'Campus & Academics',
    baseVerb: 'put',
    isSeparable: true,
    separableNote: 'Separable: You can say "put off the meeting" or "put the meeting off". If using a pronoun, it must go in between: "put it off", never "put off it".',
    multipleMeanings: [
      {
        meaning: 'To postpone, delay, or reschedule an event to a later time or date.',
        example: 'Due to severe monsoon rains, the university put off the semester exams until next week.',
      },
      {
        meaning: 'To discourage or cause someone to dislike something.',
        example: 'The arrogant attitude of the interviewer put me off the company completely.',
      },
    ],
    stage1_discover: {
      scenarioContext: 'Two college students discussing their project submission schedule.',
      dialogue: [
        { speaker: 'Neha', text: 'Have you started writing the documentation for the database schema?' },
        { speaker: 'Rahul', text: 'I keep putting it off because designing the frontend is so much more engaging.' },
        { speaker: 'Neha', text: 'You shouldn’t put it off any longer; the submission portal closes tomorrow at midnight!' },
      ],
      literalMeaning: 'To place an object away from a surface.',
      figurativeMeaning: 'To postpone, procrastinate, or delay completing an important task.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Standard in British, American, and Indian English academic discourse.',
    },
    stage2_understand: {
      question: 'In the dialogue, why does Neha advise Rahul that he "shouldn’t put it off any longer"?',
      options: [
        'He shouldn’t discard his laptop into the garbage bin.',
        'He shouldn’t delay or procrastinate on finishing his project documentation.',
        'He should cancel his college enrollment before exams begin.',
        'He should turn off the computer monitor immediately to save electricity.',
      ],
      correctAnswer: 1,
      explanation: '"Put off" means to postpone, delay, or avoid doing a task until later.',
      distractorRationales: [
        'Incorrect: Confuses "put off" with throwing away.',
        'Correct: "Put off" is the classic phrasal verb for postponing or procrastinating.',
        'Incorrect: Overly dramatic misinterpretation having nothing to do with deadlines.',
        'Incorrect: Confuses "put off" with "turn off".',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'Never ___ until tomorrow what you can accomplish today.',
        options: ['put off', 'take off', 'look into', 'bring up'],
        correctAnswer: 'put off',
        hint: 'Famous proverb: never postpone until tomorrow.',
      },
      sentenceRewrite: {
        plainSentence: 'The faculty board decided to postpone the annual sports day due to bad weather.',
        targetPhrase: 'put off',
        expectedSentence: 'The faculty board decided to put off the annual sports day due to bad weather.',
        hint: 'Replace "postpone" with "put off".',
      },
      speakingPrompt: {
        prompt: 'In a team standup meeting, explain why a low-priority task should be rescheduled.',
        referenceText: 'I suggest we put off the non-essential UI redesign until we have resolved the core database latency issues.',
        contextTip: 'Pronounce "put off" crisply with clear separation between the /t/ and /ɔːf/.',
      },
    },
  },

  {
    expression: 'Put up with',
    type: 'phrasal_verb',
    level: 'Level 5',
    category: 'Workplace & Corporate',
    baseVerb: 'put',
    isSeparable: false,
    separableNote: 'Inseparable three-part phrasal verb: "put + up + with". You cannot separate the components: "I cannot put up with this noise".',
    multipleMeanings: [
      {
        meaning: 'To tolerate, endure, or bear an unpleasant, irritating, or difficult person or situation without complaining.',
        example: 'Modern software teams will not put up with toxic workplace behavior.',
      },
    ],
    stage1_discover: {
      scenarioContext: 'An HR manager addressing team dynamics during an all-hands meeting.',
      dialogue: [
        { speaker: 'Employee', text: 'Several junior developers are frustrated because a team member consistently interrupts during design critiques.' },
        { speaker: 'HR Manager', text: 'Our organization has a zero-tolerance policy for disrespect. We will not put up with unprofessional conduct.' },
        { speaker: 'Employee', text: 'Thank you. It is reassuring to know management takes team psychological safety seriously.' },
      ],
      literalMeaning: 'To place something up high in the company of someone.',
      figurativeMeaning: 'To endure, bear, or tolerate an undesirable or stressful condition or behavior.',
      register: 'Formal',
      regionNote: 'Common in corporate governance, workplace agreements, and formal interpersonal negotiations globally.',
    },
    stage2_understand: {
      question: 'What does the HR Manager declare when saying "We will not put up with unprofessional conduct"?',
      options: [
        'The company will physically construct elevated cubicles for senior managers.',
        'The company will not tolerate, accept, or excuse disrespectful behavior in the workplace.',
        'The company intends to fire all junior developers to prevent complaints.',
        'The company will provide financial bonuses to employees who stay silent.',
      ],
      correctAnswer: 1,
      explanation: '"Put up with" is an inseparable three-word phrasal verb meaning to tolerate, accept, or endure unpleasant conditions.',
      distractorRationales: [
        'Incorrect: Literal interpretation about "putting up" physical structures.',
        'Correct: It communicates strict intolerance for unacceptable conduct.',
        'Incorrect: Misattributes disciplinary action to the victims.',
        'Incorrect: Contradicts the clear policy of zero tolerance.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'As a system administrator, I refuse to ___ security vulnerabilities caused by hardcoded database passwords.',
        options: ['put up with', 'look up to', 'take off', 'turn down'],
        correctAnswer: 'put up with',
        hint: 'Choose the three-part phrasal verb meaning to tolerate or accept.',
      },
      sentenceRewrite: {
        plainSentence: 'We can no longer tolerate constant server crashes during peak traffic hours.',
        targetPhrase: 'put up with',
        expectedSentence: 'We can no longer put up with constant server crashes during peak traffic hours.',
        hint: 'Substitute "tolerate" with "put up with".',
      },
      speakingPrompt: {
        prompt: 'State your personal standard for collaboration and respect in team projects during an interview.',
        referenceText: 'I always strive for constructive collaboration and believe teams should never put up with toxic communication.',
        contextTip: 'Deliver the phrase with firm, professional conviction.',
      },
    },
  },

  {
    expression: 'Put across',
    type: 'phrasal_verb',
    level: 'Level 5',
    category: 'Placement & Interviews',
    baseVerb: 'put',
    isSeparable: true,
    separableNote: 'Separable: "put your ideas across" or "put across your ideas". With a pronoun: "put it across", never "put across it".',
    multipleMeanings: [
      {
        meaning: 'To explain, convey, or communicate an idea, viewpoint, or proposal clearly and persuasively.',
        example: 'He put his architectural design across so clearly that the committee approved it unanimously.',
      },
    ],
    stage1_discover: {
      scenarioContext: 'A professor coaching a collegiate debate team on presentation skills.',
      dialogue: [
        { speaker: 'Professor', text: 'Having thorough research is only half the battle in competitive debating.' },
        { speaker: 'Debater', text: 'What is the other half, Professor?' },
        { speaker: 'Professor', text: 'How effectively you put your arguments across to a skeptical panel of judges.' },
      ],
      literalMeaning: 'To physically place an object across a table or physical barrier.',
      figurativeMeaning: 'To successfully communicate and convince others of an idea or message.',
      register: 'Formal',
      regionNote: 'Favored in collegiate debating, public speaking, and executive leadership development.',
    },
    stage2_understand: {
      question: 'What does the professor mean by emphasizing how debaters "put their arguments across"?',
      options: [
        'How loudly debaters shout across the auditorium to overpower their opponents.',
        'How clearly and persuasively debaters communicate their points so the audience understands and agrees.',
        'How quickly debaters slide paper evidence folders across the judges’ table.',
        'How many physical hand gestures debaters use during their five-minute speech.',
      ],
      correctAnswer: 1,
      explanation: '"Put across" means to communicate ideas effectively and persuasively so that listeners grasp and accept them.',
      distractorRationales: [
        'Incorrect: Shouting is poor debate technique; the phrase refers to clarity and persuasion.',
        'Correct: Denotes effective, articulate communication of complex concepts.',
        'Incorrect: Literal interpretation about sliding papers across a desk.',
        'Incorrect: Focuses on physical gestures rather than rhetorical clarity.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'During your placement interview, it is vital to ___ your technical achievements with clarity and modesty.',
        options: ['put across', 'put off', 'look into', 'cut corners'],
        correctAnswer: 'put across',
        hint: 'Choose the phrasal verb meaning to communicate ideas effectively.',
      },
      sentenceRewrite: {
        plainSentence: 'She communicated her project vision so effectively that all five investors backed her startup.',
        targetPhrase: 'put across',
        expectedSentence: 'She put her project vision across so effectively that all five investors backed her startup.',
        hint: 'Replace "communicated... effectively" with "put across".',
      },
      speakingPrompt: {
        prompt: 'In a job interview, describe your communication style when explaining technical architectures to non-technical stakeholders.',
        referenceText: 'I use real-world analogies to put complex system concepts across to business stakeholders without confusing them.',
        contextTip: 'Articulate each syllable of "put across" with clarity.',
      },
    },
  },

  {
    expression: 'Turn down',
    type: 'phrasal_verb',
    level: 'Level 4',
    category: 'Placement & Interviews',
    baseVerb: 'turn',
    isSeparable: true,
    separableNote: 'Separable: "turn down the offer" or "turn the offer down". With a pronoun: "turn it down", never "turn down it".',
    multipleMeanings: [
      {
        meaning: 'To reject or refuse an offer, invitation, application, or request.',
        example: 'He turned down a high-paying offer in sales because he wanted to work strictly in AI research.',
      },
      {
        meaning: 'To reduce the volume, heat, or intensity of a device.',
        example: 'Could you please turn down the volume of the speakers?',
      },
    ],
    stage1_discover: {
      scenarioContext: 'Two college friends discussing campus placement offers in the college quad.',
      dialogue: [
        { speaker: 'Arjun', text: 'Did you accept the job offer from the IT consulting firm in Bengaluru?' },
        { speaker: 'Siddharth', text: 'I actually decided to turn it down. I received an offer from a core robotics startup in Pune.' },
        { speaker: 'Arjun', text: 'That took real courage! You chose your true passion over a safe corporate brand.' },
      ],
      literalMeaning: 'To physically rotate a dial downward or fold a page corner down.',
      figurativeMeaning: 'To reject or politely decline an offer, invitation, or proposal.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Standard professional English across India, the US, and the UK.',
    },
    stage2_understand: {
      question: 'What does Siddharth mean when he says he decided to "turn down" the consulting offer?',
      options: [
        'He decreased the brightness of the offer letter PDF file on his laptop screen.',
        'He declined and rejected the job offer in favor of another opportunity.',
        'He accepted the job offer immediately and signed the employment contract.',
        'He forgot to reply to the company’s email before the deadline expired.',
      ],
      correctAnswer: 1,
      explanation: '"Turn down" is a separable phrasal verb meaning to decline, refuse, or reject an offer or request.',
      distractorRationales: [
        'Incorrect: Literal interpretation of turning down computer brightness.',
        'Correct: "Turn down" means to decline or reject an offer.',
        'Incorrect: Direct opposite of rejecting.',
        'Incorrect: Forgetting to reply is negligence, not deliberate rejection.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'Due to severe budget constraints, the board had to ___ the proposal for a new cafeteria wing.',
        options: ['turn down', 'take off', 'look up to', 'burn the midnight oil'],
        correctAnswer: 'turn down',
        hint: 'Choose the phrasal verb that means to reject or decline.',
      },
      sentenceRewrite: {
        plainSentence: 'She politely rejected their initial salary offer and requested a revised compensation package.',
        targetPhrase: 'turned down',
        expectedSentence: 'She politely turned down their initial salary offer and requested a revised compensation package.',
        hint: 'Replace "rejected" with "turned down".',
      },
      speakingPrompt: {
        prompt: 'Explain during an interview why you previously declined an offer to pursue a more aligned career direction.',
        referenceText: 'I turned down an offer in generic customer operations because I was determined to work in data engineering.',
        contextTip: 'Sound confident, polite, and respectful when expressing "turned down".',
      },
    },
  },

  {
    expression: 'Bring up',
    type: 'phrasal_verb',
    level: 'Level 4',
    category: 'Workplace & Corporate',
    baseVerb: 'bring',
    isSeparable: true,
    separableNote: 'Separable: "bring up the topic" or "bring the topic up". With a pronoun: "bring it up", never "bring up it".',
    multipleMeanings: [
      {
        meaning: 'To mention, introduce, or raise a subject or topic for discussion in a meeting or conversation.',
        example: 'I plan to bring up the server downtime issue at tomorrow’s sprint retrospective.',
      },
      {
        meaning: 'To raise, nurture, and care for a child until maturity.',
        example: 'She was brought up in a bilingual household in Hyderabad.',
      },
    ],
    stage1_discover: {
      scenarioContext: 'Two software engineers preparing for their weekly team retrospective.',
      dialogue: [
        { speaker: 'Engineer A', text: 'Our build pipeline failed three times this week because of flaky integration tests.' },
        { speaker: 'Engineer B', text: 'Are you going to bring that up in the retrospective meeting?' },
        { speaker: 'Engineer A', text: 'Definitely. We need to allocate engineering time to stabilize the CI/CD pipeline.' },
      ],
      literalMeaning: 'To physically carry an item from a lower floor to an upper floor.',
      figurativeMeaning: 'To introduce a subject or concern into a discussion or agenda.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Standard workplace and conversational English globally.',
    },
    stage2_understand: {
      question: 'In the dialogue, what does Engineer B ask when inquiring whether Engineer A will "bring that up"?',
      options: [
        'Whether Engineer A will carry the testing servers up the flight of stairs.',
        'Whether Engineer A will raise and mention the pipeline failures for discussion in the meeting.',
        'Whether Engineer A will adopt and raise a child during the company retrospective.',
        'Whether Engineer A will delete the entire codebase from the remote repository.',
      ],
      correctAnswer: 1,
      explanation: 'In conversational and meeting contexts, "bring up" means to introduce or mention a topic for discussion.',
      distractorRationales: [
        'Incorrect: Literal interpretation about carrying heavy servers upstairs.',
        'Correct: "Bring up" means raising or introducing a topic for group discussion.',
        'Incorrect: Confuses the meeting meaning with the family parenting meaning of "raising a child".',
        'Incorrect: Unrelated destructive action.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'During the quarterly town hall, an employee courageously decided to ___ the issue of gender pay parity.',
        options: ['bring up', 'put off', 'turn down', 'cut corners'],
        correctAnswer: 'bring up',
        hint: 'Choose the phrasal verb that means to mention or introduce a topic for discussion.',
      },
      sentenceRewrite: {
        plainSentence: 'I did not want to mention our budget deficit while the client was present in the room.',
        targetPhrase: 'bring up',
        expectedSentence: 'I did not want to bring up our budget deficit while the client was present in the room.',
        hint: 'Replace "mention" with "bring up".',
      },
      speakingPrompt: {
        prompt: 'Introduce an important discussion topic respectfully at the start of a team meeting.',
        referenceText: 'Before we conclude today’s agenda, I would like to bring up our timeline for the beta release.',
        contextTip: 'Deliver "bring up" smoothly as part of the sentence flow.',
      },
    },
  },

  {
    expression: 'Get across',
    type: 'phrasal_verb',
    level: 'Level 5',
    category: 'Placement & Interviews',
    baseVerb: 'get',
    isSeparable: true,
    separableNote: 'Separable: "get your message across" or "get across your message". With a pronoun: "get it across", never "get across it".',
    multipleMeanings: [
      {
        meaning: 'To successfully communicate an idea or message so that it is clearly understood by others.',
        example: 'The teacher used dynamic diagrams to get the complex quantum mechanics concept across.',
      },
    ],
    stage1_discover: {
      scenarioContext: 'A placement training mentor evaluating a student’s technical presentation delivery.',
      dialogue: [
        { speaker: 'Student', text: 'I knew all the technical details of my AI architecture, but I felt the panel looked confused.' },
        { speaker: 'Mentor', text: 'You had great content, but you struggled to get your core value proposition across.' },
        { speaker: 'Student', text: 'I see. I used too much internal jargon instead of explaining the business impact.' },
      ],
      literalMeaning: 'To physically cross from one side of a river, street, or boundary to the other.',
      figurativeMeaning: 'To successfully transmit, explain, and impart an idea so that listeners truly comprehend it.',
      register: 'Formal',
      regionNote: 'Widely used in corporate communications, presentation coaching, and interview training.',
    },
    stage2_understand: {
      question: 'What was the student’s difficulty according to the mentor’s feedback that he "struggled to get his core value proposition across"?',
      options: [
        'He was unable to walk across the presentation stage due to leg fatigue.',
        'He had trouble communicating his main idea clearly enough for the interviewers to understand.',
        'He forgot to print physical paper handouts for the interview panel members.',
        'He arrived thirty minutes late to the campus recruitment auditorium.',
      ],
      correctAnswer: 1,
      explanation: '"Get across" means to communicate an idea successfully so that listeners grasp the intended meaning.',
      distractorRationales: [
        'Incorrect: Literal interpretation of walking across physical stage floor.',
        'Correct: It denotes successful communication and cognitive comprehension by the listener.',
        'Incorrect: Handouts are irrelevant to the rhetorical delivery.',
        'Incorrect: Punctuality is unrelated to the clarity of the presentation.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'A skilled public speaker always uses concrete analogies to ___ complex philosophical principles.',
        options: ['get across', 'put off', 'turn down', 'burn the midnight oil'],
        correctAnswer: 'get across',
        hint: 'Choose the phrasal verb meaning to convey ideas so they are easily understood.',
      },
      sentenceRewrite: {
        plainSentence: 'The developer used interactive diagrams to communicate the distributed database architecture clearly.',
        targetPhrase: 'get across',
        expectedSentence: 'The developer used interactive diagrams to get the distributed database architecture across clearly.',
        hint: 'Replace "communicate... clearly" with "get across".',
      },
      speakingPrompt: {
        prompt: 'Explain during an interview how you communicate technical updates to non-technical team members.',
        referenceText: 'I always use clear visual flowcharts to get my technical recommendations across to marketing and sales teams.',
        contextTip: 'Stress "get across" with clarity and confidence.',
      },
    },
  },

  {
    expression: 'See eye to eye',
    type: 'idiom',
    level: 'Level 4',
    category: 'Leadership & Negotiation',
    baseVerb: null,
    isSeparable: false,
    separableNote: 'Idiom: Fixed phrase (often used in the negative: "we don’t see eye to eye").',
    multipleMeanings: [],
    stage1_discover: {
      scenarioContext: 'Two co-founders discussing their company’s remote-work policy.',
      dialogue: [
        { speaker: 'Co-founder A', text: 'I think all engineering teams should report to the Bangalore office three days a week.' },
        { speaker: 'Co-founder B', text: 'I disagree completely. Our remote engineers are 20% more productive at home.' },
        { speaker: 'Co-founder A', text: 'We clearly don’t see eye to eye on this, so let’s review our quarterly sprint velocity data before deciding.' },
      ],
      literalMeaning: 'Two people looking directly into each other’s pupils at the exact same physical eye level.',
      figurativeMeaning: 'To be in full agreement; to hold the exact same opinion or viewpoint on an issue.',
      register: 'Semi-Formal / Professional',
      regionNote: 'Standard in diplomatic, legal, corporate, and daily English across the world.',
    },
    stage2_understand: {
      question: 'When Co-founder A remarks that they "clearly don’t see eye to eye on this", what does he mean?',
      options: [
        'The two co-founders are experiencing vision problems and require eye exams.',
        'The two co-founders have conflicting opinions and do not currently agree on the policy.',
        'The co-founders are refusing to look at each other during the video conference.',
        'The co-founders are of completely different physical heights.',
      ],
      correctAnswer: 1,
      explanation: '"See eye to eye" means to agree with someone or view a situation from the same perspective. When negated, it indicates disagreement.',
      distractorRationales: [
        'Incorrect: Medical misinterpretation of eye health.',
        'Correct: "See eye to eye" represents mutual consensus or agreement.',
        'Incorrect: Literal interpretation about eye contact during video calls.',
        'Incorrect: Literal interpretation of physical height differences.',
      ],
    },
    stage3_use: {
      fillInBlank: {
        sentence: 'Although the marketing and product teams rarely ___, they collaborated brilliantly on the product relaunch.',
        options: ['see eye to eye', 'bite the bullet', 'cut corners', 'put off'],
        correctAnswer: 'see eye to eye',
        hint: 'Choose the idiom that means to agree or share the same viewpoint.',
      },
      sentenceRewrite: {
        plainSentence: 'My project teammate and I do not agree on which database technology to adopt.',
        targetPhrase: 'see eye to eye',
        expectedSentence: 'My project teammate and I do not see eye to eye on which database technology to adopt.',
        hint: 'Replace "do not agree" with "do not see eye to eye".',
      },
      speakingPrompt: {
        prompt: 'Describe in an interview how you resolve differences with colleagues when you do not initially agree.',
        referenceText: 'Even when my teammates and I don’t see eye to eye, I listen objectively to their reasoning to find common ground.',
        contextTip: 'Maintain a calm, diplomatic tone when speaking.',
      },
    },
  },
];

async function seedIdiomsData() {
  const existingCount = await IdiomPhrase.countDocuments();
  if (existingCount === 0) {
    console.log('[seed] Seeding Level 4-5 Idioms & Phrasal Verbs Grove curriculum...');
    await IdiomPhrase.insertMany(SEED_IDIOMS_DATA);
    console.log(`[seed] Successfully seeded ${SEED_IDIOMS_DATA.length} Level 4-5 expressions with 4-stage learning designs!`);
  } else {
    console.log(`[seed] Idioms & Phrasal Verbs already populated (${existingCount} expressions).`);
  }
}

module.exports = {
  SEED_IDIOMS_DATA,
  seedIdiomsData,
};
