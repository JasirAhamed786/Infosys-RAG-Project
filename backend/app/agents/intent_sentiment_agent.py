"""intent_sentiment_agent.py

Intent & Sentiment Analysis Agent (Groq 8B)

ROLE (Milestone 2):
- Analyze the customer message to extract:
  - intent (e.g., billing_issue, dispute, refund_request)
  - sentiment (e.g., angry, frustrated, neutral)
  - confidence scores
- Output structured JSON for downstream stages.

NOTE:
- Scaffolding only; no real Groq calls.
"""

from __future__ import annotations

from typing import Any, Literal


def run_intent_sentiment_agent(
    *,
    session_id: str,
    customer_message: str,
    turn_index: int,
    **_: Any,
) -> dict:
    """Run intent + sentiment analysis.

    Expected output shape (JSON):
    {
      "agent": "intent_sentiment",
      "turn_index": number,
      "intent": "string",
      "sentiment": "string",
      "confidence": {"intent": number, "sentiment": number}
    }
    """

    # TODO: Milestone 2 - Replace mock with real Groq 8B call.
    return {
        "agent": "intent_sentiment",
        "turn_index": turn_index,
        "intent": "billing_fee_dispute",
        "sentiment": "frustrated",
        "confidence": {"intent": 0.81, "sentiment": 0.74},
    }

