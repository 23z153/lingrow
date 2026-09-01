/**
 * ragService.js — Retrieval-Augmented Generation Service (from Guide Section 17)
 * ---------------------------------------------------------------------------
 * Splits personal & course documents into chunks, performs semantic/keyword
 * retrieval, and supplies relevant context to Qwen and DeepSeek-R1.
 * ---------------------------------------------------------------------------
 */

const Document = require('../models/Document');

/**
 * Split long document text into overlapping chunks
 */
function chunkText(text, chunkSize = 600, overlap = 100) {
  const clean = (text || '').trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    let chunkStr = clean.slice(start, end);

    // Try to break at sentence or newline boundary if possible
    if (end < clean.length) {
      const lastPeriod = chunkStr.lastIndexOf('. ');
      const lastNewline = chunkStr.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.5) {
        chunkStr = clean.slice(start, start + breakPoint + 1);
      }
    }

    const words = chunkStr
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const keywords = Array.from(new Set(words));

    chunks.push({
      chunkIndex,
      text: chunkStr.trim(),
      keywords,
      charStart: start,
      charEnd: start + chunkStr.length,
    });

    start += Math.max(1, chunkStr.length - overlap);
    chunkIndex++;
  }

  return chunks;
}

/**
 * Ingest and store a user/department document for RAG
 */
async function ingestDocument({ userId, title, text, department = 'CSE', filename = '', tags = [] }) {
  const chunks = chunkText(text);
  const doc = await Document.create({
    user: userId,
    title,
    filename: filename || title,
    fileType: filename.endsWith('.pdf') ? 'pdf' : 'text',
    department,
    summary: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
    totalChunks: chunks.length,
    chunks,
    tags,
  });

  return doc;
}

/**
 * Score relevance between query and chunk text
 */
function scoreChunkRelevance(query, chunk) {
  const qTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (!qTokens.length) return 0;

  let matchCount = 0;
  const chunkTextLower = chunk.text.toLowerCase();

  for (const token of qTokens) {
    if (chunkTextLower.includes(token)) {
      matchCount += 1;
    }
    if (chunk.keywords && chunk.keywords.includes(token)) {
      matchCount += 0.5;
    }
  }

  // Exact phrase match bonus
  if (chunkTextLower.includes(query.toLowerCase())) {
    matchCount += 3;
  }

  return matchCount / qTokens.length;
}

/**
 * Retrieve top-k matching chunks across user's documents
 */
async function retrieveDocumentContext(userId, query, maxChunks = 3) {
  if (!query) return { chunks: [], formattedContext: '' };

  // Find documents belonging to the user or common department documents
  const docs = await Document.find({ user: userId }).limit(20);
  if (!docs || docs.length === 0) {
    return { chunks: [], formattedContext: '' };
  }

  const scored = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const score = scoreChunkRelevance(query, chunk);
      if (score > 0.1) {
        scored.push({
          score,
          docTitle: doc.title,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
        });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, maxChunks);

  if (!topChunks.length) {
    return { chunks: [], formattedContext: '' };
  }

  const formattedContext = topChunks
    .map((c, idx) => `[Document ${idx + 1}: ${c.docTitle} (Section ${c.chunkIndex + 1})]\n${c.text}`)
    .join('\n\n');

  return {
    chunks: topChunks,
    formattedContext,
  };
}

module.exports = {
  chunkText,
  ingestDocument,
  retrieveDocumentContext,
};
