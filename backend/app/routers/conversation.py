"""
conversation.py

Milestone 2 — Conversation Management with real pipeline integration and
Milestone 3 persistence of coaching + escalation results.

Provides the /conversation/turn endpoint that runs the full orchestration
pipeline (Intent/Sentiment → Knowledge → Simulator → Coaching → Escalation),
persists messages to MongoDB, and attaches the coaching + escalation results
to the relevant message documents so they survive across turns and sessions.
"""

from __future__ import annotations

import datetime as dt
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.orchestration.pipeline import run_pipeline
from app.services.mongo import mongo

router = APIRouter(tags=["conversation"])


class ConversationTurnRequest(BaseModel):
    session_id: str
    mode: Literal["Simulator", "Manual", "Replay"]
    product_context: str
    scenario: str
    persona: str | None = None
    user_message: str = Field(..., min_length=1)
    turn_index: int = 0


class ConversationTurnResponse(BaseModel):
    session_id: str
    mode: Literal["Simulator", "Manual", "Replay"]
    turn_index: int
    intent_sentiment: dict[str, Any]
    knowledge: dict[str, Any]
    coaching: dict[str, Any]
    escalation: dict[str, Any]
    customer_simulation: dict[str, Any]


@router.post("/conversation/turn", response_model=ConversationTurnResponse)
def conversation_turn(req: ConversationTurnRequest):
    """Process a conversation turn through the full pipeline.

    1. Persists the agent's message to MongoDB (idempotent)
    2. Runs the pipeline (Intent/Sentiment → Knowledge → Simulator → Coaching → Escalation)
    3. Persists the customer simulation message (idempotent) and attaches the
       coaching + escalation results to it
    4. Attaches intent/sentiment result to the agent message
    5. Returns the full pipeline result
    """
    mongo.connect()

    if not req.user_message.strip():
        raise HTTPException(status_code=400, detail="user_message must not be empty")

    now = dt.datetime.utcnow()

    # ── Idempotency check: skip agent insert if this (session, turn, role) already exists ──
    existing_agent = mongo.messages.find_one({
        "session_id": req.session_id,
        "turn_index": req.turn_index,
        "role": "agent",
    })
    if existing_agent:
        agent_msg_id = existing_agent["_id"]
        print(f"[conversation] Agent message already exists for turn {req.turn_index}, skipping insert")
    else:
        agent_msg_id = str(uuid4())
        agent_doc = {
            "_id": agent_msg_id,
            "session_id": req.session_id,
            "turn_index": req.turn_index,
            "role": "agent",
            "content": req.user_message,
            "created_at": now,
        }
        mongo.messages.insert_one(agent_doc)

    # Load the authoritative session doc (Bug A). Prefer stored values so the
    # pipeline always runs with the config the user actually saved — never stale
    # or blank values sent from a stale frontend form. Fall back to the request
    # body only if a stored field is missing.
    session = mongo.sessions.find_one({"_id": req.session_id})
    effective_mode = session.get("mode") if session and session.get("mode") else req.mode
    effective_context = (
        session.get("product_context") if session and session.get("product_context") else req.product_context
    )
    effective_scenario = (
        session.get("scenario") if session and session.get("scenario") else req.scenario
    )
    effective_persona = (
        session.get("persona") if session and session.get("persona") else req.persona
    )

    # Get conversation history for context
    conversation_history = list(
        mongo.messages.find({"session_id": req.session_id})
        .sort("turn_index", 1)
    )

    # Run the real pipeline with authoritative session config
    out = run_pipeline(
        session_id=req.session_id,
        mode=effective_mode,
        input_message=req.user_message,
        product_context=effective_context,
        scenario=effective_scenario,
        persona=effective_persona,
        conversation_history=conversation_history,
        turn_index=req.turn_index,
    )

    # Persist customer simulation message (if simulator mode) — with idempotency.
    customer_msg = out.get("customer_simulation", {}).get("customer_message")
    if customer_msg:
        customer_turn_index = out.get("customer_simulation", {}).get("turn_index", req.turn_index + 1)
        existing_customer = mongo.messages.find_one({
            "session_id": req.session_id,
            "turn_index": customer_turn_index,
            "role": "customer",
        })
        if existing_customer:
            print(f"[conversation] Customer message already exists for turn {customer_turn_index}, skipping insert")
        else:
            customer_doc = {
                "_id": str(uuid4()),
                "session_id": req.session_id,
                "turn_index": customer_turn_index,
                "role": "customer",
                "content": customer_msg,
                "created_at": now,
                "intent_sentiment_result": out.get("intent_sentiment"),
                "knowledge_result": out.get("knowledge"),
                # Milestone 3: attach coaching + escalation results to the customer
                # message doc so they persist and don't get lost across turns.
                "coaching_result": out.get("coaching"),
                "escalation_result": out.get("escalation"),
                "frustration_level": out.get("customer_simulation", {}).get("internal_frustration_level"),
            }
            mongo.messages.insert_one(customer_doc)

    # Also attach intent/sentiment + coaching/escalation to the agent message so
    # both roles carry the analytics for this turn.
    mongo.messages.update_one(
        {"_id": agent_msg_id},
        {"$set": {
            "intent_sentiment_result": out.get("intent_sentiment"),
            "coaching_result": out.get("coaching"),
            "escalation_result": out.get("escalation"),
        }}
    )

    return ConversationTurnResponse(**out)

