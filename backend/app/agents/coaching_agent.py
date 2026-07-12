"""coaching_agent.py

Coaching & Response Suggestion Agent (Groq 70B)

ROLE (Milestone 3):
- Convert intent/sentiment + recommended knowledge into:
  - coaching tips for the agent (what to say / ask)
  - a suggested response draft
  - optional response alternatives
- Output structured JSON for the coaching feed UI.

NOTE:
- Scaffolding only; no real Groq calls.
"""

from __future__ import annotations

from typing import Any


def run_coaching_agent(
    *,
    session_id: str,
    intent: str,
    sentiment: str,
    recommended_kb: list[dict],
    customer_message: str,
    turn_index: int,
    **_: Any,
) -> dict:
    """Run coaching response suggestion.

    Expected output shape (JSON):
    {
      "agent": "coaching",
      "turn_index": number,
      "coaching_tips": [string],
      "suggested_response": string,
      "response_alternatives": [string]
    }
    """

    # TODO: Milestone 3 - Replace mock with real Groq 70B call.
    return {
        "agent": "coaching",
        "turn_index": turn_index,
        "coaching_tips": [
            "Acknowledge the frustration and confirm the fee/posting timeframe.",
            "Ask a clarifying question about whether the customer has an automatic payment setting or recent account changes.",
            "Summarize the dispute workflow: verify posting date → check eligibility → offer correction/refund options or escalate.",
        ],
        "suggested_response": "I’m sorry for the trouble this late fee has caused. Let’s get to the bottom of it—could you share when the fee was posted and whether there were any changes to your payment setup around that time? Once I confirm the posting details, I’ll explain the next steps to correct or refund it if eligible.",
        "response_alternatives": [
            "Thanks for explaining—I'll help you dispute the late fee. First, can you confirm the exact date the fee appeared on your account? Then I’ll review the eligibility and walk you through correction options.",
        ],
    }

