from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.sessions import router as sessions_router
from app.routers.knowledge import router as knowledge_router

app = FastAPI(title="AI Customer Support Coaching Assistant - Backend (Milestone 1)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def startup_log():
    # Importing here triggers connection initialization.
    from app.services.mongo import mongo

    # basic connectivity check (logs only)
    mongo.log_mongo_connection()


app.include_router(sessions_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")

