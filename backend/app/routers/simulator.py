"""simulator.py (stub routes)

Milestone 2: Customer Simulator Agent and Conversation Management

Endpoints in this file are scaffolding only and return mock data.

TODO: Milestone 2 - Connect these endpoints to the real orchestration pipeline
and MongoDB message persistence.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.mongo import mongo


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


@router.post("/simulator/start", response_model=SimulatorStartResponse)
def start_simulator(req: SimulatorStartRequest):
    mongo.connect()

    # TODO: Milestone 2 - validate session exists and persist thread.
    thread_id = str(uuid4())

    welcome = {
        "role": "customer",
        "content": "Hi—I'm calling about a recurring late fee. I’m not sure why it keeps happening.",
        "turn_index": 0,
    }

    mongo.messages.insert_one({
        "_id": str(uuid4()),
        "session_id": req.session_id,
        "thread_id": thread_id,
        "turn_index": 0,
        "role": "customer",
        "content": welcome["content"],
    })

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

    # TODO: Milestone 2 - call run_pipeline_mock or simulator agent with real state.
    customer_message = (
        "I understand, but the fee keeps showing up even though I pay on time. "
        "Can you check what’s triggering it?"
    )

    mongo.messages.insert_one({
        "_id": str(uuid4()),
        "session_id": req.session_id,
        "thread_id": req.thread_id,
        "turn_index": req.turn_index + 1,
        "role": "customer",
        "content": customer_message,
    })

    return {
        "session_id": req.session_id,
        "thread_id": req.thread_id,
        "turn_index": req.turn_index + 1,
        "customer_message": customer_message,
        "metadata": {"tone": "frustrated"},
    }

