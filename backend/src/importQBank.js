const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GrammarTopic = require('./models/GrammarTopic');

const QBANK_DIR = process.env.QBANK_DIR || 'D:\\LinGrow_QBank';

const CANONICAL_CATEGORIES = {
  'PARTS OF SPEECH': 'Parts of Speech',
  'SUBJECT–VERB AGREEMENT': 'Subject-Verb Agreement',
  'SUBJECT-VERB AGREEMENT': 'Subject-Verb Agreement',
  'BE, HAVE & DO': 'Be, Have & Do',
  'VERBS & VERB FORMS': 'Verbs & Verb Forms',
  'GERUNDS & INFINITIVES': 'Gerunds & Infinitives',
  'PHRASES & CLAUSES': 'Phrases & Clauses',
  'ACTIVE & PASSIVE VOICE': 'Active & Passive Voice',
  'PUNCTUATION & CAPITALIZATION': 'Punctuation & Capitalization',
  'COMMON BEGINNER ERRORS': 'Common Beginner Errors',
  'DETERMINERS & QUANTIFIERS': 'Determiners & Quantifiers',
};

const OPTION_MAP = {
  'Option A': 0,
  'Option B': 1,
  'Option C': 2,
  'Option D': 3,
  'A': 0,
  'B': 1,
  'C': 2,
  'D': 3,
};

function formatCategory(unitStr) {
  if (!unitStr) return { unit: 'General', category: 'General', unitNum: 1 };
  
  let unitNum = 1;
  const numMatch = unitStr.match(/UNIT\s+(\d+)/i);
  if (numMatch) unitNum = parseInt(numMatch[1], 10);

  const parts = unitStr.split('—').map(s => s.trim());
  if (parts.length > 1) {
    const rawCat = parts[1].trim();
    if (CANONICAL_CATEGORIES[rawCat.toUpperCase()]) {
      return { unit: unitStr, category: CANONICAL_CATEGORIES[rawCat.toUpperCase()], unitNum };
    }
    const cat = rawCat.toLowerCase().split(' ').map(w => {
      if (w === '&') return '&';
      if (w === 'and') return 'and';
      if (w === 'of') return 'of';
      if (w === 'in') return 'in';
      if (w === 'for') return 'for';
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
    return { unit: unitStr, category: cat, unitNum };
  }
  return { unit: unitStr, category: unitStr, unitNum };
}

function deriveLevel(unitNum) {
  if (unitNum <= 9) return 'Beginner';
  if (unitNum <= 18) return 'Intermediate';
  return 'Advanced';
}

async function importQuestionBank(qbankDir = QBANK_DIR) {
  if (!fs.existsSync(qbankDir)) {
    throw new Error(`Question bank directory not found at: ${qbankDir}`);
  }

  const files = fs.readdirSync(qbankDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error(`No JSON question files found in: ${qbankDir}`);
  }

  console.log(`[QBank Import] Reading ${files.length} question bank files from: ${qbankDir}`);

  const topicsToInsert = [];
  let totalQuestionsCount = 0;
  const categoryStats = {};

  for (const file of files) {
    const fullPath = path.join(qbankDir, file);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const { unit, category, unitNum } = formatCategory(content.unit);
    const level = deriveLevel(unitNum);
    const topicId = content.topicId || (parseInt(file.replace(/\D/g, ''), 10) || 1);
    const title = content.topicName || `Topic ${topicId}`;

    const questions = (content.questions || []).slice(0, 25).map((q, idx) => {
      const options = [
        String(q.optionA || '').trim(),
        String(q.optionB || '').trim(),
        String(q.optionC || '').trim(),
        String(q.optionD || '').trim(),
      ];
      const correctAnswer = OPTION_MAP[q.correctOption] ?? 0;
      return {
        questionId: q.questionId || `T${String(topicId).padStart(3, '0')}-Q${String(idx + 1).padStart(3, '0')}`,
        question: String(q.questionText || '').trim(),
        options,
        correctAnswer,
        explanation: String(q.explanation || '').trim(),
        source: q.source || null,
      };
    });

    totalQuestionsCount += questions.length;
    categoryStats[category] = (categoryStats[category] || 0) + questions.length;

    topicsToInsert.push({
      topicId,
      title,
      unit,
      category,
      level,
      description: `Comprehensive grammar question set and practice exercises on ${title} (${category}).`,
      ruleSummary: `Core principles, usage guidelines, and practical examples for ${title}.`,
      videoUrl: '',
      questions,
    });
  }

  // Sort sequentially by topicId
  topicsToInsert.sort((a, b) => a.topicId - b.topicId);

  console.log(`[QBank Import] Purging existing GrammarTopic documents...`);
  await GrammarTopic.deleteMany({});

  console.log(`[QBank Import] Inserting ${topicsToInsert.length} topics (${totalQuestionsCount} questions)...`);
  
  // Insert in batches of 25 for safe MongoDB packet handling
  const batchSize = 25;
  for (let i = 0; i < topicsToInsert.length; i += batchSize) {
    const batch = topicsToInsert.slice(i, i + batchSize);
    await GrammarTopic.insertMany(batch);
  }

  console.log(`[QBank Import] Successfully imported ${topicsToInsert.length} topics and ${totalQuestionsCount} questions!`);
  console.log(`\n--- Question Bank Summary by Category ---`);
  for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${cat.padEnd(30)}: ${count} questions`);
  }

  return { topicsCount: topicsToInsert.length, questionsCount: totalQuestionsCount, categoryStats };
}

// Standalone execution
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lingrow_ai';
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log(`[db] Connected to ${mongoUri}`);
      await importQuestionBank();
      await mongoose.disconnect();
      console.log('[db] Disconnected cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[QBank Import Error]:', err);
      process.exit(1);
    });
}

module.exports = { importQuestionBank };
