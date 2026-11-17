/**
 * performanceEvaluator.js — 100-Point Public Speaking Evaluator
 * Evaluates speeches across 8 core dimensions, detects strengths & weaknesses,
 * tracks improvement compared to past attempts, and prescribes exercises.
 */

const { analyzeSpeechDelivery, analyzeGrammarAndVocabulary } = require('./speechAnalysis');

/**
 * 100-Point Public Speaking Evaluation Engine
 */
function evaluateWorldStageSpeech({ session, previousSession = null }) {
  const segments = session.speechSegments || [];
  const fullTranscript = (session.fullTranscript || segments.map((s) => s.text).join(' ')).trim();
  const words = fullTranscript.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Total speech duration in seconds
  let totalAudioSeconds = 0;
  let hasMeasuredDuration = false;

  segments.forEach((seg) => {
    if (seg.audioDurationSeconds > 0) {
      totalAudioSeconds += seg.audioDurationSeconds;
      if (seg.measuredDuration) hasMeasuredDuration = true;
    }
  });

  if (totalAudioSeconds === 0 && session.totalDurationSeconds > 0) {
    totalAudioSeconds = session.totalDurationSeconds;
  }

  // 1. Run delivery analysis
  const delivery = analyzeSpeechDelivery({
    transcript: fullTranscript,
    durationSeconds: totalAudioSeconds,
    measured: hasMeasuredDuration,
  });

  // 2. Run linguistic analysis (grammar & vocabulary)
  const linguistic = analyzeGrammarAndVocabulary(fullTranscript);

  // 3. Score 8 dimensions (Total = 100)
  // A. Grammar Accuracy (15%)
  const grammarMistakeCount = linguistic.corrections.length;
  const grammarPenalty = Math.min(10, grammarMistakeCount * 3);
  const grammarScore = Math.max(5, Math.min(15, 15 - grammarPenalty));

  // B. Vocabulary Richness (15%)
  let vocabScore = 9;
  const rhetoricalWords = [
    'fundamental', 'profound', 'pivotal', 'sustainable', 'paradigm', 'imperative',
    'consequential', 'transform', 'catalyst', 'deliberate', 'perspective', 'innovate',
  ];
  const foundRhetorical = rhetoricalWords.filter((w) => fullTranscript.toLowerCase().includes(w));
  if (wordCount >= 60) vocabScore += 2;
  if (wordCount >= 120) vocabScore += 2;
  vocabScore += Math.min(2, foundRhetorical.length);
  vocabScore = Math.max(5, Math.min(15, vocabScore));

  // C. Sentence Formation (10%)
  let sentenceScore = 7;
  const sentences = fullTranscript.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  if (sentences.length >= 4) sentenceScore += 2;
  if (grammarMistakeCount === 0) sentenceScore += 1;
  sentenceScore = Math.max(4, Math.min(10, sentenceScore));

  // D. Clarity & Coherence (15%)
  let clarityScore = 11;
  if (delivery.fillerCount > 5) clarityScore -= 3;
  else if (delivery.fillerCount <= 1 && wordCount > 30) clarityScore += 2;
  if (wordCount >= 50) clarityScore += 2;
  clarityScore = Math.max(5, Math.min(15, clarityScore));

  // E. Topic Relevance (15%)
  let relevanceScore = 11;
  const topicWords = (session.topic || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const matchedTopicWords = topicWords.filter((w) => fullTranscript.toLowerCase().includes(w));
  if (matchedTopicWords.length >= 2 || wordCount >= 60) relevanceScore += 3;
  if (wordCount >= 100) relevanceScore += 1;
  relevanceScore = Math.max(5, Math.min(15, relevanceScore));

  // F. Fluency & Pacing (10%)
  let fluencyScore = 7;
  if (hasMeasuredDuration) {
    if (delivery.measuredWpm >= 115 && delivery.measuredWpm <= 165) fluencyScore = 10;
    else if (delivery.measuredWpm >= 85 && delivery.measuredWpm <= 190) fluencyScore = 8;
    else fluencyScore = 6;
  } else {
    if (wordCount >= 60) fluencyScore = 9;
    else if (wordCount >= 30) fluencyScore = 7;
  }
  fluencyScore = Math.max(4, Math.min(10, fluencyScore));

  // G. Speech Organization & Persuasive Arc (10%)
  let organizationScore = 6;
  const transitionWords = ['first', 'second', 'furthermore', 'moreover', 'in conclusion', 'finally', 'for example', 'however', 'consequently', 'therefore'];
  const foundTransitions = transitionWords.filter((t) => fullTranscript.toLowerCase().includes(t));
  if (foundTransitions.length >= 2) organizationScore += 2;
  else if (foundTransitions.length === 1) organizationScore += 1;

  const textLower = fullTranscript.toLowerCase();
  const hasHookOrQuestion = textLower.includes('imagine') || textLower.includes('why') || textLower.includes('what if') || textLower.includes('have you ever') || fullTranscript.includes('?');
  const hasCallToActionOrConclusion = textLower.includes('conclusion') || textLower.includes('call to action') || textLower.includes('let us') || textLower.includes('we must') || textLower.includes('finally') || textLower.includes('in summary');
  if (hasHookOrQuestion) organizationScore += 1;
  if (hasCallToActionOrConclusion) organizationScore += 1;
  organizationScore = Math.max(4, Math.min(10, organizationScore));

  // H. Audience Engagement (5%)
  let engagementScore = 3;
  const questionsAnswered = (session.questions || []).filter((q) => q.answerText && q.answerText.trim().length > 0).length;
  if (questionsAnswered >= 1) engagementScore += 2;
  else if (wordCount >= 80) engagementScore += 1;
  engagementScore = Math.max(2, Math.min(5, engagementScore));

  // Overall Score
  const overallScore = Math.min(
    100,
    grammarScore +
      vocabScore +
      sentenceScore +
      clarityScore +
      relevanceScore +
      fluencyScore +
      organizationScore +
      engagementScore
  );

  // 4. Strengths & Weaknesses
  const strengths = [];
  const weaknesses = [];

  if (overallScore >= 75) {
    strengths.push('Commanding stage presence with articulate theme development and clear audience connection.');
  } else {
    strengths.push('Committed delivery that stayed anchored to the central topic throughout.');
  }

  if (grammarMistakeCount === 0) {
    strengths.push('Flawless grammatical precision with clean agreement and accurate past/present tenses.');
  } else {
    weaknesses.push(`Identified ${grammarMistakeCount} grammatical slip(s) in agreement or auxiliary verb structures.`);
  }

  if (delivery.fillerCount <= 2 && wordCount >= 40) {
    strengths.push('Minimal hesitation fillers, maintaining a clean, authoritative speaking rhythm.');
  } else if (delivery.fillerCount > 3) {
    weaknesses.push(`Noticed ${delivery.fillerCount} vocalized pauses (${delivery.fillerWordsDetected.slice(0, 3).join(', ')}).`);
  }

  if (foundTransitions.length >= 2) {
    strengths.push('Effective use of structural discourse markers (e.g. "furthermore", "in conclusion") to guide listeners.');
  } else {
    weaknesses.push('Could incorporate more signposting phrases (e.g., "First", "Crucially", "To summarize") to structure the speech.');
  }

  // 5. Prescribed Exercises
  const suggestedExercises = [];
  if (delivery.fillerCount > 3) {
    suggestedExercises.push('The "Silent Breath Pause" drill: replace vocal fillers with a 1-second silent breath before key assertions.');
  }
  if (grammarMistakeCount > 0) {
    suggestedExercises.push('Subject-verb agreement review: practice 5 minute spoken sentence structures with third-person singular.');
  }
  suggestedExercises.push('Try the "Impromptu 3-Point Speech" mode in Debate Arena to sharpen spontaneous rhetorical agility.');
  suggestedExercises.push('Practice in "During Speech" feedback mode to build instant self-correction instincts.');

  // 6. Improvement compared to past session
  let pastComparison = {
    previousScore: null,
    diffPercent: 0,
    comment: 'First presentation recorded on World Stage! Great milestone.',
  };

  if (previousSession && previousSession.evaluation?.overallScore !== undefined) {
    const prevScore = previousSession.evaluation.overallScore;
    const diff = overallScore - prevScore;
    pastComparison = {
      previousScore: prevScore,
      diffPercent: diff,
      comment:
        diff > 0
          ? `+${diff}% improvement over your previous presentation (${prevScore}%). Keep this trajectory going!`
          : diff < 0
          ? `${diff}% compared to previous presentation. Refine structure and pacing on your next attempt.`
          : `Consistent performance matching your previous score of ${prevScore}%.`,
    };
  }

  return {
    overallScore,
    dimensionScores: {
      grammarAccuracy: grammarScore,
      vocabulary: vocabScore,
      sentenceFormation: sentenceScore,
      clarity: clarityScore,
      topicRelevance: relevanceScore,
      fluency: fluencyScore,
      speechOrganization: organizationScore,
      audienceEngagement: engagementScore,
    },
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    grammarCorrections: linguistic.corrections,
    vocabularyAlternatives: linguistic.vocabUpgrades,
    suggestedExercises: suggestedExercises.slice(0, 3),
    pastComparison,
    deliveryMetrics: delivery,
    evaluator: 'heuristic',
    evaluatedAt: new Date(),
  };
}

module.exports = {
  evaluateWorldStageSpeech,
};
