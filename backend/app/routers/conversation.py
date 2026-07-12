"""conversation.py (stub routes)

Milestone 2/3: Conversation Management

This router provides a single "turn" endpoint that wires the orchestration
pipeline later. For now it returns mock structured outputs.

TODO: Milestone 3 - Replace mocks with run_pipeline_mock + persistence.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.mongo import mongo
from app.orchestration.pipeline import run_pipeline_mock


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
    stage2_route: str


@router.post("/conversation/turn", response_model=ConversationTurnResponse)
def conversation_turn(req: ConversationTurnRequest):
    mongo.connect()

    if not req.user_message.strip():
        raise HTTPException(status_code=400, detail="user_message must not be empty")

    # Persist user message (mock persistence)
    mongo.messages.insert_one({
        "_id": str(uuid4()),
        "session_id": req.session_id,
        "turn_index": req.turn_index,
        "role": "agent",
        "content": req.user_message,
    })

    out = run_pipeline_mock(
        session_id=req.session_id,
        mode=req.mode,
        input_message=req.user_message,
        product_context=req.product_context,
        scenario=req.scenario,
        persona=req.persona,
    )

    # Persist customer simulation message (mock)
    mongo.messages.insert_one({
        "_id": str(uuid4()),
        "session_id": req.session_id,
        "turn_index": out["turn_index"],
        "role": "customer",
        "content": out["customer_simulation"]["customer_message"],
    })

    return ConversationTurnResponse(**out)

