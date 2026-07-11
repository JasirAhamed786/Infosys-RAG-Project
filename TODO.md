# TODO - AI Customer Support Coaching Assistant (Milestone 1)

## Step 1: Create project scaffold
- [ ] Create `/frontend` (React + Tailwind) base app
- [ ] Create `/backend` (FastAPI) base app
- [ ] Add root `.env.example`

## Step 2: Backend foundations
- [ ] Add MongoDB connection using `MONGODB_URI`
- [ ] Define required MongoDB collections: sessions, messages, reports, knowledge_docs
- [ ] Add Mongo connectivity test log on startup
- [ ] Implement `POST /api/sessions` (save session + return session_id)

## Step 3: Knowledge base ingestion + RAG test pipeline
- [ ] Implement `POST /api/knowledge/upload` (PDF + TXT)
- [ ] Implement text extraction
- [ ] Implement chunking (~300-500 words + overlap)
- [ ] Generate embeddings with sentence-transformers locally
- [ ] Store chunks/embeddings in local ChromaDB collection
- [ ] Save metadata into `knowledge_docs`
- [ ] Implement `POST /api/knowledge/query` (top-3 chunks + similarity)

## Step 4: Frontend session configuration module
- [ ] Build `SessionConfig` screen with mode + context + scenario + optional persona
- [ ] POST to backend and display returned session_id

## Step 5: Basic UI polish + navigation
- [ ] Add simple navigation: Session Config → Knowledge Base Upload placeholder

## Step 6: Deliverables & verification
- [ ] Add run instructions for frontend/backend locally
- [ ] Provide test steps:
  - [ ] Create session and verify in MongoDB
  - [ ] Upload sample FAQ and verify chunking/storage
  - [ ] Query Chroma and verify top-3 relevant chunks

