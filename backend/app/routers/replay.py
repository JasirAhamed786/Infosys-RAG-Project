"""
replay.py

Milestone 3 — Replay Mode.

Lets an agent upload a pre-existing support transcript and step through it
message by message, running the SAME coaching pipeline (Intent/Sentiment ->
Knowledge -> Coaching -> Escalation) on each customer message as if it had
just arrived live. No new agent logic is introduced here — this reuses
run_pipeline() exactly like conversation.py does; the only new thing is
WHERE the customer message comes from (a stored transcript, stepped through
by position, instead of live simulator generation or a live paste).

Transcript format accepted by /replay/upload:
  Plain text, one message per line, prefixed with the speaker:
    Customer: <text>
    Agent: <text>
  Blank lines are ignored. Lines without a recognized "Customer:"/"Agent:"
  prefix are skipped rather than raising, so a slightly messy paste doesn't
  fail the whole upload.
"""

from __future__ import annotations

import datetime as dt
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.orchestration.pipeline import run_pipeline
from app.services.mongo import mongo

router = APIRouter(tags=["replay"])


def _parse_transcript(raw_text: str) -> list[dict[str, str]]:
    """Parse a plain-text transcript into an ordered list of {role, content}."""
    turns: list[dict[str, str]] = []
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        lower = line.lower()
        if lower.startswith("customer:"):
            turns.append({"role": "customer", "content": line.split(":", 1)[1].strip()})
        elif lower.startswith("agent:"):
            turns.append({"role": "agent", "content": line.split(":", 1)[1].strip()})
    return turns


class ReplayUploadResponse(BaseModel):
    session_id: str
    total_turns: int
    position: int


@router.post("/replay/upload", response_model=ReplayUploadResponse)
async def upload_replay_transcript(
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a transcript file for Replay mode.

    Accepts a .txt file with "Customer:"/"Agent:" prefixed lines (see
    _parse_transcript). Stores the parsed transcript against the session
    and resets the step position to 0.
    """
    mongo.connect()

    session = mongo.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    raw_bytes = await file.read()
    try:
        raw_text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Transcript file must be UTF-8 text")

    turns = _parse_transcript(raw_text)
    if not turns:
        raise HTTPException(
            status_code=400,
            detail='No recognizable lines found. Use "Customer: ..." / "Agent: ..." per line.',
        )

    mongo.replay_transcripts.update_one(
        {"_id": session_id},
        {"$set": {
            "_id": session_id,
            "session_id": session_id,
            "turns": turns,
            "position": 0,
            "uploaded_at": dt.datetime.utcnow(),
        }},
        upsert=True,
    )

    print(f"[replay] Uploaded transcript for session {session_id}: {len(turns)} turns")

    return ReplayUploadResponse(session_id=session_id, total_turns=len(turns), position=0)


class ReplayStatusResponse(BaseModel):
    session_id: str
    total_turns: int
    position: int
    done: bool


@router.get("/replay/status/{session_id}", response_model=ReplayStatusResponse)
def replay_status(session_id: str):
    """Return the current step position for a session's uploaded transcript."""
    mongo.connect()
    doc = mongo.replay_transcripts.find_one({"_id": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="No transcript uploaded for this session")
    total = len(doc.get("turns", []))
    position = doc.get("position", 0)
    return ReplayStatusResponse(
        session_id=session_id, total_turns=total, position=position, done=position >= total,
    )


class ReplayNextResponse(BaseModel):
    session_id: str
    done: bool
    role: Literal["customer", "agent"] | None = None
    content: str | None = None
    turn_index: int
    position: int
    total_turns: int
    intent_sentiment: dict[str, Any] | None = None
    knowledge: dict[str, Any] | None = None
    coaching: dict[str, Any] | None = None
    escalation: dict[str, Any] | None = None
    customer_simulation: dict[str, Any] | None = None


@router.post("/replay/next", response_model=ReplayNextResponse)
def replay_next(session_id: str = Form(...)):
    """Advance the replay transcript by one line.

    - If the next line is a CUSTOMER message: run the full coaching
      pipeline on it (Intent/Sentiment -> Knowledge -> Coaching ->
      Escalation), persist it, and return the analysis — exactly like a
      live turn.
    - If the next line is an AGENT message: persist it as context (no
      pipeline run — coaching applies to customer messages, not the
      historical agent's own past replies) and return it so the UI can
      render the historical exchange in the correct order.
    """
    mongo.connect()

    session = mongo.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript_doc = mongo.replay_transcripts.find_one({"_id": session_id})
    if not transcript_doc:
        raise HTTPException(status_code=404, detail="No transcript uploaded for this session")

    turns = transcript_doc.get("turns", [])
    position = transcript_doc.get("position", 0)

    if position >= len(turns):
        return ReplayNextResponse(
            session_id=session_id, done=True, turn_index=position,
            position=position, total_turns=len(turns),
        )

    current = turns[position]
    role = current.get("role", "customer")
    content = current.get("content", "")
    turn_index = position

    now = dt.datetime.utcnow()
    existing = mongo.messages.find_one({
        "session_id": session_id, "turn_index": turn_index, "role": role,
    })
    if existing:
        msg_id = existing["_id"]
    else:
        msg_id = str(uuid4())
        mongo.messages.insert_one({
            "_id": msg_id,
            "session_id": session_id,
            "turn_index": turn_index,
            "role": role,
            "content": content,
            "created_at": now,
        })

    intent_sentiment = knowledge = coaching = escalation = None
    customer_simulation = None

    if role == "customer":
        conversation_history = list(
            mongo.messages.find({"session_id": session_id}).sort("turn_index", 1)
        )
        out = run_pipeline(
            session_id=session_id,
            mode="Replay",
            input_message=content,
            product_context=session.get("product_context", ""),
            scenario=session.get("scenario", ""),
            persona=session.get("persona"),
            conversation_history=conversation_history,
            turn_index=turn_index,
        )
        intent_sentiment = out.get("intent_sentiment")
        knowledge = out.get("knowledge")
        coaching = out.get("coaching")
        escalation = out.get("escalation")
        customer_simulation = out.get("customer_simulation")

        mongo.messages.update_one(
            {"_id": msg_id},
            {"$set": {
                "intent_sentiment_result": intent_sentiment,
                "knowledge_result": knowledge,
                "coaching_result": coaching,
                "escalation_result": escalation,
                "frustration_level": (customer_simulation or {}).get("internal_frustration_level"),
            }}
        )

    new_position = position + 1
    mongo.replay_transcripts.update_one(
        {"_id": session_id}, {"$set": {"position": new_position}}
    )

    return ReplayNextResponse(
        session_id=session_id,
        done=new_position >= len(turns),
        role=role,
        content=content,
        turn_index=turn_index,
        position=new_position,
        total_turns=len(turns),
        intent_sentiment=intent_sentiment,
        knowledge=knowledge,
        coaching=coaching,
        escalation=escalation,
        customer_simulation=customer_simulation,
    )