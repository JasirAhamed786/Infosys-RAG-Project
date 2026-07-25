"""
conversation.py

Milestone 2 — Conversation Management with real pipeline integration.

Provides the /conversation/turn endpoint that runs the full orchestration
pipeline (Intent/Sentiment → Knowledge → Simulator) and persists results.
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

    1. Persists the agent's message to MongoDB
    2. Runs the pipeline (Intent/Sentiment → Knowledge → Simulator)
    3. Persists the customer simulation message
    4. Saves intent/sentiment results to the message
    5. Returns the full pipeline result
    """
    mongo.connect()

    if not req.user_message.strip():
        raise HTTPException(status_code=400, detail="user_message must not be empty")

    now = dt.datetime.utcnow()
    agent_msg_id = str(uuid4())

    # Persist agent message
    agent_doc = {
        "_id": agent_msg_id,
        "session_id": req.session_id,
        "turn_index": req.turn_index,
        "role": "agent",
        "content": req.user_message,
        "created_at": now,
    }
    mongo.messages.insert_one(agent_doc)

    # Get conversation history for context
    conversation_history = list(
        mongo.messages.find({"session_id": req.session_id})
        .sort("turn_index", 1)
    )

    # Run the real pipeline
    out = run_pipeline(
        session_id=req.session_id,
        mode=req.mode,
        input_message=req.user_message,
        product_context=req.product_context,
        scenario=req.scenario,
        persona=req.persona,
        conversation_history=conversation_history,
        turn_index=req.turn_index,
    )

    # Persist customer simulation message (if simulator mode)
    customer_msg = out.get("customer_simulation", {}).get("customer_message")
    if customer_msg:
        customer_doc = {
            "_id": str(uuid4()),
            "session_id": req.session_id,
            "turn_index": out.get("customer_simulation", {}).get("turn_index", req.turn_index + 1),
            "role": "customer",
            "content": customer_msg,
            "created_at": now,
            "intent_sentiment_result": out.get("intent_sentiment"),
            "knowledge_result": out.get("knowledge"),
            "frustration_level": out.get("customer_simulation", {}).get("internal_frustration_level"),
        }
        mongo.messages.insert_one(customer_doc)

    # Also attach intent/sentiment to the agent message
    mongo.messages.update_one(
        {"_id": agent_msg_id},
        {"$set": {
            "intent_sentiment_result": out.get("intent_sentiment"),
        }}
    )

    return ConversationTurnResponse(**out)

