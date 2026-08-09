
Claude finished the response
Quick clarification before anything else — there's no "EMI devices" here. What Blackbox is asking about is the MIT License — a software license, not hardware. It sounds like that got garbled somewhere (easy mix-up if you were speaking this out loud — "MIT" and "EMI" sound similar). Let me explain what it actually is.

What the MIT License is and why it matters
When you put code on GitHub without any license file, the legal default is "all rights reserved" — technically nobody else is allowed to copy, use, or modify your code, even though it's publicly visible. That's rarely what people intend for a portfolio/academic project.

The MIT License is one of the most common open-source licenses. In plain terms, it says: "Anyone can use, copy, modify, and even sell this code, as long as they keep my copyright notice attached. I'm not liable if something breaks." It's short, permissive, and exactly what almost every student/portfolio GitHub repo uses.

Why Infosys is recommending it for your project: since this is an Infosys internship project, they likely want a clear, standard license attached so there's no ambiguity about who owns what and what others (evaluators, other students, future employers looking at your GitHub) are allowed to do with the code. It's a completely standard, low-stakes ask — not a technical or legal risk to you.

The one decision you need to make
Blackbox is stuck waiting on one question: whose name goes in the copyright line? The MIT License text includes a line like:

Copyright (c) 2026 [Your Name]
Your real options:

Your own name — most common for a personal portfolio project, even one done during an internship, since you're the author
"Infosys" — only appropriate if Infosys explicitly told you the code belongs to them, not you
Some student repos put both, e.g. Copyright (c) 2026 [Your Name], Infosys Springboard Internship Project
Since you called it "my project" throughout this whole conversation and it's on your personal GitHub (jasirAhamed786), your own full name is almost certainly the right answer — unless Infosys gave you explicit instructions saying otherwise. If you're not sure, this is worth a quick check with whoever assigned the internship project rather than guessing.

Prompt to paste into Blackbox AI
Once you've decided the name, send this:

Use "[YOUR FULL NAME]" as the copyright holder in the MIT license.

Proceed with your plan:
1. Create LICENSE file at the project root with the standard MIT License
   text, copyright line as: Copyright (c) 2026 [YOUR FULL NAME]
2. Update root README.md to add a License section near the bottom
   referencing the MIT License and linking to the LICENSE file (standard
   convention: a "## License" heading with a one-line sentence like "This
   project is licensed under the MIT License — see the LICENSE file for
   details.")

Do not modify any other files. Show me both files after creation.
Just replace [YOUR FULL NAME] with your actual name before sending it.

JASIR AHAMED M.. IS MY NAME NOW GIVE ME PROMPT

Use "JASIR AHAMED M" as the copyright holder in the MIT license.

Proceed with your plan:
1. Create LICENSE file at the project root with the standard MIT License
   text, copyright line as: Copyright (c) 2026 JASIR AHAMED M
2. Update root README.md to add a License section near the bottom
   referencing the MIT License and linking to the LICENSE file (standard
   convention: a "## License" heading with a one-line sentence like "This
   project is licensed under the MIT License — see the LICENSE file for
   details.")

Do not modify any other files. Show me both files after creation.
Paste that straight into Blackbox — it already has the full plan queued up, this just answers its one open question and tells it to go ahead.

Now generate me the best readme for my project so that it will look very, very proportional at the GitHub and explain everything clearly. Give me the readme dot m d.


Architected comprehensive README structure for GitHub visibility
Architected comprehensive README structure for GitHub visibility
I need to create


Creating a comprehensive, professional README for the Clario project

Presented file
Done
A few notes on what's in there:

Badges, TOC, and an ASCII pipeline diagram at the top — this is the kind of visual structure that makes a repo look "proportional" and professional at a glance on GitHub, versus a wall of plain text.
I described the architecture, mode system, and roadmap based on everything we've built across this conversation — Milestone 1-3 items are checked off, Milestone 4 items (Summary Agent, Analytics) are left unchecked since those are still stubs.
The roadmap and feature list are honest about what's done vs. in-progress — worth keeping that way rather than overstating completion, since this will likely get read closely in a placement interview.
To use it: replace whatever's currently in your root README.md with this content (or ask Blackbox to do it — "replace README.md with this exact content" and paste it in). One thing worth double-checking yourself before you commit it: the MongoDB/API setup steps assume your .env variable names are exactly MONGODB_URI, GROQ_API_KEY, GEMINI_API_KEY — confirm those match your actual config.py before publishing, since a wrong env var name in a README is a classic thing an interviewer might quietly test.


Readme
Document · MD 






Claude is AI and can make mistakes. Please double-check responses.


Readme · MD
<div align="center">
# Clario
 
### AI-Powered Real-Time Customer Support Coaching Assistant
 
Coach support agents *during* live conversations — not after the call ends.
 
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
 
[Overview](#overview) • [Features](#features) • [Architecture](#architecture) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Project Structure](#project-structure) • [Roadmap](#roadmap)
 
</div>
---
 
## Overview
 
Customer service representatives handle dozens of support interactions daily, often without real-time guidance, relevant knowledge resources, or immediate feedback on response quality. Traditional agent training relies on **post-call reviews** — slow, reactive, and unable to improve performance in the moment it actually matters.
 
**Clario** flips this model. It's an intelligent coaching platform that sits alongside a support agent during a **live** text-based conversation and, after every exchange, runs a multi-agent AI pipeline that:
 
- Detects the customer's **intent and emotional state**
- Retrieves the most **relevant knowledge base content** via RAG
- Suggests a **ready-to-send response** with tone feedback
- Continuously monitors **escalation risk** and flags high-risk conversations
- Surfaces all of this live, in a real-time coaching console
The result: reactive post-call training becomes **proactive, in-session coaching** — improving first-interaction resolution rates and agent performance continuously.
 
---
 
## Features
 
### 🧠 Multi-Agent AI Pipeline
Every customer message is analyzed by a staged pipeline of specialized agents, each responsible for one job — intent detection, knowledge retrieval, response coaching, and escalation monitoring — orchestrated end-to-end with graceful fallback handling if any single agent call fails.
 
### 🎭 Three Interaction Modes
| Mode | Description |
|---|---|
| **Simulator** | An AI-driven Customer Simulator Agent generates realistic, scenario-based customer messages turn by turn — ideal for practice sessions with no real customers involved. |
| **Manual** | The agent pastes in real incoming customer messages for live coaching support. |
| **Replay** | A pre-loaded support transcript is replayed message by message for retrospective coaching analysis. |
 
### 📚 RAG-Powered Knowledge Recommendations
Upload FAQs, support docs, and policy PDFs — Clario chunks, embeds, and indexes them into a vector database, then surfaces the most relevant snippets automatically based on live conversation context.
 
### 🚨 Real-Time Escalation Risk Monitoring
Tracks frustration trends across the *entire* conversation (not just the latest message) to score escalation likelihood, explain the reasoning behind that score, and recommend a concrete next action before a conversation boils over.
 
### 💬 Live Coaching Console
A real-time, multi-panel dashboard showing conversation flow, intent & sentiment analytics, knowledge base retrieval results, and live coaching suggestions — all updating turn by turn, and persisting across navigation so agents never lose session context mid-conversation.
 
### 📊 Post-Interaction Reporting *(in progress)*
Structured performance reports summarizing the sentiment journey, resolution quality score, and personalized coaching recommendations after each session.
 
---
 
## Architecture
 
Clario is built around a **staged multi-agent pipeline**, deliberately split across two LLM providers to manage rate limits efficiently:
 
```
Customer Message
      │
      ▼
┌─────────────────────────┐
│ 1. Intent & Sentiment    │  Groq · Llama 3.3 70B
│    Agent                 │  Classifies intent, emotion,
└─────────────┬─────────────  frustration score, satisfaction trend
              ▼
┌─────────────────────────┐
│ 2. Knowledge Agent       │  Gemini + ChromaDB (RAG)
│    (conditional)         │  Retrieves relevant FAQs/docs
└─────────────┬─────────────  when intent matches known categories
              ▼
┌─────────────────────────┐
│ 3. Customer Simulator    │  Groq · Llama 3.3 70B
│    Agent (Simulator mode)│  Generates next realistic customer
└─────────────┬─────────────  message with emotional continuity
              ▼
┌─────────────────────────┐
│ 4. Coaching &amp; Response  │  Gemini
│    Suggestion Agent      │  Suggests reply, tone feedback,
└─────────────┬─────────────  communication tips
              ▼
┌─────────────────────────┐
│ 5. Escalation Risk       │  Gemini
│    Monitor Agent         │  Scores escalation risk,
└─────────────┬─────────────  explains reasoning, recommends action
              ▼
   Live Coaching Console
   (real-time, all agents' output in one view)
```
 
Every agent call is wrapped in a fail-safe handler — if an LLM call errors out (timeout, rate limit, malformed response), the pipeline returns a graceful fallback instead of crashing the entire turn, so one flaky API call never takes down the coaching session.
 
On the frontend, all session state (active conversation, live agent outputs, escalation history) lives in a single global context that sits above the router — meaning a support agent can navigate between the Live Console, Coaching Feed, and Escalation Alerts tabs without ever losing their active session. State only resets on an explicit "End Session" action.
 
---
 
## Tech Stack
 
**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) (Python) — REST API layer
- [MongoDB](https://www.mongodb.com/) — session, message, and report persistence
- [ChromaDB](https://www.trychroma.com/) — vector store for RAG-based knowledge retrieval
- [Groq](https://groq.com/) (Llama 3.3 70B) — Customer Simulator + Intent/Sentiment agents
- [Google Gemini](https://ai.google.dev/) — Knowledge, Coaching, and Escalation agents
**Frontend**
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tooling
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [Framer Motion](https://www.framer.com/motion/) — page transitions and micro-interactions
---
 
## Getting Started
 
### Prerequisites
- Python 3.10+
- Node.js 18+
- A MongoDB instance (local or hosted)
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
 
Create a `.env` file inside `backend/` with:
 
```env
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
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
 
## Project Structure
 
```
Infosys Project/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, router registration
│   │   ├── core/config.py          # Environment/config settings
│   │   ├── models/schemas.py       # MongoDB document schemas
│   │   ├── services/
│   │   │   ├── mongo.py            # MongoDB service layer
│   │   │   └── rag.py              # Embedding, chunking, vector retrieval
│   │   ├── utils/llm_client.py     # Groq + Gemini client wrappers
│   │   ├── agents/                 # Individual specialized AI agents
│   │   ├── orchestration/pipeline.py  # Multi-agent pipeline orchestrator
│   │   └── routers/                # API route handlers
│   └── tests/
│
└── frontend/
    └── src/
        ├── context/SessionContext.tsx  # Global, navigation-persistent session state
        ├── components/                 # Shared UI components
        ├── services/api.ts             # API client + TypeScript interfaces
        └── pages/                      # Session Config, Knowledge Base, Live Console,
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
- [x] Persistent session state across navigation
- [ ] Post-Interaction Summary agent
- [ ] Performance analytics dashboard across multiple sessions
- [ ] Structured PDF/report export
---
 
## License
 
This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
 
---
 
<div align="center">
Built by **Jasir Ahamed M**
 
</div>
 








