/**
 * ollamaClient.js — Latency-Optimized Model Cascading Client
 * ---------------------------------------------------------------------------
 * Implements Section 2.3 & Section 6 of Latency-Optimized Architecture:
 *  1. FAST_MODEL (3B-8B): Casual conversation, simple grammar explanations
 *  2. DRAFT_MODEL (7B-70B): Complex reasoning, factual queries, RAG
 *  3. VERIFIER_MODEL (3B-8B Non-Reasoning): Fast structured JSON audit
 * ---------------------------------------------------------------------------
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

// Model cascade configuration with smart defaults
let DEFAULT_FAST_MODEL = process.env.FAST_MODEL || process.env.PRIMARY_MODEL || process.env.LOCAL_LLM_MODEL || 'qwen2.5:3b';
let DEFAULT_DRAFT_MODEL = process.env.DRAFT_MODEL || process.env.PRIMARY_MODEL || 'qwen2.5:7b';
let DEFAULT_VERIFIER_MODEL = process.env.VERIFIER_MODEL || 'qwen2.5:3b';

let cachedModels = null;
let lastModelCheck = 0;
const CACHE_TTL = 30000; // 30s

/**
 * Query Ollama /api/tags to list installed models
 */
async function listInstalledModels() {
  const now = Date.now();
  if (cachedModels && now - lastModelCheck < CACHE_TTL) {
    return cachedModels;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      cachedModels = data.models || [];
      lastModelCheck = now;

      const names = cachedModels.map((m) => m.name.toLowerCase());

      // Auto-detect fast model (favor instruct models over reasoning models)
      if (!process.env.FAST_MODEL) {
        if (names.some((n) => n.includes('qwen2.5:3b') || n.includes('llama3.2:3b') || n.includes('phi3') || n.includes('qwen2.5:1.5b'))) {
          DEFAULT_FAST_MODEL = (cachedModels.find((m) =>
            m.name.toLowerCase().includes('qwen2.5:3b') ||
            m.name.toLowerCase().includes('llama3.2:3b') ||
            m.name.toLowerCase().includes('phi3')
          ) || cachedModels.find((m) =>
            m.name.toLowerCase().includes('3b') ||
            m.name.toLowerCase().includes('1.5b')
          )).name;
        } else if (cachedModels.length > 0) {
          DEFAULT_FAST_MODEL = cachedModels[0].name;
        }
      }

      // Auto-detect draft model
      if (!process.env.DRAFT_MODEL) {
        if (names.some((n) => n.includes('qwen2.5:7b') || n.includes('qwen3') || n.includes('llama3.1:8b') || n.includes('mistral'))) {
          DEFAULT_DRAFT_MODEL = cachedModels.find((m) =>
            m.name.toLowerCase().includes('7b') ||
            m.name.toLowerCase().includes('8b') ||
            m.name.toLowerCase().includes('mistral')
          ).name;
        } else {
          DEFAULT_DRAFT_MODEL = DEFAULT_FAST_MODEL;
        }
      }

      // Auto-detect non-reasoning verifier (prefer small fast instruct model)
      if (!process.env.VERIFIER_MODEL) {
        DEFAULT_VERIFIER_MODEL = DEFAULT_FAST_MODEL;
      }

      return cachedModels;
    }
  } catch (err) {
    // Ollama not reachable
  }

  return cachedModels || [];
}

/**
 * Get active configuration for the cascaded system
 */
async function getModelConfig() {
  const models = await listInstalledModels();
  const available = models.map((m) => ({
    name: m.name,
    size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'unknown',
    family: m.details?.family || 'unknown',
    paramSize: m.details?.parameter_size || 'unknown',
    quantization: m.details?.quantization_level || 'unknown',
  }));

  // Probe GPU VRAM if available
  let gpuInfo = { detected: false, name: 'Clustered / Local GPU Target', vramTotal: 'N/A', vramUsed: 'N/A' };
  try {
    const { stdout } = await execPromise('nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu --format=csv,noheader,nounits');
    const parts = stdout.trim().split(',').map((s) => s.trim());
    if (parts.length >= 3) {
      gpuInfo = {
        detected: true,
        name: parts[0],
        vramTotal: `${parts[1]} MiB`,
        vramUsed: `${parts[2]} MiB`,
        utilization: parts[3] ? `${parts[3]}%` : '0%',
      };
    }
  } catch (e) {}

  return {
    ollamaOnline: models.length > 0,
    fastModel: DEFAULT_FAST_MODEL,
    draftModel: DEFAULT_DRAFT_MODEL,
    verifierModel: DEFAULT_VERIFIER_MODEL,
    primaryModel: DEFAULT_FAST_MODEL,
    gpuInfo,
    availableModels: available,
    architecture: 'Cascaded Latency-Optimized Routing (Fast Single-Pass / GEC / Factual Chain)',
  };
}

/**
 * Execute a chat completion call to Ollama
 */
async function chatCompletion({ model, messages, temperature = 0.7, numPredict = 512, timeoutMs = 45000 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature,
          num_predict: numPredict,
        },
        keep_alive: '10m',
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ollama API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return {
      content: data.message?.content || '',
      thinking: data.message?.thinking || '',
      evalCount: data.eval_count || 0,
      evalDuration: data.eval_duration || 0,
      totalDuration: data.total_duration || 0,
      model: data.model || model,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Execute a streaming chat completion call to Ollama
 */
async function streamChatCompletion({ model, messages, temperature = 0.7, numPredict = 512, timeoutMs = 60000, onToken }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature,
          num_predict: numPredict,
        },
        keep_alive: '10m',
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ollama streaming API error (${res.status}): ${errorText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let thinking = '';
    let buffer = '';
    let evalCount = 0;
    let evalDuration = 0;
    let totalDuration = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const chunk = parsed.message?.content || '';
          if (chunk) {
            fullContent += chunk;
            if (typeof onToken === 'function') {
              onToken(chunk);
            }
          }
          if (parsed.message?.thinking) {
            thinking += parsed.message.thinking;
          }
          if (parsed.done) {
            evalCount = parsed.eval_count || 0;
            evalDuration = parsed.eval_duration || 0;
            totalDuration = parsed.total_duration || 0;
          }
        } catch (e) {}
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        const chunk = parsed.message?.content || '';
        if (chunk) {
          fullContent += chunk;
          if (typeof onToken === 'function') onToken(chunk);
        }
      } catch (e) {}
    }

    return {
      content: fullContent,
      thinking,
      evalCount,
      evalDuration,
      totalDuration,
      model,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

module.exports = {
  OLLAMA_BASE,
  DEFAULT_PRIMARY: DEFAULT_FAST_MODEL,
  DEFAULT_FAST_MODEL,
  DEFAULT_DRAFT_MODEL,
  DEFAULT_VERIFIER_MODEL,
  DEFAULT_VERIFIER: DEFAULT_VERIFIER_MODEL,
  listInstalledModels,
  getModelConfig,
  chatCompletion,
  streamChatCompletion,
};

