import datetime as dt
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.mongo import mongo

router = APIRouter(tags=["sessions"])


class SessionCreateRequest(BaseModel):
    mode: Literal["Simulator", "Manual", "Replay"]
    product_context: str = Field(..., min_length=1)
    scenario: str = Field(..., min_length=1)
    persona: str | None = None


class SessionCreateResponse(BaseModel):
    session_id: str


@router.post("/sessions", response_model=SessionCreateResponse)
def create_session(req: SessionCreateRequest):
    mongo.connect()

    session_id = str(uuid4())
    now = dt.datetime.utcnow()

    doc = {
        "_id": session_id,
        "mode": req.mode,
        "product_context": req.product_context,
        "scenario": req.scenario,
        "persona": req.persona,
        "created_at": now,
        "status": "created",
    }

    mongo.sessions.insert_one(doc)

    return SessionCreateResponse(session_id=session_id)

