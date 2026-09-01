"""
rag.py — Local Document RAG Ingestion & Retrieval (Guide Section 17)
"""
import os
import glob
from typing import List, Dict, Any

DOCUMENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "documents")

def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end].strip())
        start += max(1, chunk_size - overlap)
    return [c for c in chunks if c]

async def retrieve_documents(query: str, max_chunks: int = 3) -> str:
    """
    Scans local files in data/documents/ and retrieves most relevant text chunks.
    """
    if not os.path.exists(DOCUMENTS_DIR):
        os.makedirs(DOCUMENTS_DIR, exist_ok=True)
        return ""

    files = glob.glob(os.path.join(DOCUMENTS_DIR, "*.*"))
    scored_chunks = []
    q_tokens = [w.lower() for w in query.split() if len(w) > 2]

    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                chunks = chunk_text(content)
                fname = os.path.basename(fpath)
                for idx, ch in enumerate(chunks):
                    ch_lower = ch.lower()
                    score = sum(1 for tok in q_tokens if tok in ch_lower)
                    if score > 0:
                        scored_chunks.append({
                            "score": score,
                            "filename": fname,
                            "index": idx,
                            "text": ch
                        })
        except Exception:
            pass

    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    top = scored_chunks[:max_chunks]
    
    if not top:
        return ""

    return "\n\n".join([
        f"[Local Document: {c['filename']} (Chunk {c['index']+1})]\n{c['text']}"
        for c in top
    ])
