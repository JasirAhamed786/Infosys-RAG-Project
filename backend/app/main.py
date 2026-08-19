from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(title="AI Customer Support Coaching Assistant - Backend (Milestone 3)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "milestone": "3"}


@app.on_event("startup")
def startup_log():
    # Importing here triggers connection initialization.
    from app.services.mongo import mongo

    # basic connectivity check (logs only)
    mongo.log_mongo_connection()

    # Log LLM client status
    if settings.GROQ_API_KEY:
        print(f"[startup] Groq client configured with model: {settings.GROQ_SIMULATOR_MODEL}")
    else:
        print("[startup] WARNING: GROQ_API_KEY not set. Simulator & Intent agents will use fallbacks.")

    if settings.GEMINI_API_KEY:
        print(f"[startup] Gemini client configured with model: {settings.GEMINI_KNOWLEDGE_MODEL}")
    else:
        print("[startup] WARNING: GEMINI_API_KEY not set. Knowledge, Coaching & Escalation agents will use fallbacks.")


# Milestone 1 routers
from app.routers.sessions import router as sessions_router
from app.routers.knowledge import router as knowledge_router

app.include_router(sessions_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")

# Milestone 2 routers
from app.routers.simulator import router as simulator_router
from app.routers.conversation import router as conversation_router

app.include_router(simulator_router, prefix="/api")
app.include_router(conversation_router, prefix="/api")

# Milestone 3 routers — Coaching + Escalation agents are real (Gemini),
# wired into the pipeline; Manual mode is handled inside conversation_router
# above (see backend/app/routers/conversation.py); Replay mode gets its own
# router since it has upload/step-through endpoints conversation_turn doesn't.
from app.routers.coaching import router as coaching_router
from app.routers.escalation import router as escalation_router
from app.routers import replay as replay_router

app.include_router(coaching_router, prefix="/api")
app.include_router(escalation_router, prefix="/api")
app.include_router(replay_router.router, prefix="/api")

# Milestone 4 scaffolding routes (stubs — will be replaced later)
from app.routers.reports import router as reports_router
from app.routers.analytics import router as analytics_router

app.include_router(reports_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


@app.get("/")
def root():
    return {
        "app": "Clario - AI Customer Support Coaching Assistant",
        "milestone": "3",
        "features": [
            "Session Configuration — Simulator, Manual, and Replay modes",
            "Knowledge Base Upload + RAG (shared ChromaDB collection)",
            "Customer Simulator Agent (Groq Llama 3.3 70B)",
            "Intent & Sentiment Analysis Agent (Groq Llama 3.3 70B)",
            "Knowledge Recommendation Agent (Gemini)",
            "Coaching & Response Suggestion Agent (Gemini)",
            "Escalation Risk Monitor Agent (Gemini)",
            "Orchestration Pipeline with staged, parallelized execution",
            "Manual Mode — paste real customer messages for live coaching",
            "Replay Mode — upload + step through a past transcript",
            "Live Console with persistent session state across navigation",
        ],
    }