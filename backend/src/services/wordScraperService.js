const DailyWord = require('../models/DailyWord');

const CURATED_WORD_POOL = [
  {
    word: 'Perspicacious',
    partOfSpeech: 'adjective',
    meaning: 'Having a ready insight into and understanding of things; sharp-witted and perceptive.',
    relevancy: 'Essential for academic debates and interview discussions when analyzing complex problems or research findings.',
    example: 'The perspicacious student quickly identified the underlying flaw in the case study.',
    question: {
      prompt: 'During a case study review, Aarav immediately spots a hidden statistical flaw that everyone else missed. Which phrase best describes his observation?',
      options: [
        'A perspicacious observation',
        'A fastidious oversight',
        'An ambiguous assumption',
        'A magnanimous mistake'
      ],
      correctAnswer: 0,
      explanation: '"Perspicacious" means having sharp insight, keen mental perception, and deep understanding.'
    },
  },
  {
    word: 'Magnanimous',
    partOfSpeech: 'adjective',
    meaning: 'Generous or forgiving, especially toward a rival or less powerful person.',
    relevancy: 'Highly valued in leadership and group project dynamics when resolving conflicts with grace.',
    example: 'Despite winning the debate, Ravi was magnanimous and praised his opponent’s strong points.',
    question: {
      prompt: 'After winning the college debate championship, Priya congratulated her runner-up opponent and offered to share her research notes with them. Her behavior is best described as:',
      options: [
        'Pedantic and strict',
        'Magnanimous and noble',
        'Ubiquitous and distant',
        'Ambiguous and silent'
      ],
      correctAnswer: 1,
      explanation: 'Magnanimity refers to noble generosity and gracious forgiveness toward rivals or team members.'
    },
  },
  {
    word: 'Eloquence',
    partOfSpeech: 'noun',
    meaning: 'Fluent, persuasive, and expressive speaking or writing.',
    relevancy: 'Core goal of LinGrow AI! Expressing your thoughts fluently without hesitation during presentations.',
    example: 'Her eloquence during the campus keynote address inspired the entire audience.',
    question: {
      prompt: 'Which sentence best demonstrates the quality of "eloquence" in professional communication?',
      options: [
        'She spoke haltingly with long silences and frequent filler words.',
        'Her articulate speech smoothly persuaded the panel with clear, expressive arguments.',
        'He shouted over everyone else to dominate the room.',
        'The presenter read word-for-word from a text document in a flat monotone.'
      ],
      correctAnswer: 1,
      explanation: 'Eloquence is fluent, articulate, persuasive, and expressive speaking or writing.'
    },
  },
  {
    word: 'Equanimity',
    partOfSpeech: 'noun',
    meaning: 'Mental calmness, composure, and evenness of temper, especially in a difficult situation.',
    relevancy: 'Crucial for viva exams, stressful job interviews, and high-pressure Q&A sessions.',
    example: 'She handled the aggressive interview questions with remarkable equanimity.',
    question: {
      prompt: 'When an interviewer asked a sudden, challenging technical question, Ananya took a calm breath, smiled, and answered logically. She demonstrated:',
      options: [
        'Panic and hesitation',
        'Equanimity under pressure',
        'Hasty defensive posture',
        'Laconian indifference'
      ],
      correctAnswer: 1,
      explanation: 'Equanimity signifies remaining mentally calm, balanced, and composed under high-stress situations.'
    },
  },
  {
    word: 'Fastidious',
    partOfSpeech: 'adjective',
    meaning: 'Very attentive to and concerned about accuracy, detail, and cleanliness.',
    relevancy: 'Key attribute expected in software engineering, research writing, and quality assurance.',
    example: 'The team lead was fastidious about code indentation and documentation standards.',
    question: {
      prompt: 'A senior software reviewer meticulously checks every variable name, boundary condition, and code formatting style before approving a pull request. This reviewer is:',
      options: [
        'Rushed and careless',
        'Fastidious about quality',
        'Indifferent to errors',
        'Ambiguous in feedback'
      ],
      correctAnswer: 1,
      explanation: 'Fastidious describes someone who is extremely thorough, careful, and attentive to accuracy and details.'
    },
  },
  {
    word: 'Ubiquitous',
    partOfSpeech: 'adjective',
    meaning: 'Present, appearing, or found everywhere.',
    relevancy: 'Frequently used in technology & business writing (e.g., "Smartphones have become ubiquitous").',
    example: 'Artificial intelligence tools are rapidly becoming ubiquitous in modern higher education.',
    question: {
      prompt: 'Smartphones, cloud storage, and messaging apps have become so common that almost every college student uses them daily. In modern technology terms, they are:',
      options: [
        'Rare novelties',
        'Ubiquitous tools',
        'Obsolete systems',
        'Perspicacious devices'
      ],
      correctAnswer: 1,
      explanation: 'Ubiquitous means existing or present everywhere at once.'
    },
  },
  {
    word: 'Laconism',
    partOfSpeech: 'noun',
    meaning: 'The practice of using very few words to express an idea effectively; conciseness.',
    relevancy: 'Highly prized in executive summaries, pitch decks, and crisp professional email writing.',
    example: 'The CEO was famous for his laconism, answering complex queries in just one punchy sentence.',
    question: {
      prompt: 'When asked to summarize a 100-page project report, the engineering lead gave a single, 8-word sentence that perfectly captured the key outcome. This practice is known as:',
      options: [
        'Laconism',
        'Verbosity',
        'Fastidiousness',
        'Equanimity'
      ],
      correctAnswer: 0,
      explanation: 'Laconism is the art of expressing deep ideas using very few, highly effective words.'
    },
  },
];

function getFormattedDate(d = new Date()) {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Scrapes today's word from Merriam-Webster RSS feed or Free Dictionary API
 */
async function scrapeWebWord() {
  try {
    const res = await fetch('https://www.merriam-webster.com/wotd/feed/rss2', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LinGrowAI-Scraper/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const xml = await res.text();
      const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
      if (itemMatch) {
        const item = itemMatch[1];
        const rawWord = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
        const shortDef = item.match(/<merriam:shortdef>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/merriam:shortdef>/i)?.[1]?.trim();
        const summary = item.match(/<itunes:summary>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/itunes:summary>/i)?.[1]?.trim();

        if (rawWord && shortDef) {
          const posMatch = summary?.match(/(noun|verb|adjective|adverb)/i);
          const partOfSpeech = posMatch ? posMatch[1].toLowerCase() : 'adjective';
          const exampleMatch = summary?.match(/\/\/\s*(.*?)(?=\n|\[|$)/);
          const example = exampleMatch ? exampleMatch[1].trim() : `Her speech was characterized by clear, ${rawWord} expressions.`;
          const meaning = shortDef.charAt(0).toUpperCase() + shortDef.slice(1);
          const relevancy = `Using "${rawWord}" enhances your vocabulary precision in academic papers, campus speeches, and technical job interviews.`;

          const question = {
            prompt: `In which of the following real-world situations is the word "${rawWord}" used most appropriately?`,
            options: [
              `When describing something that is ${meaning.toLowerCase()}.`,
              `When referring to a loud, chaotic argument in a crowded hall.`,
              `When describing an unexpected delay in railway scheduling.`,
              `When asking for a financial discount at a retail counter.`
            ],
            correctAnswer: 0,
            explanation: `"${rawWord}" (${partOfSpeech}) means: ${meaning}.`
          };

          return {
            word: rawWord,
            partOfSpeech,
            meaning,
            relevancy,
            example,
            source: 'scraped',
            question,
          };
        }
      }
    }
  } catch (err) {
    console.error('[wordScraper] Live web scrape error:', err.message);
  }

  return null;
}

/**
 * Gets or creates today's Daily Word record
 */
async function getTodayWord() {
  const dateStr = getFormattedDate();

  // Check if today's word already exists in MongoDB
  let existing = await DailyWord.findOne({ dateStr });
  if (existing && existing.source === 'scraped') return existing;

  // Try live web scrape
  const scraped = await scrapeWebWord();
  if (scraped) {
    if (existing) {
      // Upgrade existing record to live scraped word
      Object.assign(existing, scraped);
      await existing.save();
      return existing;
    }
    existing = new DailyWord({
      dateStr,
      ...scraped,
    });
    await existing.save();
    return existing;
  }

  if (existing) return existing;

  // Fallback: Pick from curated pool based on day index
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const fallbackItem = CURATED_WORD_POOL[dayOfYear % CURATED_WORD_POOL.length];

  existing = new DailyWord({
    dateStr,
    ...fallbackItem,
    source: 'curated',
  });
  await existing.save();

  return existing;
}

module.exports = {
  getTodayWord,
  getFormattedDate,
};
