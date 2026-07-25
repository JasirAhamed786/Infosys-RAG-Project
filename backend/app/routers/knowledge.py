"""
knowledge.py

Milestone 2 — Refactored for SHARED ChromaDB collection.

Upload endpoint now stores all documents into the single shared collection
with metadata tagging. Query endpoint uses the shared collection by default
with optional metadata filtering.

Milestone 1 functionality (Session Config, Knowledge Base upload, RAG test
query) is preserved and improved.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.mongo import mongo
from app.services.rag import rag_service

router = APIRouter(tags=["knowledge"])


class KnowledgeQueryRequest(BaseModel):
    query: str
    top_k: int = 3
    filter_source_document: str | None = None
    filter_category: str | None = None


class KnowledgeResult(BaseModel):
    text: str
    similarity: float
    source_document: str
    chunk_index: int
    upload_date: str


class KnowledgeQueryResponse(BaseModel):
    results: list[KnowledgeResult]
    total_chunks_in_collection: int


class UploadResponse(BaseModel):
    filename: str
    chunk_count: int
    total_chunks_in_collection: int


class CollectionStatsResponse(BaseModel):
    collection_name: str
    total_chunks: int
    embedding_model: str


@router.post("/knowledge/upload", response_model=UploadResponse)
def upload_knowledge(
    file: UploadFile = File(...),
    persona: str | None = Form(default=None),
):
    """Upload a document to the SHARED knowledge base collection.

    All documents are stored in a single ChromaDB collection with metadata
    tags (source_document, chunk_index, upload_date) for provenance tracking.
    """
    mongo.connect()

    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()

    if suffix not in [".pdf", ".txt"]:
        raise HTTPException(status_code=400, detail="Only PDF and .txt files are supported")

    raw_bytes = file.file.read()
    text = rag_service.extract_text_from_bytes(raw_bytes, suffix=suffix)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Uploaded file contained no extractable text")

    chunks = rag_service.chunk_text(text)
    embeddings = rag_service.embed_chunks(chunks)

    chunk_count = rag_service.store_in_chroma(
        filename=filename,
        chunks=chunks,
        embeddings=embeddings,
    )

    now = dt.datetime.utcnow()
    mongo.knowledge_docs.insert_one(
        {
            "_id": str(uuid4()),
            "filename": filename,
            "upload_date": now,
            "chunk_count": chunk_count,
            "persona": persona,
        }
    )

    stats = rag_service.get_collection_stats()

    return UploadResponse(
        filename=filename,
        chunk_count=chunk_count,
        total_chunks_in_collection=stats["total_chunks"],
    )


@router.post("/knowledge/query", response_model=KnowledgeQueryResponse)
def query_knowledge(req: KnowledgeQueryRequest):
    """Query the SHARED knowledge base collection with optional metadata filters.

    If filter_source_document is provided, only chunks from that document
    are searched. Otherwise, search across ALL uploaded documents.
    """
    mongo.connect()

    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    # Build optional metadata filter
    filter_metadata = None
    if req.filter_source_document:
        filter_metadata = {"source_document": req.filter_source_document}
    elif req.filter_category:
        filter_metadata = {"category": req.filter_category}

    results = rag_service.query_chroma(
        query=req.query,
        top_k=req.top_k,
        filter_metadata=filter_metadata,
    )

    stats = rag_service.get_collection_stats()

    return KnowledgeQueryResponse(
        results=[
            KnowledgeResult(
                text=r["text"],
                similarity=float(r["similarity"]),
                source_document=r["source_document"],
                chunk_index=r["chunk_index"],
                upload_date=r["upload_date"],
            )
            for r in results
        ],
        total_chunks_in_collection=stats["total_chunks"],
    )


@router.get("/knowledge/stats", response_model=CollectionStatsResponse)
def get_knowledge_stats():
    """Get statistics about the knowledge base collection."""
    stats = rag_service.get_collection_stats()
    return CollectionStatsResponse(**stats)


@router.post("/knowledge/delete-all")
def delete_all_knowledge():
    """Delete all knowledge base data and recreate the collection."""
    rag_service.delete_collection()
    mongo.connect()
    mongo.knowledge_docs.delete_many({})
    return {"status": "deleted", "message": "All knowledge base data deleted. Collection recreated."}

