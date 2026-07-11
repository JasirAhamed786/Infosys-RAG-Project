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
    collection_id: str
    query: str


class KnowledgeChunk(BaseModel):
    text: str
    similarity: float


class KnowledgeQueryResponse(BaseModel):
    results: list[KnowledgeChunk]


@router.post("/knowledge/upload")
def upload_knowledge(
    file: UploadFile = File(...),
    # Optional label to help debug; stored as filename anyway
    persona: str | None = Form(default=None),
):
    mongo.connect()

    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()

    if suffix not in [".pdf", ".txt"]:
        raise HTTPException(status_code=400, detail="Only PDF and .txt files are supported")

    # Create a unique Chroma collection for this file upload.
    chroma_collection_id = str(uuid4())

    raw_bytes = file.file.read()
    text = rag_service.extract_text_from_bytes(raw_bytes, suffix=suffix)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Uploaded file contained no extractable text")

    chunks = rag_service.chunk_text(text)
    embeddings = rag_service.embed_chunks(chunks)

    rag_service.store_in_chroma(
        collection_id=chroma_collection_id,
        chunks=chunks,
        embeddings=embeddings,
        persist=True,
    )

    now = dt.datetime.utcnow()
    mongo.knowledge_docs.insert_one(
        {
            "_id": str(uuid4()),
            "filename": filename,
            "upload_date": now,
            "chunk_count": len(chunks),
            "chroma_collection_id": chroma_collection_id,
            "persona": persona,
        }
    )

    return {
        "chroma_collection_id": chroma_collection_id,
        "chunk_count": len(chunks),
    }


@router.post("/knowledge/query", response_model=KnowledgeQueryResponse)
def query_knowledge(req: KnowledgeQueryRequest):
    mongo.connect()

    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    results = rag_service.query_chroma(
        collection_id=req.collection_id,
        query=req.query,
        top_k=3,
    )

    return KnowledgeQueryResponse(
        results=[KnowledgeChunk(text=r["text"], similarity=float(r["similarity"])) for r in results]
    )

