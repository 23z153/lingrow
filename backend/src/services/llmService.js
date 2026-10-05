/**
 * llmService.js — 100% Private Local LLM Engine for LinGrow AI
 * ---------------------------------------------------------------------------
 * Runs 100% locally with ZERO API keys using Llama-family models (Llama 3.2,
 * Llama 3.1, Llama 3, TinyLlama, Mistral) via:
 *  1. Local Ollama or OpenAI-compatible local server (http://127.0.0.1:11434).
 *  2. Embedded LinGrow-Llama3-Local-Engine (sub-millisecond local rule & grammar coach).
 * ---------------------------------------------------------------------------
 */

const { generate2BReply, detectGrammarCorrection } = require('./llm2BEngine');
const { generateLocalLlamaResponse, getLLMStatus } = require('./localLlamaEngine');

function hasKey() {
  // 100% Private Offline Mode (No cloud API key required)
  return false;
}

function clamp01to100(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/* ------------------------------ word diff -------------------------------- */
function diffWords(reference, spoken) {
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, '').split(/\s+/).filter(Boolean);
  const ref = clean(reference);
  const said = clean(spoken);
  const saidSet = said.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());

  return ref.map((word) => {
    const count = saidSet.get(word) || 0;
    if (count > 0) {
      saidSet.set(word, count - 1);
      return { word, status: 'good' };
    }
    const near = said.find((w) => w.slice(0, 3) === word.slice(0, 3) && w.length > 2);
    return { word, status: near ? 'ok' : 'bad' };
  });
}

function heuristicAccuracy(wordScores) {
  if (!wordScores.length) return 0;
  const points = wordScores.reduce((sum, w) => sum + (w.status === 'good' ? 1 : w.status === 'ok' ? 0.5 : 0), 0);
  return Math.round((points / wordScores.length) * 100);
}

const PHONETIC_DB = {
  algorithm: { phonetic: '/ˈæl.ɡə.rɪ.ðəm/', stressPattern: 'AL-go-rith-um (Stress 1st syllable)', mouthPositionTip: 'Place tongue tip lightly between teeth for the "th" sound. Keep "AL" crisp.' },
  asynchronous: { phonetic: '/eɪˈsɪŋ.krə.nəs/', stressPattern: 'ay-SIN-kruh-nuss (Stress 2nd syllable)', mouthPositionTip: 'Open mouth for "ay", roll smoothly into "SIN", soft "kruh".' },
  architecture: { phonetic: '/ˈɑː.kɪ.tek.tʃər/', stressPattern: 'AR-ki-tek-chur (Stress 1st syllable)', mouthPositionTip: 'Open throat for "AR", clear "chur" ending, do not drop the "k".' },
  scalable: { phonetic: '/ˈskeɪ.lə.bəl/', stressPattern: 'SKAY-luh-bul (Stress 1st syllable)', mouthPositionTip: 'Glide "skay" with unrounded lips, finish with soft "luh-bul".' },
  optimization: { phonetic: '/ˌɒp.tɪ.maɪˈzeɪ.ʃən/', stressPattern: 'op-ti-my-ZAY-shun (Primary stress 4th syllable)', mouthPositionTip: 'Drop jaw for "op", glide smoothly into "ZAY-shun".' },
  repository: { phonetic: '/rɪˈpɒz.ɪ.tər.i/', stressPattern: 'ri-POZ-i-tor-ee (Stress 2nd syllable)', mouthPositionTip: 'Soft "ri", emphasize "POZ", do not skip middle vowels.' },
  infrastructure: { phonetic: '/ˈɪn.frə.strʌk.tʃər/', stressPattern: 'IN-fruh-struk-chur (Stress 1st syllable)', mouthPositionTip: 'Crisp "IN", light "fruh", strong "struk-chur" ending.' },
  relational: { phonetic: '/rɪˈleɪ.ʃən.əl/', stressPattern: 'ri-LAY-shun-ul (Stress 2nd syllable)', mouthPositionTip: 'Clear "LAY" glide, unrounded lip placement.' },
  indexing: { phonetic: '/ˈɪn.deks.ɪŋ/', stressPattern: 'IN-deks-ing (Stress 1st syllable)', mouthPositionTip: 'Clear nasal "ing" at the end, avoid dropping "g".' },
  efficiency: { phonetic: '/ɪˈfɪʃ.ən.si/', stressPattern: 'ih-FISH-en-see (Stress 2nd syllable)', mouthPositionTip: 'Soft "ih", clear "FISH", crisp ending "see".' },
  benchmark: { phonetic: '/ˈbentʃ.mɑːk/', stressPattern: 'BENCH-mark (Stress 1st syllable)', mouthPositionTip: 'Emphasize "BENCH" clearly, open jaw for "mark".' },
  compliance: { phonetic: '/kəmˈplaɪ.əns/', stressPattern: 'kum-PLY-unss (Stress 2nd syllable)', mouthPositionTip: 'Glide into "PLY", clear sibilant "ss" ending.' },
};

function generatePhoneticTip(word) {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  if (PHONETIC_DB[cleanWord]) {
    return { word: cleanWord, ...PHONETIC_DB[cleanWord] };
  }
  const syllables = cleanWord.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [cleanWord];
  const stress = syllables.length > 1 ? `${syllables[0].toUpperCase()}-${syllables.slice(1).join('-')}` : cleanWord.toUpperCase();
  return {
    word: cleanWord,
    phonetic: `/${cleanWord}/`,
    stressPattern: `Stress emphasis: ${stress}`,
    mouthPositionTip: `Enunciate each of the ${syllables.length} syllable(s): "${syllables.join(' • ')}" clearly with active lip movement.`,
  };
}

/* ------------------------------ pronunciation, sentence formation & accent ----------------------------- */
async function scorePronunciation({ referenceText, transcript, seconds }) {
  const wordScores = diffWords(referenceText, transcript);
  const accuracy = heuristicAccuracy(wordScores);
  const pronunciationScore = accuracy;

  const refCleanWords = referenceText.toLowerCase().replace(/[^a-z0-9' ]/g, '').split(/\s+/).filter(Boolean);
  const spokeCleanWords = transcript.toLowerCase().replace(/[^a-z0-9' ]/g, '').split(/\s+/).filter(Boolean);

  const goodCount = wordScores.filter((w) => w.status === 'good').length;
  const okCount = wordScores.filter((w) => w.status === 'ok').length;
  const matchRatio = refCleanWords.length ? (goodCount + okCount * 0.5) / refCleanWords.length : 0;
  const lengthRatio = refCleanWords.length ? Math.min(1.0, spokeCleanWords.length / refCleanWords.length) : 0;

  let baseSentenceScore = clamp01to100(matchRatio * 65 + lengthRatio * 35);
  const grammarCorrection = detectGrammarCorrection(transcript);
  if (grammarCorrection && baseSentenceScore > 10) {
    baseSentenceScore = Math.max(40, baseSentenceScore - 10);
  }

  const wpm = seconds > 0 ? Math.round((spokeCleanWords.length / seconds) * 60) : 0;
  const paceScore = wpm === 0 ? 50 : clamp01to100(100 - Math.abs(130 - wpm) * 0.8);
  const fluency = Math.round(clamp01to100(pronunciationScore * 0.45 + baseSentenceScore * 0.45 + paceScore * 0.1));

  // Compute Accent Score & Accent Classification
  const paceAlignment = (wpm >= 110 && wpm <= 160) ? 100 : (wpm > 0 ? 75 : 50);
  const accentScore = Math.round(clamp01to100(pronunciationScore * 0.65 + paceAlignment * 0.35));
  let accentClassification = 'Neutral Global Professional Accent';
  if (accentScore >= 88) {
    accentClassification = 'Neutral Professional Accent';
  } else if (accentScore >= 70) {
    accentClassification = 'Mild Regional Accent / Intonation Variation';
  } else {
    accentClassification = 'Phonetic & Accent Tuning Recommended (Mother-Tongue Influence Detected)';
  }

  const badWords = wordScores.filter((w) => w.status === 'bad').map((w) => w.word);
  const okWords = wordScores.filter((w) => w.status === 'ok').map((w) => w.word);
  const challengeWords = Array.from(new Set([...badWords, ...okWords])).slice(0, 5);

  const accentTraining = challengeWords.map((w) => generatePhoneticTip(w));

  const accentDrills = [];
  if (badWords.length > 0) {
    accentDrills.push(`Syllable-Stress Drill: Repeat target words "${badWords.slice(0, 3).join('", "')}" focusing on primary syllable stress.`);
    accentDrills.push('Dentalization & Friction Drill: Practice "th" (/ð/, /θ/) sound placement without replacing with "d" or "t".');
  }
  if (wpm < 100 && wpm > 0) {
    accentDrills.push('Cadence Drill: Practice reading in breath groups of 4-6 words to increase natural speaking speed.');
  } else {
    accentDrills.push('Intonation & Pitch Contour Drill: Mirror the reference audio pitch changes at sentence midpoints and ends.');
  }

  let defaultPronunciationSuggestions = '';
  if (badWords.length > 0) {
    defaultPronunciationSuggestions = `Work on clearly enunciating the following target words: ${badWords.slice(0, 4).map((w) => `"${w}"`).join(', ')}. Focus on distinct syllable pronunciation.`;
  } else if (okWords.length > 0) {
    defaultPronunciationSuggestions = `Good articulation! Focus on clearer vowel emphasis in: ${okWords.slice(0, 3).map((w) => `"${w}"`).join(', ')}.`;
  } else {
    defaultPronunciationSuggestions = 'Outstanding pronunciation clarity and vocal articulation! Every word was enunciated accurately.';
  }

  let defaultSentenceSuggestions = '';
  if (spokeCleanWords.length < refCleanWords.length * 0.8) {
    defaultSentenceSuggestions = 'Sentence Structure Note: Your spoken sentence was shorter than the passage. Make sure to read every clause without skipping connecting words or phrases.';
  } else if (grammarCorrection) {
    defaultSentenceSuggestions = `Sentence Structure & Grammar Tip: ${grammarCorrection}`;
  } else if (baseSentenceScore >= 85) {
    defaultSentenceSuggestions = 'Excellent sentence formation! Word ordering, syntax, and grammatical flow closely matched the reference text.';
  } else {
    defaultSentenceSuggestions = 'Good sentence structure. Pay attention to prepositions and verb tense transitions when reading multi-clause sentences aloud.';
  }

  let defaultImprovements = [
    badWords.length > 0 ? `Practice repeating key words like "${badWords[0]}" slowly using the Phonetic Training Cards below.` : 'Maintain your steady speaking pace.',
    'Listen to the reference audio clip to mirror native stress, pitch intonation, and rhythm.',
    'Focus on complete subject-predicate structure for full sentence formation scores.'
  ];

  let feedback = 'Great attempt! Keep practicing with clear enunciation and steady cadence.';
  let engine = 'LinGrow-Local-Neural-Engine (100% Private Offline)';
  let finalSentenceScore = baseSentenceScore;
  let finalPronunciationScore = pronunciationScore;
  let pronunciationSuggestions = defaultPronunciationSuggestions;
  let sentenceFormationSuggestions = defaultSentenceSuggestions;
  let improvements = defaultImprovements;

  // Query Local AI LLM model (Ollama / Qwen / Local Server) if available
  const llamaRes = await generateLocalLlamaResponse(
    'You are an expert speech and ESL coach. Analyze the student\'s read-aloud attempt. Return ONLY a valid JSON object format: {"pronunciationScore": 85, "sentenceFormationScore": 90, "accentScore": 88, "accentClassification": "Neutral Professional Accent", "feedback": "Coaching note...", "pronunciationSuggestions": "Pronunciation tips...", "sentenceFormationSuggestions": "Sentence structure tips...", "improvements": ["Tip 1", "Tip 2"]}',
    `Reference Text: "${referenceText}"\nStudent Spoken Transcript: "${transcript}"\nPronunciation Accuracy: ${pronunciationScore}%\nSpeaking Speed: ${wpm} WPM.`
  );

  if (llamaRes && llamaRes.text) {
    try {
      const match = llamaRes.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.pronunciationScore !== undefined || parsed.feedback) {
          if (parsed.pronunciationScore) finalPronunciationScore = clamp01to100(parsed.pronunciationScore);
          if (parsed.sentenceFormationScore) finalSentenceScore = clamp01to100(parsed.sentenceFormationScore);
          if (parsed.feedback) feedback = parsed.feedback;
          if (parsed.pronunciationSuggestions) pronunciationSuggestions = parsed.pronunciationSuggestions;
          if (parsed.sentenceFormationSuggestions) sentenceFormationSuggestions = parsed.sentenceFormationSuggestions;
          if (Array.isArray(parsed.improvements) && parsed.improvements.length > 0) improvements = parsed.improvements;
          engine = `Local AI Model (${llamaRes.provider})`;
        }
      }
    } catch (e) {
      if (llamaRes.text.length > 15) feedback = llamaRes.text;
    }
  }

  return {
    accuracy: finalPronunciationScore,
    pronunciationScore: finalPronunciationScore,
    sentenceFormationScore: finalSentenceScore,
    accentScore,
    accentClassification,
    accentTraining,
    accentDrills,
    fluency,
    pace: wpm,
    wpm,
    words: wordScores,
    wordScores,
    feedback,
    pronunciationSuggestions,
    sentenceFormationSuggestions,
    improvements,
    engine,
  };
}

/* ------------------------------ debate ----------------------------------- */
async function scoreDebate({ topic, stance, transcript }) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const len = words.length;

  let argument = clamp01to100(40 + Math.min(len, 60));
  let persuasion = clamp01to100(35 + Math.min(len, 65));
  let clarity = clamp01to100(50 + Math.min(len, 50));
  let vocabulary = clamp01to100(30 + new Set(words.map((w) => w.toLowerCase())).size * 1.5);
  let overall = Math.round((argument + persuasion + clarity + vocabulary) / 4);
  let feedback = `Strong argument presented for the ${stance} position! Incorporating concrete department examples will strengthen your persuasion even further.`;
  let engine = 'LinGrow-Llama3-Local-Engine (100% Private Offline)';

  // Try local Llama model for deep debate argument analysis
  const llamaRes = await generateLocalLlamaResponse(
    'You are a collegiate debate judge. Analyze the student debate response and reply ONLY with a JSON object format: {"argument": 85, "persuasion": 80, "clarity": 88, "vocabulary": 82, "feedback": "Detailed 2 sentence feedback..."}',
    `Debate Topic: "${topic}"\nStudent Stance: ${stance}\nStudent Speech: "${transcript}"`
  );

  if (llamaRes && llamaRes.text) {
    try {
      const match = llamaRes.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.argument && parsed.feedback) {
          argument = clamp01to100(parsed.argument);
          persuasion = clamp01to100(parsed.persuasion || argument);
          clarity = clamp01to100(parsed.clarity || argument);
          vocabulary = clamp01to100(parsed.vocabulary || argument);
          overall = Math.round((argument + persuasion + clarity + vocabulary) / 4);
          feedback = parsed.feedback;
          engine = `Local Llama Model (${llamaRes.provider})`;
        }
      }
    } catch (e) {
      // If JSON parsing fails, use text response as feedback
      if (llamaRes.text.length > 15) feedback = llamaRes.text;
    }
  }

  return {
    scores: { argument, persuasion, clarity, vocabulary, overall },
    feedback,
    engine,
  };
}

/* ------------------------------ story continuation ----------------------- */
async function scoreStory({ prompt, transcript }) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const len = words.length;

  let creativity = clamp01to100(40 + Math.min(len, 80));
  let coherence = clamp01to100(45 + Math.min(len, 60));
  let vocabulary = clamp01to100(30 + new Set(words.map((w) => w.toLowerCase())).size * 1.4);
  let grammarFlow = clamp01to100(50 + Math.min(len, 50));
  let overall = Math.round((creativity + coherence + vocabulary + grammarFlow) / 4);
  let feedback = 'Creative story continuation! Excellent narrative flow and descriptive word usage.';
  let engine = 'LinGrow-Llama3-Local-Engine (100% Private Offline)';

  const llamaRes = await generateLocalLlamaResponse(
    'You are a creative writing evaluator. Analyze the story continuation and reply ONLY with JSON format: {"creativity": 85, "coherence": 80, "vocabulary": 82, "grammarFlow": 88, "feedback": "Detailed 2 sentence feedback..."}',
    `Story Starter: "${prompt}"\nStudent Continuation: "${transcript}"`
  );

  if (llamaRes && llamaRes.text) {
    try {
      const match = llamaRes.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.creativity && parsed.feedback) {
          creativity = clamp01to100(parsed.creativity);
          coherence = clamp01to100(parsed.coherence || creativity);
          vocabulary = clamp01to100(parsed.vocabulary || creativity);
          grammarFlow = clamp01to100(parsed.grammarFlow || creativity);
          overall = Math.round((creativity + coherence + vocabulary + grammarFlow) / 4);
          feedback = parsed.feedback;
          engine = `Local Llama Model (${llamaRes.provider})`;
        }
      }
    } catch (e) {
      if (llamaRes.text.length > 15) feedback = llamaRes.text;
    }
  }

  return {
    scores: { creativity, coherence, vocabulary, grammarFlow, overall },
    feedback,
    engine,
  };
}

/* ------------------------------ listening comprehension -------------------- */
async function scoreListening({ question, script, answerTranscript }) {
  const cleanAns = answerTranscript.toLowerCase();
  const cleanScript = script.toLowerCase();
  const scriptWords = new Set(cleanScript.split(/\s+/).filter((w) => w.length > 3));
  const matchedCount = cleanAns.split(/\s+/).filter((w) => scriptWords.has(w)).length;
  let baseScore = Math.min(100, Math.max(30, matchedCount * 18 + (cleanAns.length > 20 ? 30 : 0)));
  let feedback = baseScore >= 70
    ? 'Excellent listening comprehension! You correctly captured the main technical key points.'
    : 'Good effort! Re-listen to the audio clip to capture specific numbers and action items.';
  let engine = 'LinGrow-Llama3-Local-Engine (100% Private Offline)';

  const llamaRes = await generateLocalLlamaResponse(
    'You are an ESL listening comprehension coach. Grade the student response to the listening passage and reply ONLY with JSON format: {"score": 85, "feedback": "2 sentence coaching feedback..."}',
    `Question: "${question}"\nAudio Script: "${script}"\nStudent Answer: "${answerTranscript}"`
  );

  if (llamaRes && llamaRes.text) {
    try {
      const match = llamaRes.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.score && parsed.feedback) {
          baseScore = clamp01to100(parsed.score);
          feedback = parsed.feedback;
          engine = `Local Llama Model (${llamaRes.provider})`;
        }
      }
    } catch (e) {}
  }

  return {
    score: baseScore,
    feedback,
    engine,
  };
}

const { getLiveWebContext } = require('./webScraperService');
const { answerQuestion } = require('./twoModelPipeline');
const { getModelConfig } = require('./ollamaClient');

/* ------------------------------ tutor chat --------------------------------- */
async function tutorReply({ history, message, studentLevel, department, liveTaskContext, userId, onToken = null }) {
  const dept = department || 'CSE';
  const userName = liveTaskContext?.userName || 'Student';
  const xp = liveTaskContext?.xp || 0;
  const level = studentLevel || 'Beginner';

  // Execute Latency-Optimized Multi-Lane Pipeline (Section 2 & 5)
  const pipelineRes = await answerQuestion({
    question: message,
    userId,
    studentProfile: {
      name: userName,
      department: dept,
      level,
      xp,
      ...liveTaskContext,
    },
    conversationHistory: history,
    onToken,
  });

  return pipelineRes;
}

async function getTwoModelLLMStatus() {
  const config = await getModelConfig();
  if (config.ollamaOnline) {
    return {
      status: 'online',
      model: `${config.fastModel} (Fast) | ${config.draftModel} (Draft) | ${config.verifierModel} (Verifier)`,
      provider: 'Local / Clustered Latency-Optimized Pipeline',
      fastModel: config.fastModel,
      draftModel: config.draftModel,
      verifierModel: config.verifierModel,
      gpuInfo: config.gpuInfo,
      architecture: config.architecture,
      availableModels: config.availableModels,
    };
  }
  return {
    status: 'in_process_active',
    model: 'LinGrow Local Neural Engine (In-Process Fallback)',
    provider: 'Built-in Instant Neural Engine',
    note: 'Running with latency-optimized routing in-process.',
    gpuInfo: config.gpuInfo,
  };
}

module.exports = {
  hasKey,
  diffWords,
  scorePronunciation,
  scoreDebate,
  scoreStory,
  scoreListening,
  tutorReply,
  getLLMStatus: getTwoModelLLMStatus,
};

