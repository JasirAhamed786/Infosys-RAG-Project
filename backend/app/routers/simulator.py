"""
simulator.py

Milestone 2 — Customer Simulator Agent endpoints with real pipeline integration.

Connects the frontend Live Console to the real orchestration pipeline:
- POST /simulator/start — Start a simulation session
- POST /simulator/message — Send an agent message and get a simulated customer reply
- GET /simulator/stream/{session_id} — Stream customer messages token-by-token
"""

from __future__ import annotations

import datetime as dt
from typing import Any, AsyncGenerator, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agents.simulator_agent import run_simulator_agent
from app.core.config import settings
from app.orchestration.pipeline import run_pipeline
from app.services.mongo import mongo
from app.utils.llm_client import groq_client

router = APIRouter(tags=["simulator"])


class SimulatorStartRequest(BaseModel):
    session_id: str
    mode: Literal["Simulator", "Manual", "Replay"]
    product_context: str
    scenario: str
    persona: str | None = None


class SimulatorStartResponse(BaseModel):
    session_id: str
    thread_id: str
    messages: list[dict[str, Any]]


class SimulatorTurnRequest(BaseModel):
    session_id: str
    thread_id: str
    user_message: str = Field(..., min_length=1)
    turn_index: int = 0


class SimulatorTurnResponse(BaseModel):
    session_id: str
    thread_id: str
    turn_index: int
    customer_message: str
    metadata: dict[str, Any]
    intent_sentiment: dict[str, Any] | None = None
    knowledge: dict[str, Any] | None = None
    frustration_level: int | None = None


@router.post("/simulator/start", response_model=SimulatorStartResponse)
def start_simulator(req: SimulatorStartRequest):
    """Start a new simulator session.

    Creates a thread ID and generates the first customer message
    using the real Simulator Agent.
    """
    mongo.connect()

    # Validate session exists
    session = mongo.sessions.find_one({"_id": req.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    thread_id = str(uuid4())

    # Run the pipeline to get the first customer message
    pipeline_result = run_pipeline(
        session_id=req.session_id,
        mode=req.mode,
        input_message="",  # No agent message yet — this is the first turn
        product_context=req.product_context,
        scenario=req.scenario,
        persona=req.persona,
        turn_index=0,
    )

    customer_msg = pipeline_result.get("customer_simulation", {}).get(
        "customer_message",
        "Hi, I need some help with an issue I'm having.",
    )

    welcome = {
        "role": "customer",
        "content": customer_msg,
        "turn_index": 1,
    }

    return {
        "session_id": req.session_id,
        "thread_id": thread_id,
        "messages": [welcome],
    }


@router.post("/simulator/message", response_model=SimulatorTurnResponse)
def simulator_message(req: SimulatorTurnRequest):
    """Process an agent message and return the simulated customer response.

    Runs the full pipeline: Intent/Sentiment → Knowledge → Simulator.
    """
    mongo.connect()

    if not req.user_message.strip():
        raise HTTPException(status_code=400, detail="user_message must not be empty")

    # Get conversation history for pipeline context
    conversation_history = list(
        mongo.messages.find({"session_id": req.session_id})
        .sort("turn_index", 1)
    )

    # Get session details for context
    session = mongo.sessions.find_one({"_id": req.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Run the pipeline with the agent's message
    pipeline_result = run_pipeline(
        session_id=req.session_id,
        mode=session.get("mode", "Simulator"),
        input_message=req.user_message,
        product_context=session.get("product_context", ""),
        scenario=session.get("scenario", ""),
        persona=session.get("persona"),
        conversation_history=conversation_history,
        turn_index=req.turn_index,
    )

    customer_sim = pipeline_result.get("customer_simulation", {})
    intent_sent = pipeline_result.get("intent_sentiment", {})
    knowledge = pipeline_result.get("knowledge", {})

    return {
        "session_id": req.session_id,
        "thread_id": req.thread_id,
        "turn_index": customer_sim.get("turn_index", req.turn_index + 1),
        "customer_message": customer_sim.get("customer_message", ""),
        "metadata": customer_sim.get("metadata", {"tone": "neutral"}),
        "intent_sentiment": intent_sent,
        "knowledge": knowledge,
        "frustration_level": customer_sim.get("internal_frustration_level"),
    }


@router.get("/simulator/stream/{session_id}")
async def stream_simulator_message(
    session_id: str,
    agent_message: str = "",
    turn_index: int = 0,
):
    """Stream a simulated customer message token-by-token using Groq's streaming API.

    This endpoint is used by the frontend Live Console to show real-time
    customer responses as they're generated.

    Query params:
        agent_message: The latest agent message to respond to.
        turn_index: Current turn index.
    """
    mongo.connect()

    session = mongo.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get conversation history
    conversation_history = list(
        mongo.messages.find({"session_id": session_id})
        .sort("turn_index", 1)
    )

    # Build the system prompt for streaming
    persona = session.get("persona")
    product_context = session.get("product_context", "")
    scenario = session.get("scenario", "")
    current_frustration = 35

    if conversation_history:
        last_msg = conversation_history[-1]
        last_frustration = last_msg.get("frustration_level")
        if last_frustration is not None:
            current_frustration = last_frustration

    system_prompt = (
        f"You are a CUSTOMER SIMULATOR. Your persona: {persona or 'a typical customer'}. "
        f"Product: {product_context}. Scenario: {scenario}. "
        f"Frustration: {current_frustration}/100. "
        f"Generate ONE realistic customer message. Be natural and in character."
    )

    context_lines = []
    for msg in conversation_history[-6:]:
        context_lines.append(f"[{msg.get('role', 'unknown').upper()}]: {msg.get('content', '')}")
    if agent_message:
        context_lines.append(f"[AGENT]: {agent_message}")

    user_prompt = "Conversation:\n" + "\n".join(context_lines) + "\n\nGenerate next customer message:"

    async def generate():
        if groq_client.api_key:
            try:
                for token in groq_client.generate_stream(
                    model=settings.GROQ_SIMULATOR_MODEL,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=0.8,
                    max_tokens=512,
                ):
                    yield f"data: {token}\n\n"
            except Exception as e:
                yield f"data: [Error: {e}]\n\n"
        else:
            # Fallback: return a mock message
            fallback = "I'm having trouble with this issue. Can you please help me understand what's going on?"
            for char in fallback:
                yield f"data: {char}\n\n"
                import asyncio
                await asyncio.sleep(0.05)

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

