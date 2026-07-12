"""escalation.py (stub routes)

Milestone 3: Escalation Risk Detection and Alert Module

TODO: Milestone 3 - Replace with pipeline output + persistence.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.mongo import mongo


router = APIRouter(tags=["escalation"])


class EscalationAlert(BaseModel):
    session_id: str
    risk: Literal["low", "medium", "high"]
    score: float
    reasons: list[str]


class EscalationAlertsResponse(BaseModel):
    alerts: list[EscalationAlert]


@router.get("/escalation/alerts", response_model=EscalationAlertsResponse)
def get_escalation_alerts():
    mongo.connect()

    return EscalationAlertsResponse(
        alerts=[
            {
                "session_id": "mock-session-id",
                "risk": "medium",
                "score": 0.62,
                "reasons": [
                    "Customer sentiment indicates dissatisfaction.",
                    "Billing dispute intent may require verification.",
                ],
            }
        ]
    )

