"""
pipeline.py

LangGraph orchestration pipeline — Milestone 2 real implementation,
now extended for Milestone 3 Manual + Replay mode support.

Staged flow:
- Stage 1: Intent & Sentiment Analysis always runs FIRST (every turn)
- Stage 2: Knowledge Recommendation runs conditionally when intent
  suggests the customer needs information
- Stage 3: Customer Simulator runs in Simulator Mode ONLY
- Stage 4: Coaching & Response Suggestion (real Gemini agent, every turn)
- Stage 5: Escalation Risk Monitor (real Gemini agent, every turn)
- Stage 6: Summary remains a mock stub (Milestone 4)

Manual / Replay mode support:
  In these two modes, the "customer message" doesn't come from the
  Simulator Agent — in Manual mode the agent pastes it in, in Replay mode
  it comes from an uploaded transcript. Either way, the caller (see
  conversation.py / replay.py) persists that text as a role="customer"
  message BEFORE calling this pipeline, so customer_message_to_analyze
  (extracted below from conversation_history) already holds the right
  text. The only change needed here is surfacing that same text back out
  through customer_simulation.customer_message, so the frontend's existing
  contract (which always reads customer_simulation.customer_message from
  the pipeline response) keeps working identically across all three modes
  without any special-casing on the client.

Includes:
- Retry-with-backoff for 429 rate limit errors
- Clear error logging showing which agent failed and why
"""

from __future__ import annotations

import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Literal

from app.agents.intent_sentiment_agent import run_intent_sentiment_agent
from app.agents.knowledge_agent import run_knowledge_agent
from app.agents.simulator_agent import run_simulator_agent
from app.agents.coaching_agent import run_coaching_agent
from app.agents.escalation_agent import run_escalation_agent


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
    skip_simulator: bool = False,
) -> dict:
    """Execute the orchestration pipeline with REAL agent calls.

    Pipeline order:
    1. Intent & Sentiment Analysis (always runs first)
    2. Knowledge Recommendation (conditional — runs if intent suggests
       information need)
    3. Customer Simulator (runs in Simulator Mode only)
    4. Coaching & Response Suggestion (real Gemini agent, every turn)
    5. Escalation Risk Monitor (real Gemini agent, every turn)

    Args:
        session_id: The current session ID.
        mode: Session mode.
        input_message: The latest agent/customer message.
        product_context: Product/service context.
        scenario: Customer scenario.
        persona: Customer persona (optional).
        conversation_history: Previous conversation messages (optional).
        turn_index: Current turn index.
        skip_simulator: If True, skips generating a new simulator message.

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
    # Stage 1: Intent & Sentiment + Simulator (RUN IN PARALLEL)
    # ============================================================
    # These two stages are independent of one another, so we run them
    # concurrently to cut wall-clock latency. Coaching, Knowledge and
    # Escalation depend on the intent result, so they run after this
    # first wave.
    skip_intent = not customer_message_to_analyze or not customer_message_to_analyze.strip()

    run_sim = (not skip_simulator) and mode == "Simulator"

    def _do_intent() -> dict:
        if skip_intent:
            print("[pipeline] Intent & Sentiment SKIPPED — no customer message to analyze")
            return {
                "agent": "intent_sentiment",
                "turn_index": turn_index,
                "intent": "general_question",
                "emotion": "neutral",
                "frustration_score": 30,
                "satisfaction_trend": "baseline",
                "note": "skipped — no customer message available for analysis",
            }
        print(f"[pipeline] Intent & Sentiment Analysis (turn {turn_index})")
        result = _safe_run_agent(
            agent_name="intent_sentiment",
            agent_func=run_intent_sentiment_agent,
            session_id=session_id,
            customer_message=customer_message_to_analyze,
            turn_index=turn_index,
            conversation_context=conversation_history,
        )
        print(f"[pipeline] Intent: {result.get('intent')} | "
              f"Emotion: {result.get('emotion')} | "
              f"Frustration: {result.get('frustration_score')}")
        return result

    def _do_simulator() -> dict:
        if not run_sim:
            print("[pipeline] Customer Simulator skipped (mode not Simulator or skip_simulator=True)")
            return {
                "agent": "customer_simulator",
                "turn_index": turn_index,
                "customer_message": "",
                "internal_frustration_level": 35,
                "metadata": {"tone": "neutral", "language": "en"},
                "note": "skipped — not Simulator mode",
            }
        print(f"[pipeline] Customer Simulator (turn {turn_index})")
        result = _safe_run_agent(
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
              f"{result.get('internal_frustration_level')}")
        return result

    wave1 = {
        "intent": _do_intent,
        "simulator": _do_simulator,
    }

    with ThreadPoolExecutor(max_workers=2) as executor:
        wave1_futs = {key: executor.submit(fn) for key, fn in wave1.items()}
        intent_sentiment = wave1_futs["intent"].result()
        customer_simulation = wave1_futs["simulator"].result()

    # ============================================================
    # Manual / Replay: surface the externally-supplied customer message
    # through customer_simulation.customer_message so the frontend's
    # existing contract keeps working unchanged across all three modes.
    # See module docstring for the full explanation.
    # ============================================================
    if mode in ("Manual", "Replay") and customer_message_to_analyze:
        customer_simulation = {
            **customer_simulation,
            "customer_message": customer_message_to_analyze,
            "turn_index": turn_index,
            "internal_frustration_level": intent_sentiment.get(
                "frustration_score",
                customer_simulation.get("internal_frustration_level", 35),
            ),
            "note": f"{mode} mode — message supplied externally, not simulator-generated",
        }

    # ============================================================
    # Determine whether to query the knowledge base
    # ============================================================
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
    # Stage 2-5: Knowledge / Coaching / Escalation (RUN IN PARALLEL)
    # ============================================================
    # All three depend only on the intent result (and knowledge feeds
    # coaching), so they are independent of each other and can run
    # concurrently, cutting the second wave down from ~3 sequential
    # LLM calls to a single max().

    def _do_knowledge() -> dict:
        if skip_intent:
            print("[pipeline] Knowledge SKIPPED — no customer message available")
            return {
                "agent": "knowledge_recommendation",
                "turn_index": turn_index,
                "results": [],
                "note": "no relevant knowledge found",
            }
        if not should_query_knowledge:
            print(f"[pipeline] Knowledge skipped (intent: {intent_sentiment.get('intent')})")
            return {
                "agent": "knowledge_recommendation",
                "turn_index": turn_index,
                "results": [],
                "note": "skipped — intent did not suggest information need",
            }
        print(f"[pipeline] Knowledge Recommendation (intent: {intent_sentiment.get('intent')})")
        result = _safe_run_agent(
            agent_name="knowledge",
            agent_func=run_knowledge_agent,
            session_id=session_id,
            intent=intent_sentiment.get("intent", "general_question"),
            persona=persona,
            product_context=product_context,
            query_text=customer_message_to_analyze,
            turn_index=turn_index,
        )
        print(f"[pipeline] Knowledge: {len(result.get('results', []))} results found")
        return result

    def _do_coaching(recommended_kb: list[dict[str, Any]]) -> dict:
        print(f"[pipeline] Coaching (turn {turn_index})")
        result = _safe_run_agent(
            agent_name="coaching",
            agent_func=run_coaching_agent,
            session_id=session_id,
            intent=intent_sentiment.get("intent", "general_question"),
            sentiment=intent_sentiment.get("emotion", "neutral"),
            frustration_score=intent_sentiment.get("frustration_score"),
            recommended_kb=recommended_kb,
            customer_message=customer_message_to_analyze,
            turn_index=turn_index,
        )
        print(f"[pipeline] Coaching suggested_response "
              f"({len(result.get('suggested_response', ''))} chars)")
        return result

    def _do_escalation() -> dict:
        print(f"[pipeline] Escalation Risk (turn {turn_index})")
        result = _safe_run_agent(
            agent_name="escalation",
            agent_func=run_escalation_agent,
            session_id=session_id,
            intent=intent_sentiment.get("intent", "general_question"),
            sentiment=intent_sentiment.get("emotion", "neutral"),
            frustration_score=intent_sentiment.get("frustration_score"),
            turn_index=turn_index,
            customer_message=customer_message_to_analyze,
        )
        print(f"[pipeline] Escalation risk: {result.get('risk_level')} "
              f"({result.get('escalation_risk')})")
        return result

    # Knowledge can run in parallel with escalation; coaching needs the
    # knowledge result, so we run knowledge + escalation concurrently first,
    # then coaching once knowledge is available.
    with ThreadPoolExecutor(max_workers=2) as executor:
        knowledge_fut = executor.submit(_do_knowledge)
        escalation = executor.submit(_do_escalation).result()
        knowledge_result = knowledge_fut.result()

    coaching = _do_coaching(knowledge_result.get("results", []))

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