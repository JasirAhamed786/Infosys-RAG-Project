"""escalation_agent.py

Escalation Risk Monitor Agent (Gemini)

Replaces the Milestone 3 stub with a real LLM implementation.

Behavior:
- Runs EVERY turn.
- Uses Gemini to assess whether the current customer interaction warrants
  escalation based on:
    - intent category
    - sentiment severity / frustration score
    - conversation stage/turn index
    - unresolved-issue indicators (e.g. repeated requests, high frustration)
- Outputs strict JSON:
    - escalation_risk: number 0-1
    - risk_level: "low" | "medium" | "high"
    - reasoning: array of short reasons
    - recommended_action: a short suggested action
    - alert_triggered: true when risk_level == "high"
- Falls back to a safe result ONLY on a real API error.

Output label: "escalation_risk"
"""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.utils.llm_client import gemini_client

# Strict JSON-only system prompt to enforce the structured escalation output.
ESCALATION_SYSTEM_PROMPT = """You are an Escalation Risk Monitor agent for an AI customer support coaching system.

Your job: Given the customer's message, detected intent, emotional state, frustration score, and turn index, determine whether this interaction should be escalated.

Output STRICT JSON ONLY — no other text.

Rules:
1. escalation_risk: A number 0.0 to 1.0. Higher means more likely escalation is warranted.
2. risk_level: "low", "medium", or "high". Use "high" when escalation_risk is approximately 0.75 or above.
3. reasoning: An array of 1 to 3 short, specific reasons supporting the risk level.
4. recommended_action: A short, actionable next step for the agent/supervisor.
5. alert_triggered: true if risk_level == "high", otherwise false.

Output format (EXACTLY this JSON, no other text):
{
  "escalation_risk": number,
  "risk_level": "low" | "medium" | "high",
  "reasoning": ["string"],
  "recommended_action": "string",
  "alert_triggered": boolean
}"""


def run_escalation_agent(
    *,
    session_id: str,
    intent: str,
    sentiment: str,
    frustration_score: int | None = None,
    turn_index: int,
    conversation_state: dict[str, Any] | None = None,
    customer_message: str = "",
    **_: Any,
) -> dict:
    """Assess escalation risk using Gemini.

    Returns a dict with keys: agent, turn_index, escalation_risk, risk_level,
    reasoning, recommended_action, alert_triggered.

    On a real API error, returns a safe fallback so the pipeline never crashes.
    """
    conversation_state = conversation_state or {}

    fr_score_text = (
        f"{frustration_score}/100" if frustration_score is not None else "unknown"
    )

    # Compact representation of any conversation-level signals.
    state_text = conversation_state.get("signal", "") or ""

    user_prompt = f"""Customer message:
"{customer_message or '(no customer message available)'}"

Detected intent: {intent}
Detected sentiment/emotion: {sentiment}
Frustration score: {fr_score_text}
Turn index: {turn_index}
Additional context: {state_text or "(none)"}

Assess escalation risk. Output STRICT JSON ONLY."""

    result = {
        "agent": "escalation_risk",
        "turn_index": turn_index,
        "escalation_risk": 0.0,
        "risk_level": "low",
        "reasoning": [],
        "recommended_action": "",
        "alert_triggered": False,
    }

    if not gemini_client.api_key:
        print("[escalation_agent] WARNING: GEMINI_API_KEY not set. Returning fallback.")
        return _fallback(result, intent, sentiment, frustration_score)

    try:
        gres = gemini_client.generate_json(
            model=settings.GEMINI_KNOWLEDGE_MODEL,
            system_prompt=ESCALATION_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=512,
        )

        if isinstance(gres, dict) and "error" in gres:
            print(f"[escalation_agent] API returned error: {gres.get('error')}. Using fallback.")
            return _fallback(result, intent, sentiment, frustration_score)

        try:
            risk = float(gres.get("escalation_risk", 0.0))
        except (TypeError, ValueError):
            risk = 0.0
        risk = max(0.0, min(1.0, risk))

        risk_level = str(gres.get("risk_level", "low")).lower()
        if risk_level not in ("low", "medium", "high", "low_risk", "medium_risk", "high_risk"):
            risk_level = "high" if risk >= 0.75 else ("medium" if risk >= 0.45 else "low")
        if risk_level.endswith("_risk"):
            risk_level = risk_level.split("_risk")[0]

        raw_reasons = gres.get("reasoning", [])
        if isinstance(raw_reasons, list):
            reasons = [str(r).strip() for r in raw_reasons[:3] if str(r).strip()]
        elif isinstance(raw_reasons, str) and raw_reasons.strip():
            reasons = [raw_reasons.strip()]
        else:
            reasons = []

        result["escalation_risk"] = risk
        result["risk_level"] = risk_level
        result["reasoning"] = reasons
        result["recommended_action"] = str(
            gres.get("recommended_action", "") or ""
        ).strip()
        result["alert_triggered"] = bool(gres.get("alert_triggered", risk_level == "high"))

        return result

    except Exception as e:
        print(f"[escalation_agent] Unexpected error: {type(e).__name__}: {e}. Using fallback.")
        return _fallback(result, intent, sentiment, frustration_score)


def _fallback(
    result: dict,
    intent: str,
    sentiment: str,
    frustration_score: int | None,
) -> dict:
    """A safe, non-crashing result ONLY used on real API errors."""
    risk = 0.3
    if frustration_score is not None and frustration_score >= 70:
        risk = 0.8
    elif frustration_score is not None and frustration_score >= 45:
        risk = 0.5

    risk_level = "high" if risk >= 0.75 else ("medium" if risk >= 0.45 else "low")

    result["escalation_risk"] = risk
    result["risk_level"] = risk_level
    result["reasoning"] = [
        f"Customer sentiment indicates {sentiment or 'neutral'} emotional state.",
        f"Intent '{intent}' may require further verification.",
    ]
    result["recommended_action"] = (
        "Escalate to a supervisor for review." if risk_level == "high"
        else "Continue monitoring and attempt to resolve in current tier."
    )
    result["alert_triggered"] = risk_level == "high"
    result["note"] = "fallback used — Gemini unavailable or errored"
    return result
