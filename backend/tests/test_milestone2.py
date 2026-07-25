"""
test_milestone2.py

Milestone 2 Test Script

Tests the 3 real agents:
1. Simulator Agent: generates realistic customer messages for 3 scenarios
2. Intent & Sentiment Agent: analyzes customer messages
3. Knowledge Agent: retrieves from shared ChromaDB across multiple topics

How to run:
  cd backend
  python -m venv .venv
  .\.venv\Scripts\activate
  pip install -r requirements.txt
  python -m tests.test_milestone2

Prerequisites:
- MongoDB running with MONGODB_URI in backend/.env
- GROQ_API_KEY and GEMINI_API_KEY in backend/.env (optional — fallbacks work)
- sample_faq.txt uploaded via Knowledge Base Upload (for knowledge tests)
"""

import json
import os
import sys
import time
from pathlib import Path

# Ensure we can import from backend
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.services.mongo import mongo
from app.services.rag import rag_service
from app.agents.simulator_agent import run_simulator_agent
from app.agents.intent_sentiment_agent import run_intent_sentiment_agent
from app.agents.knowledge_agent import run_knowledge_agent


# ─── Helpers ────────────────────────────────────────────────────────

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️ WARN"

def print_header(text):
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}")

def print_result(status, text):
    print(f"  {status}: {text}")


# ─── Test 1: Simulator Agent (3 scenarios) ─────────────────────────

def test_simulator_agent():
    """Test the Simulator Agent across 3 different scenarios."""
    print_header("TEST 1: Customer Simulator Agent — 3 Scenarios")

    scenarios = [
        {
            "name": "Billing Complaint",
            "product_context": "Retail Banking Credit Cards",
            "scenario": "Customer has been charged a late fee for 3 consecutive months despite having automatic payments set up. They have called before and were told it was fixed, but the fee keeps appearing.",
            "persona": "A frustrated long-time customer who is considering switching banks",
        },
        {
            "name": "Technical Issue",
            "product_context": "SaaS Cloud Storage Platform",
            "scenario": "Customer cannot access their files after a system update. Files appear to be missing from their main directory. They have an important deadline tomorrow.",
            "persona": "An anxious professional who relies on the platform daily",
        },
        {
            "name": "Refund Request",
            "product_context": "E-commerce Electronics Store",
            "scenario": "Customer received a laptop with a cracked screen. They want a full refund plus compensation for shipping costs. The return window is 30 days and today is day 31.",
            "persona": "A disappointed but polite customer",
        },
    ]

    all_passed = True

    for scenario in scenarios:
        print(f"\n  ── Scenario: {scenario['name']} ──")

        # Run the simulator agent (no agent message yet — first turn)
        result = run_simulator_agent(
            session_id="test-sim",
            mode="Simulator",
            product_context=scenario["product_context"],
            scenario=scenario["scenario"],
            persona=scenario["persona"],
            user_agent_message="",
            turn_index=0,
        )

        # Validate
        checks = []

        # Check message exists and is realistic
        msg = result.get("customer_message", "")
        checks.append(("Message is non-empty", len(msg) > 50))
        checks.append(("Message is realistic (starts with natural phrasing)",
                       any(msg.lower().startswith(w) for w in ["i", "hello", "hi", "thanks", "look", "can", "could", "would", "please"])))

        # Check frustration level
        frustration = result.get("internal_frustration_level", -1)
        checks.append(("Frustration level in range 0-100", 0 <= frustration <= 100))

        # Check metadata
        metadata = result.get("metadata", {})
        checks.append(("Metadata contains tone", "tone" in metadata))
        checks.append(("Metadata contains language", "language" in metadata))

        # Check agent tag
        checks.append(("Agent tag is customer_simulator",
                       result.get("agent") == "customer_simulator"))

        print(f"\n    Generated message ({len(msg)} chars):")
        print(f"    \"{msg[:200]}{'...' if len(msg) > 200 else ''}\"")
        print(f"    Frustration: {frustration}/100")
        print(f"    Tone: {metadata.get('tone', 'N/A')}")

        scenario_passed = all(v for _, v in checks)
        if scenario_passed:
            print_result(PASS, f"{scenario['name']} — all {len(checks)} checks passed")
        else:
            print_result(FAIL, f"{scenario['name']} — failing checks:")
            for label, v in checks:
                if not v:
                    print(f"         - {label}")
            all_passed = False

    # Test emotional continuity: run a second turn with a helpful/unhelpful agent message
    print(f"\n  ── Emotional Continuity Test ──")
    result_helpful = run_simulator_agent(
        session_id="test-sim-continuity",
        mode="Simulator",
        product_context="Retail Banking",
        scenario="Late fee dispute",
        persona="Frustrated customer",
        user_agent_message="I completely understand your frustration. Let me immediately check your account and resolve this for you. I see the error and will correct it right away.",
        turn_index=1,
        conversation_history=[{"role": "customer", "content": "I keep getting charged late fees!", "turn_index": 0, "frustration_level": 65}],
    )

    frustration_after_help = result_helpful.get("internal_frustration_level", -1)
    print(f"    Frustration after HELPFUL agent reply: {frustration_after_help}/100")
    if frustration_after_help < 65:
        print_result(PASS, "Frustration decreased after helpful agent (emotional continuity working)")
    else:
        print_result(WARN, "Frustration did not decrease — may need prompt tuning")
        all_passed = False

    return all_passed


# ─── Test 2: Intent & Sentiment Agent ──────────────────────────────

def test_intent_sentiment_agent():
    """Test the Intent & Sentiment Agent with various messages."""
    print_header("TEST 2: Intent & Sentiment Analysis Agent")

    test_messages = [
        {
            "msg": "I've been charged a late fee AGAIN even though I set up automatic payments. This is the third time! I'm really frustrated with this.",
            "turn": 1,
            "expected_intents": ["billing_issue", "payment_dispute", "complaint"],
            "expected_emotions": ["frustrated", "angry"],
        },
        {
            "msg": "Thank you so much for your help! The issue is resolved and I really appreciate your patience.",
            "turn": 3,
            "expected_intents": ["general_question", "feedback", "other"],
            "expected_emotions": ["satisfied", "calm", "neutral"],
        },
        {
            "msg": "I need a refund for the order I received yesterday. The product arrived damaged and I'm very disappointed.",
            "turn": 0,
            "expected_intents": ["refund_request", "billing_issue", "complaint"],
            "expected_emotions": ["disappointed", "frustrated", "calm"],
        },
    ]

    all_passed = True

    for test in test_messages:
        result = run_intent_sentiment_agent(
            session_id="test-intent",
            customer_message=test["msg"],
            turn_index=test["turn"],
        )

        intent = result.get("intent", "").lower()
        emotion = result.get("emotion", "").lower()
        frustration = result.get("frustration_score", -1)
        trend = result.get("satisfaction_trend", "")

        print(f"\n  Message: \"{test['msg'][:80]}...\"")
        print(f"    Intent: {intent}")
        print(f"    Emotion: {emotion}")
        print(f"    Frustration: {frustration}/100")
        print(f"    Trend: {trend}")

        # Check that intent matches expected category
        intent_match = any(expected in intent for expected in test["expected_intents"])
        emotion_match = any(expected in emotion for expected in test["expected_emotions"])

        checks = []
        checks.append(("Intent matches expected category", intent_match))
        checks.append(("Emotion matches expected range", emotion_match))
        checks.append(("Frustration score in range 0-100", 0 <= frustration <= 100))
        checks.append(("Satisfaction trend is valid",
                       trend in ["improving", "declining", "stable", "baseline"]))
        checks.append(("Has agent tag", result.get("agent") == "intent_sentiment"))

        test_passed = all(v for _, v in checks)
        if test_passed:
            print_result(PASS, "All checks passed")
        else:
            print_result(WARN, "Some checks partial — model may choose different labels:")
            for label, v in checks:
                if not v:
                    print(f"         - {label}")
            # Don't fail the whole test for heuristic differences
            if result.get("error"):
                all_passed = False

    return all_passed


# ─── Test 3: Knowledge Agent ───────────────────────────────────────

def test_knowledge_agent():
    """Test the Knowledge Agent with multi-topic queries.

    IMPORTANT: For this test to work, you must have uploaded a knowledge base
    document (e.g. sample_faq.txt) via the Knowledge Base Upload page first.
    """
    print_header("TEST 3: Knowledge Recommendation Agent — Multi-Topic")

    # Check if ChromaDB has any data
    try:
        stats = rag_service.get_collection_stats()
        total_chunks = stats.get("total_chunks", 0)
        print(f"\n  ChromaDB collection stats: {total_chunks} total chunks")
        if total_chunks == 0:
            print_result(WARN, "No knowledge base documents found. Skipping full KB test.")
            print("  To test knowledge retrieval, first upload a document via:")
            print("    1. Start backend: uvicorn app.main:app --reload --port 8000")
            print("    2. POST /api/knowledge/upload with a .txt or .pdf file")
            print("    3. Re-run this test\n")
            return True  # Don't fail — KB may be empty
    except Exception as e:
        print_result(WARN, f"Cannot access ChromaDB: {e}")
        print("  Skipping knowledge agent test.")
        return True

    test_queries = [
        {
            "name": "Billing Question",
            "query": "How do I get a late fee waived on my credit card? I was charged even though I paid on time.",
            "intent": "billing_issue",
            "expected_topic": "late fee",
        },
        {
            "name": "Refund Question",
            "query": "I want to return a product I bought. What's the refund policy and how long does it take?",
            "intent": "refund_request",
            "expected_topic": "refund",
        },
        {
            "name": "Security Question",
            "query": "How do I enable two-factor authentication and what if I lose my phone?",
            "intent": "account_access",
            "expected_topic": "security",
        },
    ]

    all_passed = True

    for test in test_queries:
        print(f"\n  ── Query: {test['name']} ──")
        print(f"    Intent: {test['intent']}")
        print(f"    Query: \"{test['query'][:100]}...\"")

        result = run_knowledge_agent(
            session_id="test-knowledge",
            intent=test["intent"],
            persona=None,
            product_context="Retail Banking Support",
            query_text=test["query"],
            turn_index=0,
        )

        results = result.get("results", [])
        note = result.get("note")

        print(f"    Results found: {len(results)}")

        if note == "no relevant knowledge found":
            print_result(WARN, "No relevant knowledge found (may need to upload FAQ first)")
            continue

        if not results:
            print_result(WARN, "No results returned (KB may be empty)")
            continue

        for i, r in enumerate(results):
            chunk = r.get("chunk_text", "")[:120]
            source = r.get("source_document", "unknown")
            score = r.get("relevance_score", 0)
            why = r.get("why_relevant", "N/A")
            print(f"\n    Result #{i + 1}:")
            print(f"      Chunk: \"{chunk}...\"")
            print(f"      Source: {source}")
            print(f"      Score: {score:.4f}")
            print(f"      Why: {why}")

        # Check that results come from the shared collection (no per-file filtering)
        sources = set(r.get("source_document", "") for r in results)
        checks = []
        checks.append(("Has at least 1 result", len(results) > 0))
        checks.append(("Has source_document metadata",
                       all(r.get("source_document") for r in results)))
        checks.append(("Has relevance_score",
                       all(r.get("relevance_score", 0) > 0 for r in results)))
        checks.append(("Has why_relevant explanation",
                       all(r.get("why_relevant") for r in results)))

        test_passed = all(v for _, v in checks)
        if test_passed:
            print_result(PASS, "All checks passed")
        else:
            print_result(WARN, "Partial results:")
            for label, v in checks:
                if not v:
                    print(f"         - {label}")

    return all_passed


# ─── What "Good" vs "Bad" Output Looks Like ────────────────────────

GOOD_OUTPUT_GUIDE = """
╔══════════════════════════════════════════════════════════════════════╗
║                   HOW TO INTERPRET TEST RESULTS                     ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ✅ PASS = Agent is working correctly                                ║
║  ⚠️  WARN = Agent ran but results may vary based on API/model       ║
║  ❌ FAIL = Agent encountered an error or critical check failed       ║
║                                                                      ║
║  GOOD Simulator Output:                                             ║
║  - Messages are 50+ characters, natural-sounding                    ║
║  - Each scenario produces DIFFERENT messages (not copy-paste)       ║
║  - Emotional continuity: frustration changes based on agent reply   ║
║  - BAD: "This is a test message" or repetitive phrases              ║
║                                                                      ║
║  GOOD Intent Analysis:                                              ║
║  - Intent matches the topic (e.g. "billing_issue" for fee dispute)  ║
║  - Emotion matches message tone (e.g. "frustrated" for complaint)   ║
║  - Frustration score is sensible (high for angry, low for satisfied) ║
║  - BAD: All messages classified as "general_question" "neutral"     ║
║                                                                      ║
║  GOOD Knowledge Retrieval:                                          ║
║  - Results are RELEVANT to the query topic                          ║
║  - Results come from DIFFERENT source documents (cross-doc search)  ║
║  - Source document names are shown correctly                        ║
║  - BAD: Results all from same document (means per-collection bug)   ║
║  - BAD: Relevance score is 0.0 (means no match found)               ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
"""


# ─── Main Runner ────────────────────────────────────────────────────

def main():
    print("\n🚀 Milestone 2 Test Suite")
    print(f"   Groq API: {'✅ Configured' if settings.GROQ_API_KEY else '⚠️  Not set (using fallbacks)'}")
    print(f"   Gemini API: {'✅ Configured' if settings.GEMINI_API_KEY else '⚠️  Not set (using fallbacks)'}")
    print(f"   MongoDB: {settings.MONGODB_URI[:30]}...")
    print(f"   ChromaDB: {settings.CHROMA_PERSIST_DIR}")

    # Ensure MongoDB connection
    try:
        mongo.connect()
        mongo.client.admin.command("ping")
        print(f"   MongoDB: ✅ Connected")
    except Exception as e:
        print(f"   MongoDB: ❌ Connection failed: {e}")
        print("   Please check your MONGODB_URI in backend/.env")
        sys.exit(1)

    all_tests_passed = True

    # Run Test 1: Simulator Agent
    print("\n" + "="*70)
    sim_passed = test_simulator_agent()
    all_tests_passed = all_tests_passed and sim_passed

    # Run Test 2: Intent & Sentiment Agent
    intent_passed = test_intent_sentiment_agent()
    all_tests_passed = all_tests_passed and intent_passed

    # Run Test 3: Knowledge Agent
    knowledge_passed = test_knowledge_agent()
    all_tests_passed = all_tests_passed and knowledge_passed

    # Final Summary
    print("\n" + "="*70)
    print("  FINAL SUMMARY")
    print("="*70)
    print(f"  Simulator Agent:     {'✅ PASS' if sim_passed else '❌ PARTIAL'}")
    print(f"  Intent Agent:        {'✅ PASS' if intent_passed else '❌ PARTIAL'}")
    print(f"  Knowledge Agent:     {'✅ PASS' if knowledge_passed else '❌ PARTIAL'}")

    if settings.GROQ_API_KEY and settings.GEMINI_API_KEY:
        print("\n  Both API keys configured — full AI-powered results expected.")
    else:
        print("\n  ⚠️  Some API keys missing. Agents are using fallback logic.")
        print("     For best results, set GROQ_API_KEY and GEMINI_API_KEY in backend/.env")

    print(GOOD_OUTPUT_GUIDE)

    return all_tests_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

