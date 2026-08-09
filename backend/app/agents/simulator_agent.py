"""
simulator_agent.py

Customer Simulator Agent (Groq — Llama 3.3 70B)

Replaces the Milestone 1 stub with a real implementation:

Input:
  - persona description, product/service context, customer scenario
    (all collected from Session Config in Milestone 1)
  - Full conversation history so far

Behavior:
  - Generates ONE realistic customer message per call, matching the
    defined persona and scenario
  - Maintains emotional continuity: tracks an internal frustration
    level that can rise or fall turn-by-turn based on conversation quality
  - Emotional progression feels natural, not robotic
  - Uses Groq's streaming API (stream=True) so the message streams
    to the frontend token-by-token

Output:
  { message: string, internal_frustration_level: number (0-100) }

Saves each generated message to the MongoDB messages collection,
linked to the session_id.
"""

from __future__ import annotations

import datetime as dt
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.services.mongo import mongo
from app.utils.llm_client import GroqClient, groq_client


def _build_system_prompt(
    persona: str | None,
    product_context: str,
    scenario: str,
    current_frustration: int,
) -> str:
    """Build the system prompt for the simulator agent.

    The prompt instructs the model to act as a realistic customer
    with the given persona, scenario, and emotional state.
    """
    persona_desc = persona or "a typical customer"
    return f"""You are a CUSTOMER SIMULATOR for an AI customer support coaching system.

Your job is to generate ONE realistic customer message at a time, as if you are
a real customer interacting with a support agent.

YOUR PERSONA: {persona_desc}
PRODUCT/SERVICE CONTEXT: {product_context}
YOUR SCENARIO: {scenario}

IMPORTANT RULES:
1. Generate ONLY ONE customer message per turn — do not write the agent's response.
2. Stay in character based on your persona and scenario.
3. Your current frustration level is {current_frustration}/100.
   - If the agent's replies (in the conversation history) are vague, unhelpful,
     or dismissive, INCREASE frustration naturally.
   - If the agent is clear, empathetic, and helpful, DECREASE frustration.
4. Vary your language and complaints naturally — avoid repeating the same phrases.
5. Respond DIRECTLY to the agent's last message if there is one.

WRITING STYLE — you are a real customer TYPING a support chat, not writing an email:
- Keep your message SHORT — typically 1 to 3 sentences. NO long, structured,
  multi-sentence paragraphs. Real customers don't write polished paragraphs
  when they're frustrated or in a hurry.
- Type like a real person texting support: casual phrasing, contractions
  ("cant", "ive", "wheres", "dont"), lowercase starts, and occasionally
  missing punctuation. Do NOT write every message with formal grammar.
- Imperfection should be OCCASIONAL and natural, not exaggerated or constant.
  A couple of typos across a few messages max — never every single message,
  and never so sloppy it becomes unreadable.
- Keep each message conversational and to the point. One short ask, complaint,
  or clarification per message is enough.

Output ONLY the customer message as plain text — no JSON, no labels."""


def _build_conversation_context(
    messages: list[dict[str, Any]],
    user_agent_message: str,
) -> str:
    """Build the conversation history context from stored messages.

    Includes the last several turns and the latest agent message.
    """
    context_parts = []
    for msg in messages[-6:]:  # Last 6 messages for context
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        context_parts.append(f"[{role.upper()}]: {content}")

    # Add the latest agent message
    if user_agent_message:
        context_parts.append(f"[AGENT]: {user_agent_message}")

    return "\n".join(context_parts)


def _get_frustration_adjustment(
    agent_message: str,
    current_frustration: int,
) -> int:
    """Determine frustration adjustment based on agent message quality.

    Uses simple heuristics to determine if the agent's message is
    helpful or unhelpful, adjusting frustration accordingly.
    """
    if not agent_message:
        return 0

    agent_lower = agent_message.lower()

    # Phrases that suggest helpful/empathetic responses
    helpful_indicators = [
        "sorry", "apologize", "understand", "help", "assist",
        "let me", "i'll", "i will", "we'll", "we will",
        "resolve", "fix", "solution", "check", "investigate",
        "thank you for", "appreciate", "certainly", "absolutely",
    ]

    # Phrases that suggest unhelpful/dismissive responses
    unhelpful_indicators = [
        "unfortunately", "can't", "cannot", "won't", "will not",
        "policy", "we are unable", "not possible", "no way",
        "please call", "please email", "not our problem",
        "nothing we can do", "it is what it is",
    ]

    helpful_count = sum(1 for phrase in helpful_indicators if phrase in agent_lower)
    unhelpful_count = sum(1 for phrase in unhelpful_indicators if phrase in agent_lower)

    # Net adjustment: -5 to -15 for helpful, +5 to +20 for unhelpful
    if helpful_count > unhelpful_count:
        # Decreasing frustration (agent is being helpful)
        return max(-15, -5 * (helpful_count - unhelpful_count))
    elif unhelpful_count > helpful_count:
        # Increasing frustration (agent is being unhelpful)
        return min(20, 5 * (unhelpful_count - helpful_count))
    else:
        # Neutral: slight drift toward calm
        return -2 if current_frustration > 50 else 2


def run_simulator_agent(
    *,
    session_id: str,
    mode: str,
    product_context: str,
    scenario: str,
    persona: str | None,
    user_agent_message: str,
    turn_index: int,
    conversation_history: list[dict[str, Any]] | None = None,
    **_: Any,
) -> dict:
    """Run the customer simulator agent.

    Generates a realistic customer message using Groq's Llama 3.3 70B model,
    with streaming support and emotional continuity tracking.

    Args:
        session_id: The current session ID.
        mode: Session mode (Simulator, Manual, Replay).
        product_context: Product/service context.
        scenario: Customer scenario description.
        persona: Customer persona description (optional).
        user_agent_message: The most recent agent message to respond to.
        turn_index: Current turn index.
        conversation_history: Full conversation history (optional).

    Returns:
        dict with keys:
            - agent: "customer_simulator"
            - turn_index: int
            - customer_message: str (generated message)
            - internal_frustration_level: int (0-100)
            - metadata: dict with tone, language hints
    """
    mongo.connect()

    # Get conversation history from MongoDB if not provided
    if conversation_history is None:
        conversation_history_cursor = mongo.messages.find(
            {"session_id": session_id}
        ).sort("turn_index", 1)
        conversation_history = list(conversation_history_cursor)

    # Determine current frustration level from the last message, or start at 35
    current_frustration = 35
    if conversation_history:
        last_msg = conversation_history[-1]
        last_frustration = last_msg.get("frustration_level")
        if last_frustration is not None:
            current_frustration = last_frustration

    # Adjust frustration based on agent message
    frustration_adjustment = _get_frustration_adjustment(user_agent_message, current_frustration)
    new_frustration = max(0, min(100, current_frustration + frustration_adjustment))

    # Build prompts
    system_prompt = _build_system_prompt(
        persona=persona,
        product_context=product_context,
        scenario=scenario,
        current_frustration=new_frustration,
    )

    conversation_context = _build_conversation_context(
        messages=conversation_history or [],
        user_agent_message=user_agent_message,
    )

    user_prompt = f"""Here is the conversation so far:

{conversation_context}

Generate the NEXT customer message as your assigned persona. Remember:
- Keep it realistic and in character
- Frustration level is {new_frustration}/100 — let this influence the tone
- Respond naturally to the agent's last message
- Output ONLY the customer message text"""

    # Try to generate using Groq
    customer_message = None
    try:
        if groq_client.api_key:
            # Use streaming for the actual generation but collect for non-streaming return
            collected = []
            for token in groq_client.generate_stream(
                model=settings.GROQ_SIMULATOR_MODEL,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.8,
                max_tokens=512,
            ):
                collected.append(token)
            customer_message = "".join(collected).strip()
        else:
            # Fallback: generate JSON mode for non-streaming
            result = groq_client.generate_json(
                model=settings.GROQ_SIMULATOR_MODEL,
                system_prompt=system_prompt + "\n\nOutput in JSON format: {\"message\": \"...\"}",
                user_prompt=user_prompt,
                temperature=0.8,
                max_tokens=512,
            )
            if isinstance(result, dict) and "message" in result:
                customer_message = result["message"]
    except Exception as e:
        print(f"[simulator_agent] Groq API error: {e}")

    # Fallback: generate a context-aware message
    if not customer_message:
        customer_message = _generate_fallback_message(
            scenario=scenario,
            product_context=product_context,
            frustration=new_frustration,
            agent_message=user_agent_message,
        )

    # Clean up the message
    customer_message = customer_message.strip().strip('"').strip("'")

    # NOTE: We do NOT persist the customer message here. Calling the pipeline
    # via /conversation/turn (POST /api/conversation/turn) is the single writer
    # for customer messages: it attaches intent/sentiment + knowledge results
    # and stores them in ONE document with analytics. Persisting again here
    # (as the old SSE path did) produced DUPLICATE customer documents with
    # mismatched/blank fields. The standalone simulator endpoints that rely on
    # this function persisting were replaced by conversation.turn in the
    # SessionContext refactor, so there is no longer a caller expecting us to
    # write to MongoDB. (See backend/app/routers/conversation.py.)

    return {
        "agent": "customer_simulator",
        "turn_index": turn_index + 1,
        "customer_message": customer_message,
        "internal_frustration_level": new_frustration,
        "metadata": {
            "tone": "frustrated" if new_frustration > 60 else "concerned" if new_frustration > 35 else "calm",
            "language": "en",
        },
    }


def _generate_fallback_message(
    scenario: str,
    product_context: str,
    frustration: int,
    agent_message: str,
) -> str:
    """Generate a fallback message when Groq is unavailable.

    Creates context-aware messages that still feel realistic.
    """
    frustrated_phrases = [
        f"I'm really frustrated about this {scenario.lower()}. {agent_message[:100]}... "
        f"but I've been dealing with this for too long. Can you actually help me?",

        f"Look, I've explained my situation already. The {product_context.lower()} issue "
        f"with {scenario.lower()} is still not resolved. What are you going to do about it?",

        f"I'm getting tired of repeating myself. The {scenario.lower()} problem "
        f"is causing real issues for me. I need a solution today.",
    ]

    calm_phrases = [
        f"Thanks for looking into this. Regarding the {scenario.lower()}, "
        f"could you walk me through what happens next?",

        f"I appreciate your help with this {product_context.lower()} matter. "
        f"Just to confirm, you'll be handling the {scenario.lower()} issue personally?",

        f"That makes sense. So just to clarify, once you check the {product_context.lower()} "
        f"system, the {scenario.lower()} issue should be resolved?",
    ]

    if frustration > 60:
        import random
        return random.choice(frustrated_phrases)
    else:
        import random
        return random.choice(calm_phrases)

