/**
 * twoModelPipeline.js — Complete Latency-Optimized Architecture for LinGrow AI
 * ---------------------------------------------------------------------------
 * Implements Latency-Optimized Architecture (Sections 1-6):
 *  1. Casual Conversation: Small Fast Model, Single Pass (Zero Verification) -> <1s
 *  2. Grammar Analysis: Deterministic GEC Detector + Fast Explainer (Skip Verify Loop) -> 1-2s
 *  3. Complex / Factual / RAG / Web: Cascaded Draft + Fast Non-Reasoning Verifier -> 2-3s
 * ---------------------------------------------------------------------------
 */

const {
  chatCompletion,
  streamChatCompletion,
  DEFAULT_FAST_MODEL,
  DEFAULT_DRAFT_MODEL,
  DEFAULT_VERIFIER_MODEL,
  listInstalledModels,
} = require('./ollamaClient');
const {
  buildFastSinglePassPrompt,
  buildDraftPrompt,
  buildFastVerifierPrompt,
  buildCorrectionPrompt,
  buildGrammarExplainerPrompt,
} = require('./prompts');
const { classifyIntent } = require('./intentRouter');
const { executeWebSearch } = require('./webSearchService');
const { retrieveDocumentContext } = require('./ragService');
const { detectGrammarErrors } = require('./grammarDetectorService');
const { generate2BReply, detectGrammarCorrection } = require('./llm2BEngine');

/**
 * Fast structured verdict parser (handles JSON & text responses without CoT overhead)
 */
function parseVerificationVerdict(responseContent, thinking = '') {
  const contentStr = (responseContent || '').trim();
  const thinkingStr = (thinking || '').trim();

  // 1. Try parsing JSON verdict
  try {
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.isCorrect === 'boolean' || parsed.verdict) {
        const isCorrect = parsed.isCorrect !== false && String(parsed.verdict).toUpperCase() !== 'INCORRECT';
        return {
          isCorrect,
          verdict: isCorrect ? 'CORRECT' : 'INCORRECT',
          feedback: parsed.feedback || (isCorrect ? 'Draft meets factual accuracy and clarity standards.' : 'Revisions recommended by verifier.'),
          reasoning: thinkingStr,
        };
      }
    }
  } catch (e) {}

  // 2. Text heuristics fallback
  const combined = `${contentStr}\n${thinkingStr}`.toUpperCase();
  let isCorrect = true;
  let verdict = 'CORRECT';

  if (
    contentStr.toUpperCase().includes('VERDICT: INCORRECT') ||
    contentStr.toUpperCase().includes('VERDICT:INCORRECT') ||
    (contentStr.toUpperCase().includes('INCORRECT') && !contentStr.toUpperCase().includes('VERDICT: CORRECT')) ||
    combined.includes('VERDICT: INCORRECT')
  ) {
    isCorrect = false;
    verdict = 'INCORRECT';
  }

  return {
    isCorrect,
    verdict,
    feedback: contentStr || (isCorrect ? 'Draft meets factual accuracy and clarity standards.' : 'Revisions recommended by verifier.'),
    reasoning: thinkingStr,
  };
}

/**
 * Main Latency-Optimized Answer Pipeline
 */
async function answerQuestion({
  question,
  userId = null,
  studentProfile = null,
  forceWebSearch = false,
  forceRag = false,
  conversationHistory = [],
  onToken = null,
}) {
  const startTime = Date.now();

  // Step 1: Intent Routing (Section 2)
  const intent = classifyIntent(question);
  if (forceWebSearch) {
    intent.needsWeb = true;
    intent.isCasual = false;
  }
  if (forceRag) {
    intent.needsRag = true;
    intent.isCasual = false;
  }

  let referenceContext = '';
  let collectedSources = [];

  // Step 2: Context Retrieval (only when flagged)
  if (intent.needsWeb) {
    try {
      const searchResult = await executeWebSearch(intent.searchQuery || question, 3);
      if (searchResult.formattedContext) {
        referenceContext += `\n\n--- LIVE WEB SOURCES ---\n${searchResult.formattedContext}`;
        collectedSources.push(...searchResult.sources);
      }
    } catch (e) {}
  }

  if (intent.needsRag && userId) {
    try {
      const ragResult = await retrieveDocumentContext(userId, intent.searchQuery || question, 3);
      if (ragResult.formattedContext) {
        referenceContext += `\n\n--- UPLOADED COURSE DOCUMENTS ---\n${ragResult.formattedContext}`;
      }
    } catch (e) {}
  }

  // Check Ollama availability or use embedded neural fallback
  try {
    const models = await listInstalledModels();
    if (!models || models.length === 0) {
      throw new Error('Ollama offline');
    }

    const fastModel = process.env.FAST_MODEL || process.env.PRIMARY_MODEL || DEFAULT_FAST_MODEL;
    const draftModel = process.env.DRAFT_MODEL || process.env.PRIMARY_MODEL || DEFAULT_DRAFT_MODEL;
    const verifierModel = process.env.VERIFIER_MODEL || DEFAULT_VERIFIER_MODEL;

    // Helper: format recent conversation history (retains last 12 messages / 6 turns)
    const recentHistory = conversationHistory.slice(-12).map((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text || h.content || '',
    }));

    // Auto-detect fast grammar errors in student's query for coaching tip
    const gecQuick = await detectGrammarErrors(question);
    const autoGrammarTip = gecQuick.hasErrors && gecQuick.errors.length > 0
      ? `"${gecQuick.errors[0].span}" -> "${gecQuick.errors[0].suggestedFix}" (${gecQuick.errors[0].category})`
      : null;

    // =========================================================================
    // LANE 1: Casual Conversation / Small Talk -> Single Fast Pass (Section 2.1)
    // =========================================================================
    if (intent.isCasual && !intent.needsWeb && !intent.needsRag && !intent.isGrammarAnalysis) {
      const singlePrompt = buildFastSinglePassPrompt(question, studentProfile);
      const messages = [...singlePrompt.messages];
      if (recentHistory.length > 0) {
        messages.splice(1, 0, ...recentHistory);
      }

      const res = typeof onToken === 'function'
        ? await streamChatCompletion({
            model: fastModel,
            messages,
            temperature: 0.7,
            numPredict: 256,
            onToken,
          })
        : await chatCompletion({
            model: fastModel,
            messages,
            temperature: 0.7,
            numPredict: 256,
          });

      const reply = res.content.trim();
      const latencyMs = Date.now() - startTime;

      return {
        reply,
        draft: reply,
        correction: autoGrammarTip || detectGrammarCorrection(question),
        verification: {
          verdict: 'SKIPPED',
          isCorrect: true,
          feedback: 'Casual conversational turn — single fast pass (zero verification loop).',
          reasoning: '',
          wasCorrected: false,
        },
        sources: [],
        engine: `Small Fast Model (${fastModel}) [Single Pass]`,
        pipelineRoute: 'fast_single_pass',
        intent,
        latencyMs,
        liveWebDataUsed: false,
      };
    }

    // =========================================================================
    // LANE 2: Grammar Analysis Pipeline (Section 4)
    // =========================================================================
    if (intent.isGrammarAnalysis) {
      const gecReport = await detectGrammarErrors(question);

      if (!gecReport.hasErrors || gecReport.errors.length === 0) {
        const reply = `Your sentence "${question}" is grammatically correct and natural! Keep up the great communication.`;
        if (typeof onToken === 'function') {
          onToken(reply);
        }
        const latencyMs = Date.now() - startTime;

        return {
          reply,
          draft: reply,
          correction: null,
          verification: {
            verdict: 'SKIPPED',
            isCorrect: true,
            feedback: 'Deterministic GEC detector ground truth: No errors found.',
            reasoning: '',
            wasCorrected: false,
          },
          sources: [],
          engine: `Deterministic GEC Detector + Fast Explainer (${fastModel})`,
          pipelineRoute: 'grammar_detector_explainer',
          intent,
          latencyMs,
          liveWebDataUsed: false,
        };
      }

      // Small model explains pre-identified errors (does not re-detect, skips verify loop)
      const explainerPrompt = buildGrammarExplainerPrompt(question, gecReport.errors, gecReport.correctedText);
      const res = typeof onToken === 'function'
        ? await streamChatCompletion({
            model: fastModel,
            messages: explainerPrompt.messages,
            temperature: 0.3,
            numPredict: 300,
            onToken,
          })
        : await chatCompletion({
            model: fastModel,
            messages: explainerPrompt.messages,
            temperature: 0.3,
            numPredict: 300,
          });

      const explanation = res.content.trim() || `Correction: "${gecReport.correctedText}"`;
      const latencyMs = Date.now() - startTime;

      return {
        reply: explanation,
        draft: explanation,
        correction: `Suggested: "${gecReport.correctedText}"`,
        verification: {
          verdict: 'SKIPPED',
          isCorrect: true,
          feedback: 'Deterministic GEC detector ground truth (verification loop skipped).',
          reasoning: '',
          wasCorrected: false,
        },
        sources: [],
        engine: `Deterministic GEC Detector + Fast Explainer (${fastModel})`,
        pipelineRoute: 'grammar_detector_explainer',
        intent,
        latencyMs,
        liveWebDataUsed: false,
      };
    }

    // =========================================================================
    // LANE 3: Complex / Factual / RAG / Web -> Cascaded Draft + Fast Non-Reasoning Verifier (Section 2.2)
    // =========================================================================
    const draftPrompt = buildDraftPrompt(question, referenceContext, studentProfile);
    const draftMessages = [...draftPrompt.messages];
    if (recentHistory.length > 0) {
      draftMessages.splice(1, 0, ...recentHistory);
    }

    const draftRes = typeof onToken === 'function'
      ? await streamChatCompletion({
          model: draftModel,
          messages: draftMessages,
          temperature: 0.7,
          numPredict: 384,
          onToken,
        })
      : await chatCompletion({
          model: draftModel,
          messages: draftMessages,
          temperature: 0.7,
          numPredict: 512,
        });

    const draftText = draftRes.content.trim();

    // Fast Non-Reasoning Verifier Pass (Section 2.2)
    const verifyPrompt = buildFastVerifierPrompt(question, draftText, referenceContext);
    const verifyRes = await chatCompletion({
      model: verifierModel,
      messages: verifyPrompt.messages,
      temperature: 0.1,
      numPredict: 150, // Short budget for structured JSON verdict
    });

    const verdict = parseVerificationVerdict(verifyRes.content, verifyRes.thinking);
    let finalAnswer = draftText;
    let wasCorrected = false;

    // Correction pass only if verifier flags INCORRECT
    if (!verdict.isCorrect) {
      if (typeof onToken === 'function') {
        const note = `\n\n*(Coach Revision Note: ${verdict.feedback})*`;
        onToken(note);
        finalAnswer += note;
        wasCorrected = true;
      } else {
        const correctionPrompt = buildCorrectionPrompt(question, draftText, verdict.feedback, referenceContext);
        const correctionRes = await chatCompletion({
          model: draftModel,
          messages: correctionPrompt.messages,
          temperature: 0.3,
          numPredict: 512,
        });

        if (correctionRes.content && correctionRes.content.trim().length > 10) {
          finalAnswer = correctionRes.content.trim();
          wasCorrected = true;
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    return {
      reply: finalAnswer,
      draft: draftText,
      correction: autoGrammarTip || detectGrammarCorrection(question),
      verification: {
        verdict: verdict.verdict,
        isCorrect: verdict.isCorrect,
        feedback: verdict.feedback,
        reasoning: verdict.reasoning,
        wasCorrected,
      },
      sources: collectedSources,
      engine: `Draft (${draftModel}) + Fast Verifier (${verifierModel})`,
      pipelineRoute: 'complex_verified_chain',
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

    if (typeof onToken === 'function' && fallbackRes.reply) {
      onToken(fallbackRes.reply);
    }

    const latencyMs = Date.now() - startTime;
    return {
      reply: fallbackRes.reply,
      draft: fallbackRes.reply,
      correction: fallbackRes.correction || detectGrammarCorrection(question),
      verification: {
        verdict: 'SKIPPED',
        isCorrect: true,
        feedback: 'Executed with built-in instant neural engine (in-process fallback).',
        reasoning: '',
        wasCorrected: false,
      },
      sources: collectedSources,
      engine: 'LinGrow Local Neural Engine (In-Process Fallback)',
      pipelineRoute: 'fallback_neural_engine',
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

