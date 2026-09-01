# Two-Model Local AI Chatbot (RTX 3050 6GB Sequential Edition)

Implemented based on `local_ai_two_model_chatbot_guide.pdf` with optimizations specifically adapted for **NVIDIA RTX 3050 Laptop GPU (6GB VRAM)**.

## Architecture

```
USER QUESTION
     │
     ▼
INTENT ROUTER (current info? local documents / RAG?)
     │
     ├────────────────────────┬────────────────────────┐
     ▼                        ▼                        ▼
CURRENT: WEB SEARCH      LOCAL DOCS: RAG          GENERAL / TUTOR
(Wikipedia, HN, DEV.to)  (Document chunks)        (Direct context)
     │                        │                        │
     └────────────────────────┼────────────────────────┘
                              │
                              ▼ (context)
                         QWEN (Primary Generator)
                              │
                         DRAFT ANSWER
                              │
                              ▼
                    DEEPSEEK-R1 (Strict Verifier)
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
              CORRECT                  INCORRECT
                 │                         │
                 │                    QWEN CORRECTION
                 │                    (Rewrite using feedback)
                 │                         │
                 └────────────┬────────────┘
                              │
                              ▼
                  FINAL ANSWER + CITATIONS + VERIFICATION BADGE
```

## RTX 3050 6GB VRAM Optimization:
- **Default Models**: `qwen2.5:3b` (~1.9 GB) + `deepseek-r1:1.5b` (~1.1 GB). Combined peak footprint is under 3.2 GB VRAM, allowing lightning fast responses without GPU thermal throttling.
- **7B/8B Scaling**: If upgraded to `qwen2.5:7b` (~4.7 GB) or `deepseek-r1:8b` (~4.9 GB), **Sequential Model Execution** automatically unloads/loads models in Ollama with `keep_alive` caching to prevent out-of-memory errors on 6GB VRAM.

## How to Run:
```bash
# 1. Start Ollama and verify models
ollama list

# 2. Run CLI test
python -m two_model_ai.main

# 3. Or launch FastAPI server
python -m two_model_ai.main serve
```
