const { classifyIntent } = require('../src/services/intentRouter');
const { chunkText } = require('../src/services/ragService');
const { parseVerificationVerdict, answerQuestion } = require('../src/services/twoModelPipeline');
const {
  buildFastSinglePassPrompt,
  buildDraftPrompt,
  buildFastVerifierPrompt,
  buildCorrectionPrompt,
  buildGrammarExplainerPrompt,
} = require('../src/services/prompts');
const { detectGrammarErrors } = require('../src/services/grammarDetectorService');

describe('Latency-Optimized AI Chatbot Architecture Unit Tests', () => {
  describe('Intent Router (Section 2 & 15)', () => {
    test('detects casual conversational queries for single fast pass (Lane 1)', () => {
      const q1 = 'Hello! How are you today?';
      const res1 = classifyIntent(q1);
      expect(res1.isCasual).toBe(true);
      expect(res1.intentType).toBe('casual_conversation');

      const q2 = 'Good morning, my name is Alex';
      const res2 = classifyIntent(q2);
      expect(res2.isCasual).toBe(true);
      expect(res2.intentType).toBe('casual_conversation');
    });

    test('detects grammar analysis triggers (Lane 2)', () => {
      const q = 'Please check my grammar for this paragraph: He go to school yesterday.';
      const res = classifyIntent(q);
      expect(res.isGrammarAnalysis).toBe(true);
      expect(res.intentType).toBe('grammar_analysis');
    });

    test('detects time-sensitive and current-intent signals for live web search (Lane 3)', () => {
      const q1 = 'What are the latest developments in quantum computing?';
      const res1 = classifyIntent(q1);
      expect(res1.needsWeb).toBe(true);
      expect(res1.isFactualComplex).toBe(true);
      expect(res1.matchedWebSignals).toContain('latest');

      const q2 = 'What is the current version of Python?';
      const res2 = classifyIntent(q2);
      expect(res2.needsWeb).toBe(true);
      expect(res2.isFactualComplex).toBe(true);
    });

    test('detects RAG triggers for course notes and documents', () => {
      const q = 'According to my lecture notes and uploaded syllabus, what is on exam 1?';
      const res = classifyIntent(q);
      expect(res.needsRag).toBe(true);
    });
  });

  describe('Deterministic Grammar Error Correction (GEC) Detector (Section 4)', () => {
    test('detects subject-verb agreement errors', async () => {
      const res = await detectGrammarErrors('He play football and she want a break.');
      expect(res.hasErrors).toBe(true);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
      expect(res.errors[0].category).toBe('Subject-Verb Agreement');
      expect(res.correctedText).toContain('He plays');
      expect(res.correctedText).toContain('she wants');
    });

    test('detects preposition collocation errors', async () => {
      const res = await detectGrammarErrors('I am very interested for machine learning and depend of my team.');
      expect(res.hasErrors).toBe(true);
      expect(res.errors.some((e) => e.category === 'Preposition Usage')).toBe(true);
      expect(res.correctedText).toContain('interested in');
      expect(res.correctedText).toContain('depend on');
    });

    test('detects auxiliary verb / double past tense errors', async () => {
      const res = await detectGrammarErrors('We did went to the seminar yesterday.');
      expect(res.hasErrors).toBe(true);
      expect(res.correctedText).toContain('did go');
    });

    test('passes clean sentences with zero errors', async () => {
      const res = await detectGrammarErrors('She explains algorithms clearly and effectively.');
      expect(res.hasErrors).toBe(false);
      expect(res.errors.length).toBe(0);
    });
  });

  describe('Prompt Templates & Prefix Caching Standards (Section 6)', () => {
    test('builds Fast Single-Pass Prompt for casual conversation', () => {
      const single = buildFastSinglePassPrompt('Hi there!', { name: 'John', department: 'CSE' });
      expect(single.messages.length).toBe(2);
      expect(single.messages[0].content).toContain('LinGrow');
      expect(single.messages[1].content).toBe('Hi there!');
    });

    test('builds Fast Non-Reasoning Verifier Prompt with JSON format', () => {
      const verify = buildFastVerifierPrompt('What is TCP?', 'TCP is connection oriented.', 'TCP reference.');
      expect(verify.messages[0].content).toContain('non-reasoning');
      expect(verify.messages[0].content).toContain('"verdict": "CORRECT"');
    });

    test('builds Grammar Explainer Prompt with pre-identified error list', () => {
      const explainer = buildGrammarExplainerPrompt(
        'He go home',
        [{ span: 'He go', suggestedFix: 'He goes', category: 'Subject-Verb Agreement', explanation: 'Singular verb required.' }],
        'He goes home'
      );
      expect(explainer.messages[0].content).toContain('pedagogical grammar coach');
      expect(explainer.messages[1].content).toContain('IDENTIFIED CORRECTIONS:');
      expect(explainer.messages[1].content).toContain('He goes');
    });
  });

  describe('Fast Non-Reasoning Verdict Parser (Section 2.2)', () => {
    test('correctly parses structured JSON verdict', () => {
      const parsed = parseVerificationVerdict('{"verdict": "CORRECT", "isCorrect": true, "feedback": "Accurate summary."}');
      expect(parsed.isCorrect).toBe(true);
      expect(parsed.verdict).toBe('CORRECT');
      expect(parsed.feedback).toBe('Accurate summary.');
    });

    test('correctly parses JSON INCORRECT verdict with specific feedback', () => {
      const parsed = parseVerificationVerdict('{"verdict": "INCORRECT", "isCorrect": false, "feedback": "The explanation missed handshake step 3."}');
      expect(parsed.isCorrect).toBe(false);
      expect(parsed.verdict).toBe('INCORRECT');
      expect(parsed.feedback).toContain('handshake step 3');
    });

    test('parses legacy VERDICT: CORRECT text strings', () => {
      const parsed = parseVerificationVerdict('VERDICT: CORRECT\nThe draft accurately describes the protocol.');
      expect(parsed.isCorrect).toBe(true);
      expect(parsed.verdict).toBe('CORRECT');
    });

    test('parses legacy VERDICT: INCORRECT text strings', () => {
      const parsed = parseVerificationVerdict('VERDICT: INCORRECT\n1. Error: Port number is wrong.');
      expect(parsed.isCorrect).toBe(false);
      expect(parsed.verdict).toBe('INCORRECT');
    });
  });

  describe('RAG Document Chunking (Section 17)', () => {
    test('splits document text into overlapping chunks with keywords', () => {
      const text = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.';
      const chunks = chunkText(text, 50, 10);
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].keywords.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Pipeline Execution (Section 2 & 5)', () => {
    test('answers user query and returns execution metadata', async () => {
      const res = await answerQuestion({
        question: 'Hello! Can we practice introducing ourselves?',
        studentProfile: { name: 'Sarah', department: 'ECE', level: 'Beginner' },
      });

      expect(res).toBeDefined();
      expect(res.reply).toBeDefined();
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.intent).toBeDefined();
      expect(res.pipelineRoute).toBeDefined();
    });
  });
});

