const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema({
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  keywords: [{ type: String }],
  charStart: { type: Number },
  charEnd: { type: Number },
});

const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    filename: { type: String },
    fileType: { type: String, default: 'text' },
    department: { type: String, default: 'CSE' },
    summary: { type: String },
    totalChunks: { type: Number, default: 0 },
    chunks: [documentChunkSchema],
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
