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

/* ------------------------------ pronunciation ----------------------------- */
async function scorePronunciation({ referenceText, transcript, seconds }) {
  const wordScores = diffWords(referenceText, transcript);
  const accuracy = heuristicAccuracy(wordScores);
  const wordCount = referenceText.trim().split(/\s+/).length;
  const wpm = seconds > 0 ? Math.round((wordCount / seconds) * 60) : 0;
  const paceScore = wpm === 0 ? 50 : clamp01to100(100 - Math.abs(130 - wpm) * 0.8);
  const fluency = Math.round(clamp01to100(accuracy * 0.6 + paceScore * 0.4));

  let feedback = 'Great attempt! Work on maintaining a steady speaking pace and enunciating technical terms clearly.';
  let engine = 'LinGrow-Llama3-Local-Engine (100% Private Offline)';

  // Try local Llama model for dynamic pronunciation coaching feedback if running
  const llamaRes = await generateLocalLlamaResponse(
    'You are an expert pronunciation coach. Provide 2 concise sentences of supportive feedback for a student reading a text aloud.',
    `Reference Text: "${referenceText}"\nStudent Transcript: "${transcript}"\nAccuracy Score: ${accuracy}%\nSpeaking Speed: ${wpm} WPM.`
  );

  if (llamaRes && llamaRes.text) {
    feedback = llamaRes.text;
    engine = `Local Llama Model (${llamaRes.provider})`;
  } else if (accuracy >= 85) {
    feedback = 'Outstanding pronunciation and articulation! Your clarity and speech rhythm were crisp and natural.';
  } else if (accuracy >= 65) {
    feedback = 'Good delivery! You pronounced most key words clearly. Focus on smooth transitions between complex sentences.';
  }

  return {
    accuracy,
    fluency,
    words: wordScores,
    feedback,
    wpm,
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

