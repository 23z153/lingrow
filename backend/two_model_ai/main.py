"""
main.py — Two-Model Local AI Chatbot Server & Runner (Guide Sections 19 & 20)
Target: NVIDIA RTX 3050 Laptop GPU (6GB VRAM) Sequential Execution
"""
import os
import time
import asyncio
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

try:
    from fastapi import FastAPI, UploadFile, File, Form
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

from .router import classify_intent
from .web_search import web_search
from .rag import retrieve_documents
from .qwen import qwen_generate, qwen_correct
from .verifier import deepseek_verify
from .ollama_client import get_available_models, PRIMARY_MODEL, VERIFIER_MODEL

# ----------------- Core Flow (Section 19) -----------------

async def answer_question(question: str) -> Dict[str, Any]:
    start_time = time.time()
    intent = classify_intent(question)
    context = ""
    sources = []

    # Step 1: Context retrieval
    if intent.needs_web:
        search_res = await web_search(intent.search_query or question)
        if search_res.get("formatted_context"):
            context += "\n\n" + search_res["formatted_context"]
            sources.extend(search_res.get("sources", []))

    if intent.needs_rag:
        doc_context = await retrieve_documents(intent.search_query or question)
        if doc_context:
            context += "\n\n" + doc_context

    # Step 2: Primary Generator Draft (Qwen)
    draft = await qwen_generate(question, context)

    # Step 3: Verifier Verification (DeepSeek-R1)
    verdict = await deepseek_verify(
        question=question,
        draft=draft,
        context=context
    )

    final_answer = draft
    was_corrected = False

    # Step 4: Qwen Correction if INCORRECT
    if not verdict.is_correct:
        corrected = await qwen_correct(
            question=question,
            draft=draft,
            feedback=verdict.feedback,
            context=context
        )
        if corrected and len(corrected) > 10:
            final_answer = corrected
            was_corrected = True

    duration = time.time() - start_time

    return {
        "final_answer": final_answer,
        "draft": draft,
        "verification": {
            "verdict": verdict.verdict,
            "is_correct": verdict.is_correct,
            "feedback": verdict.feedback,
            "reasoning": verdict.reasoning,
            "was_corrected": was_corrected
        },
        "sources": sources,
        "intent": {
            "needs_web": intent.needs_web,
            "needs_rag": intent.needs_rag,
            "type": intent.intent_type
        },
        "duration_seconds": round(duration, 3)
    }

# ----------------- FastAPI App (Section 20) -----------------

if HAS_FASTAPI:
    app = FastAPI(
        title="Two-Model Local AI Chatbot",
        description="Sequential Qwen + DeepSeek-R1 Architecture for RTX 3050 6GB"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class ChatRequest(BaseModel):
        question: str

    class SearchRequest(BaseModel):
        query: str

    @app.post("/chat")
    async def chat_endpoint(req: ChatRequest):
        return await answer_question(req.question)

    @app.post("/search")
    async def search_endpoint(req: SearchRequest):
        return await web_search(req.query)

    @app.get("/health")
    async def health_endpoint():
        models = await get_available_models()
        return {
            "status": "healthy",
            "hardware": "RTX 3050 Laptop GPU (6GB VRAM)",
            "ollama_models": models,
            "primary_model": os.getenv("PRIMARY_MODEL", PRIMARY_MODEL),
            "verifier_model": os.getenv("VERIFIER_MODEL", VERIFIER_MODEL)
        }

    @app.get("/models")
    async def models_endpoint():
        return {
            "available": await get_available_models(),
            "active_primary": os.getenv("PRIMARY_MODEL", PRIMARY_MODEL),
            "active_verifier": os.getenv("VERIFIER_MODEL", VERIFIER_MODEL)
        }

# ----------------- CLI Interactive Mode -----------------

async def interactive_cli():
    print("=" * 60)
    print(" Two-Model Local AI Chatbot (RTX 3050 6GB Sequential Edition)")
    print(f" Primary Generator: {os.getenv('PRIMARY_MODEL', PRIMARY_MODEL)}")
    print(f" Verifier:          {os.getenv('VERIFIER_MODEL', VERIFIER_MODEL)}")
    print("=" * 60)
    print("Type your questions below. Type 'exit' to quit.\n")

    while True:
        try:
            q = input("\nUser > ").strip()
            if not q:
                continue
            if q.lower() in ("exit", "quit", "q"):
                break

            print("\nProcessing (Qwen Draft -> DeepSeek-R1 Verify)...")
            res = await answer_question(q)

            verdict = res["verification"]["verdict"]
            status_symbol = "✓" if verdict == "CORRECT" else "!"
            print(f"\n[Verifier: {status_symbol} {verdict}] (Time: {res['duration_seconds']}s)")
            
            if res["verification"]["was_corrected"]:
                print("[Draft corrected using DeepSeek-R1 feedback]")
                
            print(f"\nAI > {res['final_answer']}")

            if res.get("sources"):
                print("\nSources:")
                for s in res["sources"]:
                    print(f" - {s['title']} ({s['url']})")

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "serve" and HAS_FASTAPI:
        uvicorn.run(app, host="127.0.0.1", port=8000)
    else:
        asyncio.run(interactive_cli())
