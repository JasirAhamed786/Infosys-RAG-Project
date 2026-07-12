import re
from typing import Iterable

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

    def extract_text_from_bytes(self, raw_bytes: bytes, suffix: str) -> str:
        if suffix == ".txt":
            return raw_bytes.decode("utf-8", errors="ignore")

        if suffix == ".pdf":
            from pypdf import PdfReader
            from io import BytesIO

            reader = PdfReader(BytesIO(raw_bytes))
            text_parts: list[str] = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            return "\n".join(text_parts)

        raise ValueError(f"Unsupported suffix: {suffix}")

    def chunk_text(self, text: str, min_words: int = 80) -> list[str]:
        """Chunk into ~300-500 words with overlap.

        Implementation: split into words, then create windows.
        """
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
        return vectors.tolist()  # Chroma expects list[float]

    def store_in_chroma(
        self,
        collection_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
        persist: bool = True,
    ):
        # 👇 CRITICAL FIX: Explicitly set hnsw:space to cosine for accurate similarity % scores! 👇
        collection = self.chroma_client.get_or_create_collection(
            name=collection_id,
            metadata={"hnsw:space": "cosine"}
        )

        ids = [f"chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"chunk_index": i} for i in range(len(chunks))]

        # Store documents as raw chunk text
        collection.add(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        # Removed self.chroma_client.persist() because PersistentClient
        # in modern ChromaDB handles persistence automatically on add().

    def query_chroma(self, collection_id: str, query: str, top_k: int = 3):
        collection = self.chroma_client.get_collection(name=collection_id)

        q_vec = self.embedder.encode([query], convert_to_numpy=True)[0].tolist()

        # query returns distances; we convert to a similarity-like score
        # Now that we explicitly set Cosine space above, this formula is 100% accurate!
        results = collection.query(
            query_embeddings=[q_vec],
            n_results=top_k,
            include=["documents", "distances"],
        )

        out = []
        docs = results.get("documents", [[]])[0]
        dists = results.get("distances", [[]])[0]

        for doc, dist in zip(docs, dists):
            # If distance is cosine distance: similarity = 1 - distance
            similarity = 1.0 - float(dist)
            out.append({"text": doc, "similarity": similarity})

        return out


rag_service = RAGService()