"""
analytics.py

Milestone 4 — Cross-Session Performance Analytics Module.
"""

from __future__ import annotations

import datetime as dt
from fastapi import APIRouter
from app.services.mongo import mongo

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_analytics_dashboard():
    """Calculate aggregated telemetry and trends across all sessions and reports."""
    mongo.connect()

    total_sessions = mongo.sessions.count_documents({})
    total_messages = mongo.messages.count_documents({})
    reports_cursor = list(mongo.reports.find())

    # 1. Average Resolution Score
    scores = [r.get("resolution_quality_score", 0) for r in reports_cursor if r.get("resolution_quality_score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    # 2. Intent Distribution from messages
    intent_pipeline = [
        {"$match": {"intent_sentiment_result.intent": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$intent_sentiment_result.intent", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_intents = list(mongo.messages.aggregate(intent_pipeline))
    intent_distribution = [
        {"intent": item["_id"].replace("_", " ").title(), "count": item["count"]}
        for item in top_intents if item.get("_id")
    ]

    # 3. Frustration Trend over last 10 reports
    frustration_trend = []
    for r in reports_cursor[-10:]:
        journey = r.get("sentiment_journey", [])
        avg_frust = 30
        if journey:
            frust_scores = [pt.get("score", 30) for pt in journey if isinstance(pt, dict)]
            if frust_scores:
                avg_frust = round(sum(frust_scores) / len(frust_scores))
        frustration_trend.append({
            "session_id": r.get("session_id", "")[:8],
            "average_frustration": avg_frust,
            "resolution_score": r.get("resolution_quality_score", 70),
        })

    # 4. Aggregated Escalation Triggers & Knowledge Gaps
    all_triggers = []
    all_gaps = []
    for r in reports_cursor:
        for t in r.get("escalation_triggers", []):
            if t:
                all_triggers.append(t)
        for g in r.get("knowledge_gaps", []):
            if g:
                all_gaps.append(g)

    return {
        "summary": {
            "total_sessions": total_sessions,
            "completed_reports": len(reports_cursor),
            "total_messages": total_messages,
            "avg_resolution_score": avg_score,
        },
        "intent_distribution": intent_distribution,
        "frustration_trend": frustration_trend,
        "top_escalation_triggers": list(set(all_triggers))[:6],
        "identified_knowledge_gaps": list(set(all_gaps))[:6],
    }