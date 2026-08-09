import datetime as dt
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
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


class SessionDetailResponse(BaseModel):
    session_id: str
    mode: str
    product_context: str
    scenario: str
    persona: str | None
    created_at: str
    status: str


class SessionListItem(BaseModel):
    session_id: str
    mode: str
    product_context: str
    scenario: str
    persona: str | None
    created_at: str
    status: str


class SessionListResponse(BaseModel):
    sessions: list[SessionListItem]


@router.get("/sessions", response_model=SessionListResponse)
def list_sessions(limit: int = 20):
    """List the most recently created sessions (newest first).

    Lets a user discover and verify the session IDs they have created
    from the Session Configuration module.
    """
    mongo.connect()

    limit = max(1, min(limit, 200))
    docs = list(
        mongo.sessions.find().sort("created_at", -1).limit(limit)
    )

    sessions = []
    for s in docs:
        sessions.append(SessionListItem(
            session_id=s["_id"],
            mode=s.get("mode", ""),
            product_context=s.get("product_context", ""),
            scenario=s.get("scenario", ""),
            persona=s.get("persona"),
            created_at=s.get("created_at", "").isoformat()
            if isinstance(s.get("created_at"), dt.datetime)
            else str(s.get("created_at", "")),
            status=s.get("status", "unknown"),
        ))

    return SessionListResponse(sessions=sessions)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: str):
    """Retrieve an existing session by its ID.

    Used by the Live Console to load a previously created session
    from the Session Configuration module.
    """
    mongo.connect()

    session = mongo.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionDetailResponse(
        session_id=session["_id"],
        mode=session.get("mode", ""),
        product_context=session.get("product_context", ""),
        scenario=session.get("scenario", ""),
        persona=session.get("persona"),
        created_at=session.get("created_at", "").isoformat() if isinstance(session.get("created_at"), dt.datetime) else str(session.get("created_at", "")),
        status=session.get("status", "unknown"),
    )

