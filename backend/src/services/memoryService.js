/**
 * memoryService.js — Persistent Memory & Context Service for LinGrow AI
 * ---------------------------------------------------------------------------
 * Manages long-term student memory, goals, strengths, and preferences.
 * Injects context dynamically into the multi-lane LLM pipeline.
 * ---------------------------------------------------------------------------
 */

const TutorMemory = require('../models/TutorMemory');

/**
 * Fetch all memories for a student
 */
async function getStudentMemories(userId) {
  if (!userId) return [];
  try {
    return await TutorMemory.find({ user: userId }).sort({ createdAt: -1 }).limit(20);
  } catch (e) {
    return [];
  }
}

/**
 * Add a memory item
 */
async function addStudentMemory({ userId, fact, category = 'goal', source = 'user_added' }) {
  if (!userId || !fact || typeof fact !== 'string') return null;
  const cleanFact = fact.trim();
  if (cleanFact.length < 3) return null;

  // Check if identical or nearly identical memory already exists
  const existing = await TutorMemory.findOne({
    user: userId,
    fact: { $regex: new RegExp(`^${cleanFact.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
  });
  if (existing) return existing;

  return await TutorMemory.create({
    user: userId,
    fact: cleanFact,
    category,
    source,
  });
}

/**
 * Delete a specific memory
 */
async function deleteStudentMemory(userId, memoryId) {
  return await TutorMemory.findOneAndDelete({ _id: memoryId, user: userId });
}

/**
 * Clear all memories for a user
 */
async function clearStudentMemories(userId) {
  return await TutorMemory.deleteMany({ user: userId });
}

/**
 * Heuristically detect and extract persistent learning context from a student message
 */
async function autoExtractMemory(userId, message) {
  if (!userId || !message || typeof message !== 'string') return null;
  const trimmed = message.trim();

  const memoryPatterns = [
    { regex: /\b(?:i am|i'm|im)\s+preparing\s+for\s+([a-zA-Z0-9\s,&-]{3,40})/i, category: 'goal', prefix: 'Preparing for' },
    { regex: /\bmy\s+goal\s+is\s+to\s+([a-zA-Z0-9\s,&-]{3,50})/i, category: 'goal', prefix: 'Goal:' },
    { regex: /\b(?:i want to|want to)\s+(?:focus on|improve|master)\s+([a-zA-Z0-9\s,&-]{3,40})/i, category: 'goal', prefix: 'Wants to improve' },
    { regex: /\b(?:i am interested in|interested in)\s+([a-zA-Z0-9\s,&-]{3,40})/i, category: 'topic', prefix: 'Interested in' },
    { regex: /\b(?:i struggle with|difficult for me to|hard for me to)\s+([a-zA-Z0-9\s,&-]{3,40})/i, category: 'weakness', prefix: 'Struggles with' },
    { regex: /\b(?:please call me|you can call me|my name is)\s+([a-zA-Z]{2,20})/i, category: 'preference', prefix: 'Prefers to be called' },
    { regex: /\bremember\s+that\s+([a-zA-Z0-9\s,&'-]{4,60})/i, category: 'preference', prefix: 'Remember:' },
  ];

  for (const { regex, category, prefix } of memoryPatterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const extractedSubject = match[1].replace(/[.!?].*$/, '').trim();
      if (extractedSubject.length >= 3 && extractedSubject.length <= 60) {
        const fact = `${prefix} ${extractedSubject}`;
        try {
          return await addStudentMemory({
            userId,
            fact,
            category,
            source: 'auto_extracted',
          });
        } catch (e) {}
      }
    }
  }

  return null;
}

/**
 * Format memories into a clean prompt string for LLM injection
 */
function formatMemoriesForPrompt(memories = []) {
  if (!memories || memories.length === 0) return '';
  const lines = memories.map((m) => `- ${m.fact}`).join('\n');
  return `\nSTUDENT LONG-TERM MEMORY & GOALS:\n${lines}`;
}

module.exports = {
  getStudentMemories,
  addStudentMemory,
  deleteStudentMemory,
  clearStudentMemories,
  autoExtractMemory,
  formatMemoriesForPrompt,
};
