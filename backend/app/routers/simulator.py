"""
simulator.py

Milestone 2 — Customer Simulator Agent endpoints with real pipeline integration.
"""

from __future__ import annotations

import datetime as dt
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

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
    mongo.connect()

    session = mongo.sessions.find_one({"_id": req.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    thread_id = str(uuid4())

    pipeline_result = run_pipeline(
        session_id=req.session_id,
        mode=req.mode,
        input_message="",
        product_context=req.product_context,
        scenario=req.scenario,
        persona=req.persona,
        turn_index=0,
    )

    customer_msg = pipeline_result.get("customer_simulation", {}).get(
        "customer_message",
        "Hi, I need some help with an issue I'm having.",
    )
    frustration_level = pipeline_result.get("customer_simulation", {}).get(
        "internal_frustration_level", 35
    )

    now = dt.datetime.utcnow()
    first_turn_index = pipeline_result.get("customer_simulation", {}).get("turn_index", 1)
    
    mongo.messages.insert_one({
        "_id": str(uuid4()),
        "session_id": req.session_id,
        "turn_index": first_turn_index,
        "role": "customer",
        "content": customer_msg,
        "created_at": now,
        "frustration_level": frustration_level,
    })

    welcome = {
        "role": "customer",
        "content": customer_msg,
        "turn_index": first_turn_index,
    }

    return {
        "session_id": req.session_id,
        "thread_id": thread_id,
        "messages": [welcome],
    }


@router.post("/simulator/message", response_model=SimulatorTurnResponse)
def simulator_message(req: SimulatorTurnRequest):
    mongo.connect()

    if not req.user_message.strip():
        raise HTTPException(status_code=400, detail="user_message must not be empty")

    now = dt.datetime.utcnow()

    # 1. Persist the human agent's message
    existing_agent = mongo.messages.find_one({
        "session_id": req.session_id,
        "turn_index": req.turn_index,
        "role": "agent",
    })
    
    if not existing_agent:
        mongo.messages.insert_one({
            "_id": str(uuid4()),
            "session_id": req.session_id,
            "turn_index": req.turn_index,
            "role": "agent",
            "content": req.user_message,
            "created_at": now,
        })

    # 2. Use this turn's feedback from the pipeline as the single source of truth.
    customer_turn_index = req.turn_index

    # 3. Pull history and pass it to the pipeline for context.
    conversation_history = list(
        mongo.messages.find({"session_id": req.session_id}).sort("turn_index", 1)
    )

    session = mongo.sessions.find_one({"_id": req.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 4. Run the pipeline (NOT skipping the simulator) so IT generates and persists
    #    the fresh customer message as the single writer. This removes the dead
    #    SSE-era read-path that used to grab a "pre-written" customer message and
    #    fall back to the hardcoded "I need assistance." default — that default was
    #    never written by anything anymore and produced stale/dummy text (Bug B).
    pipeline_result = run_pipeline(
        session_id=req.session_id,
        mode=session.get("mode", "Simulator"),
        input_message=req.user_message,
        product_context=session.get("product_context", ""),
        scenario=session.get("scenario", ""),
        persona=session.get("persona"),
        conversation_history=conversation_history,
        turn_index=customer_turn_index,
        skip_simulator=False,  # <-- Let the pipeline generate the fresh customer message
    )

    intent_sent = pipeline_result.get("intent_sentiment", {})
    knowledge = pipeline_result.get("knowledge", {})
    customer_sim = pipeline_result.get("customer_simulation", {})

    actual_customer_message = customer_sim.get("customer_message", "")
    if customer_sim.get("turn_index") is not None:
        customer_turn_index = customer_sim.get("turn_index")

    current_frustration = customer_sim.get(
        "internal_frustration_level",
        intent_sent.get("frustration_score", 30) if intent_sent else 30,
    )

    return {
        "session_id": req.session_id,
        "thread_id": req.thread_id,
        "turn_index": customer_turn_index,
        "customer_message": actual_customer_message,
        "metadata": {"tone": intent_sent.get("emotion", "neutral") if intent_sent else "neutral"},
        "intent_sentiment": intent_sent,
        "knowledge": knowledge,
        "frustration_level": current_frustration,
    }


@router.get("/simulator/stream/{session_id}")
async def stream_simulator_message(
    session_id: str,
    agent_message: str = "",
    turn_index: int = 0,
):
    mongo.connect()

    session = mongo.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    conversation_history = list(
        mongo.messages.find({"session_id": session_id}).sort("turn_index", 1)
    )

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
        collected_message = ""
        
        if groq_client.api_key:
            try:
                for token in groq_client.generate_stream(
                    model=settings.GROQ_SIMULATOR_MODEL,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=0.8,
                    max_tokens=512,
                ):
                    collected_message += token
                    yield f"data: {token}\n\n"
            except Exception as e:
                yield f"data: [Error: {e}]\n\n"
        else:
            fallback = "I'm having trouble with this issue. Can you please help me understand what's going on?"
            collected_message = fallback
            for char in fallback:
                yield f"data: {char}\n\n"
                import asyncio
                await asyncio.sleep(0.05)

        if collected_message:
            mongo.messages.insert_one({
                "_id": str(uuid4()),
                "session_id": session_id,
                "turn_index": turn_index + 1,
                "role": "customer",
                "content": collected_message.strip(),
                "created_at": dt.datetime.utcnow(),
                "frustration_level": current_frustration,
            })

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