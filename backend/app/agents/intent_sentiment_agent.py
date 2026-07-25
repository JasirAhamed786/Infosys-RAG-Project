"""
intent_sentiment_agent.py

Intent & Sentiment Analysis Agent (Groq — Llama 3.1 8B)

Replaces the Milestone 1 stub with a real implementation:

Input:
  - Latest customer message
  - Brief conversation context (last 2-3 turns)

Behavior:
  - Classifies customer intent into a clear category
    (e.g. billing issue, technical problem, refund request, etc.)
  - Detects emotional state (e.g. calm, frustrated, angry, confused)
  - Outputs frustration_score (0-100)
  - Outputs satisfaction_trend (improving / declining / stable / baseline)
  - MUST return structured JSON only, with retry on malformed JSON

Output:
  { intent: string, emotion: string, frustration_score: number,
    satisfaction_trend: string }

This agent runs FIRST every turn, before any other agent.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.config import settings
from app.utils.llm_client import JSONParseError, groq_client

# Strict JSON-only system prompt to enforce structured output
SYSTEM_PROMPT = """You are an Intent & Sentiment Analysis agent for a customer support coaching system.

Your task: Analyze the customer's message and output STRICT JSON ONLY — no other text.

Analyze:
1. INTENT: What does the customer want? Choose a clear, specific label (e.g. "billing_issue", "technical_problem", "refund_request", "account_access", "general_question", "complaint", "cancellation_request", "feature_request", "payment_dispute", "other")
2. EMOTION: What is the customer's emotional state? (e.g. "calm", "frustrated", "angry", "confused", "satisfied", "anxious", "disappointed", "neutral", "urgent")
3. FRUSTRATION_SCORE: A number 0-100 indicating how frustrated the customer seems:
   - 0-20: Very calm, satisfied, or neutral
   - 21-40: Mildly concerned or impatient
   - 41-60: Frustrated or annoyed
   - 61-80: Very frustrated or angry
   - 81-100: Extremely angry or escalated
4. SATISFACTION_TREND: Compared to the previous message, is the customer's satisfaction:
   - "improving" — getting more satisfied/calm
   - "declining" — getting more frustrated/angry
   - "stable" — same as before
   - "baseline" — this is the first message

Output format (EXACTLY this JSON, no other text):
{
  "intent": "string",
  "emotion": "string",
  "frustration_score": number,
  "satisfaction_trend": "improving|declining|stable|baseline"
}"""


def run_intent_sentiment_agent(
    *,
    session_id: str,
    customer_message: str,
    turn_index: int,
    conversation_context: list[dict[str, Any]] | None = None,
    **_: Any,
) -> dict:
    """Run intent + sentiment analysis.

    Analyzes the customer message and returns structured JSON with
    intent, emotion, frustration score, and satisfaction trend.

    Args:
        session_id: The current session ID (used for DB lookup if needed).
        customer_message: The latest customer message to analyze.
        turn_index: Current turn index.
        conversation_context: Previous 2-3 turns for context (optional).

    Returns:
        dict with keys: agent, turn_index, intent, emotion,
        frustration_score, satisfaction_trend
    """
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

    # Default result in case everything fails
    default_result = {
        "agent": "intent_sentiment",
        "turn_index": turn_index,
        "intent": "general_question",
        "emotion": "neutral",
        "frustration_score": 30,
        "satisfaction_trend": "baseline" if turn_index == 0 else "stable",
        "error": "analysis_failed",
    }

    try:
        if groq_client.api_key:
            result = groq_client.generate_json(
                model=settings.GROQ_INTENT_MODEL,
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.3,  # Low temperature for consistent classification
                max_tokens=256,
            )

            if isinstance(result, dict) and "error" in result:
                print(f"[intent_sentiment_agent] API returned error: {result.get('error')}")
                return {**default_result, "error": result.get("error")}

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
            # No API key — use heuristic analysis
            print("[intent_sentiment_agent] WARNING: GROQ_API_KEY not set. Using heuristic analysis.")
            return _heuristic_analysis(
                customer_message=customer_message,
                turn_index=turn_index,
            )

    except JSONParseError as e:
        print(f"[intent_sentiment_agent] JSON parse error after retries: {e}")
        return default_result
    except Exception as e:
        print(f"[intent_sentiment_agent] Unexpected error: {e}")
        return default_result


def _heuristic_analysis(
    customer_message: str,
    turn_index: int,
) -> dict:
    """Fallback heuristic analysis when API is unavailable.

    Uses keyword matching to estimate intent and emotion.
    """
    msg_lower = customer_message.lower()
    result = {
        "agent": "intent_sentiment",
        "turn_index": turn_index,
        "intent": "general_question",
        "emotion": "neutral",
        "frustration_score": 30,
        "satisfaction_trend": "baseline" if turn_index == 0 else "stable",
    }

    # Intent detection
    if any(word in msg_lower for word in ["bill", "charge", "fee", "payment", "overcharge", "late fee"]):
        result["intent"] = "billing_issue"
    elif any(word in msg_lower for word in ["refund", "money back", "return", "cancel", "reimburs"]):
        result["intent"] = "refund_request"
    elif any(word in msg_lower for word in ["error", "bug", "not working", "broken", "crash", "technical"]):
        result["intent"] = "technical_problem"
    elif any(word in msg_lower for word in ["login", "password", "access", "account", "forgot"]):
        result["intent"] = "account_access"
    elif any(word in msg_lower for word in ["complain", "unacceptable", "terrible", "worst", "awful"]):
        result["intent"] = "complaint"

    # Emotion detection
    angry_words = ["angry", "furious", "outraged", "livid", "unacceptable", "terrible"]
    frustrated_words = ["frustrat", "annoy", "tire", "sick of", "fed up", "ridiculous"]
    anxious_words = ["worried", "concerned", "anxious", "nervous", "stress", "urgent"]
    confused_words = ["confus", "don't understand", "unclear", "what does", "how is"]
    satisfied_words = ["thank", "appreciate", "great", "perfect", "excellent", "satisfied"]

    if any(word in msg_lower for word in angry_words):
        result["emotion"] = "angry"
        result["frustration_score"] = 75
    elif any(word in msg_lower for word in frustrated_words):
        result["emotion"] = "frustrated"
        result["frustration_score"] = 55
    elif any(word in msg_lower for word in anxious_words):
        result["emotion"] = "anxious"
        result["frustration_score"] = 45
    elif any(word in msg_lower for word in confused_words):
        result["emotion"] = "confused"
        result["frustration_score"] = 35
    elif any(word in msg_lower for word in satisfied_words):
        result["emotion"] = "satisfied"
        result["frustration_score"] = 10

    # Trend detection
    if turn_index == 0:
        result["satisfaction_trend"] = "baseline"
    elif result["frustration_score"] > 60:
        result["satisfaction_trend"] = "declining"
    elif result["frustration_score"] < 20:
        result["satisfaction_trend"] = "improving"
    else:
        result["satisfaction_trend"] = "stable"

    return result

