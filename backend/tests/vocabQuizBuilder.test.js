const { buildVocabQuiz } = require('../src/services/vocabQuizBuilder');

describe('Vocabulary Quiz Builder', () => {
  const sampleWords = [
    { _id: '1', word: 'Meticulous', partOfSpeech: 'adjective', meaning: 'Showing great attention to detail; very careful and precise.', example: 'He is meticulous in his work.' },
    { _id: '2', word: 'Ambiguous', partOfSpeech: 'adjective', meaning: 'Open to more than one interpretation; not clear.', example: 'The agreement was ambiguous.' },
    { _id: '3', word: 'Resilient', partOfSpeech: 'adjective', meaning: 'Able to recover quickly from difficulties.', example: 'She is a resilient entrepreneur.' },
    { _id: '4', word: 'Candid', partOfSpeech: 'adjective', meaning: 'Truthful and straightforward; frank.', example: 'He gave a candid interview.' },
    { _id: '5', word: 'Diligent', partOfSpeech: 'adjective', meaning: 'Having or showing care in work.', example: 'A diligent student succeeds.' },
    { _id: '6', word: 'Pragmatic', partOfSpeech: 'adjective', meaning: 'Dealing with things sensibly and realistically.', example: 'We took a pragmatic approach.' },
  ];

  test('generates varied questions with at least 5 distinct types', () => {
    const quiz = buildVocabQuiz(sampleWords, sampleWords, 'user123');

    expect(quiz.length).toBe(6);

    const types = quiz.map((q) => q.type);
    const distinctTypes = new Set(types);

    // Must include at least 5 distinct types
    expect(distinctTypes.size).toBeGreaterThanOrEqual(5);

    // No two consecutive questions share the same type
    for (let i = 0; i < types.length - 1; i++) {
      expect(types[i]).not.toBe(types[i + 1]);
    }
  });

  test('each question has valid options, no duplicate options, and a valid correctIndex', () => {
    const quiz = buildVocabQuiz(sampleWords, sampleWords);

    quiz.forEach((q) => {
      expect(q.prompt).toBeTruthy();
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);

      // Check no duplicate options
      const uniqueOptions = new Set(q.options);
      expect(uniqueOptions.size).toBe(q.options.length);

      // Check correctIndex is valid
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);

      // Check explanation exists
      expect(q.explanation).toBeTruthy();
    });
  });
});
