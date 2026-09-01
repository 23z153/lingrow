const mongoose = require('mongoose');
const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
    sections: [{ heading: String, content: String }],
  },
  { timestamps: true }
);
module.exports = mongoose.model('Lesson', lessonSchema);
