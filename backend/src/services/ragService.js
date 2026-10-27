/**
 * ragService.js — Retrieval-Augmented Generation Service (from Guide Section 17)
 * ---------------------------------------------------------------------------
 * Splits personal & course documents into chunks, performs semantic/keyword
 * retrieval, and supplies relevant context to Qwen and DeepSeek-R1.
 * ---------------------------------------------------------------------------
 */

const Document = require('../models/Document');
const { embedText } = require('./ollamaClient');

/**
 * Compute cosine similarity between two vector embeddings
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Split long document text into overlapping chunks
 */
function chunkText(text, chunkSize = 600, overlap = 100) {
  const clean = (text || '').trim();
  if (!clean) return [];

  if (clean.length <= chunkSize) {
    const words = clean
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    return [
      {
        chunkIndex: 0,
        text: clean,
        keywords: Array.from(new Set(words)),
        charStart: 0,
        charEnd: clean.length,
      },
    ];
  }

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

    if (start + chunkStr.length >= clean.length) {
      break;
    }

    start += Math.max(1, chunkStr.length - overlap);
    chunkIndex++;
  }

  return chunks;
}

/**
 * Ingest and store a user/department document for RAG with dense vector embeddings
 */
async function ingestDocument({ userId, title, text, department = 'CSE', filename = '', tags = [], isDepartmentWide = false }) {
  const chunks = chunkText(text);

  // Generate vector embeddings for chunks if embedding model is available
  try {
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embedText(chunkTexts);
    if (embeddings && Array.isArray(embeddings) && embeddings.length === chunks.length) {
      chunks.forEach((chunk, i) => {
        chunk.embedding = embeddings[i];
      });
    }
  } catch (e) {
    // Graceful fallback: text and keyword chunks still saved without vectors
  }

  const doc = await Document.create({
    user: userId || null,
    isDepartmentWide,
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
 * Score relevance between query and chunk using hybrid semantic vector + keyword matching
 */
function scoreChunkRelevance(query, chunk, queryEmbedding = null) {
  // 1. Keyword / Token match score
  const qTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  let keywordScore = 0;
  if (qTokens.length > 0) {
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

    keywordScore = Math.min(1, matchCount / (qTokens.length + 1));
  }

  // 2. Semantic vector cosine similarity
  let semanticScore = 0;
  if (queryEmbedding && chunk.embedding && chunk.embedding.length > 0) {
    semanticScore = cosineSimilarity(queryEmbedding, chunk.embedding);
    semanticScore = Math.max(0, semanticScore);
  }

  // 3. Hybrid Combination (70% Semantic Vector + 30% Exact Keyword Match)
  if (queryEmbedding && chunk.embedding && chunk.embedding.length > 0) {
    return (semanticScore * 0.7) + (keywordScore * 0.3);
  }

  // Fallback to pure keyword score
  return keywordScore;
}

/**
 * Retrieve top-k matching chunks across user's and department-wide documents
 */
async function retrieveDocumentContext(userId, query, maxChunks = 3, department = 'CSE') {
  if (!query) return { chunks: [], formattedContext: '' };

  // Generate vector embedding for user query
  let queryEmbedding = null;
  try {
    queryEmbedding = await embedText(query);
  } catch (e) {}

  // Find documents belonging to user OR department-wide documents
  const queryFilter = {
    $or: [
      ...(userId ? [{ user: userId }] : []),
      { isDepartmentWide: true },
      { department: { $in: [department, 'General', 'All'] } },
    ],
  };

  const docs = await Document.find(queryFilter).limit(25);
  if (!docs || docs.length === 0) {
    return { chunks: [], formattedContext: '' };
  }

  const scored = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const score = scoreChunkRelevance(query, chunk, queryEmbedding);
      if (score > 0.15) {
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
    .map((c, idx) => `[Source ${idx + 1}: "${c.docTitle}" (Section ${c.chunkIndex + 1}) - Relevance: ${(c.score * 100).toFixed(0)}%]\n${c.text}`)
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
