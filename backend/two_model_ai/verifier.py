"""
verifier.py — DeepSeek-R1 Strict Verifier Model (Guide Section 13)
"""
import os
from typing import NamedTuple
from .ollama_client import chat, VERIFIER_MODEL
from .prompts import get_verification_messages

class VerdictResult(NamedTuple):
    is_correct: bool
    verdict: str
    feedback: str
    reasoning: str

async def deepseek_verify(question: str, draft: str, context: str = "") -> VerdictResult:
    """
    Executes strict DeepSeek-R1 verification on the Qwen draft.
    Checks:
     1. Relevance
     2. Factual accuracy
     3. Correct use of current info
     4. Unsupported claims
     5. Contradictions
     6. English clarity
     7. Missing important information
    """
    model = os.getenv("VERIFIER_MODEL", VERIFIER_MODEL)
    messages = get_verification_messages(question, draft, context)
    
    # 1024 token budget allows full reasoning tokens + final verdict
    res = await chat(model=model, messages=messages, temperature=0.1, num_predict=1024)
    
    content = res.get("content", "").strip()
    thinking = res.get("thinking", "").strip()
    combined = f"{content}\n{thinking}".upper()

    is_correct = True
    verdict_str = "CORRECT"

    if "VERDICT: INCORRECT" in content.upper() or "VERDICT:INCORRECT" in content.upper() or ("INCORRECT" in content.upper() and "VERDICT: CORRECT" not in content.upper()):
        is_correct = False
        verdict_str = "INCORRECT"
    elif "VERDICT: CORRECT" in content.upper() or "VERDICT:CORRECT" in content.upper():
        is_correct = True
        verdict_str = "CORRECT"
    elif "VERDICT: INCORRECT" in combined:
        is_correct = False
        verdict_str = "INCORRECT"

    feedback = content if content else (thinking[:300] + "...")

    return VerdictResult(
        is_correct=is_correct,
        verdict=verdict_str,
        feedback=feedback,
        reasoning=thinking
    )
