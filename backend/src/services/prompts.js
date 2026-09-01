/**
 * prompts.js — Two-Model AI Chatbot Prompts (from Guide Sections 12, 13, 14)
 * ---------------------------------------------------------------------------
 * Standardized prompt templates for Qwen Draft Generation, DeepSeek-R1
 * Verification, and Qwen Correction Pass.
 * ---------------------------------------------------------------------------
 */

/**
 * Section 12: Qwen Draft Prompt
 */
function buildDraftPrompt(question, context = '', studentProfile = null) {
  let systemPrompt = `You are the primary AI assistant and personalized English & Technical Communication Tutor.
Answer the user's question clearly and accurately.
Use the supplied reference information when present.
For current information, rely on the supplied sources rather than inventing facts.
Write natural, grammatically correct English.
Do not mention internal model processing.`;

  if (studentProfile && studentProfile.name) {
    systemPrompt += `\n\nStudent Profile:
- Student Name: ${studentProfile.name}
- Department/Major: ${studentProfile.department || 'CSE'}
- Skill Level: ${studentProfile.level || 'Beginner'} (${studentProfile.xp || 0} XP)
Tailor explanations with supportive tone and relevant real-world examples.`;
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
 * Section 13: DeepSeek Verification Prompt
 */
function buildVerificationPrompt(question, draft, context = '') {
  const systemPrompt = `You are a strict answer verifier.

Check:
1. Relevance
2. Factual accuracy
3. Correct use of current information
4. Unsupported claims
5. Contradictions
6. English clarity
7. Missing important information

Return your evaluation ending with:
VERDICT: CORRECT
or
VERDICT: INCORRECT

If INCORRECT, list the errors and provide corrected facts.
If CORRECT, briefly explain why the draft is acceptable.`;

  const userContent = `USER QUESTION:
${question}

QWEN DRAFT:
${draft}

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
 * Section 14: Correction Prompt
 */
function buildCorrectionPrompt(question, draft, feedback, context = '') {
  const systemPrompt = `Rewrite the answer using the verifier's corrections.

Rules:
- Preserve correct information.
- Fix every identified factual error.
- Do not add unsupported facts.
- Answer the user's actual question directly.
- Use clear, natural English.
- Do not mention the verifier or internal processing.`;

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
 * Intent Router Classifier Prompt
 */
function buildIntentPrompt(question) {
  const systemPrompt = `You are an intent routing classifier. Analyze whether answering the user question requires:
1. Real-time / recent web search (e.g., latest releases, breaking news, live events, current prices, versions).
2. Personal / course RAG document search (e.g. notes, syllabus, uploaded PDFs).
3. General knowledge / conversational tutoring.

Reply strictly in JSON:
{"needs_web": true/false, "needs_rag": true/false, "search_query": "keyword query"}`;

  return {
    systemPrompt,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  };
}

module.exports = {
  buildDraftPrompt,
  buildVerificationPrompt,
  buildCorrectionPrompt,
  buildIntentPrompt,
};
