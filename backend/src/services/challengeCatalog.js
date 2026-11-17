/**
 * challengeCatalog.js — LinGrow AI Adventure Questions & Challenges Catalog
 * Strictly categorized into Beginner, Intermediate, and Advanced tiers.
 */

const CHALLENGES = [
  /* ==========================================================================
     LEVEL 1: BEGINNER (Core Foundations — Grammar, Basic Vocab, Simple Dialogue)
     ========================================================================== */
  {
    id: 'detective-b1',
    level: 'Beginner',
    category: 'detective',
    title: 'English Detective: Case #101',
    subtitle: 'The Missing Classroom Key',
    desc: 'Examine three freshmen statements to discover the false alibi exposed by a basic past tense auxiliary error.',
    icon: '🕵️‍♂️',
    xp: 20,
    interactive: true,
    actionText: 'Investigate Case',
    badge: 'Grammar Deduction',
    data: {
      caseTitle: 'Case #101: The Missing Classroom Key',
      themeBadge: 'PAST TENSE SYNTAX INVESTIGATION',
      scenario: 'The teacher’s desk key was misplaced right before morning roll call. Three freshmen waiting outside the language lab gave these statements:',
      statements: [
        { speaker: 'Freshman Alex', quote: 'I waited at the library entrance until the bell rang. I didn’t see anyone enter the corridor.' },
        { speaker: 'Freshman Brian', quote: 'I was go to the cafeteria with my roommate before classes started.' },
        { speaker: 'Freshman Chloe', quote: 'I walked directly to my desk and unpacked my notebooks.' },
      ],
      question: 'Which student made a basic grammatical error indicating a fabricated excuse?',
      options: [
        { label: 'A) Alex ("didn’t see")', choice: 'Alex' },
        { label: 'B) Brian ("was go" — auxiliary was requires -ing or simple went)', choice: 'Brian' },
        { label: 'C) Chloe ("walked directly")', choice: 'Chloe' },
      ],
      correctChoice: 'Brian',
      explanation: 'Brian said "was go". In English, past continuous requires "was + verb-ing" (was going), or simple past (went). This grammatical slip exposes Brian’s false alibi!',
    },
  },
  {
    id: 'escape-b1',
    level: 'Beginner',
    category: 'escape-room',
    title: 'Escape the English Room: Chamber of Prepositions',
    subtitle: 'Elemental Preposition Gate',
    desc: 'Solve the spatial rune by placing the correct preposition to unlock the elemental stone gate.',
    icon: '🗝️',
    xp: 20,
    interactive: true,
    actionText: 'Enter Chamber',
    badge: 'Spatial Syntax',
    data: {
      chamberTitle: 'Chamber #1: Chamber of Prepositions',
      scenario: 'A heavy stone gate blocks the cavern path. Inscribe the correct spatial preposition into the glowing slot:',
      sentence: 'The student sat quietly _________ the shade of the ancient banyan tree.',
      options: [
        { label: 'A) in (enclosed spatial shade)', choice: 'in' },
        { label: 'B) between (requires two reference points)', choice: 'between' },
        { label: 'C) onto (indicates directional movement towards a surface)', choice: 'onto' },
      ],
      correctChoice: 'in',
      explanation: 'In English, we say "in the shade" because the shade is treated as a three-dimensional protective area of shelter.',
    },
  },
  {
    id: 'battle-b1',
    level: 'Beginner',
    category: 'word-battle',
    title: 'Word Battle Arena: Drake Hatchling Duel',
    subtitle: 'Foundational Vocabulary Clash',
    desc: 'Rapid-fire synonym match against the Drake Hatchling before the round timer runs out.',
    icon: '⚔️',
    xp: 20,
    interactive: true,
    actionText: 'Battle Hatchling',
    badge: 'Vocab Speed',
    data: {
      opponent: 'Drake Hatchling',
      targetWord: 'Courageous',
      question: 'Select the exact SYNONYM for "Courageous" before time expires:',
      options: [
        { label: 'Brave & Bold', choice: 'Brave' },
        { label: 'Fearful', choice: 'Fearful' },
        { label: 'Sluggish', choice: 'Sluggish' },
        { label: 'Silent', choice: 'Silent' },
      ],
      correctChoice: 'Brave',
      explanation: '"Courageous" means possessing or showing courage; brave and valorous.',
    },
  },
  {
    id: 'quest-b1',
    level: 'Beginner',
    category: 'random-quest',
    title: 'Destiny Quest: Foundational Articulation',
    subtitle: 'Phonetics & Spoken Introduction',
    desc: 'Spin the Destiny wheel for an oral articulation sprint and self-introduction exercise.',
    icon: '🎲',
    xp: 15,
    interactive: true,
    actionText: 'Roll Quest',
    badge: 'Impromptu Oral',
    data: {
      tasks: [
        'Say this tongue-twister 3 times cleanly without pausing: "Crisp clear crystal clouds over the castle!"',
        'Introduce yourself out loud in 3 complete sentences: your full name, your college department, and your favorite passion.',
        'State 3 objects you can see around you right now using complete sentences starting with "There is..." or "There are...".',
      ],
    },
  },
  {
    id: 'scenario-b1',
    level: 'Beginner',
    category: 'simulation',
    title: 'Campus Everyday Dialogue: Library Desk',
    subtitle: 'Polite Everyday Communication',
    desc: 'Practice courteous spoken inquiry with the campus librarian using polite modals (could/would/please).',
    icon: '📚',
    xp: 25,
    interactive: false,
    destination: 'situational',
    actionText: 'Practice Dialogue',
    badge: 'Polite Modals',
  },
  {
    id: 'pronounce-b1',
    level: 'Beginner',
    category: 'pronunciation',
    title: 'Voice Studio: Foundational Phonetics',
    subtitle: 'Ending Consonants & Vowel Clarity',
    desc: 'Read aloud a beginner passage with clear articulation of final -ed, -s, and diphthong sounds.',
    icon: '🎙️',
    xp: 25,
    interactive: false,
    destination: 'read-aloud',
    actionText: 'Start Reading',
    badge: 'Phoneme Accuracy',
  },

  /* ==========================================================================
     LEVEL 2: INTERMEDIATE (Phrasal Verbs, Complex Grammar, Fluency, Stories)
     ========================================================================== */
  {
    id: 'detective-i1',
    level: 'Intermediate',
    category: 'detective',
    title: 'English Detective: Case #104',
    subtitle: 'The Mystery of the Gilded Parchment',
    desc: 'Interrogate three scholars to spot the continuous stative verb error exposing the thief.',
    icon: '🕵️‍♂️',
    xp: 25,
    interactive: true,
    actionText: 'Launch Case',
    badge: 'Stative Verb Trap',
    data: {
      caseTitle: 'Case #104: The Mystery of the Gilded Parchment',
      themeBadge: 'STATIVE VERB TENSE DETECTION',
      scenario: 'At 10:00 PM last night, an ancient Dragon Codex was stolen from the Academy Vault. Three scholars were in the library wing:',
      statements: [
        { speaker: 'Scholar Aaron', quote: 'I was reading in the eastern archive until 10:30 PM. I haven’t seen anyone enter the corridor.' },
        { speaker: 'Scholar Brenda', quote: 'I arrived yesterday at 11:00 PM, after the vault had already been unlocked.' },
        { speaker: 'Scholar Cedric', quote: 'I was inspecting the lock when suddenly the alarm rang. I am knowing all the security codes by heart!' },
      ],
      question: 'Which scholar made a fundamental grammatical error indicating deceit?',
      options: [
        { label: 'A) Aaron ("haven’t seen")', choice: 'Aaron' },
        { label: 'B) Brenda ("arrived yesterday")', choice: 'Brenda' },
        { label: 'C) Cedric ("am knowing" — state verbs cannot be continuous!)', choice: 'Cedric' },
      ],
      correctChoice: 'Cedric',
      explanation: '"Know" is a stative verb representing mental cognition. In English grammar, stative verbs cannot be used in continuous/progressive tenses ("am knowing" is grammatically incorrect). Cedric is the culprit!',
    },
  },
  {
    id: 'escape-i1',
    level: 'Intermediate',
    category: 'escape-room',
    title: 'Escape the English Room: Chamber of Phrasals',
    subtitle: 'Linguistic Puzzle Solver',
    desc: 'Solve the phrasal verb riddle to shatter the rune binding the portal.',
    icon: '🗝️',
    xp: 25,
    interactive: true,
    actionText: 'Enter Room',
    badge: 'Phrasal Mastery',
    data: {
      chamberTitle: 'Chamber #2: Chamber of Phrasals',
      scenario: 'The stone portal is sealed by an enchanted linguistic rune. Complete the sentence with the correct phrasal verb:',
      sentence: 'The dragon refused to _________ the kingdom, standing firm against the storm.',
      options: [
        { label: 'A) give up on (abandon hope / cease caring)', choice: 'give up on' },
        { label: 'B) give in to (yield to pressure / surrender)', choice: 'give in to' },
        { label: 'C) take after (resemble an ancestor)', choice: 'take after' },
      ],
      correctChoice: 'give up on',
      explanation: '"Give up on" means to stop having faith, abandon, or stop trying to save someone or something.',
    },
  },
  {
    id: 'battle-i1',
    level: 'Intermediate',
    category: 'word-battle',
    title: 'Word Battle Arena: Drake Shadow Clash',
    subtitle: 'Collegiate Vocabulary Duel',
    desc: 'High-tempo battle against the Drake Shadow champion to select nuanced collegiate synonyms.',
    icon: '⚔️',
    xp: 25,
    interactive: true,
    actionText: 'Battle Shadow',
    badge: 'Collegiate Speed',
    data: {
      opponent: 'Drake Shadow Champion',
      targetWord: 'Resilient',
      question: 'Choose the exact SYNONYM for "Resilient" before the Drake strikes:',
      options: [
        { label: 'Fragile', choice: 'Fragile' },
        { label: 'Adaptable & Tough', choice: 'Adaptable & Tough' },
        { label: 'Hesitant', choice: 'Hesitant' },
        { label: 'Sluggish', choice: 'Sluggish' },
      ],
      correctChoice: 'Adaptable & Tough',
      explanation: '"Resilient" means able to recoil or bounce back rapidly from adversity; flexible, tough, and adaptable.',
    },
  },
  {
    id: 'quest-i1',
    level: 'Intermediate',
    category: 'random-quest',
    title: 'Destiny Quest: Grammar Nuance & Storytelling',
    subtitle: 'Distinction & Spontaneous Speech',
    desc: 'Explain tricky grammatical differences and narrate an unscripted spontaneous experience.',
    icon: '🎲',
    xp: 20,
    interactive: true,
    actionText: 'Roll Quest',
    badge: 'Fluency Sprint',
    data: {
      tasks: [
        'Explain the difference between "Affect" (verb) and "Effect" (noun) out loud in two simple sentences with examples.',
        'Use the phrasal verb "bring about" in a spoken sentence discussing positive technological change.',
        'Speak for 30 seconds describing a time you overcame an unexpected academic obstacle.',
      ],
    },
  },
  {
    id: 'sim-i1',
    level: 'Intermediate',
    category: 'simulation',
    title: 'Workplace Simulation: The Agile Standup',
    subtitle: 'Team Status & Blocker Communication',
    desc: 'Participate in an interactive sprint standup, communicating updates and blockers concisely without rambling.',
    icon: '💼',
    xp: 30,
    interactive: false,
    destination: 'simulator',
    actionText: 'Join Standup',
    badge: 'Workplace Agility',
  },
  {
    id: 'story-i1',
    level: 'Intermediate',
    category: 'story',
    title: 'Story Continuation: The Stalled Elevator',
    subtitle: 'Spontaneous Spoken Narration',
    desc: 'Listen to a narrative opening and continue the story spontaneously with rich descriptors and connective phrases.',
    icon: '📖',
    xp: 30,
    interactive: false,
    destination: 'story',
    actionText: 'Continue Story',
    badge: 'Narrative Flow',
  },

  /* ==========================================================================
     LEVEL 3: ADVANCED (Executive Oratory, Inversions, High-Stakes Debate)
     ========================================================================== */
  {
    id: 'detective-a1',
    level: 'Advanced',
    category: 'detective',
    title: 'English Detective: Case #108',
    subtitle: 'The Syndicate Infiltration',
    desc: 'Examine diplomatic council statements to detect an inverted negative adverb syntax violation.',
    icon: '🕵️‍♂️',
    xp: 35,
    interactive: true,
    actionText: 'Crack Case',
    badge: 'Inversion Syntax',
    data: {
      caseTitle: 'Case #108: The Syndicate Infiltration',
      themeBadge: 'NEGATIVE ADVERBIAL INVERSION EXPOSURE',
      scenario: 'The High Council’s encrypted vault key was leaked during an emergency assembly. Three senior ambassadors gave sworn statements:',
      statements: [
        { speaker: 'Ambassador Douglas', quote: 'Had we received the dispatch sooner, we would have fortified the perimeter immediately.' },
        { speaker: 'Ambassador Evelyn', quote: 'Under no circumstances the courier should leave the diplomatic bag unattended.' },
        { speaker: 'Ambassador Felix', quote: 'Scarcely had the assembly convened when the power grid malfunctioned.' },
      ],
      question: 'Which ambassador committed an advanced inversion syntax error indicating a fabricated testimony?',
      options: [
        { label: 'A) Douglas ("Had we received" — third conditional inversion is correct)', choice: 'Douglas' },
        { label: 'B) Evelyn ("Under no circumstances the courier should" — negative fronting requires auxiliary inversion!)', choice: 'Evelyn' },
        { label: 'C) Felix ("Scarcely had the assembly" — negative time inversion is correct)', choice: 'Felix' },
      ],
      correctChoice: 'Evelyn',
      explanation: 'When negative adverbials like "Under no circumstances" are fronted for rhetorical emphasis, subject-auxiliary inversion is mandatory: "Under no circumstances should the courier leave...". Evelyn’s error exposes her counterfeit memo!',
    },
  },
  {
    id: 'escape-a1',
    level: 'Advanced',
    category: 'escape-room',
    title: 'Escape Room: Vault of Mixed Conditionals',
    subtitle: 'Grand Sanctum Puzzle',
    desc: 'Solve the mixed third conditional key to unseal the Archmage’s inner sanctum.',
    icon: '🗝️',
    xp: 35,
    interactive: true,
    actionText: 'Unseal Vault',
    badge: 'Mixed Conditionals',
    data: {
      chamberTitle: 'Chamber #3: Vault of Conditionals & Inversions',
      scenario: 'The vault lock glows with dual temporal runes linking past historical cause to present reality:',
      sentence: 'If the dragon had not defended the fortress walls yesterday, our kingdom _________ in ruins today.',
      options: [
        { label: 'A) would be (Mixed conditional: past cause + present consequence)', choice: 'would be' },
        { label: 'B) would have been (Third conditional: past consequence only)', choice: 'would have been' },
        { label: 'C) will be (First conditional: future consequence)', choice: 'will be' },
      ],
      correctChoice: 'would be',
      explanation: 'This is a mixed conditional. The condition occurred in the past ("had not defended"), but the consequence directly impacts the present ("today"), requiring "would + base verb" (would be).',
    },
  },
  {
    id: 'battle-a1',
    level: 'Advanced',
    category: 'word-battle',
    title: 'Word Battle Arena: Elder Wyrm Showdown',
    subtitle: 'GRE & Executive Vocabulary Clash',
    desc: 'Face the legendary Elder Wyrm in a high-stakes duel testing sophisticated academic and rhetoric vocabulary.',
    icon: '⚔️',
    xp: 30,
    interactive: true,
    actionText: 'Face Elder Wyrm',
    badge: 'GRE Vocabulary',
    data: {
      opponent: 'Elder Wyrm Archmage',
      targetWord: 'Equivocal',
      question: 'Select the exact SYNONYM for "Equivocal" before the wyrm unleashes its breath:',
      options: [
        { label: 'Deliberately ambiguous and evasive', choice: 'Deliberately ambiguous and evasive' },
        { label: 'Impartial and fair', choice: 'Impartial and fair' },
        { label: 'Outspoken and loud', choice: 'Outspoken and loud' },
        { label: 'Fragile and fleeting', choice: 'Fragile and fleeting' },
      ],
      correctChoice: 'Deliberately ambiguous and evasive',
      explanation: '"Equivocal" describes speech or statements open to more than one interpretation; deliberately ambiguous, misleading, or elusive.',
    },
  },
  {
    id: 'quest-a1',
    level: 'Advanced',
    category: 'random-quest',
    title: 'Destiny Quest: Impromptu Persuasion Sprint',
    subtitle: 'Oratory & Critical Rhetoric',
    desc: 'Deliver an unscripted 45-second persuasive spoken argument with sophisticated transitions and zero filler words.',
    icon: '🎲',
    xp: 30,
    interactive: true,
    actionText: 'Roll Quest',
    badge: 'Executive Oratory',
    data: {
      tasks: [
        'Deliver an impromptu 45-second speech defending: "Why human creativity is amplified rather than replaced by artificial intelligence." Eliminate all filler words (um, uh, like).',
        'Rephrase this colloquial sentence into executive-level diplomatic English: "We messed up the deadline because the client kept changing their mind."',
        'Present a well-structured counter-argument to this thesis: "Remote work permanently damages corporate culture and team innovation."',
      ],
    },
  },
  {
    id: 'pitch-a1',
    level: 'Advanced',
    category: 'simulation',
    title: 'Startup Pitch Arena: Hostile Boardroom Defense',
    subtitle: 'High-Stakes Investor Q&A',
    desc: 'Step into the Dragon Boardroom to defend your venture metrics and handle aggressive VC interruptions.',
    icon: '💼',
    xp: 40,
    interactive: false,
    destination: 'simulator',
    actionText: 'Pitch Boardroom',
    badge: 'Executive Defense',
  },
  {
    id: 'worldstage-a1',
    level: 'Advanced',
    category: 'simulation',
    title: 'World Stage: The Global Keynote Oratory',
    subtitle: 'Auditorium Public Speaking',
    desc: 'Address a reactive virtual audience of 500 attendees, evaluated in real time for pitch variation, pacing, and presence.',
    icon: '🏛️',
    xp: 40,
    interactive: false,
    destination: 'world-stage',
    actionText: 'Step onto Stage',
    badge: 'Keynote Mastery',
  },
];

const UNLOCK_REQUIREMENTS = {
  Beginner: {
    unlockedByDefault: true,
    requiredCountToUnlockNext: 4,
    nextLevel: 'Intermediate',
  },
  Intermediate: {
    unlockedByDefault: false,
    requiredCountToUnlockNext: 4,
    unlockRequirementText: 'Complete at least 4 Beginner challenges to unlock',
    nextLevel: 'Advanced',
  },
  Advanced: {
    unlockedByDefault: false,
    requiredCountToUnlockNext: 0,
    unlockRequirementText: 'Complete at least 4 Intermediate challenges to unlock',
    nextLevel: null,
  },
};

function getAllChallenges() {
  return CHALLENGES;
}

function getChallengeById(id) {
  return CHALLENGES.find((c) => c.id === id) || null;
}

function getChallengesByLevel(level) {
  return CHALLENGES.filter((c) => c.level === level);
}

function calculateLevelsSummary(completedChallengeIds = [], userUnlockedLevels = ['Beginner']) {
  const completedSet = new Set(completedChallengeIds);
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const summary = {};

  levels.forEach((lvl) => {
    const list = getChallengesByLevel(lvl);
    const completedCount = list.filter((c) => completedSet.has(c.id)).length;
    const total = list.length;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const isUnlocked = userUnlockedLevels.includes(lvl);
    const req = UNLOCK_REQUIREMENTS[lvl];

    summary[lvl] = {
      name: lvl,
      unlocked: isUnlocked,
      total,
      completed: completedCount,
      percent,
      requiredToUnlockNext: req.requiredCountToUnlockNext,
      nextLevel: req.nextLevel,
      unlockRequirement: req.unlockRequirementText || null,
      challenges: list.map((c) => ({
        ...c,
        completed: completedSet.has(c.id),
      })),
    };
  });

  return summary;
}

module.exports = {
  CHALLENGES,
  UNLOCK_REQUIREMENTS,
  getAllChallenges,
  getChallengeById,
  getChallengesByLevel,
  calculateLevelsSummary,
};
