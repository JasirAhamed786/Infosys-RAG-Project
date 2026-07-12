"""schemas.py

MongoDB collection schema definitions (scaffolding)

This project currently uses plain MongoDB collections without schema validation
at the DB level. These Pydantic-like shapes document expected fields.

TODO: Milestone 2/3/4 - Add stricter validation and/or Pydantic models.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID


# NOTE: Using type aliases as lightweight schema documentation.

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
    return {
        "_id": "string(uuid)",
        "session_id": "string",
        "turn_index": "int",
        "role": "customer|agent|system",
        "content": "string",
        "created_at": "datetime",
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
        "chroma_collection_id": "string",
        "persona": "string|null",
    }

