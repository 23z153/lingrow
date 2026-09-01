"""
router.py — Intent Router & Classifier (Guide Section 15)
"""
import re
from typing import Dict, Any

WEB_SEARCH_TRIGGERS = [
    'latest', 'today', 'current', 'recent', 'this week', 'this month', 'this year',
    'price', 'pricing', 'release', 'released', 'version', 'news', 'update', 'updates',
    'trending', 'trend', 'breakthrough', 'who is', 'what happened', 'announcement',
    '2024', '2025', '2026'
]

RAG_TRIGGERS = [
    'pdf', 'document', 'notes', 'my notes', 'syllabus', 'lecture', 'uploaded',
    'file', 'handout', 'assignment', 'textbook', 'chapter', 'course material'
]

class IntentResult:
    def __init__(self, needs_web: bool, needs_rag: bool, search_query: str, intent_type: str):
        self.needs_web = needs_web
        self.needs_rag = needs_rag
        self.search_query = search_query
        self.intent_type = intent_type

def classify_intent(question: str) -> IntentResult:
    if not question:
        return IntentResult(needs_web=False, needs_rag=False, search_query="", intent_type="general")
    
    q_lower = question.lower()
    
    needs_web = any(re.search(r'\b' + re.escape(trig) + r'\b', q_lower) for trig in WEB_SEARCH_TRIGGERS)
    needs_rag = any(re.search(r'\b' + re.escape(trig) + r'\b', q_lower) for trig in RAG_TRIGGERS)
    
    search_query = re.sub(
        r'\b(can you tell me|what is the|explain to me|please explain|tell me about|how to)\b',
        '',
        question,
        flags=re.IGNORECASE
    )
    search_query = re.sub(r'[?!.,;]', ' ', search_query).strip()
    if not search_query:
        search_query = question
        
    intent_type = "general"
    if needs_web and needs_rag:
        intent_type = "hybrid"
    elif needs_web:
        intent_type = "current_web"
    elif needs_rag:
        intent_type = "document_rag"
        
    return IntentResult(
        needs_web=needs_web,
        needs_rag=needs_rag,
        search_query=search_query,
        intent_type=intent_type
    )
