<div align="center">

# **Clario**

### AI-Powered Real-Time Customer Support Coaching Assistant

Coach support agents *during* live conversations — not after the call ends.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Status](https://img.shields.io/badge/Status-Milestone%204%20Complete-success)](#roadmap)

[Overview](#overview) • [Features](#features) • [Architecture](#architecture) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [API Reference](#api-reference) • [Project Structure](#project-structure) • [Roadmap](#roadmap)

</div>

---

## Overview

Customer service representatives handle dozens of support interactions daily, often without real-time guidance, relevant knowledge resources, or immediate feedback on response quality. Traditional agent training relies on **post-call reviews** — slow, reactive, and unable to improve performance in the moment it actually matters.

**Clario** flips this model. It's an intelligent coaching platform that sits alongside a support agent during a **live** text-based conversation. After every exchange, a six-agent AI pipeline:

- Detects the customer's **intent and emotional state**
- Retrieves the most **relevant knowledge base content** via RAG
- Suggests a **ready-to-send response** with tone feedback
- Continuously monitors **escalation risk** and flags high-risk conversations
- Surfaces all of this live, in a real-time coaching console
- Generates a **structured post-interaction report** — sentiment journey, resolution quality score, and coaching recommendations — once the session ends
- Aggregates trends across **every session** into a Performance Analytics dashboard

The result: reactive post-call training becomes **proactive, in-session coaching** — improving first-interaction resolution rates and agent performance continuously.

This project was built as a four-milestone Infosys internship project (Vidzai Digital) and is now feature-complete across all four milestones.

---

## Features

### 🧠 Six-Agent AI Pipeline
Every customer message is analyzed by a staged pipeline of specialized agents — intent detection, knowledge retrieval, response coaching, escalation monitoring, and post-interaction summarization — orchestrated end-to-end with graceful fallback handling if any single agent call fails.

### 🎭 Three Interaction Modes
| Mode | Description |
|---|---|
| **Simulator** | An AI-driven Customer Simulator Agent generates realistic, scenario-based customer messages turn by turn — ideal for practice sessions with no real customers involved. |
| **Manual** | The agent pastes in real incoming customer messages for live coaching support. |
| **Replay** | A pre-loaded support transcript is uploaded (or drag-and-dropped) and replayed message by message for retrospective coaching analysis. |

### 📚 RAG-Powered Knowledge Recommendations
Upload FAQs, support docs, and policy PDFs — Clario chunks, embeds, and indexes them into a shared ChromaDB vector collection, then surfaces the most relevant snippets automatically based on live conversation context, with AI-generated reasoning for why each snippet was (or wasn't) considered relevant.

### 🚨 Real-Time Escalation Risk Monitoring
Tracks frustration trends across the *entire* conversation (not just the latest message) to score escalation likelihood on every turn, explain the reasoning behind that score, and recommend a concrete next action — with a live alert banner when risk crosses into high territory.

### 💬 Live Coaching Console
A real-time, multi-panel dashboard showing conversation flow, intent & sentiment analytics, knowledge base retrieval results, and live coaching suggestions — all updating turn by turn, and persisting across navigation so agents never lose session context mid-conversation.

### 📊 Post-Interaction Reports & Debriefs
After a session ends, the Post-Interaction Summary Agent generates an executive summary, a turn-by-turn customer sentiment journey, a resolution quality score, coaching recommendations, and a list of escalation triggers and knowledge gaps identified during the conversation.

### 📈 Performance Analytics Dashboard
Aggregated telemetry across every session on the platform: total sessions, average resolution score, most common customer intents, recent session quality trends, common escalation triggers, and identified knowledge base gaps — surfacing systemic patterns a single session report can't show.

---

## Architecture

Clario is built around a **staged multi-agent pipeline**, deliberately split across two LLM providers to manage rate limits efficiently:

```
Agent's message (Simulator mode)
      │
      ▼
┌──────────────────────────┐
│ 1. Customer Simulator     │  Groq · Llama 3.3 70B
│    Agent (Simulator mode) │  Generates the next realistic customer
└─────────────┬──────────────  message with emotional continuity
              ▼
┌──────────────────────────┐
│ 2. Intent & Sentiment     │  Groq · Llama 3.3 70B
│    Agent                  │  Classifies intent, emotion,
└─────────────┬──────────────  frustration score, satisfaction trend
              ▼
┌──────────────────────────┐
│ 3. Knowledge Agent        │  Gemini + ChromaDB (RAG)
│    (conditional)          │  Retrieves relevant FAQs/docs
└─────────────┬──────────────  when intent matches known categories
              ▼
      ┌───────┴───────┐
      ▼               ▼
┌───────────┐   ┌─────────────┐
│ 4. Coaching│   │ 5. Escalation│  Gemini · run in parallel
│  Agent     │   │  Risk Agent  │  Suggested reply + tone feedback
└─────┬──────┘   └──────┬───────┘  Risk score + reasoning + action
      └───────┬─────────┘
              ▼
   Live Coaching Console
   (real-time, all agents' output in one view)

              │
     (on session end)
              ▼
┌──────────────────────────┐
│ 6. Post-Interaction       │  Gemini
│    Summary Agent          │  Sentiment journey, resolution score,
└─────────────┬──────────────  coaching recommendations, gaps
              ▼
   Reports & Analytics Dashboard
```

Every agent call is wrapped in a fail-safe handler (`_safe_run_agent`) — if an LLM call errors out (timeout, rate limit, malformed response), the pipeline returns a graceful fallback instead of crashing the entire turn, so one flaky API call never takes down the coaching session.

In **Simulator mode**, the Customer Simulator Agent runs *before* Intent & Sentiment Analysis — this is a deliberate design decision, not an implementation detail: since the Simulator generates each turn's customer message live, Intent/Sentiment must wait for that fresh text before analyzing it, rather than analyzing a stale message left over from the previous turn.

On the frontend, all session state (active conversation, live agent outputs, escalation history) lives in a single global context (`SessionContext`) that sits above the router — meaning a support agent can navigate between the Live Console, Coaching Feed, Escalation Alerts, Reports, and Analytics tabs without ever losing their active session. State only resets on an explicit "End Session" action.

---

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) (Python) — REST API layer
- [MongoDB](https://www.mongodb.com/) (via Motor/PyMongo) — session, message, and report persistence
- [ChromaDB](https://www.trychroma.com/) — shared vector collection for RAG-based knowledge retrieval
- [sentence-transformers](https://www.sbert.net/) (`all-MiniLM-L6-v2`) — embedding model for RAG
- [Groq](https://groq.com/)  — Customer Simulator + Intent/Sentiment agents (chosen for low latency)
- [Google Gemini](https://ai.google.dev/) — Knowledge, Coaching, Escalation, and Post-Interaction Summary agents (chosen for reasoning quality)

**Frontend**
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tooling
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [Framer Motion](https://www.framer.com/motion/) — page transitions and micro-interactions
- [Lucide React](https://lucide.dev/) — icon set

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A MongoDB instance (local or hosted, e.g. MongoDB Atlas)
- API keys for [Groq](https://console.groq.com/) and [Google Gemini](https://aistudio.google.com/)

### Backend Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/` (see `.env.example` at the repo root for the full list):

```env
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
CHROMA_PERSIST_DIR=./chroma_data
FRONTEND_ORIGIN=http://localhost:5173
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
```

Run the server:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://127.0.0.1:8000` — health check at `/api/health`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

The app will be available at `http://localhost:5173`.

---

## API Reference

All routes are prefixed with `/api`.

| Area | Method & Path | Purpose |
|---|---|---|
| Sessions | `POST /sessions` | Create a new coaching session |
| Sessions | `GET /sessions` | List all sessions |
| Sessions | `GET /sessions/{session_id}` | Get session detail |
| Knowledge Base | `POST /knowledge/upload` | Upload & index a support doc into the shared RAG collection |
| Knowledge Base | `POST /knowledge/query` | Query the knowledge base directly |
| Knowledge Base | `GET /knowledge/stats` | Collection stats (doc count, chunk count) |
| Knowledge Base | `POST /knowledge/delete-all` | Clear the knowledge base |
| Simulator | `POST /simulator/start` | Start a Simulator-mode session |
| Simulator | `POST /simulator/message` | Advance the simulated conversation one turn |
| Simulator | `GET /simulator/stream/{session_id}` | SSE stream for simulator updates |
| Conversation | `POST /conversation/turn` | Submit a turn (Simulator/Manual mode) through the full pipeline |
| Replay | `POST /replay/upload` | Upload a transcript file for Replay mode |
| Replay | `GET /replay/status/{session_id}` | Get replay progress |
| Replay | `POST /replay/next` | Step to the next replayed turn |
| Coaching | `GET /coaching/feed/{session_id}` | Latest coaching suggestion for a session |
| Escalation | `GET /escalation/alerts` | Live escalation risk queue |
| Reports | `POST /reports/generate/{session_id}` | Generate a Post-Interaction Summary report |
| Reports | `GET /reports/{session_id}` | Fetch a specific report |
| Reports | `GET /reports` | List all available reports |
| Analytics | `GET /analytics/dashboard` | Aggregated cross-session performance telemetry |

For full request/response schemas, see [`docs/PROJECT_DOCUMENTATION.md`](./docs/PROJECT_DOCUMENTATION.md).

---

## Project Structure

```
Infosys-RAG-Project/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS, router registration
│   │   ├── core/config.py             # Environment/config settings
│   │   ├── models/schemas.py          # Pydantic request/response + Mongo doc schemas
│   │   ├── services/
│   │   │   ├── mongo.py               # MongoDB service layer
│   │   │   └── rag.py                 # Embedding, chunking, vector retrieval (ChromaDB)
│   │   ├── utils/llm_client.py        # Groq + Gemini client wrappers
│   │   ├── agents/                    # 6 specialized AI agents
│   │   │   ├── simulator_agent.py
│   │   │   ├── intent_sentiment_agent.py
│   │   │   ├── knowledge_agent.py
│   │   │   ├── coaching_agent.py
│   │   │   ├── escalation_agent.py
│   │   │   └── summary_agent.py
│   │   ├── orchestration/pipeline.py  # Multi-agent pipeline orchestrator
│   │   └── routers/                   # API route handlers (sessions, knowledge,
│   │                                   # simulator, conversation, replay, coaching,
│   │                                   # escalation, reports, analytics)
│   └── tests/
│
└── frontend/
    └── src/
        ├── context/SessionContext.tsx # Global, navigation-persistent session state
        ├── components/                # Shared UI components (Sidebar, TopNav, NavButton)
        ├── services/api.ts            # API client + TypeScript interfaces
        └── pages/                     # Session Config, Knowledge Base, Live Console,
                                        # Coaching Feed, Escalation Alerts, Reports, Analytics
```

---

## Roadmap

- [x] Session configuration & three interaction modes
- [x] RAG-powered knowledge base ingestion
- [x] Customer Simulator, Intent/Sentiment, and Knowledge agents
- [x] Real-time multi-panel coaching console
- [x] Coaching & Response Suggestion agent
- [x] Escalation Risk Monitor agent
- [x] Manual Mode and Replay Mode (with drag-and-drop transcript upload)
- [x] Persistent session state across navigation
- [x] Post-Interaction Summary agent
- [x] Performance Analytics dashboard across multiple sessions
- [x] End-to-end testing across all modes and agents
- [x] Technical documentation and project report

All four milestones are complete. See [`docs/PROJECT_DOCUMENTATION.md`](./docs/PROJECT_DOCUMENTATION.md) for full technical detail and [`TODO.md`](./TODO.md) for the UI polish changelog.

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">
Built by **Jasir Ahamed M**

Infosys Internship Project · Vidzai Digital

</div>