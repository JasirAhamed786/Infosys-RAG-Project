"""
debug_test.py

Run this directly to test Intent/Sentiment and Knowledge agents in
isolation, bypassing the API/pipeline entirely. This will show you
EXACTLY what's failing, with full error output.

Run from the backend/ folder with your venv active:
    python debug_test.py
"""
import sys

print("=" * 70)
print("STEP 1: Checking environment variables are loaded...")
print("=" * 70)
try:
    from app.core.config import settings
    print(f"GROQ_API_KEY set: {bool(settings.GROQ_API_KEY)} (length: {len(settings.GROQ_API_KEY)})")
    print(f"GEMINI_API_KEY set: {bool(settings.GEMINI_API_KEY)} (length: {len(settings.GEMINI_API_KEY)})")
    print(f"GROQ_INTENT_MODEL: {settings.GROQ_INTENT_MODEL}")
    print(f"GEMINI_KNOWLEDGE_MODEL: {settings.GEMINI_KNOWLEDGE_MODEL}")
    print(f"CHROMA_COLLECTION_NAME: {settings.CHROMA_COLLECTION_NAME}")
    if not settings.GROQ_API_KEY:
        print("\n*** PROBLEM FOUND: GROQ_API_KEY is EMPTY. Check your .env file. ***")
        sys.exit(1)
    if not settings.GEMINI_API_KEY:
        print("\n*** WARNING: GEMINI_API_KEY is EMPTY. Knowledge Agent explanations will fail. ***")
except Exception as e:
    print(f"\n*** PROBLEM FOUND: Could not load config/settings: {e} ***")
    sys.exit(1)

print("\n" + "=" * 70)
print("STEP 2: Testing raw Groq call (bare minimum, no agent logic)...")
print("=" * 70)
try:
    from app.utils.llm_client import groq_client
    result = groq_client.generate_json(
        model=settings.GROQ_INTENT_MODEL,
        system_prompt='Return ONLY this exact JSON: {"test": "ok"}',
        user_prompt="Respond now.",
        temperature=0.0,
        max_tokens=50,
    )
    print(f"Raw Groq result: {result}")
    if "error" in result:
        print(f"\n*** PROBLEM FOUND: Groq call itself is failing: {result['error']} ***")
        print("*** This is your root cause for the Intent/Sentiment agent. ***")
    else:
        print("Groq call succeeded.")
except Exception as e:
    print(f"\n*** PROBLEM FOUND: Exception calling Groq directly: {type(e).__name__}: {e} ***")

print("\n" + "=" * 70)
print("STEP 3: Testing the real Intent & Sentiment Agent...")
print("=" * 70)
try:
    from app.agents.intent_sentiment_agent import run_intent_sentiment_agent
    result = run_intent_sentiment_agent(
        session_id="debug-test",
        customer_message="I am absolutely furious, this is the third time I've contacted support about my missing refund and nobody has helped me!",
        turn_index=1,
        conversation_context=[],
    )
    print(f"Intent/Sentiment result: {result}")
    if result.get("intent") == "general_question" and result.get("frustration_score") in (0, 30):
        print("\n*** WARNING: Got a default/fallback-looking result for a CLEARLY angry message.")
        print("*** This confirms the agent is falling back instead of using the real model. ***")
except Exception as e:
    print(f"\n*** PROBLEM FOUND: Exception in run_intent_sentiment_agent: {type(e).__name__}: {e} ***")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("STEP 4: Checking ChromaDB has any data at all...")
print("=" * 70)
try:
    from app.services.rag import rag_service
    stats = rag_service.get_collection_stats()
    print(f"ChromaDB stats: {stats}")
    if stats["total_chunks"] == 0:
        print("\n*** PROBLEM FOUND: ChromaDB has ZERO chunks. ***")
        print("*** You need to upload a knowledge base document BEFORE the Knowledge Agent can find anything. ***")
        print("*** This alone fully explains 'No knowledge results available' in the UI. ***")
except Exception as e:
    print(f"\n*** PROBLEM FOUND: Exception checking ChromaDB: {type(e).__name__}: {e} ***")

print("\n" + "=" * 70)
print("STEP 5: Testing the real Knowledge Agent (only if Step 4 had data)...")
print("=" * 70)
try:
    from app.agents.knowledge_agent import run_knowledge_agent
    result = run_knowledge_agent(
        session_id="debug-test",
        intent="refund_request",
        persona=None,
        product_context="test",
        query_text="how long does a refund take?",
        turn_index=1,
    )
    print(f"Knowledge Agent result: {result}")
except Exception as e:
    print(f"\n*** PROBLEM FOUND: Exception in run_knowledge_agent: {type(e).__name__}: {e} ***")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("DONE. Read the *** PROBLEM FOUND *** lines above — that's your root cause.")
print("=" * 70)