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
    """Calculate aggregated telemetry and trends across all sessions and reports safely."""
    mongo.connect()

    total_sessions = mongo.sessions.count_documents({})
    total_messages = mongo.messages.count_documents({})
    reports_cursor = list(mongo.reports.find())

    # 1. Average Resolution Score (Safe extraction)
    scores = []
    for r in reports_cursor:
        score = r.get("resolution_quality_score")
        if isinstance(score, (int, float)):
            scores.append(score)
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    # 2. Intent Distribution from messages (Safe aggregation)
    top_intents = []
    try:
        intent_pipeline = [
            {"$match": {"intent_sentiment_result.intent": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": "$intent_sentiment_result.intent", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_intents = list(mongo.messages.aggregate(intent_pipeline))
    except Exception as e:
        print(f"[analytics] Aggregation error: {e}")

    intent_distribution = [
        {"intent": str(item["_id"]).replace("_", " ").title(), "count": item.get("count", 0)}
        for item in top_intents if item.get("_id")
    ]

    # 3. Frustration Trend over last 10 reports (Safe iteration & math)
    frustration_trend = []
    for r in reports_cursor[-10:]:
        journey = r.get("sentiment_journey", [])
        avg_frust = 30
        
        if isinstance(journey, list) and journey:
            frust_scores = []
            for pt in journey:
                if isinstance(pt, dict):
                    score = pt.get("score")
                    if isinstance(score, (int, float)):
                        frust_scores.append(score)
            if frust_scores:
                avg_frust = round(sum(frust_scores) / len(frust_scores))
        
        # Safely grab the session ID and score
        sess_id = str(r.get("session_id", ""))[:8]
        res_score = r.get("resolution_quality_score")
        res_score = res_score if isinstance(res_score, (int, float)) else 70
        
        frustration_trend.append({
            "session_id": sess_id,
            "average_frustration": avg_frust,
            "resolution_score": res_score,
        })

    # 4. Aggregated Escalation Triggers & Knowledge Gaps (Safe extraction)
    all_triggers = []
    all_gaps = []
    for r in reports_cursor:
        triggers = r.get("escalation_triggers", [])
        if isinstance(triggers, list):
            for t in triggers:
                if t and isinstance(t, str):
                    all_triggers.append(t.strip())
        
        gaps = r.get("knowledge_gaps", [])
        if isinstance(gaps, list):
            for g in gaps:
                if g and isinstance(g, str):
                    all_gaps.append(g.strip())

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