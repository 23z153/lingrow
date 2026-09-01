"""
qwen.py — Primary Answer Generator & Correction Model (Guide Sections 12 & 14)
"""
import os
from .ollama_client import chat, PRIMARY_MODEL
from .prompts import get_draft_messages, get_correction_messages

async def qwen_generate(question: str, context: str = "") -> str:
    """
    Generates initial draft answer using Qwen (Section 12).
    """
    model = os.getenv("PRIMARY_MODEL", PRIMARY_MODEL)
    messages = get_draft_messages(question, context)
    res = await chat(model=model, messages=messages, temperature=0.7, num_predict=512)
    return res.get("content", "").strip()

async def qwen_correct(question: str, draft: str, feedback: str, context: str = "") -> str:
    """
    Rewrites answer using verifier feedback (Section 14).
    """
    model = os.getenv("PRIMARY_MODEL", PRIMARY_MODEL)
    messages = get_correction_messages(question, draft, feedback, context)
    res = await chat(model=model, messages=messages, temperature=0.3, num_predict=512)
    return res.get("content", "").strip()
