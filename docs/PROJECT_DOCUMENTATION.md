# Clario — AI Customer Support Coaching Assistant
## Technical Project Documentation

**Project:** AI Customer Support Coaching Assistant
**Organization:** Vidzai Digital (Infosys Internship Project)
**Author:** Jasir Ahamed M
**Status:** All four milestones complete
**Repository:** https://github.com/JasirAhamed786/Infosys-RAG-Project

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [System Architecture](#4-system-architecture)
5. [Agent Specifications](#5-agent-specifications)
6. [Multi-Agent Pipeline Orchestration](#6-multi-agent-pipeline-orchestration)
7. [Interaction Modes](#7-interaction-modes)
8. [RAG Knowledge Pipeline](#8-rag-knowledge-pipeline)
9. [Data Models](#9-data-models)
10. [API Reference](#10-api-reference)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Milestone-by-Milestone Summary](#12-milestone-by-milestone-summary)
13. [Engineering Decisions & Bug Fixes](#13-engineering-decisions--bug-fixes)
14. [Testing & Validation](#14-testing--validation)
15. [Setup & Deployment](#15-setup--deployment)
16. [Known Limitations & Future Work](#16-known-limitations--future-work)
17. [Conclusion](#17-conclusion)

---

## 1. Introduction

Clario is a full-stack, multi-agent AI platform that coaches customer support agents **during** live text-based interactions rather than after the fact. It was developed as a four-milestone Infosys internship project for Vidzai Digital, moving from architecture design through to a fully working platform with real LLM-backed agents, a persistent React coaching console, post-interaction reporting, and cross-session analytics.

The system supports three distinct interaction modes (Simulator, Manual, Replay), runs a six-agent AI pipeline on every conversational turn, and produces structured performance reports and aggregate analytics once sessions conclude.

---

## 2. Problem Statement

Customer service representatives handle dozens of support interactions daily, often without access to real-time guidance, relevant knowledge resources, or immediate feedback on response quality. Training agents through post-call reviews is slow and reactive, failing to improve performance during live interactions where it matters most. Organizations need intelligent systems that coach agents in the moment — improving resolution quality, reducing escalations, and enhancing customer experience continuously.

---

## 3. Objectives

1. Develop a multi-agent real-time coaching pipeline that analyzes each conversation turn and delivers instant guidance to support agents.
2. Build a Customer Simulator Agent that generates realistic, scenario-based customer messages for self-contained simulation without real users.
3. Provide RAG-powered knowledge recommendations — surfacing relevant FAQs, support articles, and troubleshooting steps per conversation context.
4. Detect escalation risk continuously with reasoning and recommended intervention strategies.
5. Generate post-interaction performance reports with sentiment journey, resolution quality scoring, and personalized improvement recommendations.

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                    │
│  SessionContext (global state) → pages → components             │
└───────────────────────────┬──────────────────────────────────────┘
                             │ REST (fetch) + SSE
┌───────────────────────────▼──────────────────────────────────────┐
│                       FastAPI Backend (main.py)                  │
│  ┌──────────────┐  ┌───────────────────┐  ┌────────────────────┐ │
│  │   Routers     │→│   Orchestration    │→│   Agent Layer       │ │
│  │ (sessions,    │  │   pipeline.py      │  │ (6 specialized     │ │
│  │  conversation,│  │                    │  │  LLM agents)       │ │
│  │  replay, ...) │  │                    │  │                    │ │
│  └──────┬────────┘  └────────────────────┘  └─────────┬──────────┘ │
│         │                                              │            │
│  ┌──────▼────────┐                            ┌────────▼─────────┐ │
│  │  MongoDB       │                            │  Groq / Gemini    │ │
│  │  (mongo.py)    │                            │  clients          │ │
│  │  sessions,     │                            │  (llm_client.py)  │ │
│  │  messages,     │                            └────────────────────┘ │
│  │  reports       │                                                    │
│  └────────────────┘                            ┌────────────────────┐ │
│                                                  │  ChromaDB (rag.py) │ │
│                                                  │  shared vector     │ │
│                                                  │  collection         │ │
│                                                  └────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Design Principles

- **Fail-safe agent execution.** Every agent call is wrapped in `_safe_run_agent()`, which catches exceptions and returns a graceful fallback dict instead of crashing the pipeline. One flaky LLM response never takes down a live coaching session.
- **Provider separation to manage rate limits.** Groq (Llama 3.3 70B) handles the two agents that need the lowest latency — Customer Simulator and Intent/Sentiment — while Gemini handles the four agents where reasoning depth matters more than raw speed: Knowledge, Coaching, Escalation, and Summary.
- **Correctness-ordered execution, not blind parallelism.** Where two stages are genuinely independent (e.g. Knowledge + Escalation, or Coaching after Knowledge resolves), they run concurrently via `ThreadPoolExecutor` to cut latency. Where one stage's output is a hard input to another (Simulator → Intent/Sentiment in Simulator mode), they run sequentially — see §13 for why this was a deliberate fix, not an original design choice.
- **Persistent, navigation-safe frontend state.** All session state lives in one `SessionContext` above the router so an agent can move between Live Console, Coaching Feed, Escalation Alerts, Reports, and Analytics without losing the active session.

---

## 5. Agent Specifications

Clario implements six specialized agents, each with a single responsibility.

### 5.1 Customer Simulator Agent
- **File:** `backend/app/agents/simulator_agent.py`
- **Provider:** Groq (Llama 3.3 70B)
- **Mode:** Simulator mode only
- **Input:** product context, scenario, persona, the agent's latest message, conversation history, turn index
- **Output:** `customer_message`, `internal_frustration_level` (0–100), `metadata` (tone, language), `turn_index` (assigned as `agent_turn_index + 1`)
- **Purpose:** Generates realistic, scenario-consistent customer messages turn by turn, with emotional continuity across the conversation (frustration can build or ease based on how well the agent responds).

### 5.2 Intent & Sentiment Analysis Agent
- **File:** `backend/app/agents/intent_sentiment_agent.py`
- **Provider:** Groq (Llama 3.3 70B)
- **Input:** the customer's message for the current turn, conversation context
- **Output:** `intent` (category), `emotion`, `frustration_score` (0–100), `satisfaction_trend`
- **Purpose:** Classifies what the customer wants and how they feel, driving the knowledge-query trigger and feeding every downstream agent (Knowledge, Coaching, Escalation).

### 5.3 Knowledge Recommendation Agent
- **File:** `backend/app/agents/knowledge_agent.py`
- **Provider:** Gemini + ChromaDB (RAG)
- **Trigger:** Conditional — runs only when the detected intent falls into an information-needing category (`billing_issue`, `technical_problem`, `how_to`, `account_access`, etc.)
- **Input:** intent, persona, product context, query text (the customer's message)
- **Output:** top-matching knowledge chunks with match percentage, source document, and AI-generated reasoning for relevance (or irrelevance) of each result
- **Purpose:** RAG-powered retrieval of the most relevant FAQs, support articles, and troubleshooting steps for the current conversational context.

### 5.4 Coaching & Response Suggestion Agent
- **File:** `backend/app/agents/coaching_agent.py`
- **Provider:** Gemini
- **Input:** customer message, detected intent/sentiment, frustration score, top knowledge snippets
- **Output:** `suggested_response` (plain-text, ready to paste into the reply box), `tone_feedback`, `communication_tips` (3 actionable tips), `confidence` (0–1)
- **Purpose:** Generates a ready-to-send draft reply grounded in retrieved knowledge and the customer's emotional state, plus short-form coaching feedback on tone and communication.
- **Note:** The prompt explicitly forbids markdown syntax (no `**bold**`, no numbered-list markup) since the output is pasted directly into a live chat box; a defensive regex strip (`_strip_markdown`) is also applied in code as a safety net in case the model doesn't fully comply.

### 5.5 Escalation Risk Monitor Agent
- **File:** `backend/app/agents/escalation_agent.py`
- **Provider:** Gemini
- **Trigger:** Every turn, regardless of intent
- **Input:** full conversation history, frustration score trend across turns (not just the current message), intent, turns without resolution
- **Output:** `escalation_risk` (0–1), `risk_level` (`low` / `medium` / `high`), `reasoning`, `recommended_action`, `alert_triggered` (boolean, true when `risk_level == "high"`)
- **Purpose:** Continuously tracks whether a conversation is trending toward escalation, referencing specific signals rather than a single-message snapshot, and surfaces a concrete next step before things boil over.

### 5.6 Post-Interaction Summary Agent
- **File:** `backend/app/agents/summary_agent.py`
- **Provider:** Gemini
- **Trigger:** On demand, after a session ends (`POST /reports/generate/{session_id}`)
- **Input:** full conversation transcript, product context, scenario
- **Output:**
  - `interaction_summary` — 2–3 sentence executive summary
  - `resolution_quality_score` — 0–100 rating of empathy, resolution, clarity, professionalism
  - `sentiment_journey` — turn-by-turn array of `{turn, customer_sentiment, score, summary}`
  - `coaching_recommendations` — 2–4 concrete improvement points
  - `escalation_triggers` — phrases/factors that agitated the customer
  - `knowledge_gaps` — questions the agent struggled to answer or missing policy knowledge
- **Purpose:** Turns a completed conversation into a structured, reviewable debrief for the agent and their manager.

---

## 6. Multi-Agent Pipeline Orchestration

**File:** `backend/app/orchestration/pipeline.py`, function `run_pipeline()`.

Execution order per turn:

1. **Customer Simulator** (Simulator mode only) — generates this turn's customer message *first*.
2. **Intent & Sentiment Analysis** — analyzes that fresh message (Simulator mode) or the externally-supplied message (Manual/Replay mode).
3. **Knowledge Recommendation** — conditional, based on the detected intent.
4. **Coaching** and **Escalation** — run concurrently via `ThreadPoolExecutor`, since both depend only on the intent/sentiment result and neither depends on the other. Coaching additionally consumes the Knowledge stage's results once available.
5. Results from all stages are merged into a single response payload returned to the frontend.

Every stage is wrapped in `_safe_run_agent()`:

```python
def _safe_run_agent(agent_name, agent_func, **kwargs) -> dict:
    try:
        return agent_func(**kwargs)
    except Exception as e:
        # log, then return a fallback dict instead of raising
        return {"agent": agent_name, "error": str(e), ...}
```

This ensures a single agent failure (timeout, malformed JSON, rate limit) degrades gracefully rather than failing the whole turn.

---

## 7. Interaction Modes

| Mode | How it works | Customer message source |
|---|---|---|
| **Simulator** | The agent (a human, practicing) types replies; the Customer Simulator Agent generates the next customer message each turn based on scenario, persona, and conversation history. | Generated live by the Simulator Agent, inside the same pipeline call. |
| **Manual** | The agent pastes in a real customer message received from an actual support channel. | Supplied directly by the user via the UI. |
| **Replay** | A `.txt` transcript (formatted as alternating `Customer:` / `Agent:` lines) is uploaded and stepped through turn by turn. | Parsed from the uploaded transcript by `_parse_transcript()` in `replay.py`. |

In Manual and Replay modes, the customer message is already known before the pipeline runs, so it's persisted to MongoDB first and then passed straight into `run_pipeline()`. In Simulator mode, it doesn't exist until the Simulator Agent generates it *during* the pipeline call — this distinction is the reason Simulator generation is sequenced before Intent/Sentiment analysis (see §13.1).

---

## 8. RAG Knowledge Pipeline

**File:** `backend/app/services/rag.py`

- All uploaded documents (FAQs, support docs, policy PDFs) are chunked and embedded using `sentence-transformers/all-MiniLM-L6-v2`.
- Chunks are stored in a **single shared ChromaDB collection** (`clario_knowledge_base`) tagged with metadata (`source_document`, `chunk_index`, `upload_date`), so a query searches across every uploaded document at once.
- Optional metadata filtering is supported via `filter_metadata` in `query_chroma()`.
- The Knowledge Agent queries this collection with the customer's message as the search query, then asks Gemini to explain, per result, why each retrieved chunk is or isn't actually relevant to the current context — this reasoning is surfaced directly in the Live Console's Knowledge Retrieval panel.

---

## 9. Data Models

**File:** `backend/app/models/schemas.py`

Core MongoDB collections:

- **sessions** — `session_id`, `mode`, `product_context`, `scenario`, `persona`, `created_at`, `status`
- **messages** — `session_id`, `turn_index`, `role` (`"customer"`, `"agent"`, or `"system"`), `content`, `timestamp`, plus per-turn pipeline outputs (intent/sentiment, knowledge results, coaching suggestion, escalation score) attached for later report generation
- **reports** — `session_id`, `interaction_summary`, `resolution_quality_score`, `sentiment_journey`, `coaching_recommendations`, `escalation_triggers`, `knowledge_gaps`, `generated_at`

Pydantic models in `schemas.py` define strict request/response contracts for every router, keeping the FastAPI-generated OpenAPI schema accurate for frontend consumption via `frontend/src/services/api.ts`.

---

## 10. API Reference

All endpoints are mounted under `/api`. Full detail (request/response bodies) is available via FastAPI's interactive docs at `http://127.0.0.1:8000/docs` when running locally.

| Router | Method & Path | Description |
|---|---|---|
| Sessions | `POST /sessions` | Create a session (mode, product context, scenario, persona) |
| Sessions | `GET /sessions` | List all sessions |
| Sessions | `GET /sessions/{session_id}` | Get a single session's detail |
| Knowledge | `POST /knowledge/upload` | Upload + chunk + embed a document into the shared collection |
| Knowledge | `POST /knowledge/query` | Direct RAG query (used for debugging/testing) |
| Knowledge | `GET /knowledge/stats` | Document/chunk counts in the collection |
| Knowledge | `POST /knowledge/delete-all` | Clear the knowledge base |
| Simulator | `POST /simulator/start` | Initialize a Simulator-mode session |
| Simulator | `POST /simulator/message` | Advance the simulated conversation one turn |
| Simulator | `GET /simulator/stream/{session_id}` | SSE stream of simulator/pipeline updates |
| Conversation | `POST /conversation/turn` | Submit a turn (Simulator or Manual mode) through the full 6-agent pipeline |
| Replay | `POST /replay/upload` | Upload a transcript file for Replay mode |
| Replay | `GET /replay/status/{session_id}` | Current replay progress (turn X of N) |
| Replay | `POST /replay/next` | Step to the next replayed turn through the pipeline |
| Coaching | `GET /coaching/feed/{session_id}` | Latest coaching suggestion for a session |
| Escalation | `GET /escalation/alerts` | Live escalation risk queue across recent turns |
| Reports | `POST /reports/generate/{session_id}` | Run the Summary Agent and persist a report |
| Reports | `GET /reports/{session_id}` | Fetch one report |
| Reports | `GET /reports` | List all generated reports |
| Analytics | `GET /analytics/dashboard` | Aggregated telemetry: total sessions, avg resolution score, top intents, recent quality trends, common escalation triggers, knowledge gaps |

---

## 11. Frontend Architecture

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion

### 11.1 State Management
`frontend/src/context/SessionContext.tsx` holds all live session state (conversation messages, latest agent outputs, escalation history, turn count) in a single reducer-driven context mounted above the router. This means:
- Navigating between pages never loses the active session.
- All pages read from the same source of truth, so the Coaching Feed, Escalation Alerts, and Live Console panels always agree on the current turn's data.
- State resets only on an explicit "End Session" action.

### 11.2 Pages
| Page | Purpose |
|---|---|
| `Home.tsx` | Landing/dashboard entry point |
| `SessionConfig.tsx` | Select interaction mode, define product context and scenario |
| `KnowledgeBaseUpload.tsx` | Upload and manage RAG documents |
| `LiveConsole.tsx` | The core 4-panel real-time coaching interface |
| `CoachingFeedPlaceholder.tsx` | Live coaching tips + suggested response feed |
| `EscalationAlertsPlaceholder.tsx` | Real-time escalation risk queue and reasoning |
| `ReportsPlaceholder.tsx` | Post-interaction reports and sentiment journey |
| `AnalyticsDashboardPlaceholder.tsx` | Cross-session performance analytics |

### 11.3 Live Console Layout
A four-panel grid:
1. **Customer Interaction** — the conversation thread with a turn tracker
2. **Real-Time AI Intent & Sentiment** — classified intent, detected emotion, frustration level, satisfaction trend
3. **Agent Knowledge Base Retrieval** — top RAG matches with AI reasoning
4. **Live Coaching** — suggested response, tone feedback, communication tips, and a confidence indicator, with a "Use this reply" button that populates the reply box (without auto-sending, so the agent reviews/edits first)

---

## 12. Milestone-by-Milestone Summary

**Milestone 1 (Weeks 1–2):** Architecture design, agent responsibilities, orchestration flow, data models. Session configuration module (mode + product context + scenario selection). Knowledge Base ingestion with chunking, embedding, and ChromaDB indexing.

**Milestone 2 (Weeks 3–4):** Customer Simulator Agent (Groq), Intent & Sentiment Analysis Agent (Groq), Knowledge Recommendation Agent (Gemini + ChromaDB), all wired through the first version of the orchestration pipeline.

**Milestone 3 (Weeks 5–6):** Coaching & Response Suggestion Agent (Gemini), Escalation Risk Monitor Agent (Gemini), the three-panel (later four-panel) Live Console UI, Manual Mode, and Replay Mode with drag-and-drop transcript upload.

**Milestone 4 (Weeks 7–8):** Post-Interaction Summary Agent (Gemini), Performance Analytics Module, end-to-end testing across all three modes and all six agents, and this technical documentation.

---

## 13. Engineering Decisions & Bug Fixes

This section documents real bugs found and fixed during development — included because diagnosing and explaining these was part of the engineering work, not just writing the original code.

### 13.1 Sentiment-lag race condition (pipeline.py)
**Symptom:** The Live Console's Intent & Sentiment panel displayed emotion/frustration readings that appeared to belong to an earlier customer message than the one currently shown in the chat.

**Root cause:** In Simulator mode, the Customer Simulator Agent and the Intent & Sentiment Agent originally ran **concurrently** via `ThreadPoolExecutor`. Intent/Sentiment read its input from `conversation_history`, which does not yet contain the new customer message the Simulator generates *during that same pipeline call*. The result: Intent/Sentiment always analyzed the previous turn's customer message while the API response paired it with the Simulator's brand-new message — a one-turn lag baked into every response.

**Fix:** Restructured Stage 1 so the Simulator runs first (in Simulator mode), and its output is fed into `customer_message_to_analyze` before Intent & Sentiment runs. Manual/Replay mode was unaffected, since the customer message is already known before the pipeline call begins in those modes.

### 13.2 Turn-index collision (SessionContext.tsx)
**Symptom:** The Post-Interaction Summary Agent occasionally produced a sentiment journey with a duplicate turn number (e.g. two entries both labeled "Turn 5").

**Root cause:** The backend assigns `agent turn_index = N`, `customer turn_index = N + 1` (see `simulator_agent.py`). The frontend reducer, however, advanced `turnCount` by a flat `+1` after every round, so the next round's agent message reused the *same* `turn_index` as the previous round's customer message. This ambiguity in MongoDB's sort order fed duplicate `[Turn N]` labels into the transcript the Summary Agent analyzed.

**Fix:** Changed the `TURN_SUCCESS` reducer case to set `turnCount: customerTurnIndex + 1` (from the actual backend-assigned index) instead of blindly incrementing, eliminating the collision at its source.

### 13.3 Markdown leakage in suggested responses (coaching_agent.py)
**Symptom:** The Coaching Feed's suggested response occasionally displayed literal `**` characters around words instead of rendering them as bold — because the UI renders `suggested_response` as plain text, but the model sometimes returned markdown-formatted text.

**Fix:** Added an explicit instruction in the Coaching Agent's system prompt forbidding markdown syntax, plus a defensive `_strip_markdown()` regex pass in code as a safety net, since prompt instructions alone aren't 100% reliable across model calls.

---

## 14. Testing & Validation

- **`backend/tests/test_milestone2.py`** — verifies the Simulator and Intent/Sentiment agents against sample conversation turns, checking output schema conformance and graceful fallback behavior when API keys are absent.
- **End-to-end manual testing** was conducted across all three interaction modes:
  - Simulator mode: multi-turn conversations with escalating/de-escalating frustration to confirm the escalation risk score rises and falls appropriately across a conversation, not per isolated message.
  - Manual mode: pasted real-world-style customer messages to confirm intent/sentiment/coaching/escalation all reflect the actual pasted text.
  - Replay mode: a 10-line sample transcript (customer/agent alternating) stepped through turn by turn, confirming pipeline analysis runs only on customer turns and that escalation risk tracks the transcript's designed frustration arc (escalating around turns 5–7, cooling off by the end).
- **Report generation** was validated by generating reports for completed sessions and cross-checking the sentiment journey against the actual conversation transcript for turn-number accuracy (see §13.2 fix).
- **Analytics dashboard** was validated against multiple completed sessions to confirm aggregate figures (total sessions, average resolution score, top intents, escalation triggers, knowledge gaps) update correctly as new reports are generated.

---

## 15. Setup & Deployment

See the [README](../README.md#getting-started) for full local setup instructions (backend virtualenv + `uvicorn`, frontend `npm install` + `vite`). In brief:

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
# create .env with MONGODB_URI, GROQ_API_KEY, GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev -- --port 5173
```

---

## 16. Known Limitations & Future Work

- **Single-turn coupling in Simulator mode.** Running the Simulator before Intent/Sentiment (§13.1) trades a small amount of parallel latency for correctness — an acceptable trade-off for a coaching tool where accuracy matters more than shaving milliseconds off a turn.
- **No authentication/multi-tenant support.** The platform currently assumes a single trusted user; adding agent accounts and session ownership would be needed for a multi-agent team deployment.
- **PDF/structured report export.** Reports are currently viewable in-app; exporting a report as a shareable PDF was scoped out of Milestone 4 and remains a natural next step.
- **Analytics filtering.** The current dashboard aggregates across all sessions; filtering by date range, product context, or agent would make it more actionable for a real team lead.

---

## 17. Conclusion

Clario delivers on all five stated project outcomes: a real-time multi-agent coaching pipeline, a scenario-based Customer Simulator, RAG-powered knowledge recommendations, continuous escalation risk detection, and structured post-interaction reporting with sentiment journeys and resolution scoring. All four milestones — architecture and ingestion, core agents, live coaching UI with Manual/Replay modes, and post-interaction reporting with analytics — are complete, tested end-to-end, and documented above.

---

*Infosys Internship Project*