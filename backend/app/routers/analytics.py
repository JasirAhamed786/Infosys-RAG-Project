"""analytics.py (stub routes)

Milestone 4: Analytics Dashboard

TODO: Milestone 4 - Replace with aggregated metrics computed from reports.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.mongo import mongo


router = APIRouter(tags=["analytics"])


class AnalyticsChart(BaseModel):
    title: str
    type: str
    data: list[dict[str, Any]]


class AnalyticsResponse(BaseModel):
    charts: list[AnalyticsChart]


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics():
    mongo.connect()

    return AnalyticsResponse(
        charts=[
            {
                "title": "Escalation Risk Trend",
                "type": "line",
                "data": [
                    {"x": "T1", "y": 0.2},
                    {"x": "T2", "y": 0.4},
                    {"x": "T3", "y": 0.35},
                ],
            },
            {
                "title": "Coaching Tip Effectiveness",
                "type": "bar",
                "data": [
                    {"x": "Tip A", "y": 0.72},
                    {"x": "Tip B", "y": 0.64},
                    {"x": "Tip C", "y": 0.81},
                ],
            },
        ]
    )

