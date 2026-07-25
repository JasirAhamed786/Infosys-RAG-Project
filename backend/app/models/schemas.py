"""schemas.py

MongoDB collection schema definitions for Milestone 2.

Now includes intent_sentiment_result and knowledge_result fields
in the message schema for pipeline persistence.
"""

from __future__ import annotations

from typing import Any, Literal


SessionMode = Literal["Simulator", "Manual", "Replay"]


def session_schema() -> dict[str, Any]:
    return {
        "_id": "string(uuid)",
        "mode": "SessionMode",
        "product_context": "string",
        "scenario": "string",
        "persona": "string|null",
        "created_at": "datetime",
        "status": "string",
    }


def message_schema() -> dict[str, Any]:
    """Schema for messages stored in MongoDB.

    Fields:
        _id: Unique message ID (UUID string).
        session_id: Reference to the session.
        turn_index: Sequential turn number.
        role: "customer", "agent", or "system".
        content: Message text content.
        created_at: Timestamp of creation.
        intent_sentiment_result: Result from Intent & Sentiment Agent (optional).
        knowledge_result: Result from Knowledge Recommendation Agent (optional).
        frustration_level: Simulated frustration level from Simulator Agent (optional).
    """
    return {
        "_id": "string(uuid)",
        "session_id": "string",
        "turn_index": "int",
        "role": "customer|agent|system",
        "content": "string",
        "created_at": "datetime",
        "intent_sentiment_result": "dict|null",
        "knowledge_result": "dict|null",
        "frustration_level": "int|null",
    }


def report_schema() -> dict[str, Any]:
    return {
        "_id": "string(uuid)",
        "session_id": "string",
        "summary": "string",
        "metrics": "array",
        "created_at": "datetime",
    }


def knowledge_doc_schema() -> dict[str, Any]:
    return {
        "_id": "string(uuid)",
        "filename": "string",
        "upload_date": "datetime",
        "chunk_count": "int",
        "persona": "string|null",
    }

