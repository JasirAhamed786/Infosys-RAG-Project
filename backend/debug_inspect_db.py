"""Debug script: pull real MongoDB documents for Bug A (sessions) and Bug B (messages).

Run from backend/ dir:
    python debug_inspect_db.py
"""
import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.services.mongo import mongo

def _fmt(v):
    if isinstance(v, dt.datetime):
        return v.isoformat()
    return v

def main():
    mongo.connect()
    db_name = mongo.db.name if mongo.db is not None else "UNKNOWN"
    print(f"=== Connected to DB: {db_name} ===")
    print(f"Collections: {list(mongo.db.list_collection_names()) if mongo.db is not None else []}")
    print()

    # ---- Bug A: sessions ----
    print("=== SESSIONS (last 5, newest first) ===")
    sessions = list(mongo.sessions.find().sort("created_at", -1).limit(5))
    for s in sessions:
        print(f"  _id={s.get('_id')}")
        print(f"    mode={s.get('mode')!r}")
        print(f"    product_context={s.get('product_context')!r}")
        print(f"    scenario={s.get('scenario')!r}")
        print(f"    persona={s.get('persona')!r}")
        print(f"    created_at={_fmt(s.get('created_at'))}")
        print(f"    status={s.get('status')!r}")
        print()

    # ---- Bug B: messages ----
    print("=== MESSAGES (last 12, newest first) ===")
    msgs = list(mongo.messages.find().sort("created_at", -1).limit(12))
    for m in msgs:
        print(f"  _id={m.get('_id')}")
        print(f"    session_id={m.get('session_id')}")
        print(f"    turn_index={m.get('turn_index')}")
        print(f"    role={m.get('role')!r}")
        print(f"    content={m.get('content')!r}")
        print(f"    frustration_level={m.get('frustration_level')}")
        print(f"    created_at={_fmt(m.get('created_at'))}")
        print()

if __name__ == "__main__":
    main()
