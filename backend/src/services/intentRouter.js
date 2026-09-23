/**
 * intentRouter.js — Latency-Optimized Query Intent Classifier
 * ---------------------------------------------------------------------------
 * Routes queries to the lowest-latency lane that satisfies accuracy requirements:
 *  1. Casual Conversation / Small Talk -> Small Fast Model, Single Pass (Zero Verification)
 *  2. Grammar Analysis -> Deterministic GEC Detector + Fast Explainer (Skip Verify Loop)
 *  3. Document RAG -> Context Retrieval + Small/Fast Model
 *  4. Complex / Factual / Current Web -> Cascaded Draft + Fast Non-Reasoning Verifier
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

const CASUAL_PATTERNS = [
  /^(hi|hello|hey|greetings|hola|howdy)\b/i,
  /^how are you\b/i,
  /^good (morning|afternoon|evening|night|day)\b/i,
  /^(what's up|sup|how's it going)\b/i,
  /^(tell me a joke|make me laugh|say something funny)\b/i,
  /^(thank you|thanks|thanks a lot|appreciate it)\b/i,
  /^(bye|goodbye|see you|talk to you later|cya)\b/i,
  /^(my name is|i am|i'm feeling|i want to practice English|let's practice|let's chat)\b/i,
  /^(yes|no|yeah|nope|sure|ok|okay|cool|nice|great|awesome|understood)\b/i,
  /^(can we talk|let's have a conversation|start a conversation)\b/i,
];

const GRAMMAR_TRIGGERS = [
  'check my grammar',
  'correct this',
  'is this correct',
  'is this grammatically correct',
  'fix my sentence',
  'fix this sentence',
  'grammar error',
  'grammar check',
  'proofread',
  'spelling check',
  'find mistakes',
  'correct my english',
];

const COMPLEX_FACTUAL_TRIGGERS = [
  'architecture of',
  'difference between',
  'compare and contrast',
  'how does .* work in depth',
  'step by step implementation',
  'write code for',
  'time complexity',
  'space complexity',
  'mathematical proof',
  'detailed explanation of',
];

/**
 * Classify user intent fast with heuristic detection & regex triggers
 */
function classifyIntent(question) {
  if (!question || typeof question !== 'string') {
    return {
      needsWeb: false,
      needsRag: false,
      isCasual: true,
      isGrammarAnalysis: false,
      isFactualComplex: false,
      intentType: 'casual_conversation',
      searchQuery: '',
    };
  }

  const qTrimmed = question.trim();
  const qLower = qTrimmed.toLowerCase();

  // 1. Check for casual conversation / small talk greetings first
  const isCasualGreeting = CASUAL_PATTERNS.some((pat) => pat.test(qTrimmed));

  // 2. Check for explicit or implicit web search triggers (avoid matching conversational 'today' in greetings)
  const matchedWebSignals = isCasualGreeting ? [] : WEB_SEARCH_TRIGGERS.filter((trigger) => {
    const regex = new RegExp(`\\b${trigger}\\b`, 'i');
    return regex.test(qLower);
  });
  const needsWeb = matchedWebSignals.length > 0;

  // 3. Check for explicit RAG triggers
  const matchedRagSignals = RAG_TRIGGERS.filter((trigger) => {
    const regex = new RegExp(`\\b${trigger}\\b`, 'i');
    return regex.test(qLower);
  });
  const needsRag = matchedRagSignals.length > 0;

  // 4. Check for grammar analysis triggers
  const isGrammarAnalysis = GRAMMAR_TRIGGERS.some((gt) => qLower.includes(gt)) ||
    (qLower.startsWith('is "') && qLower.endsWith('" correct?'));

  // 5. Check for complex technical / factual reasoning
  const isComplexFactual = needsWeb || COMPLEX_FACTUAL_TRIGGERS.some((pt) => new RegExp(pt, 'i').test(qLower));

  // 6. Final casual decision
  const isCasual = isCasualGreeting || (!needsWeb && !needsRag && !isGrammarAnalysis && !isComplexFactual && (
    qTrimmed.length < 35 ||
    (!qLower.includes('explain') && !qLower.includes('why') && !qLower.includes('how does') && !qLower.includes('what is the difference'))
  ));

  // Formulate cleaned search query
  let searchQuery = question
    .replace(/\b(can you tell me|what is the|explain to me|please explain|tell me about|how to)\b/gi, '')
    .replace(/[?!.,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!searchQuery) searchQuery = question;

  let intentType = 'casual_conversation';
  if (needsWeb && needsRag) intentType = 'hybrid';
  else if (needsWeb) intentType = 'current_web';
  else if (needsRag) intentType = 'document_rag';
  else if (isGrammarAnalysis) intentType = 'grammar_analysis';
  else if (isComplexFactual) intentType = 'factual_complex';
  else if (isCasual) intentType = 'casual_conversation';
  else intentType = 'general_coaching';

  return {
    needsWeb,
    needsRag,
    isCasual: intentType === 'casual_conversation',
    isGrammarAnalysis,
    isFactualComplex: intentType === 'factual_complex' || intentType === 'current_web' || intentType === 'hybrid',
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
  CASUAL_PATTERNS,
  GRAMMAR_TRIGGERS,
};

