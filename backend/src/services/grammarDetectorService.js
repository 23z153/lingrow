/**
 * grammarDetectorService.js — Deterministic Grammar Analysis Pipeline
 * ---------------------------------------------------------------------------
 * Implements Section 4 of Latency-Optimized Architecture:
 *  1. Deterministic Detector: Sequence/rule-based engine (or LanguageTool container)
 *     that outputs structured errors (span, category, suggested fix).
 *  2. Explainer: Small fast model writes a pedagogical explanation of the pre-identified
 *     errors only (does not re-detect, skips verify loop).
 * ---------------------------------------------------------------------------
 */

const GRAMMAR_RULES = [
  // 1. Subject-Verb Agreement (Singular third-person)
  {
    category: 'Subject-Verb Agreement',
    ruleId: 'SVA_SINGULAR_PRESENT',
    pattern: /\b(he|she|it|everyone|everybody|each of (?:them|us|the students|the people))\s+(play|go|work|want|need|come|think|make|know|take|see|do|watch|try)\b/i,
    fix: (match, p1, p2) => {
      const verbForms = {
        play: 'plays', go: 'goes', work: 'works', want: 'wants', need: 'needs',
        come: 'comes', think: 'thinks', make: 'makes', know: 'knows', take: 'takes',
        see: 'sees', do: 'does', watch: 'watches', try: 'tries',
      };
      const verb = (p2 || '').toLowerCase();
      return `${p1} ${verbForms[verb] || verb + 's'}`;
    },
    explanation: "Singular third-person subjects require the verb with an '-s' or '-es' ending in the present simple tense.",
  },
  // 2. Plural Subject with Singular Verb
  {
    category: 'Subject-Verb Agreement',
    ruleId: 'SVA_PLURAL_PAST',
    pattern: /\b(they|we|you|the students|the developers|the engineers|these|those)\s+(was|is)\b/i,
    fix: (match, p1, p2) => `${p1} ${p2.toLowerCase() === 'was' ? 'were' : 'are'}`,
    explanation: "Plural subjects take the plural verb ('are' in present, 'were' in past).",
  },
  // 3. Double Past / Auxiliary Verb Error
  {
    category: 'Tense & Auxiliary Error',
    ruleId: 'AUX_DID_PAST',
    pattern: /\b(did|didn't|did not)\s+(went|saw|ate|bought|came|wrote|made|took|found|spoke)\b/i,
    fix: (match, p1, p2) => {
      const baseForms = {
        went: 'go', saw: 'see', ate: 'eat', bought: 'buy', came: 'come',
        wrote: 'write', made: 'make', took: 'take', found: 'find', spoke: 'speak',
      };
      return `${p1} ${baseForms[p2.toLowerCase()] || p2}`;
    },
    explanation: "After the auxiliary 'did / didn't', the main verb must always be in its base/infinitive form.",
  },
  // 4. Modal Verb with 'to'
  {
    category: 'Modal Verb Error',
    ruleId: 'MODAL_WITH_TO',
    pattern: /\b(can|could|should|would|must|might)\s+to\s+([a-z]+)\b/i,
    fix: (match, p1, p2) => `${p1} ${p2}`,
    explanation: "Modal verbs ('can', 'should', 'must', etc.) are followed directly by the bare infinitive without 'to'.",
  },
  // 5. Indefinite Article 'a' vs 'an'
  {
    category: 'Article Usage',
    ruleId: 'ARTICLE_A_AN',
    pattern: /\b(a)\s+(apple|orange|egg|hour|elephant|engineer|architect|idea|interview|algorithm|issue|application)\b/i,
    fix: (match, p1, p2) => `an ${p2}`,
    explanation: "Use 'an' before words starting with a vowel sound.",
  },
  {
    category: 'Article Usage',
    ruleId: 'ARTICLE_AN_A',
    pattern: /\b(an)\s+(university|uniform|unique|useful|user|year|european)\b/i,
    fix: (match, p1, p2) => `a ${p2}`,
    explanation: "Use 'a' before words starting with a consonant 'yoo' sound like 'university'.",
  },
  // 6. Preposition Collocations
  {
    category: 'Preposition Usage',
    ruleId: 'PREP_INTERESTED',
    pattern: /\b(interested)\s+(for|about|to|at)\b/i,
    fix: () => 'interested in',
    explanation: "The adjective 'interested' takes the preposition 'in'.",
  },
  {
    category: 'Preposition Usage',
    ruleId: 'PREP_DEPEND',
    pattern: /\b(depend|depends|depending)\s+(of|in)\b/i,
    fix: (match, p1) => `${p1} on`,
    explanation: "The verb 'depend' collocated with the preposition 'on' (or 'upon').",
  },
  {
    category: 'Preposition Usage',
    ruleId: 'PREP_DISCUSS',
    pattern: /\b(discuss|discussed|discussing)\s+about\b/i,
    fix: (match, p1) => p1,
    explanation: "'Discuss' is a transitive verb; omit 'about' and follow directly with the object.",
  },
  // 7. Confused Words / Collocations
  {
    category: 'Spelling & Vocabulary',
    ruleId: 'CONFUSED_ALOT',
    pattern: /\b(alot)\b/i,
    fix: () => 'a lot',
    explanation: "'A lot' is always written as two separate words.",
  },
  {
    category: 'Grammar & Usage',
    ruleId: 'COULD_OF',
    pattern: /\b(could|should|would)\s+of\b/i,
    fix: (match, p1) => `${p1} have`,
    explanation: "Use 'have' (or '\\'ve'), not 'of'.",
  },
  {
    category: 'Pronoun / Homophone Error',
    ruleId: 'THEIR_THERE_THEYRE',
    pattern: /\b(their)\s+(is|are|was|were)\b/i,
    fix: (match, p1, p2) => `there ${p2}`,
    explanation: "'There' indicates existence or location; 'their' is possessive.",
  },
  // 8. Capitalization (Lowercase 'i')
  {
    category: 'Capitalization',
    ruleId: 'CAPITAL_I',
    pattern: /(^|\s)(i)(\s|[.,!?'"])/,
    fix: (match, p1, p2, p3) => `${p1}I${p3}`,
    explanation: "The first-person pronoun 'I' is always capitalized.",
  },
];

/**
 * Deterministic error detection on student writing
 */
async function detectGrammarErrors(text) {
  if (!text || typeof text !== 'string') {
    return { hasErrors: false, errors: [], correctedText: '' };
  }

  const errors = [];

  // 1. If LanguageTool server is configured via LANGUAGETOOL_URL, attempt querying it
  if (process.env.LANGUAGETOOL_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const params = new URLSearchParams({ text, language: 'en-US' });
      const res = await fetch(`${process.env.LANGUAGETOOL_URL}/v2/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
          data.matches.forEach((m) => {
            const span = text.substring(m.offset, m.offset + m.length);
            const suggestedFix = m.replacements && m.replacements[0] ? m.replacements[0].value : '';
            errors.push({
              span,
              offset: m.offset,
              length: m.length,
              category: m.rule?.category?.name || 'Grammar & Style',
              suggestedFix,
              explanation: m.message,
              ruleId: m.rule?.id || 'LT_RULE',
            });
          });

          return {
            hasErrors: errors.length > 0,
            errors,
            correctedText: applyCorrections(text, errors),
          };
        }
      }
    } catch (ltErr) {
      // Fall through to built-in deterministic rules
    }
  }

  // 2. High-speed built-in deterministic rule engine
  GRAMMAR_RULES.forEach((rule) => {
    let match;
    const globalRegex = new RegExp(rule.pattern.source, 'gi');
    while ((match = globalRegex.exec(text)) !== null) {
      const span = match[0];
      const offset = match.index;
      const length = span.length;
      const suggestedFix = typeof rule.fix === 'function' ? rule.fix(...match) : rule.fix;

      // Avoid duplicate span overlaps
      if (!errors.some((e) => e.offset === offset && e.length === length)) {
        errors.push({
          span,
          offset,
          length,
          category: rule.category,
          suggestedFix,
          explanation: rule.explanation,
          ruleId: rule.ruleId,
        });
      }
    }
  });

  return {
    hasErrors: errors.length > 0,
    errors,
    correctedText: applyCorrections(text, errors),
  };
}

/**
 * Apply error replacements to text
 */
function applyCorrections(text, errors) {
  if (!errors.length) return text;
  // Sort reverse by offset to apply cleanly without shifting indices
  const sorted = [...errors].sort((a, b) => b.offset - a.offset);
  let res = text;
  sorted.forEach((e) => {
    if (e.suggestedFix && e.offset >= 0 && e.offset + e.length <= res.length) {
      res = res.slice(0, e.offset) + e.suggestedFix + res.slice(e.offset + e.length);
    }
  });
  return res;
}

module.exports = {
  detectGrammarErrors,
  applyCorrections,
  GRAMMAR_RULES,
};
