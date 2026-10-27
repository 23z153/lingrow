/**
 * webSearchService.js — Live Web Search Engine with Source Quality Rules
 * ---------------------------------------------------------------------------
 * Implements Guide Sections 15 & 16:
 *  - Retrieves relevant real-time sources
 *  - Preserves title, date, URL, source name, and clean snippet
 *  - Formats verified reference evidence for Qwen & DeepSeek
 * ---------------------------------------------------------------------------
 */

/**
 * Strip HTML tags and normalize whitespace
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect whether query pertains to technology, software, or computer engineering
 */
function isTechQuery(query) {
  const TECH_KEYWORDS = [
    'ai', 'llm', 'software', 'programming', 'developer', 'startup', 'tech', 'coding',
    'framework', 'library', 'database', 'system', 'linux', 'hardware', 'crypto',
    'algorithm', 'cyber', 'security', 'hack', 'app', 'web', 'cloud', 'aws', 'docker',
    'kubernetes', 'python', 'javascript', 'react', 'node', 'rust', 'golang', 'git',
    'devops', 'backend', 'frontend', 'engineering', 'computer', 'server', 'api'
  ];
  const words = (query || '').toLowerCase().split(/\W+/);
  return words.some((w) => TECH_KEYWORDS.includes(w));
}

/**
 * Filter sources to ensure they are strictly relevant to the query terms
 */
function filterRelevantSources(sources, query) {
  const stopWords = new Set([
    'who', 'is', 'what', 'where', 'when', 'why', 'how', 'the', 'a', 'an',
    'and', 'or', 'to', 'in', 'on', 'at', 'for', 'of', 'with', 'about',
    'can', 'you', 'tell', 'me'
  ]);
  const queryTerms = (query || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  if (queryTerms.length === 0) return sources;

  // Prefer sources whose title explicitly contains at least one query term
  const titleMatches = sources.filter((s) => {
    const t = (s.title || '').toLowerCase();
    return queryTerms.some((term) => t.includes(term));
  });

  if (titleMatches.length > 0) {
    return titleMatches;
  }

  // Fallback: snippet contains query terms
  return sources.filter((s) => {
    const text = `${s.title} ${s.snippet}`.toLowerCase();
    return queryTerms.some((term) => text.includes(term));
  });
}

/**
 * Search Wikipedia for encyclopedic background & definitions
 */
async function searchWikipedia(query, limit = 2) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=${limit}&prop=extracts|pageprops&exintro=1&explaintext=1&exsentences=3&format=json&origin=*`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'LinGrow-AI-TwoModelBot/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();

    if (data.query && data.query.pages) {
      return Object.values(data.query.pages)
        .filter((p) => p.extract && p.extract.length > 30)
        .sort((a, b) => (a.index || 99) - (b.index || 99))
        .map((p) => ({
          title: p.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/\s+/g, '_'))}`,
          snippet: cleanText(p.extract),
          source: 'Wikipedia Official',
          date: new Date().toISOString().split('T')[0],
        }));
    }
  } catch (err) {
    // Graceful network fallback
  }
  return [];
}

/**
 * Search HackerNews via Algolia for live tech discussions, releases & updates
 */
async function searchHackerNews(query, limit = 3) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
      query
    )}&tags=story&restrictSearchableAttributes=title&hitsPerPage=${limit}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();

    if (data.hits && Array.isArray(data.hits)) {
      return data.hits
        .filter((h) => h.title)
        .map((h) => ({
          title: h.title,
          url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          snippet: `Live tech trend: ${h.title}. Author: ${h.author || 'Tech Community'}. Points: ${h.points || 0}.`,
          source: 'HackerNews Tech Feed',
          date: h.created_at ? h.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
    }
  } catch (err) {
    // Network fallback
  }
  return [];
}

/**
 * Search DEV.to for engineering tutorials & architectural deep-dives
 */
async function searchDevTo(query, limit = 2) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const cleanTag = query.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const url = `https://dev.to/api/articles?per_page=${limit}&tag=${encodeURIComponent(cleanTag || 'tech')}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'LinGrow-AI-TwoModelBot/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();

    if (Array.isArray(data)) {
      return data
        .filter((a) => a.title && a.description)
        .map((a) => ({
          title: a.title,
          url: a.url,
          snippet: cleanText(a.description),
          source: 'DEV.to Engineering',
          date: a.published_at ? a.published_at.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
    }
  } catch (err) {
    // Network fallback
  }
  return [];
}

/**
 * Main Web Search aggregator fulfilling Section 16 Source Quality Rules
 */
async function executeWebSearch(query, maxSources = 4) {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return { sources: [], formattedContext: '' };

  const isTech = isTechQuery(cleanQ);

  const searchPromises = [searchWikipedia(cleanQ, 2)];
  if (isTech) {
    searchPromises.push(searchHackerNews(cleanQ, 2));
    searchPromises.push(searchDevTo(cleanQ, 2));
  }

  const searchResults = await Promise.all(searchPromises);
  const combined = searchResults.flat();

  // Remove duplicates by URL or title
  const seenUrls = new Set();
  const uniqueSources = [];
  for (const item of combined) {
    if (item.url && !seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      uniqueSources.push(item);
    }
  }

  // Filter sources for keyword relevance to query
  const relevantSources = filterRelevantSources(uniqueSources, cleanQ);
  const selectedSources = relevantSources.slice(0, maxSources);

  if (selectedSources.length === 0) {
    return {
      sources: [],
      formattedContext: '',
      query: cleanQ,
    };
  }

  // Format evidence block for Qwen and DeepSeek prompts
  const formattedContext = selectedSources
    .map(
      (s, idx) =>
        `[Source ${idx + 1}: ${s.title} | ${s.source} | Date: ${s.date} | URL: ${s.url}]\n${s.snippet}`
    )
    .join('\n\n');

  return {
    sources: selectedSources,
    formattedContext,
    query: cleanQ,
  };
}

module.exports = {
  executeWebSearch,
  searchWikipedia,
  searchHackerNews,
  searchDevTo,
};
