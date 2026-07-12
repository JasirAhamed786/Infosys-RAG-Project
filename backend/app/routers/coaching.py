"""coaching.py (stub routes)

Milestone 3: Live Coaching Feed

Endpoints return mock coaching tips/drafts.

TODO: Milestone 3 - Replace with real conversation persistence and streaming if needed.
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.mongo import mongo


router = APIRouter(tags=["coaching"])


class CoachingFeedRequest(BaseModel):
    session_id: str
    turn_index: int = Field(default=0, ge=0)


class CoachingTip(BaseModel):
    tip: str
    severity: str = "normal"


class CoachingFeedResponse(BaseModel):
    session_id: str
    turn_index: int
    coaching_tips: list[CoachingTip]
    suggested_response: str


@router.get("/coaching/feed/{session_id}", response_model=CoachingFeedResponse)
def get_coaching_feed(session_id: str, turn_index: int = 0):
    mongo.connect()

    return CoachingFeedResponse(
        session_id=session_id,
        turn_index=turn_index,
        coaching_tips=[
            {"tip": "Acknowledge frustration and confirm timeline.", "severity": "normal"},
            {"tip": "Ask 1 clarifying question before suggesting dispute steps.", "severity": "normal"},
        ],
        suggested_response=(
            "I’m sorry this keeps happening. Let’s verify the posting details and payment context so we can correct the issue. "
            "Could you share the date you noticed the late fee?"
        ),
    )

