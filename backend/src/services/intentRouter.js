/**
 * intentRouter.js — Query Intent Classifier (from Guide Section 15)
 * ---------------------------------------------------------------------------
 * Detects whether an incoming user question requires:
 *  1. Live Web Search (time-sensitive, news, versions, releases, tech trends)
 *  2. Local Document RAG (course materials, uploaded PDFs, personal notes)
 *  3. Direct General Tutoring (English practice, definitions, logic, concepts)
 * ---------------------------------------------------------------------------
 */

const WEB_SEARCH_TRIGGERS = [
  'latest',
  'today',
  'current',
  'recent',
  'this week',
  'this month',
  'this year',
  'price',
  'pricing',
  'release',
  'released',
  'version',
  'news',
  'update',
  'updates',
  'trending',
  'trend',
  'breakthrough',
  'who is',
  'what happened',
  'announcement',
  '2024',
  '2025',
  '2026',
];

const RAG_TRIGGERS = [
  'pdf',
  'document',
  'notes',
  'my notes',
  'syllabus',
  'lecture',
  'uploaded',
  'file',
  'handout',
  'assignment',
  'textbook',
  'chapter',
  'course material',
];

/**
 * Classify user intent fast with heuristic detection & regex triggers
 */
function classifyIntent(question) {
  if (!question || typeof question !== 'string') {
    return { needsWeb: false, needsRag: false, searchQuery: '', intentType: 'general' };
  }

  const qLower = question.toLowerCase();

  // 1. Check for explicit or implicit web search triggers
  const matchedWebSignals = WEB_SEARCH_TRIGGERS.filter((trigger) => {
    const regex = new RegExp(`\\b${trigger}\\b`, 'i');
    return regex.test(qLower);
  });

  const needsWeb = matchedWebSignals.length > 0;

  // 2. Check for explicit RAG triggers
  const matchedRagSignals = RAG_TRIGGERS.filter((trigger) => {
    const regex = new RegExp(`\\b${trigger}\\b`, 'i');
    return regex.test(qLower);
  });

  const needsRag = matchedRagSignals.length > 0;

  // Formulate cleaned search query
  let searchQuery = question
    .replace(/\b(can you tell me|what is the|explain to me|please explain|tell me about|how to)\b/gi, '')
    .replace(/[?!.,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!searchQuery) searchQuery = question;

  let intentType = 'general';
  if (needsWeb && needsRag) intentType = 'hybrid';
  else if (needsWeb) intentType = 'current_web';
  else if (needsRag) intentType = 'document_rag';

  return {
    needsWeb,
    needsRag,
    intentType,
    searchQuery,
    matchedWebSignals,
    matchedRagSignals,
  };
}

module.exports = {
  classifyIntent,
  WEB_SEARCH_TRIGGERS,
  RAG_TRIGGERS,
};
