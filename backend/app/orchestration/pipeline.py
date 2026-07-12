"""pipeline.py

LangGraph orchestration skeleton

Staged flow (scaffolding only; no real LLM/KB calls):
- Stage 1: Intent always runs
- Stage 2: conditional routing (Knowledge/Escalation/Coaching decision)
- Stage 3: Simulator runs in Simulator Mode

This pipeline wires the stub agent functions so the full stack can be
end-to-end tested with mock data.

TODO: Milestone 2/3 - Replace mock node outputs with real agent logic.
"""

from __future__ import annotations

from typing import Any, Literal

try:
    # Optional dependency; scaffolding should not fail if LangGraph isn't installed.
    from langgraph.graph import StateGraph  # type: ignore
except Exception:  # pragma: no cover
    StateGraph = None  # type: ignore

from app.agents.intent_sentiment_agent import run_intent_sentiment_agent
from app.agents.knowledge_agent import run_knowledge_agent
from app.agents.coaching_agent import run_coaching_agent
from app.agents.escalation_agent import run_escalation_agent
from app.agents.simulator_agent import run_simulator_agent


class PipelineState(dict[str, Any]):
    """Loose state container for pipeline wiring."""


def decide_stage2_route(state: PipelineState) -> Literal["knowledge", "coaching", "escalation"]:
    """Mock conditional routing decision.

    TODO: Milestone 3 - Make real conditional decision based on risk/confidence.
    """

    # Use escalation score/risk if present; otherwise default to coaching.
    risk = state.get("escalation", {}).get("risk")
    if risk == "high":
        return "escalation"
    return "knowledge" if state.get("intent", {}).get("confidence", {}).get("intent", 0) > 0.6 else "coaching"


def run_pipeline_mock(*, session_id: str, mode: Literal["Simulator", "Manual", "Replay"], input_message: str, product_context: str, scenario: str, persona: str | None = None) -> dict:
    """Execute the orchestration pipeline using stub agents.

    Output shape (JSON) (mock):
    {
      "session_id": string,
      "mode": mode,
      "turn_index": number,
      "intent_sentiment": {...},
      "knowledge": {...} (optional),
      "coaching": {...} (optional),
      "escalation": {...} (optional),
      "customer_simulation": {...}
    }
    """

    turn_index = int(state_turn_index := 0)  # single-turn scaffold

    intent_sentiment = run_intent_sentiment_agent(
        session_id=session_id,
        customer_message=input_message,
        turn_index=turn_index,
    )

    state: PipelineState = {
        "intent": intent_sentiment,
        "turn_index": turn_index,
    }

    # Stage 2: conditional knowledge/escalation/coaching routing (mock)
    knowledge = run_knowledge_agent(
        session_id=session_id,
        intent=intent_sentiment["intent"],
        persona=persona,
        product_context=product_context,
        query_text=input_message,
        turn_index=turn_index,
    )

    escalation = run_escalation_agent(
        session_id=session_id,
        intent=intent_sentiment["intent"],
        sentiment=intent_sentiment["sentiment"],
        turn_index=turn_index,
        conversation_state={"scenario": scenario},
    )

    route = decide_stage2_route({"intent": intent_sentiment, "escalation": escalation})

    if route == "escalation":
        coaching = run_coaching_agent(
            session_id=session_id,
            intent=intent_sentiment["intent"],
            sentiment=intent_sentiment["sentiment"],
            recommended_kb=knowledge.get("recommended_kb", []),
            customer_message=input_message,
            turn_index=turn_index,
        )
        # Keep knowledge too; real routing can change.
    else:
        coaching = run_coaching_agent(
            session_id=session_id,
            intent=intent_sentiment["intent"],
            sentiment=intent_sentiment["sentiment"],
            recommended_kb=knowledge.get("recommended_kb", []),
            customer_message=input_message,
            turn_index=turn_index,
        )

    # Stage 3: Simulator in Simulator Mode
    customer_simulation = run_simulator_agent(
        session_id=session_id,
        mode=mode,
        product_context=product_context,
        scenario=scenario,
        persona=persona,
        user_agent_message=input_message,
        turn_index=turn_index,
    )

    return {
        "session_id": session_id,
        "mode": mode,
        "turn_index": turn_index,
        "intent_sentiment": intent_sentiment,
        "knowledge": knowledge,
        "coaching": coaching,
        "escalation": escalation,
        "customer_simulation": customer_simulation,
        "stage2_route": route,
    }


def build_langgraph_app():
    """Build a LangGraph app if langgraph is installed.

    Not required for scaffolding; included for future milestone extension.
    """

    if StateGraph is None:
        return None

    graph = StateGraph(PipelineState)  # type: ignore

    # TODO: Milestone 3 - Define real LangGraph nodes.
    # For now, we skip full graph construction.
    return graph

