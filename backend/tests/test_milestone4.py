"""
test_milestone4.py

Unit and integration tests for Milestone 4:
- Post-Interaction Summary Agent
- Reports Router
- Analytics Dashboard Aggregations
"""

import pytest
from app.agents.summary_agent import run_summary_agent
from app.services.mongo import mongo


@pytest.fixture(autouse=True)
def init_db():
    mongo.connect()


def test_summary_agent_fallback_structure():
    """Ensure summary agent returns all necessary fields even without network/API."""
    result = run_summary_agent(
        session_id="test-session-123",
        conversation_history=[
            {"role": "customer", "content": "I need help with my bill", "turn_index": 1},
            {"role": "agent", "content": "I can help with that.", "turn_index": 1},
        ],
        product_context="Billing",
        scenario="Disputed charge",
    )

    assert "interaction_summary" in result
    assert "resolution_quality_score" in result
    assert isinstance(result["resolution_quality_score"], int)
    assert "sentiment_journey" in result
    assert "coaching_recommendations" in result
    assert "escalation_triggers" in result
    assert "knowledge_gaps" in result


def test_summary_agent_empty_history():
    """Ensure empty conversations are handled gracefully."""
    result = run_summary_agent(
        session_id="test-empty",
        conversation_history=[],
    )
    assert result["agent"] == "post_interaction_summary"
    assert result["resolution_quality_score"] == 75