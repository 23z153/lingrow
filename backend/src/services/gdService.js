const { detectGrammarCorrection } = require('./llm2BEngine');
const { awardXP } = require('./progressService');

/**
 * Analyzes speech transcripts for each student in a Group Discussion (GD) room,
 * generates performance scores (Clarity, Grammar, Vocabulary, Interaction),
 * identifies grammatical errors with corrections, and produces targeted skill improvement suggestions.
 */
async function evaluateGdSession(room) {
  const reports = [];

  const topicKeywords = (room.topic || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const interactionPhrases = [
    'i agree',
    'however',
    'in my opinion',
    'from my perspective',
    'on the other hand',
    'furthermore',
    'what do you think',
    'i believe',
    'that is a good point',
    'to add to',
    'in contrast',
    'therefore'
  ];

  for (const participant of room.participants) {
    const studentId = participant._id ? participant._id.toString() : participant.toString();
    const studentName = participant.name || 'Student';

    // Gather all speech utterances for this student
    const studentTranscripts = (room.transcripts || []).filter(
      (t) => (t.student ? t.student.toString() : '') === studentId
    );

    const fullText = studentTranscripts.map((t) => t.text).join(' ').trim();
    const wordCount = fullText ? fullText.split(/\s+/).length : 0;

    let clarityScore = 70;
    let grammarScore = 75;
    let vocabularyScore = 70;
    let interactionScore = 65;
    let strengths = [];
    let corrections = [];
    let suggestions = [];

    if (wordCount === 0) {
      clarityScore = 50;
      grammarScore = 60;
      vocabularyScore = 50;
      interactionScore = 40;
      strengths.push('Attended the Group Discussion session in the lobby.');
      suggestions.push('Speak up early during the discussion to share your perspectives.');
      suggestions.push('Use discussion starter phrases like "In my opinion..." or "I would like to add..."');
      suggestions.push('Practice speaking short 2-3 sentence points to build confidence.');
    } else {
      // 1. Clarity & Fluency
      if (wordCount > 40) clarityScore += 15;
      else if (wordCount > 20) clarityScore += 10;
      if (studentTranscripts.length >= 2) clarityScore += 10;
      clarityScore = Math.min(98, clarityScore);

      // 2. Grammar evaluation
      const grammarTip = detectGrammarCorrection(fullText);
      if (!grammarTip) {
        grammarScore += 15;
        strengths.push('Demonstrated strong grammatical accuracy across spoken contributions.');
      } else {
        grammarScore -= 10;
        corrections.push({
          original: fullText.slice(0, 120),
          corrected: grammarTip.replace(/^💡 Tip: /i, ''),
          explanation: 'Grammar and phrasing refinement for clearer delivery during discussions.'
        });
        suggestions.push(`Refine sentence structure: ${grammarTip}`);
      }
      grammarScore = Math.min(95, Math.max(50, grammarScore));

      // 3. Vocabulary & Topic Relevance
      const lowerText = fullText.toLowerCase();
      const matchedKeywords = topicKeywords.filter((kw) => lowerText.includes(kw));
      if (matchedKeywords.length > 0) {
        vocabularyScore += 15;
        strengths.push(`Effective usage of topic-specific vocabulary ("${matchedKeywords.join('", "')}").`);
      } else {
        suggestions.push(`Incorporate core topic terms like "${topicKeywords.slice(0, 3).join('", "')}" in your statements.`);
      }
      const uniqueWords = new Set(lowerText.split(/\s+/)).size;
      if (uniqueWords > 25) vocabularyScore += 10;
      vocabularyScore = Math.min(96, Math.max(55, vocabularyScore));

      // 4. Interaction & Turn-taking
      const matchedInteraction = interactionPhrases.filter((p) => lowerText.includes(p));
      if (matchedInteraction.length > 0) {
        interactionScore += 25;
        strengths.push(`Great collaborative turn-taking using phrases like "${matchedInteraction[0]}".`);
      } else {
        suggestions.push('Enhance group dynamics by using phrases such as "I agree with...", "However...", or "From my perspective..."');
      }
      if (studentTranscripts.length > 1) {
        interactionScore += 10;
        strengths.push('Maintained active engagement across multiple speaking turns.');
      }
      interactionScore = Math.min(95, Math.max(45, interactionScore));

      // Additional general skill suggestions
      if (wordCount < 30) {
        suggestions.push('Elaborate on your statements by adding examples or supporting reasons.');
      } else {
        suggestions.push('Try structuring your response with: State Point -> Provide Reason -> Give Example.');
      }
    }

    const overallScore = Math.round(
      clarityScore * 0.25 + grammarScore * 0.25 + vocabularyScore * 0.25 + interactionScore * 0.25
    );

    // Award student XP for participating in GD
    try {
      if (participant._id) {
        await awardXP(participant, 25);
      }
    } catch (e) {
      console.error('[gdService] XP award error:', e.message);
    }

    reports.push({
      student: participant._id || participant,
      studentName,
      overallScore,
      clarityScore,
      grammarScore,
      vocabularyScore,
      interactionScore,
      strengths,
      corrections,
      suggestions,
      analyzedAt: new Date()
    });
  }

  room.reports = reports;
  room.status = 'COMPLETED';
  room.endedAt = new Date();
  await room.save();

  return room;
}

module.exports = { evaluateGdSession };
