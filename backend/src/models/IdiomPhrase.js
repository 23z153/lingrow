const mongoose = require('mongoose');

const idiomPhraseSchema = new mongoose.Schema(
  {
    expression: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: ['idiom', 'phrasal_verb'], required: true, index: true },
    level: { type: String, enum: ['Level 4', 'Level 5'], default: 'Level 4', index: true },
    category: {
      type: String,
      enum: [
        'Workplace & Corporate',
        'Campus & Academics',
        'Placement & Interviews',
        'Daily Life & Social',
        'Leadership & Negotiation',
      ],
      required: true,
      index: true,
    },
    baseVerb: { type: String, trim: true, default: null, index: true }, // e.g. 'look', 'take', 'put', 'get', 'turn', 'bring'
    isSeparable: { type: Boolean, default: false },
    separableNote: { type: String, default: '' },
    multipleMeanings: [
      {
        meaning: { type: String, required: true },
        example: { type: String, required: true },
      },
    ],
    stage1_discover: {
      scenarioContext: { type: String, required: true },
      dialogue: [
        {
          speaker: { type: String, required: true },
          text: { type: String, required: true },
        },
      ],
      literalMeaning: { type: String, required: true },
      figurativeMeaning: { type: String, required: true },
      register: {
        type: String,
        enum: ['Formal', 'Semi-Formal / Professional', 'Informal / Conversational', 'Slang'],
        default: 'Semi-Formal / Professional',
      },
      regionNote: { type: String, default: '' },
    },
    stage2_understand: {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: Number, required: true }, // 0-based
      explanation: { type: String, required: true },
      distractorRationales: [{ type: String, required: true }], // Option A, B, C, D explanations in LinGrow_QBank style
    },
    stage3_use: {
      fillInBlank: {
        sentence: { type: String, required: true }, // e.g. "She decided to ___ when her thesis proposal was rejected."
        options: [{ type: String, required: true }],
        correctAnswer: { type: String, required: true },
        hint: { type: String, default: '' },
      },
      sentenceRewrite: {
        plainSentence: { type: String, required: true },
        targetPhrase: { type: String, required: true },
        expectedSentence: { type: String, required: true },
        hint: { type: String, default: '' },
      },
      speakingPrompt: {
        prompt: { type: String, required: true },
        referenceText: { type: String, required: true },
        contextTip: { type: String, default: '' },
      },
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IdiomPhrase', idiomPhraseSchema);
