import datetime as dt

import pymongo
from pymongo import MongoClient

from app.core.config import settings


class MongoService:
    """MongoDB connection + collection access."""

    def __init__(self):
        self.client: MongoClient | None = None
        self.db = None

        # Collections (created/used as plain collections; schema enforced by app)
        self.sessions = None
        self.messages = None
        self.reports = None
        self.knowledge_docs = None
        # Milestone 3 — Replay mode: stores the parsed transcript + current
        # step position per session_id (see backend/app/routers/replay.py).
        self.replay_transcripts = None

    def connect(self):
        if self.client is None:
            self.client = MongoClient(settings.MONGODB_URI)
            # Default DB is derived from the URI; if your URI includes a DB name, pymongo uses it.
            # If not, Mongo will fall back to 'test'.
            self.db = self.client.get_default_database()

            self.sessions = self.db["sessions"]
            self.messages = self.db["messages"]
            self.reports = self.db["reports"]
            self.knowledge_docs = self.db["knowledge_docs"]
            self.replay_transcripts = self.db["replay_transcripts"]

            # Clearly log WHICH database + collection stores sessions so the user
            # can find them in MongoDB Compass (they may otherwise be looking at a
            # different DB such as the default "test" database).
            print(f"[mongo] Writing to database '{self.db.name}' -> collection "
                  f"'sessions' ({self.sessions.name}). Look in '{self.db.name}' "
                  f"in MongoDB Compass to see your created sessions.")

    def log_mongo_connection(self):
        self.connect()
        try:
            # ping is cheap; proves connectivity
            self.client.admin.command("ping")
            print(f"[mongo] Connected successfully. DB={self.db.name}")
        except Exception as e:
            print(f"[mongo] Connection failed: {e}")
            raise

    def ensure_collections(self):
        """Make sure collections exist (MongoDB creates on first insert, but we pre-touch here)."""
        self.connect()
        # Insert no-op docs? We avoid that; instead, list collections and create indexes later if needed.
        # Touch by creating indexes is overkill for Milestone 1.
        return True


mongo = MongoService()