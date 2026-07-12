"""summary_agent.py

Post-Interaction Summary Agent (Gemini)

ROLE (Milestone 4):
- After a conversation ends, produce:
  - concise summary
  - key decisions/actions
  - coaching effectiveness notes
  - performance metrics suitable for analytics UI

NOTE:
- Scaffolding only; no real Gemini calls.
"""

from __future__ import annotations

from typing import Any


def run_summary_agent(*, session_id: str, conversation: list[dict], **_: Any) -> dict:
    """Run post-interaction summary.

    Expected output shape (JSON):
    {
      "agent": "post_interaction_summary",
      "session_id": string,
      "summary": string,
      "actions": [string],
      "metrics": [{"name": string, "value": number|string}]
    }
    """

    # TODO: Milestone 4 - Replace mock with real Gemini call.
    return {
        "agent": "post_interaction_summary",
        "session_id": session_id,
        "summary": "Mock summary: Customer disputed a recurring late fee; agent acknowledged concerns, verified posting details, and initiated dispute workflow.",
        "actions": [
            "Acknowledged customer frustration",
            "Collected posting date/payment context",
            "Prepared next-step dispute workflow",
        ],
        "metrics": [
            {"name": "turn_count", "value": len(conversation)},
            {"name": "escalation_recommended", "value": "no"},
        ],
    }

