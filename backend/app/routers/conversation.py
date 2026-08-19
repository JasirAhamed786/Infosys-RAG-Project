"""
conversation.py

Milestone 2 — Conversation Management with real pipeline integration and
Milestone 3 persistence of coaching + escalation results.

Milestone 3 addition: Manual mode support. In Simulator mode, req.user_message
is what the AGENT typed to the (simulated) customer, and the Simulator Agent
generates the customer's reply inside the pipeline. In Manual mode there is
no Simulator Agent generating anything — the agent instead pastes in the
REAL customer's incoming message, so req.user_message IS the customer's
message and is persisted as role="customer" directly. Replay mode is driven
by /api/replay/next (see replay.py), not this endpoint, but the same branch
is kept here for safety if a client posts a Replay turn directly through
this endpoint.

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

    Simulator mode:
      1. Persists the agent's message to MongoDB (idempotent, role="agent")
      2. Runs the pipeline (Intent/Sentiment → Knowledge → Simulator →
         Coaching → Escalation)
      3. Persists the customer simulation message (idempotent,
         role="customer") and attaches coaching + escalation to it
      4. Attaches intent/sentiment + coaching/escalation to the agent message

    Manual mode:
      1. Persists req.user_message as the CUSTOMER's message (idempotent,
         role="customer") — there is no separate simulator-generated reply
      2. Runs the pipeline (Simulator Agent is skipped automatically since
         mode != "Simulator")
      3. Attaches intent/sentiment + knowledge + coaching + escalation
         directly onto that same customer message document
    """
    mongo.connect()

    if not req.user_message.strip():
        raise HTTPException(status_code=400, detail="user_message must not be empty")

    now = dt.datetime.utcnow()

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

    is_manual_or_replay = effective_mode in ("Manual", "Replay")

    # ── Persist the incoming message ──
    # Simulator mode: req.user_message is what the AGENT typed -> role="agent".
    # Manual/Replay mode: req.user_message IS the customer's message -> role="customer".
    primary_role = "customer" if is_manual_or_replay else "agent"

    existing_primary = mongo.messages.find_one({
        "session_id": req.session_id,
        "turn_index": req.turn_index,
        "role": primary_role,
    })
    if existing_primary:
        primary_msg_id = existing_primary["_id"]
        print(f"[conversation] {primary_role} message already exists for turn {req.turn_index}, skipping insert")
    else:
        primary_msg_id = str(uuid4())
        mongo.messages.insert_one({
            "_id": primary_msg_id,
            "session_id": req.session_id,
            "turn_index": req.turn_index,
            "role": primary_role,
            "content": req.user_message,
            "created_at": now,
        })

    # Get conversation history for context (includes the message just inserted above)
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

    if is_manual_or_replay:
        # The primary message inserted above IS the customer message
        # (pipeline.py overlays customer_simulation.customer_message to
        # match it exactly). Attach the analysis directly onto that same
        # document instead of inserting a second one.
        mongo.messages.update_one(
            {"_id": primary_msg_id},
            {"$set": {
                "intent_sentiment_result": out.get("intent_sentiment"),
                "knowledge_result": out.get("knowledge"),
                "coaching_result": out.get("coaching"),
                "escalation_result": out.get("escalation"),
                "frustration_level": out.get("customer_simulation", {}).get("internal_frustration_level"),
            }}
        )
    else:
        # Simulator mode — unchanged behavior: persist the simulator-
        # generated customer reply (if any) as a second document, and
        # attach intent/sentiment + coaching/escalation to the agent message.
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
            {"_id": primary_msg_id},
            {"$set": {
                "intent_sentiment_result": out.get("intent_sentiment"),
                "coaching_result": out.get("coaching"),
                "escalation_result": out.get("escalation"),
            }}
        )

    return ConversationTurnResponse(**out)