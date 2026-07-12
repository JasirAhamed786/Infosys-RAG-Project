"""simulator_agent.py

Customer Simulator Agent (Groq 70B)

ROLE (Milestone 2):
- Generate realistic customer messages for the selected conversation scenario.
- Maintain basic conversation context (for now: mock context handling).
- Output structured JSON that the orchestration pipeline can consume.

NOTE:
- This file is scaffolding only. No real Groq calls are made.
- When the project moves to Milestone 2, replace mock outputs with real model calls.
"""

from __future__ import annotations

from typing import Any, Literal


def run_simulator_agent(
    *,
    session_id: str,
    mode: Literal["Simulator", "Manual", "Replay"],
    product_context: str,
    scenario: str,
    persona: str | None,
    user_agent_message: str,
    turn_index: int,
    **_: Any,
) -> dict:
    """Run the customer simulator.

    Expected output shape (JSON):
    {
      "agent": "customer_simulator",
      "mode": "Simulator|Manual|Replay",
      "turn_index": number,
      "customer_message": string,
      "metadata": { "tone": string, "language": string }
    }
    """

    # TODO: Milestone 2 - Replace with real Groq 70B call and conversation memory.
    return {
        "agent": "customer_simulator",
        "mode": mode,
        "turn_index": turn_index,
        "customer_message": (
            "Thanks for reaching out. I’m still seeing the late fee appear on my account, "
            "and it’s affecting my budget. Can you explain why it’s happening and how I can get it removed?"
        ),
        "metadata": {"tone": "frustrated", "language": "en"},
    }

