"""
intent_sentiment_agent.py

Intent & Sentiment Analysis Agent (Groq)
"""

from __future__ import annotations

import json
from typing import Any

from app.core.config import settings
from app.utils.llm_client import JSONParseError, groq_client

# Strict JSON-only system prompt to enforce structured output without markdown formatting
SYSTEM_PROMPT = """You are an expert customer support AI analyst. 
Your ONLY job is to analyze the user's message and output a raw JSON object.

You must evaluate the customer's text and determine:
1. intent: The core reason for their message (e.g., "billing_issue", "technical_problem", "refund_request", "account_access", "general_question", "complaint", "cancellation_request", "feature_request", "payment_dispute", "other")
2. emotion: Their primary emotional state (e.g., "calm", "frustrated", "angry", "confused", "satisfied", "anxious", "disappointed", "neutral", "urgent")
3. frustration_score: A number 0-100 indicating how frustrated the customer seems:
   - 0-20: Very calm, satisfied, or neutral
   - 21-40: Mildly concerned or impatient
   - 41-60: Frustrated or annoyed
   - 61-80: Very frustrated or angry
   - 81-100: Extremely angry or escalated
4. satisfaction_trend: Compared to the previous message, is the customer's satisfaction:
   - "improving" — getting more satisfied/calm
   - "declining" — getting more frustrated/angry
   - "stable" — same as before
   - "baseline" — this is the first message

CRITICAL INSTRUCTION: You must output ONLY a valid JSON object. Do not include markdown formatting, code blocks (like ```json), conversational text, or explanations. 

Output exactly this JSON format and nothing else:
{
  "intent": "string",
  "emotion": "string",
  "frustration_score": 0,
  "satisfaction_trend": "string"
}"""


def run_intent_sentiment_agent(
    *,
    session_id: str,
    customer_message: str,
    turn_index: int,
    conversation_context: list[dict[str, Any]] | None = None,
    **_: Any,
) -> dict:
    """Run intent + sentiment analysis."""
    
    # Build the user prompt with context
    context_str = ""
    if conversation_context:
        context_lines = []
        for msg in conversation_context[-3:]:  # Last 3 turns
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            context_lines.append(f"[{role.upper()}]: {content}")
        context_str = "\n".join(context_lines)

    user_prompt = f"""Previous conversation context (last few turns):
{context_str or "(no prior context — this is the first message)"}

Latest customer message to analyze:
"{customer_message}"

Analyze this customer message and return STRICT JSON ONLY."""

    try:
        if groq_client.api_key:
            # Use the configured intent model from settings
            model = settings.GROQ_INTENT_MODEL
            
            result = groq_client.generate_json(
                model=model,
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.1,  # Low temperature for consistent classification
                max_tokens=1024,  # Increased to prevent token cutoff errors
            )

            if isinstance(result, dict) and "error" in result:
                print(f"[intent_sentiment_agent] API returned error: {result.get('error')}. Falling back to heuristic analysis.")
                return _heuristic_analysis(
                    customer_message=customer_message,
                    turn_index=turn_index,
                )

            # Validate and normalize the result
            intent = str(result.get("intent", "general_question"))
            emotion = str(result.get("emotion", "neutral"))
            frustration_score = int(result.get("frustration_score", 30))
            satisfaction_trend = str(result.get("satisfaction_trend", "baseline"))

            # Clamp frustration score
            frustration_score = max(0, min(100, frustration_score))

            # Validate satisfaction trend
            valid_trends = ["improving", "declining", "stable", "baseline"]
            if satisfaction_trend not in valid_trends:
                satisfaction_trend = "baseline" if turn_index == 0 else "stable"

            return {
                "agent": "intent_sentiment",
                "turn_index": turn_index,
                "intent": intent,
                "emotion": emotion,
                "frustration_score": frustration_score,
                "satisfaction_trend": satisfaction_trend,
            }
        else:
            print("[intent_sentiment_agent] WARNING: GROQ_API_KEY not set. Using heuristic analysis.")
            return _heuristic_analysis(
                customer_message=customer_message,
                turn_index=turn_index,
            )

    except JSONParseError as e:
        print(f"[intent_sentiment_agent] JSON parse error after retries: {e}. Falling back to heuristics.")
        return _heuristic_analysis(customer_message, turn_index)
    except Exception as e:
        print(f"[intent_sentiment_agent] Unexpected error: {e}. Falling back to heuristics.")
        return _heuristic_analysis(customer_message, turn_index)


def _heuristic_analysis(
    customer_message: str,
    turn_index: int,
) -> dict:
    """Fallback heuristic analysis when API is unavailable."""
    msg_lower = customer_message.lower()
    
    intent = "general_question"
    if any(word in msg_lower for word in ["bill", "charge", "fee", "payment", "overcharge", "late fee", "cost", "plan", "subscrib"]):
        intent = "billing_issue"
    elif any(word in msg_lower for word in ["refund", "money back", "return", "cancel", "reimburs"]):
        intent = "refund_request"
    elif any(word in msg_lower for word in ["error", "bug", "not working", "broken", "crash", "technical", "issue", "fail", "taps", "app"]):
        intent = "technical_problem"
    elif any(word in msg_lower for word in ["login", "password", "access", "account", "forgot"]):
        intent = "account_access"
    elif any(word in msg_lower for word in ["complain", "unacceptable", "terrible", "worst", "awful"]):
        intent = "complaint"

    emotion = "neutral"
    frustration_score = 30

    if any(word in msg_lower for word in ["unclear", "confus", "don't understand", "explain"]):
        emotion = "confused"
        frustration_score = 35
    elif any(w in msg_lower for w in ["angry", "furious", "terrible", "worst", "unacceptable", "horrible", "ridiculous", "ignored", "unbelievable", "livid", "outraged", "fool", "idiot"]):
        emotion = "angry"
        frustration_score = 85
    elif any(word in msg_lower for word in ["frustrat", "annoy", "tired", "waiting", "sick of", "fed up"]):
        emotion = "frustrated"
        frustration_score = 65
    elif any(word in msg_lower for word in ["thank", "great", "helpful", "appreciate", "perfect", "excellent", "satisfied"]):
        emotion = "satisfied"
        frustration_score = 10

    # Trend detection
    if turn_index == 0:
        satisfaction_trend = "baseline"
    elif frustration_score > 60:
        satisfaction_trend = "declining"
    elif frustration_score < 30:
        satisfaction_trend = "improving"
    else:
        satisfaction_trend = "stable"

    return {
        "agent": "intent_sentiment",
        "turn_index": turn_index,
        "intent": intent,
        "emotion": emotion,
        "frustration_score": frustration_score,
        "satisfaction_trend": satisfaction_trend,
    }