"""
rag.py

RAG Service — Milestone 2 refactored for SHARED ChromaDB collection.

All uploaded documents are stored in ONE shared ChromaDB collection
("clario_knowledge_base") with metadata tagging (source_document,
chunk_index, upload_date) so search queries across ALL documents at once.

Optional metadata filtering is supported via the filter_metadata parameter
in query_chroma().
"""

from __future__ import annotations

import datetime as dt
import re
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from app.core.config import settings


class RAGService:
    def __init__(self):
        self.embedder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)

        # Persistent chroma directory (local)
        self.chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(allow_reset=True),
        )

        # Ensure the shared collection exists with cosine similarity
        self.shared_collection = self.chroma_client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def extract_text_from_bytes(self, raw_bytes: bytes, suffix: str) -> str:
        if suffix in (".txt", ".md"):
            return raw_bytes.decode("utf-8", errors="ignore")

        if suffix == ".pdf":
            from io import BytesIO

            from pypdf import PdfReader

            reader = PdfReader(BytesIO(raw_bytes))
            text_parts: list[str] = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            return "\n".join(text_parts)

        raise ValueError(f"Unsupported suffix: {suffix}")

    def chunk_text(self, text: str, min_words: int = 80) -> list[str]:
        """Chunk into ~300-500 words with overlap."""
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()
        words = text.split(" ")

        target_words = 380
        overlap_words = 60
        step = max(1, target_words - overlap_words)

        chunks: list[str] = []
        for start in range(0, len(words), step):
            end = min(len(words), start + target_words)
            chunk_words = words[start:end]
            if len(chunk_words) < min_words:
                continue
            chunks.append(" ".join(chunk_words))

        return chunks

    def embed_chunks(self, chunks: list[str]) -> list[list[float]]:
        vectors = self.embedder.encode(chunks, show_progress_bar=False, convert_to_numpy=True)
        return vectors.tolist()

    def store_in_chroma(
        self,
        filename: str,
        chunks: list[str],
        embeddings: list[list[float]],
        persist: bool = True,
    ) -> int:
        """Store chunks in the SHARED collection with metadata.

        Args:
            filename: Source document filename (stored as metadata).
            chunks: List of text chunks.
            embeddings: Precomputed embeddings for each chunk.

        Returns:
            Number of chunks stored.
        """
        upload_date = dt.datetime.utcnow().isoformat()

        # Generate unique IDs with a prefix to avoid collisions across uploads
        ids = [f"{filename}_chunk_{i}_{dt.datetime.utcnow().timestamp()}" for i in range(len(chunks))]

        metadatas = [
            {
                "source_document": filename,
                "chunk_index": i,
                "upload_date": upload_date,
            }
            for i in range(len(chunks))
        ]

        # Add to the shared collection (already initialized in __init__)
        self.shared_collection.add(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return len(chunks)

    def query_chroma(
        self,
        query: str,
        top_k: int = 3,
        filter_metadata: dict[str, str] | None = None,
    ) -> list[dict[str, Any]]:
        """Query the SHARED ChromaDB collection.

        Searches across ALL uploaded documents at once. Supports optional
        metadata filtering (e.g. {"source_document": "faq.pdf"} or
        {"category": "billing"} if stored).

        Args:
            query: The search query text.
            top_k: Number of results to return (default 3).
            filter_metadata: Optional metadata filter dict.

        Returns:
            List of dicts with keys: text, similarity, source_document,
            chunk_index, upload_date.
        """
        q_vec = self.embedder.encode([query], convert_to_numpy=True)[0].tolist()

        # Prepare the where filter if provided
        where_filter = None
        if filter_metadata:
            # ChromaDB supports simple equality filters on metadata
            where_filter = filter_metadata

        results = self.shared_collection.query(
            query_embeddings=[q_vec],
            n_results=top_k,
            include=["documents", "distances", "metadatas"],
            where=where_filter,
        )

        out = []
        docs = results.get("documents", [[]])[0]
        dists = results.get("distances", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        for doc, dist, meta in zip(docs, dists, metas):
            similarity = 1.0 - float(dist)
            out.append({
                "text": doc,
                "similarity": similarity,
                "source_document": meta.get("source_document", "unknown") if meta else "unknown",
                "chunk_index": meta.get("chunk_index", -1) if meta else -1,
                "upload_date": meta.get("upload_date", "") if meta else "",
            })

        return out

    def get_collection_stats(self) -> dict[str, Any]:
        """Get statistics about the shared collection."""
        count = self.shared_collection.count()
        return {
            "collection_name": settings.CHROMA_COLLECTION_NAME,
            "total_chunks": count,
            "embedding_model": settings.EMBEDDING_MODEL_NAME,
        }

    def delete_collection(self):
        """Delete and recreate the shared collection (useful for testing)."""
        self.chroma_client.delete_collection(settings.CHROMA_COLLECTION_NAME)
        self.shared_collection = self.chroma_client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )


rag_service = RAGService()

