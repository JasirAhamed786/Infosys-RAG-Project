# Milestone 2 Bug Fixes — Implementation Progress

## Bug 1: Upload Endpoint — Missing `chroma_collection_id`
- [x] Add `from app.core.config import settings` import to `knowledge.py`
- [x] Add `chroma_collection_id: str` field to `UploadResponse` model in `knowledge.py`
- [x] Include `chroma_collection_id=settings.CHROMA_COLLECTION_NAME` in upload return

## Bug 2: Knowledge Agent — Query Pollution & Threshold
- [x] Fix `search_query = query_text.strip()` (remove intent/product prefix prepending)
- [x] Change `MIN_SIMILARITY_THRESHOLD` from `0.35` → `0.15`

## Bug 3: Intent & Sentiment Agent — Model & Heuristic Fallback
- [x] Use `getattr(settings, "GROQ_INTENT_MODEL", "llama-3.1-8b-instant")` for dynamic model
- [x] Fall back to `_heuristic_analysis` when API returns error (not just when no API key)

