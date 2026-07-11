# AI Customer Support Coaching Assistant (Milestone 1)

This repo contains a **foundation only** for Milestone 1:
- Session configuration screen (Frontend) + `POST /api/sessions` (Backend)
- Knowledge base ingestion (PDF/TXT) + local embeddings + local ChromaDB + test query endpoint
- No AI agents yet (Milestone 2)

## Local run (defaults)
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

### 1) Configure environment
Copy env example:
```bash
copy .env.example .env
```
Set `MONGODB_URI` to your MongoDB Atlas connection string.

### 2) Backend
```bash
cd backend
python -m venv .venv
.\./.venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3) Frontend
```bash
cd frontend
npm install
npm run dev -- --port 5173
```

## How to verify deliverables
See `backend/README.md` and `frontend/README.md` plus the API routes described there.

