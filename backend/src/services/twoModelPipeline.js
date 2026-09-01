/**
 * twoModelPipeline.js — Complete Two-Model Architecture for LinGrow AI
 * ---------------------------------------------------------------------------
 * Architecture from Guide (Sections 1, 3, 18, 19, 23):
 *  USER QUESTION
 *       │
 *       ▼
 *  INTENT ROUTER (current info? RAG data?)
 *       │
 *  [WEB SEARCH] / [RAG DATA] -> Context Assembly
 *       │
 *       ▼
 *  QWEN (Primary Generator) -> DRAFT
 *       │
 *       ▼
 *  DEEPSEEK-R1 (Verifier) -> VERDICT: CORRECT or INCORRECT
 *       │
 *  ┌────┴────┐
 *  ▼         ▼
 * CORRECT  INCORRECT -> QWEN CORRECTION (Rewrite using feedback)
 *  │         │
 *  └────┬────┘
 *       ▼
 *  FINAL ANSWER + SOURCES + VERIFICATION METADATA
 * ---------------------------------------------------------------------------
 * Optimized for RTX 3050 Laptop GPU (6GB VRAM) Sequential Execution.
 * ---------------------------------------------------------------------------
 */

const { chatCompletion, DEFAULT_PRIMARY, DEFAULT_VERIFIER, listInstalledModels } = require('./ollamaClient');
const { buildDraftPrompt, buildVerificationPrompt, buildCorrectionPrompt } = require('./prompts');
const { classifyIntent } = require('./intentRouter');
const { executeWebSearch } = require('./webSearchService');
const { retrieveDocumentContext } = require('./ragService');
const { generate2BReply, detectGrammarCorrection } = require('./llm2BEngine');

/**
 * Parse verdict and feedback from DeepSeek-R1 response
 */
function parseVerificationVerdict(responseContent, thinking = '') {
  const contentStr = (responseContent || '').trim();
  const thinkingStr = (thinking || '').trim();
  const combined = `${contentStr}\n${thinkingStr}`.toUpperCase();

  let isCorrect = true;
  let verdict = 'CORRECT';

  // Check explicit verdict in content first, then combined
  if (
    contentStr.toUpperCase().includes('VERDICT: INCORRECT') ||
    contentStr.toUpperCase().includes('VERDICT:INCORRECT') ||
    (contentStr.toUpperCase().includes('INCORRECT') && !contentStr.toUpperCase().includes('VERDICT: CORRECT'))
  ) {
    isCorrect = false;
    verdict = 'INCORRECT';
  } else if (
    contentStr.toUpperCase().includes('VERDICT: CORRECT') ||
    contentStr.toUpperCase().includes('VERDICT:CORRECT')
  ) {
    isCorrect = true;
    verdict = 'CORRECT';
  } else if (combined.includes('VERDICT: INCORRECT')) {
    isCorrect = false;
    verdict = 'INCORRECT';
  }

  // Extract clean feedback (excluding raw <think> tags)
  let feedback = contentStr;
  if (!feedback && thinkingStr) {
    feedback = thinkingStr.slice(0, 300) + '...';
  }

  return {
    isCorrect,
    verdict,
    feedback: feedback || (isCorrect ? 'Draft meets factual accuracy and clarity standards.' : 'Revisions recommended by verifier.'),
    reasoning: thinkingStr,
  };
}

/**
 * Main Two-Model Answer Pipeline (Guide Section 19)
 */
async function answerQuestion({
  question,
  userId = null,
  studentProfile = null,
  forceWebSearch = false,
  forceRag = false,
  conversationHistory = [],
}) {
  const startTime = Date.now();

  // Step 1: Intent Routing
  const intent = classifyIntent(question);
  if (forceWebSearch) intent.needsWeb = true;
  if (forceRag) intent.needsRag = true;

  let referenceContext = '';
  let collectedSources = [];

  // Step 2: Context Retrieval
  if (intent.needsWeb) {
    try {
      const searchResult = await executeWebSearch(intent.searchQuery || question, 3);
      if (searchResult.formattedContext) {
        referenceContext += `\n\n--- LIVE WEB SOURCES ---\n${searchResult.formattedContext}`;
        collectedSources.push(...searchResult.sources);
      }
    } catch (e) {
      // Graceful fallback
    }
  }

  if (intent.needsRag && userId) {
    try {
      const ragResult = await retrieveDocumentContext(userId, intent.searchQuery || question, 3);
      if (ragResult.formattedContext) {
        referenceContext += `\n\n--- UPLOADED COURSE DOCUMENTS ---\n${ragResult.formattedContext}`;
      }
    } catch (e) {}
  }

  // Step 3: Sequential Model Execution on RTX 3050
  try {
    // Check if Ollama is accessible
    const models = await listInstalledModels();
    if (!models || models.length === 0) {
      throw new Error('Ollama offline');
    }

    const primaryModel = process.env.PRIMARY_MODEL || DEFAULT_PRIMARY;
    const verifierModel = process.env.VERIFIER_MODEL || DEFAULT_VERIFIER;

    // 3a. Qwen Draft Generation (Section 12)
    const draftPrompt = buildDraftPrompt(question, referenceContext, studentProfile);
    
    // Inject recent conversation history for coherent dialogue
    const draftMessages = [...draftPrompt.messages];
    if (conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-4).map((h) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.text || h.content || '',
      }));
      // Place history right after system message
      draftMessages.splice(1, 0, ...recent);
    }

    const draftRes = await chatCompletion({
      model: primaryModel,
      messages: draftMessages,
      temperature: 0.7,
      numPredict: 512,
    });

    const draftText = draftRes.content.trim();

    // 3b. DeepSeek-R1 Strict Verification (Section 13)
    const verifyPrompt = buildVerificationPrompt(question, draftText, referenceContext);
    const verifyRes = await chatCompletion({
      model: verifierModel,
      messages: verifyPrompt.messages,
      temperature: 0.1,
      numPredict: 1024, // Sufficient budget for reasoning tokens + verdict
    });

    const verdict = parseVerificationVerdict(verifyRes.content, verifyRes.thinking);

    let finalAnswer = draftText;
    let wasCorrected = false;

    // 3c. Qwen Correction Pass if INCORRECT (Section 14)
    if (!verdict.isCorrect) {
      const correctionPrompt = buildCorrectionPrompt(question, draftText, verdict.feedback, referenceContext);
      const correctionRes = await chatCompletion({
        model: primaryModel,
        messages: correctionPrompt.messages,
        temperature: 0.3,
        numPredict: 512,
      });

      if (correctionRes.content && correctionRes.content.trim().length > 10) {
        finalAnswer = correctionRes.content.trim();
        wasCorrected = true;
      }
    }

    const latencyMs = Date.now() - startTime;
    const autoGrammar = detectGrammarCorrection(question);

    return {
      reply: finalAnswer,
      draft: draftText,
      correction: autoGrammar,
      verification: {
        verdict: verdict.verdict,
        isCorrect: verdict.isCorrect,
        feedback: verdict.feedback,
        reasoning: verdict.reasoning,
        wasCorrected,
      },
      sources: collectedSources,
      engine: `Qwen (${primaryModel}) + DeepSeek-R1 (${verifierModel}) [RTX 3050 6GB Sequential]`,
      intent,
      latencyMs,
      liveWebDataUsed: collectedSources.length > 0,
    };
  } catch (ollamaErr) {
    // Graceful fallback to embedded LinGrow Neural Engine
    const fallbackRes = await generate2BReply({
      history: conversationHistory,
      message: question,
      studentLevel: studentProfile?.level || 'Beginner',
      department: studentProfile?.department || 'CSE',
      liveTaskContext: studentProfile,
    });

    const latencyMs = Date.now() - startTime;
    return {
      reply: fallbackRes.reply,
      draft: fallbackRes.reply,
      correction: fallbackRes.correction || detectGrammarCorrection(question),
      verification: {
        verdict: 'SKIPPED',
        isCorrect: true,
        feedback: 'Executed with built-in instant neural engine (offline mode).',
        reasoning: '',
        wasCorrected: false,
      },
      sources: collectedSources,
      engine: 'LinGrow Local Neural Engine (In-Process Fallback)',
      intent,
      latencyMs,
      liveWebDataUsed: collectedSources.length > 0,
    };
  }
}

module.exports = {
  answerQuestion,
  parseVerificationVerdict,
};
