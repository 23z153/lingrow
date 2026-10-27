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
 * Developer Terminal Logger for Pipeline Routing & Source Verification (Dev Only)
 */
function logDevRouting({ question, route, intent, sources = [], ragSources = [], engine, latencyMs, verdict = null }) {
  if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_PIPELINE) return;
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev && !process.env.DEBUG_PIPELINE) return;

  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const magenta = '\x1b[35m';
  const gray = '\x1b[90m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';

  const webStatus = sources && sources.length > 0
    ? `${green}${bold}ACTIVE (${sources.length} sources)${reset}`
    : `${gray}INACTIVE${reset}`;

  const ragStatus = ragSources && ragSources.length > 0
    ? `${green}${bold}ACTIVE (${ragSources.length} chunks matched)${reset}`
    : `${gray}INACTIVE${reset}`;

  const shortQuery = question.length > 70 ? `${question.slice(0, 67)}...` : question;

  console.log(`\n${bold}${cyan}╔══════════════════════ [LINGROW DEV PIPELINE ROUTING] ══════════════════════╗${reset}`);
  console.log(`${cyan}║${reset} ${bold}Query:${reset}        "${shortQuery}"`);
  console.log(`${cyan}║${reset} ${bold}Lane/Route:${reset}   ${magenta}${route}${reset}`);
  console.log(`${cyan}║${reset} ${bold}Web Search:${reset}   ${webStatus}`);
  if (sources && sources.length > 0) {
    sources.forEach((s, idx) => {
      console.log(`${cyan}║${reset}   ${yellow}🌐 [Web ${idx + 1}]${reset} ${s.title || s.source || s.url} ${gray}(${s.url || ''})${reset}`);
    });
  }
  console.log(`${cyan}║${reset} ${bold}RAG Search:${reset}   ${ragStatus}`);
  if (ragSources && ragSources.length > 0) {
    ragSources.forEach((r, idx) => {
      const matchScore = r.score != null ? ` [Relevance: ${r.score}%]` : '';
      console.log(`${cyan}║${reset}   ${yellow}📚 [RAG ${idx + 1}]${reset} ${r.title} ${r.section ? `(${r.section})` : ''}${matchScore}`);
    });
  }
  console.log(`${cyan}║${reset} ${bold}Engine:${reset}       ${engine}`);
  if (verdict) {
    const verdictColor = verdict.isCorrect ? green : yellow;
    console.log(`${cyan}║${reset} ${bold}Verifier:${reset}     ${verdictColor}${verdict.verdict} (${verdict.isCorrect ? 'VALID' : 'CORRECTED'})${reset}`);
  }
  console.log(`${cyan}║${reset} ${bold}Latency:${reset}      ${latencyMs}ms`);
  console.log(`${cyan}╚════════════════════════════════════════════════════════════════════╝${reset}\n`);
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
  let collectedRagSources = [];

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
      const targetDept = studentProfile?.department || 'CSE';
      const ragResult = await retrieveDocumentContext(userId, intent.searchQuery || question, 3, targetDept);
      if (ragResult.formattedContext) {
        referenceContext += `\n\n--- UPLOADED COURSE & DEPARTMENT STUDY DOCUMENTS ---\n${ragResult.formattedContext}`;
      }
      if (ragResult.chunks && Array.isArray(ragResult.chunks)) {
        collectedRagSources.push(
          ...ragResult.chunks.map((c) => ({
            title: c.docTitle,
            section: c.chunkIndex != null ? `Section ${c.chunkIndex + 1}` : '',
            score: c.score != null ? Math.round(c.score * 100) : null,
            textSnippet: (c.text || '').slice(0, 150) + (c.text && c.text.length > 150 ? '...' : ''),
          }))
        );
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

    // Helper: format recent conversation history
    const recentHistory = conversationHistory.slice(-4).map((h) => ({
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
            numPredict: 1024,
            onToken,
          })
        : await chatCompletion({
            model: fastModel,
            messages,
            temperature: 0.7,
            numPredict: 1024,
          });

      const reply = res.content.trim();
      const latencyMs = Date.now() - startTime;

      logDevRouting({
        question,
        route: 'fast_single_pass',
        intent,
        sources: [],
        ragSources: [],
        engine: `Small Fast Model (${fastModel}) [Single Pass]`,
        latencyMs,
        verdict: null,
      });

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
        ragSources: [],
        ragUsed: false,
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

        logDevRouting({
          question,
          route: 'grammar_detector_explainer',
          intent,
          sources: [],
          ragSources: [],
          engine: `Deterministic GEC Detector + Fast Explainer (${fastModel})`,
          latencyMs,
          verdict: null,
        });

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
          ragSources: [],
          ragUsed: false,
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
            numPredict: 768,
            onToken,
          })
        : await chatCompletion({
            model: fastModel,
            messages: explainerPrompt.messages,
            temperature: 0.3,
            numPredict: 768,
          });

      const explanation = res.content.trim() || `Correction: "${gecReport.correctedText}"`;
      const latencyMs = Date.now() - startTime;

      logDevRouting({
        question,
        route: 'grammar_detector_explainer',
        intent,
        sources: [],
        ragSources: [],
        engine: `Deterministic GEC Detector + Fast Explainer (${fastModel})`,
        latencyMs,
        verdict: null,
      });

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
        ragSources: [],
        ragUsed: false,
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
          numPredict: 1536,
          onToken,
        })
      : await chatCompletion({
          model: draftModel,
          messages: draftMessages,
          temperature: 0.7,
          numPredict: 1536,
        });

    const draftText = draftRes.content.trim();

    // Fast Non-Reasoning Verifier Pass (Section 2.2)
    const verifyPrompt = buildFastVerifierPrompt(question, draftText, referenceContext);
    const verifyRes = await chatCompletion({
      model: verifierModel,
      messages: verifyPrompt.messages,
      temperature: 0.1,
      numPredict: 256,
    });

    const verdict = parseVerificationVerdict(verifyRes.content, verifyRes.thinking);
    let finalAnswer = draftText;
    let wasCorrected = false;

    // Fast Feedback Loop: Conditional correction only on verified error in non-streaming mode
    if (!verdict.isCorrect && typeof onToken !== 'function') {
      const correctionPrompt = buildCorrectionPrompt(question, draftText, verdict.feedback, referenceContext);
      const correctionRes = await chatCompletion({
        model: draftModel,
        messages: correctionPrompt.messages,
        temperature: 0.3,
        numPredict: 1536,
      });

      if (correctionRes.content && correctionRes.content.trim().length > 10) {
        finalAnswer = correctionRes.content.trim();
        wasCorrected = true;
      }
    }

    const latencyMs = Date.now() - startTime;
    const ragUsed = collectedRagSources.length > 0;
    const liveWebDataUsed = collectedSources.length > 0;

    logDevRouting({
      question,
      route: 'complex_verified_chain',
      intent,
      sources: collectedSources,
      ragSources: collectedRagSources,
      engine: `Draft (${draftModel}) + Fast Verifier (${verifierModel})`,
      latencyMs,
      verdict,
    });

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
      ragSources: collectedRagSources,
      ragUsed,
      liveWebDataUsed,
      engine: `Draft (${draftModel}) + Fast Verifier (${verifierModel})`,
      pipelineRoute: 'complex_verified_chain',
      intent,
      latencyMs,
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
    const ragUsed = collectedRagSources.length > 0;
    const liveWebDataUsed = collectedSources.length > 0;

    logDevRouting({
      question,
      route: 'fallback_neural_engine',
      intent,
      sources: collectedSources,
      ragSources: collectedRagSources,
      engine: 'LinGrow Local Neural Engine (In-Process Fallback)',
      latencyMs,
      verdict: null,
    });

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
      ragSources: collectedRagSources,
      ragUsed,
      liveWebDataUsed,
      engine: 'LinGrow Local Neural Engine (In-Process Fallback)',
      pipelineRoute: 'fallback_neural_engine',
      intent,
      latencyMs,
    };
  }
}

module.exports = {
  answerQuestion,
  parseVerificationVerdict,
};

