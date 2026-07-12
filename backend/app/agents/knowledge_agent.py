"""knowledge_agent.py

Knowledge Recommendation Agent (Gemini)

ROLE (Milestone 2/3):
- Given the intent + conversation context, query the Knowledge Base (RAG)
  and recommend relevant knowledge snippets/answers.
- Output structured JSON for coaching orchestration.

NOTE:
- Scaffolding only; no real Gemini calls.
"""

from __future__ import annotations

from typing import Any


def run_knowledge_agent(
    *,
    session_id: str,
    intent: str,
    persona: str | None,
    product_context: str,
    query_text: str,
    turn_index: int,
    **_: Any,
) -> dict:
    """Run knowledge recommendation.

    Expected output shape (JSON):
    {
      "agent": "knowledge_recommendation",
      "turn_index": number,
      "recommended_kb": [{"title": string, "snippet": string, "source": string}]
    }
    """

    # TODO: Milestone 3 - Replace mock with real KB query + Gemini summarization.
    return {
        "agent": "knowledge_recommendation",
        "turn_index": turn_index,
        "recommended_kb": [
            {
                "title": "Late Fee Dispute - Standard Workflow",
                "snippet": "Explain eligibility, verify posting date, confirm account status, and offer correction steps or escalation if systemic...",
                "source": "MockKB:Policies/LateFees.md",
            },
            {
                "title": "Refund Timeline & Customer Communication",
                "snippet": "Provide clear refund expectations and next-step ETA; document all communication...",
                "source": "MockKB:Billing/Refunds.txt",
            },
        ],
    }

