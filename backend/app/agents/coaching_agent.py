"""coaching_agent.py

Coaching & Response Suggestion Agent (Groq — Llama 3.3 70B)

Replaces the Milestone 3 stub with a real LLM implementation.

Input (per turn):
  - Detected customer intent (from Intent & Sentiment Agent)
  - Detected sentiment/emotion + frustration score
  - Recommended knowledge base results (from Knowledge Agent)
  - The raw customer message being analyzed

Behavior:
  - Uses Groq (Llama 3.3 70B) to generate:
      - suggested_response: a draft reply for the human agent
      - tone_feedback: brief note on the tone of the proposed reply
      - communication_tips: 1-3 concise coaching tips
      - confidence: a 0-1 confidence in this suggestion
  - Falls back to a safe result ONLY on a real API error (never on the
    happy path) — mirrors the _safe_run_agent() pattern in pipeline.py.

Output label: "coaching"
"""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.utils.llm_client import groq_client

# Strict JSON-only system prompt to enforce the structured coaching output.
COACHING_SYSTEM_PROMPT = """You are a Coaching & Response Suggestion agent for an AI customer support coaching system.

Your job: Given the customer's message, their detected intent, their emotional state, and any recommended knowledge base information, produce a helpful coaching suggestion for a human support agent.

Output STRICT JSON ONLY — no other text.

Rules:
1. suggested_response: A complete, professional draft reply the agent can send. Be empathetic, concise, and actionable. Use the recommended knowledge if relevant.
2. tone_feedback: ONE short sentence on the tone your suggested response uses (e.g. warm, firm, empathetic) and why it fits.
3. communication_tips: An array of 1 to 3 short, specific coaching tips for the agent (what to say, what to ask, what to avoid).
4. confidence: A number 0.0 to 1.0 reflecting how confident you are in this suggestion.

Output format (EXACTLY this JSON, no other text):
{
  "suggested_response": "string",
  "tone_feedback": "string",
  "communication_tips": ["string", "string"],
  "confidence": number
}"""


def run_coaching_agent(
    *,
    session_id: str,
    intent: str,
    sentiment: str,
    frustration_score: int | None = None,
    recommended_kb: list[dict[str, Any]] | None = None,
    customer_message: str,
    turn_index: int,
    **_: Any,
) -> dict:
    """Generate a coaching suggestion using Groq (Llama 3.3 70B).

    Returns a dict with keys: agent, turn_index, suggested_response,
    tone_feedback, communication_tips, confidence.

    On a real API error, returns a safe fallback so the pipeline never crashes.
    """
    recommended_kb = recommended_kb or []

    # Build a compact representation of the recommended knowledge (if any).
    kb_lines = []
    for r in recommended_kb[:3]:
        snippet = r.get("chunk_text", "")[:300]
        src = r.get("source_document", "unknown")
        if snippet:
            kb_lines.append(f"- ({src}) {snippet}")
    kb_text = "\n".join(kb_lines) if kb_lines else "(no relevant knowledge found)"

    fr_score_text = (
        f"{frustration_score}/100" if frustration_score is not None else "unknown"
    )

    user_prompt = f"""Customer message:
"{customer_message}"

Detected intent: {intent}
Detected sentiment/emotion: {sentiment}
Frustration score: {fr_score_text}

Recommended knowledge for this customer:
{kb_text}

Generate a coaching suggestion. Output STRICT JSON ONLY."""

    result = {
        "agent": "coaching",
        "turn_index": turn_index,
        "intent": intent,
        "suggested_response": "",
        "tone_feedback": "",
        "communication_tips": [],
        # Alias used by the frontend (LiveConsole / CoachingFeed) — the pipeline
        # returns this as the array of coaching tips.
        "coaching_tips": [],
        "confidence": 0.0,
    }

    if not groq_client.api_key:
        print("[coaching_agent] WARNING: GROQ_API_KEY not set. Returning fallback.")
        return _fallback(result, customer_message, intent, sentiment)

    try:
        gres = groq_client.generate_json(
            model=settings.GROQ_COACHING_MODEL,
            system_prompt=COACHING_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.4,
            max_tokens=512,
        )

        if isinstance(gres, dict) and "error" in gres:
            print(f"[coaching_agent] API returned error: {gres.get('error')}. Using fallback.")
            return _fallback(result, customer_message, intent, sentiment)

        suggested_response = str(gres.get("suggested_response", "")).strip()
        if not suggested_response:
            print("[coaching_agent] Empty suggested_response from LLM. Using fallback.")
            return _fallback(result, customer_message, intent, sentiment)

        result["suggested_response"] = suggested_response
        result["tone_feedback"] = str(gres.get("tone_feedback", "")).strip()

        raw_tips = gres.get("communication_tips", [])
        if isinstance(raw_tips, list):
            result["communication_tips"] = [
                str(t).strip() for t in raw_tips[:3] if str(t).strip()
            ]
        elif isinstance(raw_tips, str) and raw_tips.strip():
            result["communication_tips"] = [raw_tips.strip()]

        # Keep the frontend alias in sync.
        result["coaching_tips"] = result["communication_tips"]

        try:
            raw_conf = float(gres.get("confidence", 0.0))
            result["confidence"] = max(0.0, min(1.0, raw_conf))
        except (TypeError, ValueError):
            result["confidence"] = 0.0

        return result

    except Exception as e:
        print(f"[coaching_agent] Unexpected error: {type(e).__name__}: {e}. Using fallback.")
        return _fallback(result, customer_message, intent, sentiment)


def _fallback(
    result: dict,
    customer_message: str,
    intent: str,
    sentiment: str,
) -> dict:
    """A safe, non-crashing result ONLY used on real API errors."""
    result["suggested_response"] = (
        f"I understand your concern regarding {intent}. Let me look into the details "
"and get you a clear answer as soon as possible."
    )
    result["tone_feedback"] = "Empathetic and reassuring, appropriate for a support response."
    result["communication_tips"] = [
        "Acknowledge the customer's concern and show empathy.",
        "Ask a clarifying question to better understand the issue.",
        "Provide clear next steps and set expectations.",
    ]
    result["coaching_tips"] = result["communication_tips"]
    result["confidence"] = 0.3
    result["note"] = f"fallback used (sentiment={sentiment}) — Groq unavailable or errored"
    return result

