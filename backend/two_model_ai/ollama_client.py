"""
ollama_client.py — Local Ollama Client Optimized for RTX 3050 6GB Sequential Execution
"""
import os
import httpx
from typing import List, Dict, Any, Optional

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
PRIMARY_MODEL = os.getenv("PRIMARY_MODEL", "qwen2.5:3b")
VERIFIER_MODEL = os.getenv("VERIFIER_MODEL", "deepseek-r1:1.5b")

async def get_available_models() -> List[str]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{OLLAMA_BASE}/api/tags")
            if res.status_code == 200:
                data = res.json()
                return [m["name"] for m in data.get("models", [])]
    except Exception:
        pass
    return []

async def chat(
    model: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    num_predict: int = 512,
    timeout: float = 60.0
) -> Dict[str, Any]:
    """
    Executes a chat completion call to local Ollama.
    Uses keep_alive="5m" to prevent GPU memory thrashing on RTX 3050 (6GB VRAM).
    """
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": num_predict
        },
        "keep_alive": "5m"
    }
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        res = await client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        res.raise_for_status()
        data = res.json()
        
        msg = data.get("message", {})
        return {
            "content": msg.get("content", ""),
            "thinking": msg.get("thinking", ""),
            "model": data.get("model", model),
            "eval_count": data.get("eval_count", 0),
            "eval_duration": data.get("eval_duration", 0),
            "total_duration": data.get("total_duration", 0)
        }
