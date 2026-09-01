/**
 * ollamaClient.js — High-Performance Ollama Integration for Two-Model Architecture
 * ---------------------------------------------------------------------------
 * Optimized for RTX 3050 Laptop GPU (6GB VRAM) and sequential model execution.
 * ---------------------------------------------------------------------------
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

// Model configuration with smart RTX 3050 defaults
let DEFAULT_PRIMARY = process.env.PRIMARY_MODEL || process.env.LOCAL_LLM_MODEL || 'qwen2.5:3b';
let DEFAULT_VERIFIER = process.env.VERIFIER_MODEL || 'deepseek-r1:1.5b';

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

      // Auto-match best available Qwen & DeepSeek models if specific tags exist
      const names = cachedModels.map((m) => m.name.toLowerCase());

      if (!process.env.PRIMARY_MODEL) {
        if (names.some((n) => n.includes('qwen3:8b') || n.includes('qwen3'))) {
          DEFAULT_PRIMARY = cachedModels.find((m) => m.name.toLowerCase().includes('qwen3')).name;
        } else if (names.some((n) => n.includes('qwen2.5:7b') || n.includes('qwen2.5:3b') || n.includes('qwen'))) {
          DEFAULT_PRIMARY = cachedModels.find((m) => m.name.toLowerCase().includes('qwen')).name;
        }
      }

      if (!process.env.VERIFIER_MODEL) {
        if (names.some((n) => n.includes('deepseek-r1:8b') || n.includes('deepseek-r1:7b') || n.includes('deepseek-r1:1.5b') || n.includes('deepseek'))) {
          DEFAULT_VERIFIER = cachedModels.find((m) => m.name.toLowerCase().includes('deepseek')).name;
        }
      }

      return cachedModels;
    }
  } catch (err) {
    // Ollama not reachable
  }

  return cachedModels || [];
}

/**
 * Get active configuration for the 2-model system
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
  let gpuInfo = { detected: false, name: 'RTX 3050 Laptop GPU (6GB VRAM Target)', vramTotal: '6144 MiB', vramUsed: 'N/A' };
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
    primaryModel: DEFAULT_PRIMARY,
    verifierModel: DEFAULT_VERIFIER,
    gpuInfo,
    availableModels: available,
    architecture: 'Sequential Qwen (Primary Generator) + DeepSeek-R1 (Verifier)',
    hardwareTarget: 'NVIDIA RTX 3050 (6GB VRAM) Sequential Execution',
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
        // Keep in memory for 5m to avoid constant disk reloads while conserving VRAM
        keep_alive: '5m',
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

module.exports = {
  OLLAMA_BASE,
  DEFAULT_PRIMARY,
  DEFAULT_VERIFIER,
  listInstalledModels,
  getModelConfig,
  chatCompletion,
};
