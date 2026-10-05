require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Passage = require('./models/Passage');
const VocabWord = require('./models/VocabWord');
const DebateTopic = require('./models/DebateTopic');
const StoryPrompt = require('./models/StoryPrompt');
const ListeningClip = require('./models/ListeningClip');
const Lesson = require('./models/Lesson');
const GrammarTopic = require('./models/GrammarTopic');
const SituationalPhrase = require('./models/SituationalPhrase');
const { scrapeDepartmentContent } = require('./services/departmentScraperService');

async function upsertUser({ name, email, password, role, department, batch, level, xp = 0 }) {
  let user = await User.findOne({ email });
  if (user) {
    if (level) user.level = level;
    if (xp) user.xp = xp;
    await user.save();
    return user;
  }
  user = new User({ name, email, role, department, batch, level, xp, emailVerified: true });
  await user.setPassword(password);
  await user.save();
  return user;
}

async function run() {
  await connectDB();
  console.log('[seed] Seeding demo accounts and content...');

  await upsertUser({ name: 'Aarav Krishnan', email: 'student@lingrow.demo', password: 'password123', role: 'student', department: 'CSE', batch: 'CSE-B', level: 'Advanced', xp: 2000 });
  await upsertUser({ name: 'Dr. Lakshmi Menon', email: 'teacher@lingrow.demo', password: 'password123', role: 'teacher', department: 'English' });
  await upsertUser({ name: 'Admin Office', email: 'admin@lingrow.demo', password: 'password123', role: 'admin', department: 'Administration' });

  const extraStudents = [
    ['Divya Ramesh', 'ECE', 'ECE-A', 'Advanced'],
    ['Karthik Subramanian', 'CSE', 'CSE-B', 'Beginner'],
    ['Sneha Balaji', 'IT', 'IT-A', 'Intermediate'],
    ['Rahul Iyer', 'CSE', 'CSE-A', 'Beginner'],
    ['Priya Natarajan', 'ECE', 'ECE-B', 'Advanced'],
  ];
  for (const [name, department, batch, level] of extraStudents) {
    const email = name.toLowerCase().replace(/\s+/g, '.') + '@lingrow.demo';
    await upsertUser({ name, email, password: 'password123', role: 'student', department, batch, level });
  }

  if ((await Passage.countDocuments()) === 0) {
    await Passage.insertMany([
      { title: 'A Morning Walk', level: 'Beginner', wordCount: 64, text: "Every morning, Ravi wakes up early and walks to the park near his house. The air feels cool and fresh. Birds sing from the trees, and the sun rises slowly over the hills. Ravi enjoys this quiet time before the city becomes busy and loud." },
      { title: 'The Library Visit', level: 'Beginner', wordCount: 58, text: "Priya loves visiting the college library after class. She finds a quiet corner near the window and opens her favorite book. The librarian smiles and waves at her. Priya reads for an hour before returning home for dinner with her family." },
      { title: 'A Difficult Decision', level: 'Intermediate', wordCount: 82, text: "Choosing between two job offers was harder than Arjun expected. One company offered better pay, while the other promised more learning opportunities. He spoke with his mentor, weighed the pros and cons carefully, and finally chose the path that matched his long-term goals rather than short-term comfort." },
      { title: 'Team Project Update', level: 'Intermediate', wordCount: 76, text: "During the weekly stand-up meeting, Meena explained that the design phase was complete and development had begun. She mentioned a small delay caused by a vendor issue but assured the team that the deadline would still be met with some adjusted priorities." },
      { title: 'The Ethics of Automation', level: 'Advanced', wordCount: 96, text: "As industries increasingly adopt automation, the conversation shifts from whether machines can replace human labor to whether they should. Proponents argue efficiency and safety improve dramatically, while critics warn of widespread displacement. Navigating this tension responsibly requires policy that anticipates disruption rather than merely reacting to it." },
      { title: 'Negotiating Under Pressure', level: 'Advanced', wordCount: 88, text: "Effective negotiators remain calm even when the other party raises their voice or issues an ultimatum. Instead of reacting defensively, they pause, reframe the disagreement around shared interests, and propose alternatives that preserve the relationship while still protecting their own position." },
    ]);
  }

  if ((await VocabWord.countDocuments()) === 0) {
    await VocabWord.insertMany([
      { word: 'Meticulous', partOfSpeech: 'adjective', meaning: 'Showing great attention to detail; very careful and precise.', example: 'She gave a meticulous review of the report before submitting it.', level: 'Intermediate' },
      { word: 'Ambiguous', partOfSpeech: 'adjective', meaning: 'Open to more than one interpretation; not clear or precise.', example: 'His answer was ambiguous, so we asked him to clarify.', level: 'Intermediate' },
      { word: 'Resilient', partOfSpeech: 'adjective', meaning: 'Able to recover quickly from difficulties; tough.', example: 'The team stayed resilient despite three straight losses.', level: 'Beginner' },
      { word: 'Candid', partOfSpeech: 'adjective', meaning: 'Truthful and straightforward; frank.', example: 'I appreciated her candid feedback on my presentation.', level: 'Advanced' },
      { word: 'Diligent', partOfSpeech: 'adjective', meaning: 'Having or showing care in one\u2019s work or duties.', example: 'He was diligent about proofreading every email twice.', level: 'Beginner' },
      { word: 'Pragmatic', partOfSpeech: 'adjective', meaning: 'Dealing with things sensibly and realistically.', example: 'We need a pragmatic solution, not an ideal one.', level: 'Advanced' },
      { word: 'Coherent', partOfSpeech: 'adjective', meaning: 'Logical and consistent; easy to follow.', example: 'His argument was coherent from start to finish.', level: 'Intermediate' },
      { word: 'Versatile', partOfSpeech: 'adjective', meaning: 'Able to adapt to many different functions or activities.', example: 'She is a versatile speaker, comfortable in any setting.', level: 'Intermediate' },
    ]);
  }

  if ((await DebateTopic.countDocuments()) === 0) {
    await DebateTopic.insertMany([
      { topic: 'Should colleges make attendance optional for final-year students?', level: 'Advanced' },
      { topic: 'Is remote work better than working from an office?', level: 'Advanced' },
      { topic: 'Should social media platforms verify the identity of every user?', level: 'Advanced' },
    ]);
  }

  if ((await StoryPrompt.countDocuments()) === 0) {
    await StoryPrompt.insertMany([
      { prompt: "The lift stopped between the third and fourth floor. Meera pressed every button twice, but nothing happened. Then she noticed a small note taped inside, one she was certain hadn't been there a moment ago...", level: 'Advanced' },
      { prompt: "The professor placed an old, unlabeled jar on the desk and said nothing. For a full minute, the class simply stared at it, waiting for an explanation that never came...", level: 'Advanced' },
    ]);
  }

  if ((await ListeningClip.countDocuments()) === 0) {
    await ListeningClip.insertMany([
      { title: 'Workshop Announcement', level: 'Beginner', script: 'Good morning everyone. The design-thinking workshop will begin at ten thirty in Seminar Hall two, right next to the library. Please bring your laptops and arrive fifteen minutes early to collect your ID badges.', question: 'What time does the workshop begin, and where is it held?' },
      { title: 'Changing Plans', level: 'Intermediate', script: 'A: I was thinking we could launch the campaign on Monday. B: Actually, given the vendor delay, maybe we push it to Wednesday and use the extra two days to test everything properly.', question: 'What does the second speaker suggest instead of the original plan?' },
    ]);
  }

  if ((await Lesson.countDocuments()) === 0) {
    await Lesson.insertMany([
      { title: 'Greetings & Small Talk', level: 'Beginner', sections: [
        { heading: 'Formal vs informal greetings', content: 'In professional settings, use "Good morning" or "It\'s nice to meet you." Among friends, "Hey" or "What\'s up" is fine.' },
        { heading: 'Starting small talk', content: 'Comment on something neutral and shared: the weather, the event, or a recent update. "How has your week been?" is a safe opener.' },
        { heading: 'Ending a conversation politely', content: '"It was great catching up — I should get back to it, but let\'s talk again soon" closes a conversation warmly.' },
        { heading: 'Practice', content: 'Try greeting a new colleague and asking two small-talk questions before moving to the main topic.' },
      ]},
      { title: 'Describing Daily Routines', level: 'Beginner', sections: [
        { heading: 'Present simple for routines', content: 'Use present simple with routines: "I wake up at six," "She studies every evening."' },
        { heading: 'Sequencing words', content: 'First, then, after that, finally — these help routines sound organized when spoken aloud.' },
        { heading: 'Practice', content: 'Describe your morning routine out loud in under a minute using at least three sequencing words.' },
      ]},
      { title: 'Expressing Opinions Politely', level: 'Intermediate', sections: [
        { heading: 'Softening language', content: '"I think," "In my view," and "It seems to me that" soften a strong opinion and invite discussion rather than confrontation.' },
        { heading: 'Disagreeing respectfully', content: '"I see your point, but I look at it a little differently" keeps disagreement constructive.' },
        { heading: 'Practice', content: 'State an opinion on a topic you care about, then practice disagreeing with your own point respectfully.' },
      ]},
    ]);
  }

  await GrammarTopic.deleteMany({});
  await GrammarTopic.insertMany([
      {
        title: 'Mastering English Tenses (Present, Past & Future)',
        category: 'Tenses',
        level: 'Beginner',
        videoUrl: 'https://www.youtube.com/embed/84jVz0D-KkY',
        description: 'Comprehensive beginner lesson on English Tenses. Master Simple Present, Present Continuous, Simple Past, Present Perfect, and Future tenses with practical everyday examples.',
        ruleSummary: '• Simple Present: Facts & Routines ("She works in IT").\n• Present Continuous: Happening right now ("She is presenting a paper").\n• Simple Past: Completed past events ("They graduated in 2025").\n• Present Perfect: Past actions with present result ("I have completed the assignment").\n• Simple Future: Future plans ("We will submit tomorrow").',
        questions: [
          {
            question: 'Look! The professor ___ on the board right now.',
            options: ['writes', 'is writing', 'wrote', 'has written'],
            correctAnswer: 1,
            explanation: '"Right now" indicates an action happening at the present moment, requiring Present Continuous ("is writing").'
          },
          {
            question: 'Priya ___ French very fluently.',
            options: ['is speaking', 'speaks', 'speak', 'speaking'],
            correctAnswer: 1,
            explanation: 'General abilities and characteristics use Simple Present ("speaks").'
          },
          {
            question: 'I ___ the correct answer to this problem.',
            options: ['am knowing', 'know', 'knows', 'am known'],
            correctAnswer: 1,
            explanation: '"Know" is a state verb expressing a mental state and is never used in continuous tense ("am knowing" is incorrect).'
          },
          {
            question: 'We usually ___ tea in the morning, but today we are having coffee.',
            options: ['drink', 'are drinking', 'drinks', 'drank'],
            correctAnswer: 0,
            explanation: '"Usually" indicates a habitual routine, which requires Simple Present ("drink").'
          },
          {
            question: 'Yesterday, the students ___ their final project presentation.',
            options: ['complete', 'completes', 'completed', 'have completed'],
            correctAnswer: 2,
            explanation: '"Yesterday" specifies a finished past time, requiring Simple Past ("completed").'
          },
          {
            question: 'Arjun ___ already finished reading the reference manual.',
            options: ['is', 'has', 'have', 'was'],
            correctAnswer: 1,
            explanation: '"Has finished" is Present Perfect, used for a completed action with present relevance.'
          },
          {
            question: 'Next week, our department ___ a national conference.',
            options: ['organize', 'organized', 'will organize', 'has organized'],
            correctAnswer: 2,
            explanation: '"Next week" refers to a future event, requiring Simple Future ("will organize").'
          },
          {
            question: 'While I ___ to class, it started raining heavily.',
            options: ['walked', 'was walking', 'am walking', 'walk'],
            correctAnswer: 1,
            explanation: 'An ongoing background action interrupted by a past event takes Past Continuous ("was walking").'
          },
          {
            question: 'They ___ in Chennai since 2020.',
            options: ['live', 'are living', 'have lived', 'lived'],
            correctAnswer: 2,
            explanation: 'Actions starting in the past and continuing up to the present with "since" use Present Perfect ("have lived").'
          },
          {
            question: 'Don\'t disturb him; he ___ for his semester exam.',
            options: ['prepares', 'is preparing', 'prepared', 'has prepared'],
            correctAnswer: 1,
            explanation: 'Action happening right now at the time of speaking requires Present Continuous ("is preparing").'
          }
        ]
      },
      {
        title: 'Subject-Verb Agreement Essentials',
        category: 'Subject-Verb Agreement',
        level: 'Beginner',
        videoUrl: 'https://www.youtube.com/embed/g2bM1u1w1_U',
        description: 'Learn how singular and plural subjects must match their verbs accurately in academic and professional English sentences.',
        ruleSummary: '• Singular subjects (he, she, it, student) take singular verbs ending in -s/es (walks, is, has).\n• Plural subjects (they, we, students) take base verbs without -s (walk, are, have).\n• Special cases: "Neither/Nor" agrees with the closest subject. Words like "Each" and "Every" are singular.',
        questions: [
          {
            question: 'She ___ to the library every afternoon after class.',
            options: ['go', 'goes', 'going', 'gone'],
            correctAnswer: 1,
            explanation: '"She" is a singular third-person subject, so it requires the singular verb form "goes".'
          },
          {
            question: 'The students in the laboratory ___ working on their chemistry project.',
            options: ['is', 'are', 'was', 'am'],
            correctAnswer: 1,
            explanation: 'The true subject is "students" (plural), not "laboratory". Plural subjects take "are".'
          },
          {
            question: 'Neither Ravi nor his friends ___ attending the seminar today.',
            options: ['is', 'are', 'has', 'was'],
            correctAnswer: 1,
            explanation: 'In "Neither... nor..." sentences, the verb agrees with the subject closest to it ("his friends" - plural).'
          },
          {
            question: 'Every student in the class ___ received a certificate.',
            options: ['have', 'has', 'having', 'are'],
            correctAnswer: 1,
            explanation: '"Every" makes the subject grammatically singular, so we use "has".'
          },
          {
            question: 'The list of recommended books ___ available on the portal.',
            options: ['is', 'are', 'were', 'be'],
            correctAnswer: 0,
            explanation: 'The main subject is "list" (singular noun), not "books". Therefore, use "is".'
          },
          {
            question: 'Both the professor and the teaching assistant ___ present.',
            options: ['is', 'was', 'are', 'has been'],
            correctAnswer: 2,
            explanation: '"Both... and..." forms a plural subject requiring plural verb "are".'
          },
          {
            question: 'Ten kilometers ___ a long distance to walk every day.',
            options: ['are', 'is', 'were', 'be'],
            correctAnswer: 1,
            explanation: 'Amounts of distance, money, or time treated as a single unit take a singular verb ("is").'
          },
          {
            question: 'Either the captain or the players ___ responsible for the win.',
            options: ['is', 'are', 'was', 'has'],
            correctAnswer: 1,
            explanation: 'In "Either... or...", the verb agrees with the subject closest to it ("the players" - plural).'
          },
          {
            question: 'One of my closest friends ___ working at Google.',
            options: ['are', 'is', 'were', 'have'],
            correctAnswer: 1,
            explanation: '"One of..." refers to a single individual ("One"), so it requires singular verb "is".'
          },
          {
            question: 'Statistics ___ a mandatory subject for computer science students.',
            options: ['are', 'is', 'were', 'have'],
            correctAnswer: 1,
            explanation: 'Academic subjects ending in -s (Statistics, Physics, Mathematics) take singular verb "is".'
          }
        ]
      },
      {
        title: 'Articles: A, An & The',
        category: 'Articles & Nouns',
        level: 'Beginner',
        videoUrl: 'https://www.youtube.com/embed/9g_7m-O-Fls',
        description: 'Master indefinite (a/an) and definite (the) articles when talking about singular, plural, and uncountable nouns.',
        ruleSummary: '• Use "a" before consonant sounds ("a university", "a unit").\n• Use "an" before vowel sounds ("an hour", "an MBA graduate").\n• Use "the" when referring to a specific item already mentioned or unique ("the sun", "the library").',
        questions: [
          {
            question: 'He has been waiting at the station for ___ hour.',
            options: ['a', 'an', 'the', 'no article'],
            correctAnswer: 1,
            explanation: '"Hour" begins with a silent "h", producing a vowel sound (/aʊər/), so it takes "an".'
          },
          {
            question: 'Priya wants to buy ___ new laptop for her project.',
            options: ['a', 'an', 'the', 'no article'],
            correctAnswer: 0,
            explanation: 'We are introducing a non-specific singular countable noun beginning with a consonant sound ("new"), so we use "a".'
          },
          {
            question: '___ sun rises in the east every morning.',
            options: ['A', 'An', 'The', 'No article'],
            correctAnswer: 2,
            explanation: 'Unique celestial objects and geographical facts take the definite article "The".'
          },
          {
            question: 'Arjun is studying ___ computer science at college.',
            options: ['a', 'an', 'the', 'no article'],
            correctAnswer: 3,
            explanation: 'Academic subjects (computer science, mathematics, history) do not take an article.'
          },
          {
            question: 'She is ___ honest officer who works diligently.',
            options: ['a', 'an', 'the', 'no article'],
            correctAnswer: 1,
            explanation: '"Honest" starts with a silent "h", giving a vowel sound, so it uses "an".'
          },
          {
            question: 'My uncle completed his degree at ___ European university.',
            options: ['a', 'an', 'the', 'no article'],
            correctAnswer: 0,
            explanation: '"European" starts with a consonant sound (/jʊərəˈpiːən/), so it takes "a".'
          },
          {
            question: '___ Taj Mahal is located in Agra.',
            options: ['A', 'An', 'The', 'No article'],
            correctAnswer: 2,
            explanation: 'Famous historical monuments and landmark buildings require the definite article "The".'
          },
          {
            question: 'We need to buy ___ fresh water for the journey.',
            options: ['a', 'an', 'the', 'no article'],
            correctAnswer: 3,
            explanation: 'Uncountable nouns like water, sugar, and advice do not take indefinite articles (a/an).'
          },
          {
            question: 'This is ___ best book I have ever read on algorithms.',
            options: ['a', 'an', 'the', 'no article'],
            correctAnswer: 2,
            explanation: 'Superlative adjectives ("the best", "the highest") always require "the".'
          },
          {
            question: 'He is studying for ___ MBA degree.',
            options: ['a', 'an', 'the', 'no article'],
            correctAnswer: 1,
            explanation: '"MBA" is pronounced starting with a vowel sound (/ɛm-biː-eɪ/), so it takes "an".'
          }
        ]
      },
      {
        title: 'Prepositions of Time & Place',
        category: 'Prepositions',
        level: 'Beginner',
        videoUrl: 'https://www.youtube.com/embed/2g811C7j65c',
        description: 'Learn the exact rules for using In, On, and At for times, dates, locations, and events in conversational and formal context.',
        ruleSummary: '• AT: Specific precise times & points ("at 5 PM", "at the main door").\n• ON: Days, dates & surfaces ("on Monday", "on July 15th", "on the table").\n• IN: Enclosed spaces, months, years & cities ("in Chennai", "in 2026", "in August").',
        questions: [
          {
            question: 'The team meeting is scheduled ___ 10:30 AM.',
            options: ['in', 'on', 'at', 'by'],
            correctAnswer: 2,
            explanation: 'Use "at" for specific times on the clock ("at 10:30 AM").'
          },
          {
            question: 'Our final semester examinations will start ___ Monday.',
            options: ['in', 'on', 'at', 'to'],
            correctAnswer: 1,
            explanation: 'Use "on" for days of the week and specific dates ("on Monday").'
          },
          {
            question: 'My brother lives and works ___ Bangalore.',
            options: ['at', 'on', 'in', 'into'],
            correctAnswer: 2,
            explanation: 'Use "in" for cities, countries, and large geographical areas.'
          },
          {
            question: 'She placed the reference books ___ the desk.',
            options: ['in', 'on', 'at', 'inside'],
            correctAnswer: 1,
            explanation: 'Use "on" to indicate position touching a surface ("on the desk").'
          },
          {
            question: 'India gained independence ___ 1947.',
            options: ['on', 'at', 'in', 'by'],
            correctAnswer: 2,
            explanation: 'Use "in" for years, centuries, and decades.'
          },
          {
            question: 'The campus canteen is located ___ the ground floor.',
            options: ['in', 'on', 'at', 'above'],
            correctAnswer: 1,
            explanation: 'Use "on" for floor levels in a building ("on the ground floor").'
          },
          {
            question: 'I will meet you ___ the airport terminal entrance.',
            options: ['in', 'on', 'at', 'inside'],
            correctAnswer: 2,
            explanation: 'Use "at" for specific landmarks, venues, or meeting points.'
          },
          {
            question: 'Her birthday is ___ May 24th.',
            options: ['in', 'on', 'at', 'by'],
            correctAnswer: 1,
            explanation: 'Specific calendar dates take preposition "on".'
          },
          {
            question: 'The seminar starts ___ the morning.',
            options: ['at', 'on', 'in', 'by'],
            correctAnswer: 2,
            explanation: 'Parts of the day take "in" ("in the morning", "in the evening"). Exception: "at night".'
          },
          {
            question: 'Please arrive ___ time for the job interview.',
            options: ['at', 'on', 'in', 'by'],
            correctAnswer: 1,
            explanation: '"On time" means punctual / at the scheduled hour.'
          }
        ]
      },
      {
        title: 'Common Indian English Grammar Pitfalls',
        category: 'Common Pitfalls',
        level: 'Beginner',
        videoUrl: 'https://www.youtube.com/embed/Q4u4mKk5G1A',
        description: 'Identify and correct direct translation mistakes commonly made by Indian college students in writing and speaking.',
        ruleSummary: '• Avoid redundant prepositions: "discuss the issue" (NOT "discuss about").\n• Possession cannot be continuous: "I have two sisters" (NOT "I am having").\n• Avoid double past tense: "Did you see?" (NOT "Did you saw?").',
        questions: [
          {
            question: 'Which sentence is grammatically correct?',
            options: [
              'We will discuss about the syllabus tomorrow.',
              'We will discuss the syllabus tomorrow.',
              'We will discuss on the syllabus tomorrow.',
              'We will discuss regarding the syllabus tomorrow.'
            ],
            correctAnswer: 1,
            explanation: '"Discuss" means "talk about", so adding "about" is redundant. Correct: "We will discuss the syllabus."'
          },
          {
            question: 'Correct this sentence: "I am having three sisters."',
            options: [
              'I am having three sisters.',
              'I have three sisters.',
              'I had been having three sisters.',
              'I am have three sisters.'
            ],
            correctAnswer: 1,
            explanation: 'Possession cannot be continuous. Use simple present "I have three sisters."'
          },
          {
            question: 'Choose the correct phrasing for placing a drink order:',
            options: [
              'Let us order for two cups of coffee.',
              'Let us order two cups of coffee.',
              'Let us ordering two cups of coffee.',
              'Let us order to two cups of coffee.'
            ],
            correctAnswer: 1,
            explanation: '"Order" as a verb takes a direct object without "for". Correct: "order two cups of coffee."'
          },
          {
            question: 'Fix the sentence: "Did you bought the hall ticket?"',
            options: [
              'Did you bought the hall ticket?',
              'Did you buy the hall ticket?',
              'Do you bought the hall ticket?',
              'Have you buy the hall ticket?'
            ],
            correctAnswer: 1,
            explanation: 'The auxiliary verb "did" already carries the past tense, so the main verb must be in base form ("buy").'
          },
          {
            question: 'Which of the following is correct?',
            options: [
              'I am revert back to your email.',
              'I will revert to your email.',
              'I will revert back to your email.',
              'I will reverting to your email.'
            ],
            correctAnswer: 1,
            explanation: '"Revert" means "return to", so "revert back" is redundant.'
          },
          {
            question: 'Select the correct sentence:',
            options: [
              'He is senior than me.',
              'He is senior to me.',
              'He is senior from me.',
              'He is more senior than me.'
            ],
            correctAnswer: 1,
            explanation: 'Latin comparative adjectives (senior, junior, superior, inferior) take "to", not "than".'
          },
          {
            question: 'Fix the sentence: "I told to him to submit the report."',
            options: [
              'I told to him to submit the report.',
              'I told him to submit the report.',
              'I said to him for submit the report.',
              'I told him that to submit the report.'
            ],
            correctAnswer: 1,
            explanation: '"Tell" takes a direct object without "to" (e.g. "I told him").'
          },
          {
            question: 'Which sentence correctly expresses reason?',
            options: [
              'Because I was sick, so I could not attend.',
              'Because I was sick, I could not attend.',
              'As I was sick, so I could not attend.',
              'Since I was sick, therefore I could not attend.'
            ],
            correctAnswer: 1,
            explanation: 'Do not pair "Because/As/Since" with "so/therefore" in the same sentence.'
          },
          {
            question: 'Correct: "What is your good name?"',
            options: [
              'What is your good name?',
              'May I know your name, please?',
              'What good name you have?',
              'Tell your good name.'
            ],
            correctAnswer: 1,
            explanation: '"Good name" is a literal translation of "shubh naam". In standard English, use "May I know your name, please?"'
          },
          {
            question: 'Fix: "She does not has a hall ticket."',
            options: [
              'She does not has a hall ticket.',
              'She does not have a hall ticket.',
              'She do not have a hall ticket.',
              'She is not having a hall ticket.'
            ],
            correctAnswer: 1,
            explanation: 'After auxiliary "does not", always use base verb "have".'
          }
        ]
      }
    ]);

  await SituationalPhrase.deleteMany({});
  await SituationalPhrase.insertMany([
    {
      title: 'Politely Asking a Professor for a Deadline Extension',
      category: 'Campus Life',
      level: 'Beginner',
      situationContext: 'You were unwell during the weekend and missed the assignment submission deadline. You need to approach your professor politely in person or via email to request a 2-day extension.',
      phrases: [
        {
          speaker: 'Student',
          englishText: 'Good morning Professor. May I have a brief moment of your time to discuss my assignment submission?',
          explanation: 'Starts with a formal greeting and politely requests permission to speak before jumping into the topic.',
          keyTips: 'Always start with "Good morning/afternoon Professor" instead of "Hi" or "Hey".'
        },
        {
          speaker: 'Student',
          englishText: 'I apologize for bringing this up, but due to severe fever over the weekend, I was unable to complete the final report on time.',
          explanation: 'Clearly states the genuine reason without making dramatic excuses.',
          keyTips: 'Be direct, honest, and state the reason concisely.'
        },
        {
          speaker: 'Student',
          englishText: 'Would it be possible to submit my completed assignment by Thursday morning instead?',
          explanation: 'Offers a realistic new proposed deadline instead of an open-ended request.',
          keyTips: 'Always suggest a specific proposed date (e.g. "by Thursday morning") so the professor can give a quick yes/no.'
        }
      ],
      interactivePrompts: [
        {
          prompt: 'Step 1: How should you open the conversation when approaching your professor in their cabin?',
          options: [
            '"Hey, I need an extension on my assignment because I wasn\'t feeling good."',
            '"Good morning Professor. May I have a brief moment of your time to discuss my assignment?"',
            '"Why is the assignment deadline set so early?"',
            '"Sir, please give me extra grace marks."'
          ],
          correctAnswer: 1,
          explanation: 'Option B is polite, respectful, acknowledges the professor’s time, and sets a professional tone.'
        },
        {
          prompt: 'Step 2: When explaining why you missed the deadline, what is the best way to frame your request?',
          options: [
            '"I will give it whenever I finish it."',
            '"I apologize for the delay. Due to illness over the weekend, would it be possible to submit by Thursday morning?"',
            '"I was busy with other things so I couldn\'t complete it on time."',
            '"Everyone in class wants an extension anyway."'
          ],
          correctAnswer: 1,
          explanation: 'Apologizing sincerely and offering a specific, realistic submission date demonstrates accountability.'
        },
        {
          prompt: 'Step 3: The professor replies: "I can accept it by Thursday, but 5% will be deducted for late submission." How do you respond?',
          options: [
            '"That is completely fair, Professor. Thank you so much for understanding and granting the extension."',
            '"Why are you deducting 5%? That is unfair to sick students!"',
            '"Forget it then, I won\'t submit the assignment at all."',
            '"Give me full marks or I will complain to the HOD."'
          ],
          correctAnswer: 0,
          explanation: 'Accepting reasonable policy decisions with grace maintains a strong academic relationship.'
        }
      ]
    },
    {
      title: 'Group Project Introduction & Task Division',
      category: 'Campus Life',
      level: 'Beginner',
      situationContext: 'You have been assigned to a 4-member group for a mini-project. You are meeting your classmates for the first time in the library to introduce yourselves and divide project responsibilities.',
      phrases: [
        {
          speaker: 'Student',
          englishText: 'Hi everyone! I am Aarav from CSE Section B. I am really glad to be working with you all on this project.',
          explanation: 'Warm, positive opening that sets a collaborative team tone.',
          keyTips: 'Smile and introduce your name and department clearly.'
        },
        {
          speaker: 'Student',
          englishText: 'Should we first list out all project deliverables and then assign tasks based on our strengths?',
          explanation: 'Proposes an organized workflow for the team meeting.',
          keyTips: 'Use "Should we..." or "How about we..." to make suggestions collaboratively.'
        },
        {
          speaker: 'Student',
          englishText: 'I would be happy to take responsibility for the presentation design and slide deck.',
          explanation: 'Volunteers for a specific role proactively.',
          keyTips: 'Say "I would be happy to take responsibility for..." to volunteer for project parts.'
        }
      ],
      interactivePrompts: [
        {
          prompt: 'Step 1: How should you introduce yourself at the start of your first team meeting?',
          options: [
            '"Let\'s get this over with quickly so I can leave."',
            '"Hi everyone! I am Aarav from CSE B, and I am really glad to be working with you all."',
            '"Who made me part of this team?"',
            '"I am the smartest here so I will lead."'
          ],
          correctAnswer: 1,
          explanation: 'A warm, welcoming introduction establishes trust and teamwork.'
        },
        {
          prompt: 'Step 2: How should you propose dividing project responsibilities?',
          options: [
            '"You three do the research and coding, and I will just review it on the last day."',
            '"Should we first outline all project requirements and assign tasks based on everyone\'s strengths?"',
            '"I will decide who does what without asking anyone."',
            '"Let us leave everything until the night before submission."'
          ],
          correctAnswer: 1,
          explanation: 'Proposing a collaborative task breakdown encourages shared ownership and efficiency.'
        },
        {
          prompt: 'Step 3: A teammate insists on doing the exact same task you volunteered for. How do you resolve this politely?',
          options: [
            '"How about we collaborate on the slides together, or I can handle backend coding while you take the lead on presentation design?"',
            '"I claimed this part first so you have to pick something else!"',
            '"If I don\'t get slides, I am leaving the group."',
            '"Let\'s toss a coin and winner takes all."'
          ],
          correctAnswer: 0,
          explanation: 'Offering a collaborative split or flexible alternative preserves team harmony and productivity.'
        }
      ]
    },
    {
      title: 'Asking for Clarification During a Technical Lecture',
      category: 'Campus Life',
      level: 'Beginner',
      situationContext: 'During a data structures lecture, you didn\'t understand the difference between a Stack and a Queue. You raise your hand to ask the professor to re-explain.',
      phrases: [
        {
          speaker: 'Student',
          englishText: 'Excuse me, Professor. Could you please re-explain the LIFO concept with a quick example?',
          explanation: 'Polite interruption during Q&A with a specific clarification question.',
          keyTips: 'Pinpoint the exact concept you didn\'t understand rather than saying "I didn\'t get anything."'
        },
        {
          speaker: 'Student',
          englishText: 'Thank you Professor, that real-world cafeteria plate example made it completely clear!',
          explanation: 'Expresses gratitude and confirms understanding.',
          keyTips: 'Always thank the speaker after they clarify your doubt.'
        }
      ],
      interactivePrompts: [
        {
          prompt: 'Step 1: What is the most effective way to raise a doubt during class Q&A?',
          options: [
            '"Stop talking and repeat what you just said."',
            '"Excuse me Professor, could you please re-explain the LIFO concept with a quick example?"',
            '"This topic makes no sense at all."',
            '"I didn\'t understand a single word today."'
          ],
          correctAnswer: 1,
          explanation: 'Politely asking with a specific point of confusion helps the professor give a targeted explanation.'
        },
        {
          prompt: 'Step 2: After the professor explains using an analogy, how should you confirm your understanding?',
          options: [
            '"Silence without responding."',
            '"Thank you Professor, that cafeteria plate analogy made it completely clear!"',
            '"Okay whatever."',
            '"Repeat it one more time."'
          ],
          correctAnswer: 1,
          explanation: 'Acknowledging the explanation confirms comprehension and expresses polite appreciation.'
        },
        {
          prompt: 'Step 3: What should you do if you still have a detailed follow-up question after class ends?',
          options: [
            '"Approach the professor at the end of class: \'Thank you for class today, Professor. Could I drop by during office hours tomorrow for a quick clarification?\'"',
            '"Shout across the crowded hallway while the professor is walking away."',
            '"Give up and never ask doubts again."',
            '"Send 15 repeated messages to the professor\'s personal phone late at night."'
          ],
          correctAnswer: 0,
          explanation: 'Requesting an office hour appointment respects the professor’s schedule and privacy.'
        }
      ]
    },
    {
      title: 'Ordering Food at the Campus Canteen & Paying',
      category: 'Social & Daily',
      level: 'Beginner',
      situationContext: 'You are at the college cafeteria with your friend. You want to order two masala dosas and bottled water, ask for the total bill, and pay via UPI QR code.',
      phrases: [
        {
          speaker: 'Student',
          englishText: 'Good afternoon! Could I please get two masala dosas and one bottle of mineral water?',
          explanation: 'Polite ordering phrasing with "Could I please get...".',
          keyTips: 'Use "Could I get..." or "I would like to have..." for food orders.'
        },
        {
          speaker: 'Student',
          englishText: 'Could you please tell me the total amount? Can I pay using GPay QR code?',
          explanation: 'Asks for total bill and payment mode clearly.',
          keyTips: '"Can I pay using UPI / GPay?" is standard for digital transactions.'
        }
      ],
      interactivePrompts: [
        {
          prompt: 'Step 1: Choose the most polite way to place your food order at the counter:',
          options: [
            '"Give me two dosas fast."',
            '"Good afternoon! Could I please get two masala dosas and a bottle of mineral water?"',
            '"Hey, make dosa for me."',
            '"Dosa two nos."'
          ],
          correctAnswer: 1,
          explanation: '"Good afternoon! Could I please get..." is warm, polite, and natural.'
        },
        {
          prompt: 'Step 2: How do you politely inquire about the bill and digital payment mode?',
          options: [
            '"How much money? Take cash only."',
            '"Could you please tell me the total amount? Can I pay using UPI QR code?"',
            '"I am paying later."',
            '"Scan code fast."'
          ],
          correctAnswer: 1,
          explanation: 'Asking for total amount and confirming UPI payment mode ensures a smooth transaction.'
        },
        {
          prompt: 'Step 3: The canteen manager mentions that masala dosa is out of stock. How do you respond?',
          options: [
            '"No problem at all! Could I please substitute that with a plain dosa instead?"',
            '"Why did you run out of food? This canteen is awful!"',
            '"Cancel everything and refund me immediately!"',
            '"Stare silently without saying anything."'
          ],
          correctAnswer: 0,
          explanation: 'Adapting politely with a substitute order handles unexpected stock outages smoothly.'
        }
      ]
    },
    {
      title: 'Answering "Tell Me About Yourself" in a Job Interview',
      category: 'Professional & Jobs',
      level: 'Beginner',
      situationContext: 'You are sitting in a campus placement interview for a Software Engineer role. The interviewer opens with: "Welcome! To start off, please tell me a bit about yourself."',
      phrases: [
        {
          speaker: 'Student',
          englishText: 'Thank you for this opportunity. I am a final-year Computer Science student passionate about full-stack development and problem-solving.',
          explanation: 'Expresses gratitude and summarizes educational background and primary interest.',
          keyTips: 'Structure your answer: Past (Education), Present (Key Skills & Projects), Future (Career Goal).'
        },
        {
          speaker: 'Student',
          englishText: 'Recently, I led a 3-member team to build an AI-assisted study platform using Node.js and MongoDB.',
          explanation: 'Highlights a concrete project achievement.',
          keyTips: 'Mention 1-2 major projects with specific technologies used.'
        },
        {
          speaker: 'Student',
          englishText: 'I am excited about this role because your company’s focus on innovative web products aligns perfectly with my career goals.',
          explanation: 'Connects personal skills to the hiring company’s mission.',
          keyTips: 'Conclude by explaining why you are eager to join their team.'
        }
      ],
      interactivePrompts: [
        {
          prompt: 'Step 1: How should you open your response to "Tell me about yourself" in a placement interview?',
          options: [
            '"My name is Aarav and I like watching movies and playing games."',
            '"Thank you for this opportunity. I am a final-year Computer Science student passionate about software development."',
            '"You already have my resume, so you can read it."',
            '"I am looking for any job that pays well."'
          ],
          correctAnswer: 1,
          explanation: 'Expressing appreciation and opening with your academic field & core passion sets an executive tone.'
        },
        {
          prompt: 'Step 2: How should you discuss your practical projects in the middle of your answer?',
          options: [
            '"I did some small college assignments."',
            '"Recently, I led a 3-member team to build an AI-assisted study platform using Node.js and MongoDB."',
            '"My friends did the coding and I just presented it."',
            '"Projects are not important, only marks matter."'
          ],
          correctAnswer: 1,
          explanation: 'Highlighting project role, team collaboration, and exact technologies proves practical skills.'
        },
        {
          prompt: 'Step 3: How should you conclude your intro response to leave a strong impression?',
          options: [
            '"I am excited about this role because your company\'s focus on web innovation aligns perfectly with my career goals."',
            '"That is all I have to say, ask the next question."',
            '"I applied to 50 companies and yours happened to call me."',
            '"I don\'t have any specific goals, I just need a job package."'
          ],
          correctAnswer: 0,
          explanation: 'Connecting your personal skills directly to the hiring company’s mission leaves a lasting impression.'
        }
      ]
    }
  ]);

  console.log('[seed] Running Department Content Scraper (50+ Question Bank sets per department)...');
  const scrapeStats = await scrapeDepartmentContent();
  console.log(`[seed] Scraper finished: Created ${scrapeStats.passagesCreated} department passages & ${scrapeStats.clipsCreated} department listening clips.`);

  console.log('[seed] Done. Demo logins:');
  console.log('  student@lingrow.demo / password123');
  console.log('  teacher@lingrow.demo / password123');
  console.log('  admin@lingrow.demo   / password123');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
