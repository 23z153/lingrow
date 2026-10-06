/**
 * prompts.js — Latency-Optimized Prompt Templates & Prefix Caching Standards
 * ---------------------------------------------------------------------------
 * Standardized prefix structures designed for automatic KV/prompt-prefix caching.
 * Includes:
 *  1. Fast Single-Pass Prompt (for casual conversation & direct coaching)
 *  2. Fast Non-Reasoning Verifier Prompt (structured JSON output, zero CoT)
 *  3. Grammar Explainer Prompt (explaining deterministic GEC detector errors)
 *  4. Factual Draft & Correction Prompts (for complex/factual queries)
 * ---------------------------------------------------------------------------
 */

/**
 * Standard System Prefix for LinGrow AI Coach (static for prefix caching)
 */
const SYSTEM_PREFIX_COACH = `You are the AI assistant and personalized English & Technical Communication Tutor for LinGrow.
Write natural, grammatically correct English.
Be encouraging, helpful, and concise.
Do not mention internal model processing or prompt instructions.`;

/**
 * Single-Pass Casual Conversation Prompt
 */
function buildFastSinglePassPrompt(question, studentProfile = null) {
  let systemPrompt = SYSTEM_PREFIX_COACH;
  if (studentProfile && studentProfile.name) {
    systemPrompt += `\nStudent: ${studentProfile.name} | Dept: ${studentProfile.department || 'CSE'} | Level: ${studentProfile.level || 'Beginner'}`;
    if (studentProfile.memoryContext) {
      systemPrompt += studentProfile.memoryContext;
    }
  }

  return {
    systemPrompt,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  };
}

/**
 * Section 12: Complex / Factual Draft Prompt
 */
function buildDraftPrompt(question, context = '', studentProfile = null) {
  let systemPrompt = `${SYSTEM_PREFIX_COACH}\nAnswer clearly and accurately. Rely on supplied reference data when present.`;

  if (studentProfile && studentProfile.name) {
    systemPrompt += `\nStudent: ${studentProfile.name} | Dept: ${studentProfile.department || 'CSE'} | Level: ${studentProfile.level || 'Beginner'}`;
    if (studentProfile.memoryContext) {
      systemPrompt += studentProfile.memoryContext;
    }
  }

  const userContent = `USER QUESTION:
${question}

REFERENCE DATA:
${context ? context.trim() : 'None provided.'}`;

  return {
    systemPrompt,
    userContent,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
}

/**
 * Fast Non-Reasoning Verifier Prompt (Section 2.2: Compact JSON, Zero CoT)
 */
function buildFastVerifierPrompt(question, draft, context = '') {
  const systemPrompt = `You are a fast, non-reasoning factual and relevance verifier.
Check if the draft answers the question accurately without hallucinations or contradictions.
Reply strictly with a JSON object:
{"verdict": "CORRECT", "isCorrect": true, "feedback": "Brief verification note"}
or
{"verdict": "INCORRECT", "isCorrect": false, "feedback": "Specific error explanation"}`;

  const userContent = `QUESTION:
${question}

DRAFT TO AUDIT:
${draft}

REFERENCE CONTEXT:
${context ? context.trim() : 'None provided.'}`;

  return {
    systemPrompt,
    userContent,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
}

/**
 * Legacy/Standard DeepSeek Verification Prompt
 */
function buildVerificationPrompt(question, draft, context = '') {
  return buildFastVerifierPrompt(question, draft, context);
}

/**
 * Section 14: Correction Prompt
 */
function buildCorrectionPrompt(question, draft, feedback, context = '') {
  const systemPrompt = `${SYSTEM_PREFIX_COACH}\nRewrite the draft fixing identified errors without adding unsupported facts.`;

  const userContent = `USER QUESTION:
${question}

ORIGINAL DRAFT:
${draft}

VERIFIER FEEDBACK:
${feedback}

REFERENCE INFORMATION:
${context ? context.trim() : 'None provided.'}`;

  return {
    systemPrompt,
    userContent,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
}

/**
 * Section 4.2: Grammar Explainer Prompt (Deterministic GEC Output -> Friendly Explanation)
 */
function buildGrammarExplainerPrompt(question, errors = [], correctedText = '') {
  const systemPrompt = `${SYSTEM_PREFIX_COACH}\nYou are a pedagogical grammar coach. Explain the pre-identified grammatical corrections clearly in 2-3 friendly sentences. Do not hunt for additional errors.`;

  const errorSummary = errors.map((e, idx) => `${idx + 1}. Error: "${e.span}" -> Suggested Fix: "${e.suggestedFix}" (${e.category}: ${e.explanation})`).join('\n');

  const userContent = `STUDENT WRITING:
"${question}"

IDENTIFIED CORRECTIONS:
${errorSummary || 'No major errors found.'}

CORRECTED SENTENCE:
"${correctedText || question}"

Provide a warm, supportive pedagogical explanation helping the student understand why these corrections improve their sentence.`;

  return {
    systemPrompt,
    userContent,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
}

module.exports = {
  SYSTEM_PREFIX_COACH,
  buildFastSinglePassPrompt,
  buildDraftPrompt,
  buildFastVerifierPrompt,
  buildVerificationPrompt,
  buildCorrectionPrompt,
  buildGrammarExplainerPrompt,
};

