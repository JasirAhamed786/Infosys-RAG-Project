"""
knowledge_agent.py

Knowledge Recommendation Agent (Gemini 2.0 Flash)

Replaces the Milestone 1 stub with a real implementation:

Input:
  - Latest customer message
  - Intent from Agent #2 (Intent & Sentiment)
  - Product/service context

Behavior:
  - Queries the SHARED ChromaDB collection for top 3 most relevant
    knowledge base chunks across ALL uploaded documents
  - Uses Gemini to briefly explain WHY each chunk is relevant
    (1 sentence per chunk)
  - Includes source_document metadata in the output
  - Returns "no relevant knowledge found" if no good match exists

Output:
  { results: [ { chunk_text: string, source_document: string,
    relevance_score: number, why_relevant: string } ] }

Saves result to MongoDB message's knowledge_result field.
"""

from __future__ import annotations

import datetime as dt
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.services.mongo import mongo
from app.services.rag import rag_service
from app.utils.llm_client import gemini_client

# System prompt for Gemini relevance explanation
RELEVANCE_SYSTEM_PROMPT = """You are a Knowledge Relevance Analyst for a customer support coaching system.

Your job: Given a customer message and a retrieved knowledge base chunk, explain
why that chunk is relevant to the customer's situation.

Rules:
1. Write EXACTLY ONE sentence per chunk — be concise.
2. Focus on what specific information in the chunk addresses the customer's need.
3. Be practical and actionable.
4. Output ONLY valid JSON, no other text.

Output format:
{
  "explanations": [
    "One sentence explaining why chunk 1 is relevant.",
    "One sentence explaining why chunk 2 is relevant.",
    "One sentence explaining why chunk 3 is relevant."
  ]
}"""

# Minimum similarity threshold to consider a result relevant
MIN_SIMILARITY_THRESHOLD = 0.15


def run_knowledge_agent(
    *,
    session_id: str,
    intent: str,
    persona: str | None,
    product_context: str,
    query_text: str,
    turn_index: int,
    **_: Any,
) -> dict:
    """Run knowledge recommendation.

    Queries the shared ChromaDB collection and uses Gemini to explain
    relevance. If no API keys are available, falls back to direct retrieval.

    Args:
        session_id: The current session ID.
        intent: The classified intent from the Intent & Sentiment Agent.
        persona: Customer persona (unused for retrieval, kept for API compat).
        product_context: Product/service context.
        query_text: The latest customer message.
        turn_index: Current turn index.

    Returns:
        dict with keys: agent, turn_index, results (list of dicts).
    """
    mongo.connect()

    # Use clean natural language query — no intent/product prefix pollution
    search_query = query_text.strip()

    print(f"[knowledge_agent] Searching with clean query: {search_query[:200]}...")

    # Query the shared ChromaDB collection
    try:
        retrieval_results = rag_service.query_chroma(
            query=search_query,
            top_k=3,
        )
    except Exception as e:
        print(f"[knowledge_agent] ChromaDB query error: {e}")
        retrieval_results = []

    print(f"[knowledge_agent] Got {len(retrieval_results)} results from ChromaDB")

    # Filter out low-similarity results
    relevant_results = [
        r for r in retrieval_results
        if r["similarity"] >= MIN_SIMILARITY_THRESHOLD
    ]

    if not relevant_results:
        print("[knowledge_agent] No relevant knowledge found (below threshold or empty)")

        result = {
            "agent": "knowledge_recommendation",
            "turn_index": turn_index,
            "results": [],
            "note": "no relevant knowledge found",
        }

        # Save to MongoDB
        _save_knowledge_result(session_id, turn_index, result)

        return result

    # Use Gemini to explain relevance of each result
    explanations = _generate_explanations(
        customer_message=query_text,
        chunks=[r["text"] for r in relevant_results],
        intent=intent,
    )

    # Build the output
    out_results = []
    for i, r in enumerate(relevant_results):
        out_results.append({
            "chunk_text": r["text"],
            "source_document": r["source_document"],
            "relevance_score": round(r["similarity"], 4),
            "why_relevant": explanations[i] if i < len(explanations) else "Matches the customer's query topic.",
        })

    result = {
        "agent": "knowledge_recommendation",
        "turn_index": turn_index,
        "results": out_results,
    }

    # Save to MongoDB
    _save_knowledge_result(session_id, turn_index, result)

    return result


def _generate_explanations(
    customer_message: str,
    chunks: list[str],
    intent: str,
) -> list[str]:
    """Use Gemini to generate brief explanations for each chunk.

    Falls back to generic explanations if Gemini is unavailable.
    """
    if not chunks:
        return []

    # If Gemini is not configured, use generic explanations
    if not gemini_client.api_key:
        print("[knowledge_agent] WARNING: GEMINI_API_KEY not set. Using generic explanations.")
        return [
            f"Matches the customer's {intent} query topic and provides relevant information.",
            "Contains related information that may help address this inquiry.",
            "Offers supplementary details that could be useful for this topic.",
        ][:len(chunks)]

    # Build the prompt for Gemini
    chunks_text = ""
    for i, chunk in enumerate(chunks):
        # Truncate long chunks
        truncated = chunk[:500] + "..." if len(chunk) > 500 else chunk
        chunks_text += f"\nCHUNK {i + 1}: {truncated}\n"

    user_prompt = f"""Customer message: "{customer_message}"
Detected intent: {intent}

Retrieved knowledge base chunks:
{chunks_text}

For each chunk, write ONE sentence explaining why it is relevant to this customer's message and intent.

Output JSON with an "explanations" array containing exactly {len(chunks)} sentences."""

    try:
        result = gemini_client.generate_json(
            model=settings.GEMINI_KNOWLEDGE_MODEL,
            system_prompt=RELEVANCE_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.4,
            max_tokens=512,
        )

        if isinstance(result, dict) and "explanations" in result:
            explanations = result["explanations"]
            # Ensure we have the right number of explanations
            if len(explanations) < len(chunks):
                # Pad with generic explanations
                generic = [
                    "This chunk is relevant because it addresses the core topic of the customer's inquiry.",
                    "Contains information that could help resolve the customer's concern.",
                    "Provides supplementary details relevant to this type of issue.",
                ]
                explanations.extend(generic[:len(chunks) - len(explanations)])
            return explanations[:len(chunks)]
        else:
            print(f"[knowledge_agent] Gemini returned unexpected format: {result}")
    except Exception as e:
        print(f"[knowledge_agent] Gemini explanation error: {e}")

    # Fallback generic explanations
    return [
        "This knowledge base entry addresses the customer's topic and provides relevant guidance.",
        "Contains information related to the customer's situation that may be helpful.",
        "Offers supplementary context that could assist in handling this type of inquiry.",
    ][:len(chunks)]


def _save_knowledge_result(
    session_id: str,
    turn_index: int,
    result: dict,
):
    """Save the knowledge result to the most recent customer message in MongoDB.

    Finds the latest customer message for this session+turn and updates
    its knowledge_result field.
    """
    try:
        mongo.messages.update_one(
            {
                "session_id": session_id,
                "turn_index": turn_index,
                "role": "customer",
            },
            {
                "$set": {
                    "knowledge_result": result,
                }
            },
        )
    except Exception as e:
        print(f"[knowledge_agent] Failed to save knowledge result to MongoDB: {e}")

