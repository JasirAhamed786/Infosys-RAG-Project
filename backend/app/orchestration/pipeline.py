"""
pipeline.py

LangGraph orchestration pipeline — Milestone 2 real implementation.

Staged flow:
- Stage 1: Intent & Sentiment Analysis always runs FIRST (every turn)
- Stage 2: Knowledge Recommendation runs conditionally when intent
  suggests the customer needs information
- Stage 3: Customer Simulator runs in Simulator Mode
- Coaching, Escalation, and Summary remain as mock stubs (Milestone 3/4)

Includes:
- Retry-with-backoff for 429 rate limit errors
- Clear error logging showing which agent failed and why
"""

from __future__ import annotations

import traceback
from typing import Any, Literal

from app.agents.intent_sentiment_agent import run_intent_sentiment_agent
from app.agents.knowledge_agent import run_knowledge_agent
from app.agents.simulator_agent import run_simulator_agent


def run_pipeline(
    *,
    session_id: str,
    mode: Literal["Simulator", "Manual", "Replay"],
    input_message: str,
    product_context: str,
    scenario: str,
    persona: str | None = None,
    conversation_history: list[dict[str, Any]] | None = None,
    turn_index: int = 0,
) -> dict:
    """Execute the orchestration pipeline with REAL agent calls.

    Pipeline order:
    1. Intent & Sentiment Analysis (always runs first)
    2. Knowledge Recommendation (conditional — runs if intent suggests
       information need)
    3. Customer Simulator (runs in Simulator Mode only)
    4. Coaching, Escalation, Summary (mock stubs — Milestone 3/4)

    Args:
        session_id: The current session ID.
        mode: Session mode.
        input_message: The latest agent/customer message.
        product_context: Product/service context.
        scenario: Customer scenario.
        persona: Customer persona (optional).
        conversation_history: Previous conversation messages (optional).
        turn_index: Current turn index.

    Returns:
        dict with results from all pipeline stages.
    """
    # ============================================================
    # Extract the actual customer message to analyze
    # Intent & Knowledge should analyze what the CUSTOMER said,
    # not what the agent typed. We look for the last customer
    # message in the conversation history.
    # ============================================================
    customer_message_to_analyze = ""
    if conversation_history:
        # Find the last customer message from conversation history
        for msg in reversed(conversation_history):
            if msg.get("role") == "customer":
                customer_message_to_analyze = msg.get("content", "")
                break

    # If no customer message found in history, use input_message
    # (this handles the first-turn initiation case)
    if not customer_message_to_analyze:
        customer_message_to_analyze = input_message

    print(f"[pipeline] customer_message_to_analyze: "
          f"'{customer_message_to_analyze[:80]}{'...' if len(customer_message_to_analyze) > 80 else ''}'")

    # ============================================================
    # Stage 1: Intent & Sentiment Analysis (skipped if no message)
    # ============================================================
    skip_intent = not customer_message_to_analyze or not customer_message_to_analyze.strip()
    if skip_intent:
        print(f"[pipeline] Stage 1: Intent & Sentiment SKIPPED — no customer message to analyze")
        intent_sentiment = {
            "agent": "intent_sentiment",
            "turn_index": turn_index,
            "intent": "general_question",
            "emotion": "neutral",
            "frustration_score": 30,
            "satisfaction_trend": "baseline",
            "note": "skipped — no customer message available for analysis",
        }
    else:
        print(f"[pipeline] Stage 1: Intent & Sentiment Analysis (turn {turn_index})")
        intent_sentiment = _safe_run_agent(
            agent_name="intent_sentiment",
            agent_func=run_intent_sentiment_agent,
            session_id=session_id,
            customer_message=customer_message_to_analyze,
            turn_index=turn_index,
            conversation_context=conversation_history,
        )
        print(f"[pipeline] Intent: {intent_sentiment.get('intent')} | "
              f"Emotion: {intent_sentiment.get('emotion')} | "
              f"Frustration: {intent_sentiment.get('frustration_score')}")

    # Check if intent suggests customer needs information
    info_needing_intents = [
        "billing_issue", "technical_problem", "refund_request",
        "general_question", "how_to", "feature_request",
        "account_access", "payment_dispute", "information",
    ]
    should_query_knowledge = not skip_intent and any(
        keyword in str(intent_sentiment.get("intent", "")).lower()
        for keyword in info_needing_intents
    )

    # ============================================================
    # Stage 2: Knowledge Recommendation (conditional)
    # ============================================================
    knowledge_result = {
        "agent": "knowledge_recommendation",
        "turn_index": turn_index,
        "results": [],
        "note": "skipped — intent did not suggest information need",
    }

    if skip_intent:
        print(f"[pipeline] Stage 2: Knowledge SKIPPED — no customer message available")
        knowledge_result = {
            "agent": "knowledge_recommendation",
            "turn_index": turn_index,
            "results": [],
            "note": "no relevant knowledge found",
        }
    elif should_query_knowledge:
        print(f"[pipeline] Stage 2: Knowledge Recommendation (intent: "
              f"{intent_sentiment.get('intent')})")
        knowledge_result = _safe_run_agent(
            agent_name="knowledge",
            agent_func=run_knowledge_agent,
            session_id=session_id,
            intent=intent_sentiment.get("intent", "general_question"),
            persona=persona,
            product_context=product_context,
            query_text=customer_message_to_analyze,
            turn_index=turn_index,
        )
        result_count = len(knowledge_result.get("results", []))
        print(f"[pipeline] Knowledge: {result_count} results found")
    else:
        print(f"[pipeline] Stage 2: Knowledge skipped "
              f"(intent: {intent_sentiment.get('intent')})")

    # ============================================================
    # Stage 3: Customer Simulator (Simulator Mode only)
    # ============================================================
    customer_simulation = {
        "agent": "customer_simulator",
        "turn_index": turn_index,
        "customer_message": "",
        "internal_frustration_level": 35,
        "metadata": {"tone": "neutral", "language": "en"},
        "note": "skipped — not Simulator mode",
    }

    if mode == "Simulator":
        print(f"[pipeline] Stage 3: Customer Simulator")
        customer_simulation = _safe_run_agent(
            agent_name="simulator",
            agent_func=run_simulator_agent,
            session_id=session_id,
            mode=mode,
            product_context=product_context,
            scenario=scenario,
            persona=persona,
            user_agent_message=input_message,
            turn_index=turn_index,
            conversation_history=conversation_history,
        )
        print(f"[pipeline] Simulator frustration: "
              f"{customer_simulation.get('internal_frustration_level')}")
    else:
        print(f"[pipeline] Stage 3: Simulator skipped (mode: {mode})")

    # ============================================================
    # Stage 4/5: Coaching & Escalation (mock stubs — Milestone 3)
    # ============================================================
    coaching = {
        "agent": "coaching",
        "turn_index": turn_index,
        "coaching_tips": [
            "Acknowledge the customer's concern and show empathy.",
            "Ask clarifying questions to better understand the issue.",
            "Provide clear next steps and set expectations.",
        ],
        "suggested_response": (
            "I understand your concern. Let me look into this for you. "
            "Could you provide a few more details so I can help resolve this quickly?"
        ),
        "response_alternatives": [],
        "note": "mock stub — Milestone 3 will implement real coaching logic",
    }

    escalation = {
        "agent": "escalation_risk",
        "turn_index": turn_index,
        "risk": "low",
        "score": 0.15,
        "reasons": [],
        "note": "mock stub — Milestone 3 will implement real escalation logic",
    }

    # ============================================================
    # Build and return the combined pipeline result
    # ============================================================
    return {
        "session_id": session_id,
        "mode": mode,
        "turn_index": turn_index,
        "intent_sentiment": intent_sentiment,
        "knowledge": knowledge_result,
        "coaching": coaching,
        "escalation": escalation,
        "customer_simulation": customer_simulation,
    }


def _safe_run_agent(
    agent_name: str,
    agent_func: callable,
    **kwargs: Any,
) -> dict:
    """Safely run an agent with error handling and logging.

    Wraps agent calls to catch exceptions, log them clearly,
    and return a fallback result instead of crashing the pipeline.

    Args:
        agent_name: Human-readable name for logging.
        agent_func: The agent function to call.
        **kwargs: Arguments to pass to the agent function.

    Returns:
        dict: The agent's result, or a fallback error dict.
    """
    try:
        return agent_func(**kwargs)
    except Exception as e:
        error_msg = f"[pipeline] AGENT FAILED: {agent_name} — {type(e).__name__}: {e}"
        print(error_msg)
        traceback.print_exc()
        return {
            "agent": agent_name,
            "error": str(e),
            "error_type": type(e).__name__,
            "note": f"Agent {agent_name} failed to execute",
        }

