const { classifyIntent } = require('../src/services/intentRouter');
const { chunkText } = require('../src/services/ragService');
const { parseVerificationVerdict } = require('../src/services/twoModelPipeline');
const { buildDraftPrompt, buildVerificationPrompt, buildCorrectionPrompt } = require('../src/services/prompts');

describe('Two-Model Local AI Chatbot Architecture Unit Tests', () => {
  describe('Intent Router (Section 15)', () => {
    test('detects time-sensitive and current-intent signals for live web search', () => {
      const q1 = 'What are the latest developments in quantum computing?';
      const res1 = classifyIntent(q1);
      expect(res1.needsWeb).toBe(true);
      expect(res1.matchedWebSignals).toContain('latest');

      const q2 = 'What is the current version of Python?';
      const res2 = classifyIntent(q2);
      expect(res2.needsWeb).toBe(true);

      const q3 = 'Explain the TCP three-way handshake in simple English.';
      const res3 = classifyIntent(q3);
      expect(res3.needsWeb).toBe(false);
      expect(res3.needsRag).toBe(false);
      expect(res3.intentType).toBe('general');
    });

    test('detects RAG triggers for course notes and documents', () => {
      const q = 'According to my lecture notes and uploaded syllabus, what is on exam 1?';
      const res = classifyIntent(q);
      expect(res.needsRag).toBe(true);
    });
  });

  describe('Prompt Templates (Sections 12, 13, 14)', () => {
    test('builds Qwen Draft Prompt with user question and reference context', () => {
      const draft = buildDraftPrompt('What is TCP?', 'TCP reference context.');
      expect(draft.messages.length).toBe(2);
      expect(draft.messages[0].content).toContain('primary AI assistant');
      expect(draft.messages[1].content).toContain('USER QUESTION:\nWhat is TCP?');
      expect(draft.messages[1].content).toContain('REFERENCE DATA:\nTCP reference context.');
    });

    test('builds DeepSeek Verification Prompt with strict checklist', () => {
      const verify = buildVerificationPrompt('What is TCP?', 'TCP is connection oriented.', 'TCP reference.');
      expect(verify.messages[0].content).toContain('strict answer verifier');
      expect(verify.messages[0].content).toContain('VERDICT: CORRECT');
      expect(verify.messages[1].content).toContain('QWEN DRAFT:\nTCP is connection oriented.');
    });

    test('builds Qwen Correction Prompt with verifier feedback', () => {
      const correction = buildCorrectionPrompt(
        'What is TCP?',
        'Wrong draft',
        'VERDICT: INCORRECT. Factual error.',
        'TCP reference'
      );
      expect(correction.messages[0].content).toContain("Rewrite the answer using the verifier's corrections.");
      expect(correction.messages[1].content).toContain('VERIFIER FEEDBACK:\nVERDICT: INCORRECT. Factual error.');
    });
  });

  describe('DeepSeek-R1 Verdict Parser', () => {
    test('correctly identifies CORRECT verdict', () => {
      const parsed = parseVerificationVerdict('VERDICT: CORRECT\nThe draft accurately describes the protocol.');
      expect(parsed.isCorrect).toBe(true);
      expect(parsed.verdict).toBe('CORRECT');
    });

    test('correctly identifies INCORRECT verdict and captures feedback', () => {
      const parsed = parseVerificationVerdict('VERDICT: INCORRECT\n1. Error: Port number is wrong.');
      expect(parsed.isCorrect).toBe(false);
      expect(parsed.verdict).toBe('INCORRECT');
      expect(parsed.feedback).toContain('Error: Port number is wrong.');
    });

    test('parses thinking stream when verdict is embedded', () => {
      const parsed = parseVerificationVerdict('', 'The draft is wrong.\nVERDICT: INCORRECT');
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
});
