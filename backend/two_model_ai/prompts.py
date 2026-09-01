"""
prompts.py — Standard Prompt Templates from PDF Guide (Sections 12, 13, 14)
"""

def get_draft_messages(question: str, context: str = ""):
    system_prompt = (
        "You are the primary AI assistant.\n"
        "Answer the user's question clearly and accurately.\n"
        "Use the supplied reference information when present.\n"
        "For current information, rely on the supplied sources rather than inventing facts.\n"
        "Write natural, grammatically correct English.\n"
        "Do not mention internal model processing."
    )
    user_prompt = (
        f"USER QUESTION:\n{question}\n\n"
        f"REFERENCE DATA:\n{context.strip() if context else 'None provided.'}"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

def get_verification_messages(question: str, draft: str, context: str = ""):
    system_prompt = (
        "You are a strict answer verifier.\n\n"
        "Check:\n"
        "1. Relevance\n"
        "2. Factual accuracy\n"
        "3. Correct use of current information\n"
        "4. Unsupported claims\n"
        "5. Contradictions\n"
        "6. English clarity\n"
        "7. Missing important information\n\n"
        "Return:\n"
        "VERDICT: CORRECT or INCORRECT\n\n"
        "If INCORRECT, list the errors and provide corrected facts.\n"
        "If CORRECT, briefly explain why the draft is acceptable."
    )
    user_prompt = (
        f"USER QUESTION:\n{question}\n\n"
        f"QWEN DRAFT:\n{draft}\n\n"
        f"REFERENCE INFORMATION:\n{context.strip() if context else 'None provided.'}"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

def get_correction_messages(question: str, draft: str, feedback: str, context: str = ""):
    system_prompt = (
        "Rewrite the answer using the verifier's corrections.\n\n"
        "Rules:\n"
        "- Preserve correct information.\n"
        "- Fix every identified factual error.\n"
        "- Do not add unsupported facts.\n"
        "- Answer the user's actual question directly.\n"
        "- Use clear, natural English.\n"
        "- Do not mention the verifier or internal processing."
    )
    user_prompt = (
        f"USER QUESTION:\n{question}\n\n"
        f"ORIGINAL DRAFT:\n{draft}\n\n"
        f"VERIFIER FEEDBACK:\n{feedback}\n\n"
        f"REFERENCE INFORMATION:\n{context.strip() if context else 'None provided.'}"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
