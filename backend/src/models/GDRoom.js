const mongoose = require('mongoose');

const gdRoomSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    maxStudents: { type: Number, default: 4, min: 2, max: 10 },
    targetDurationMinutes: { type: Number, default: 5 },
    status: { type: String, enum: ['LOBBY', 'IN_PROGRESS', 'COMPLETED'], default: 'LOBBY' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    transcripts: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        studentName: { type: String, required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    reports: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        studentName: { type: String, required: true },
        overallScore: { type: Number, default: 75 },
        clarityScore: { type: Number, default: 75 },
        grammarScore: { type: Number, default: 75 },
        vocabularyScore: { type: Number, default: 75 },
        interactionScore: { type: Number, default: 75 },
        strengths: [String],
        corrections: [
          {
            original: String,
            corrected: String,
            explanation: String
          }
        ],
        suggestions: [String],
        analyzedAt: { type: Date, default: Date.now }
      }
    ],
    startedAt: Date,
    endedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('GDRoom', gdRoomSchema);
