"""reports.py (stub routes)

Milestone 4: Post-Interaction Report

TODO: Milestone 4 - Replace mocks with summary agent + persistence.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.mongo import mongo


router = APIRouter(tags=["reports"])


class ReportMetric(BaseModel):
    name: str
    value: str | int | float


class SessionReportResponse(BaseModel):
    session_id: str
    summary: str
    metrics: list[ReportMetric]


@router.get("/reports/{session_id}", response_model=SessionReportResponse)
def get_report(session_id: str):
    mongo.connect()

    return SessionReportResponse(
        session_id=session_id,
        summary="Mock report: agent acknowledged customer frustration, verified posting details, and prepared dispute workflow.",
        metrics=[
            {"name": "turn_count", "value": 3},
            {"name": "escalation_recommended", "value": "no"},
        ],
    )

