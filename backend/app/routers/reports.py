"""
reports.py

Milestone 4 — Post-Interaction Reports API Router.
"""

from __future__ import annotations

import datetime as dt
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.summary_agent import run_summary_agent
from app.services.mongo import mongo

router = APIRouter(prefix="/api/reports", tags=["reports"])


class GenerateReportRequest(BaseModel):
    session_id: str


@router.post("/generate/{session_id}")
def generate_report(session_id: str):
    """Generate and persist post-interaction summary report."""
    mongo.connect()

    session = mongo.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch all messages ordered by turn
    messages = list(
        mongo.messages.find({"session_id": session_id}).sort("turn_index", 1)
    )

    if not messages:
        raise HTTPException(status_code=400, detail="Cannot generate report for empty session")

    # Run Summary Agent
    report_data = run_summary_agent(
        session_id=session_id,
        conversation_history=messages,
        product_context=session.get("product_context", ""),
        scenario=session.get("scenario", ""),
    )

    now = dt.datetime.utcnow()
    report_doc = {
        "_id": str(uuid4()),
        "session_id": session_id,
        "mode": session.get("mode", "Simulator"),
        "product_context": session.get("product_context", ""),
        "scenario": session.get("scenario", ""),
        "persona": session.get("persona"),
        "interaction_summary": report_data.get("interaction_summary"),
        "resolution_quality_score": report_data.get("resolution_quality_score"),
        "sentiment_journey": report_data.get("sentiment_journey"),
        "coaching_recommendations": report_data.get("coaching_recommendations"),
        "escalation_triggers": report_data.get("escalation_triggers"),
        "knowledge_gaps": report_data.get("knowledge_gaps"),
        "total_turns": len([m for m in messages if m.get("role") == "customer"]),
        "created_at": now,
    }

    # Upsert report
    mongo.reports.update_one(
        {"session_id": session_id},
        {"$set": report_doc},
        upsert=True,
    )

    # Mark session completed
    mongo.sessions.update_one(
        {"_id": session_id},
        {"$set": {"status": "completed", "completed_at": now}},
    )

    # Convert for JSON response
    report_doc["created_at"] = report_doc["created_at"].isoformat()
    return report_doc


@router.get("/{session_id}")
def get_report(session_id: str):
    """Retrieve existing report by session ID."""
    mongo.connect()
    report = mongo.reports.find_one({"session_id": session_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found for this session")

    if isinstance(report.get("created_at"), dt.datetime):
        report["created_at"] = report["created_at"].isoformat()
    return report


@router.get("")
def list_reports():
    """List all completed session reports."""
    mongo.connect()
    cursor = mongo.reports.find().sort("created_at", -1).limit(50)
    reports = []
    for doc in cursor:
        if isinstance(doc.get("created_at"), dt.datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        reports.append(doc)
    return {"reports": reports, "total": len(reports)}