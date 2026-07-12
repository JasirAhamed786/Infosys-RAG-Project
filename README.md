# AI Customer Support Coaching Assistant (Milestone 1)

This repo contains a **working Milestone 1 foundation** for the AI Customer Support Coaching Assistant.

## What’s included (Milestone 1)
- **Session configuration (UI)**: Frontend screen for configuring the coaching session.
- **Backend session API**: `POST /api/sessions` to create/update session configuration.
- **Knowledge base ingestion (UI + Backend)**: PDF/TXT ingestion, local embeddings, and **local ChromaDB** indexing.
- **Test/query endpoint**: Validate retrieval quality during ingestion.
- **No full AI agent orchestration yet** (agent-driven workflows are targeted for Milestone 2).

## Routing / Navigation updates
- The landing experience is now driven by the new **`Home` page**.
- `src/App.tsx` uses **Framer Motion** with `AnimatePresence` + a `motion.div` keyed by `location.pathname` for smooth route transitions.
- Root route behavior:
  - `GET /` now renders **`<Home />`** directly (no longer redirecting to `/session`).
- `src/components/TopNav.tsx` now includes a **first tab**:
  - **Home** (`to="/"`)
- The TopNav brand status indicator shows **“Customer Support Agent”** with an emerald pulsing dot.

## UI layout guarantees
- Existing enterprise widescreen layout wrappers are preserved:
  - `max-w-7xl` container sizing
  - existing glassmorphism + telemetry badge styles
  - existing telemetry/visual hierarchy

## Local run (defaults)
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173

## 1) Configure environment
Copy env example:
```bash
copy .env.example .env
```
Set `MONGODB_URI` to your MongoDB Atlas connection string.

## 2) Backend
```bash
cd backend
python -m venv .venv
.\./.venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 3) Frontend
```bash
cd frontend
npm install
npm run dev -- --port 5173
```

## How to verify deliverables
- Run both backend + frontend as described above.
- Validate navigation: open `/`, verify **Home** loads, then use TopNav to switch to:
  - `/session`
  - `/knowledge`
  - `/console`
  - `/coaching`
  - `/escalation`
  - `/reports`
  - `/analytics`
- API validation: follow `backend/README.md` and `frontend/README.md` for route details and test flows.


