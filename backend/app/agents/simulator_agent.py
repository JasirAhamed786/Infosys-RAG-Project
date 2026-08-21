"""
simulator_agent.py

Customer Simulator Agent (Groq)

Generates ONE realistic customer message per call, matching the
defined persona and scenario, dynamically adjusting emotional state
based on the agent's tone. Uses strict JSON generation for safety.
"""

from __future__ import annotations

from typing import Any
from app.core.config import settings
from app.services.mongo import mongo
from app.utils.llm_client import groq_client


def _build_system_prompt(
    persona: str | None,
    product_context: str,
    scenario: str,
    current_frustration: int,
) -> str:
    """Build the strict JSON system prompt for the simulator agent."""
    persona_desc = persona or "a typical customer"
    return f"""You are a CUSTOMER SIMULATOR for an AI customer support coaching system.

YOUR PERSONA: {persona_desc}
PRODUCT/SERVICE CONTEXT: {product_context}
YOUR SCENARIO: {scenario}

BEHAVIORAL RULES:
1. Generate ONLY ONE customer message per turn — do not write the agent's response.
2. Stay in character based on your persona and scenario.
3. Your baseline frustration level right now is {current_frustration}/100.
4. DYNAMIC EMOTION REACTIVITY:
   - If the agent's replies are vague, unhelpful, or dismissive, INCREASE frustration naturally.
   - If the agent insults you, is rude, or calls you names (e.g., "fool"), you MUST become highly angry, hostile, and threaten to escalate or leave.
   - If the agent is clear, empathetic, and helpful, DECREASE frustration.
5. Type like a real person texting support: casual phrasing, short sentences (1-3 max). Real customers don't write polished paragraphs when they're in a hurry.

CRITICAL INSTRUCTION: You must output STRICTLY valid JSON only. 
Do NOT wrap your response in markdown blocks (e.g., do not use ```json).
Do NOT include any conversational text before or after the JSON.

Output EXACTLY this JSON schema:
{{
  "customer_message": "string",
  "internal_frustration_level": 0
}}"""


def _build_conversation_context(
    messages: list[dict[str, Any]],
    user_agent_message: str,
) -> str:
    """Build the conversation history context from stored messages."""
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
    """Heuristic base adjustment, overridden by the LLM's final decision."""
    if not agent_message:
        return 0

    agent_lower = agent_message.lower()
    helpful_indicators = ["sorry", "apologize", "understand", "help", "assist", "let me", "resolve", "fix", "thank you"]
    unhelpful_indicators = ["unfortunately", "can't", "cannot", "won't", "policy", "unable", "fool", "idiot"]

    helpful_count = sum(1 for phrase in helpful_indicators if phrase in agent_lower)
    unhelpful_count = sum(1 for phrase in unhelpful_indicators if phrase in agent_lower)

    if unhelpful_count > helpful_count:
        return min(25, 10 * (unhelpful_count - helpful_count))
    elif helpful_count > unhelpful_count:
        return max(-15, -5 * (helpful_count - unhelpful_count))
    return 0


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
    """Run the customer simulator agent."""
    mongo.connect()

    if conversation_history is None:
        conversation_history_cursor = mongo.messages.find(
            {"session_id": session_id}
        ).sort("turn_index", 1)
        conversation_history = list(conversation_history_cursor)

    current_frustration = 35
    if conversation_history:
        last_msg = conversation_history[-1]
        if last_msg.get("frustration_level") is not None:
            current_frustration = last_msg.get("frustration_level")

    frustration_adjustment = _get_frustration_adjustment(user_agent_message, current_frustration)
    baseline_frustration = max(0, min(100, current_frustration + frustration_adjustment))

    system_prompt = _build_system_prompt(
        persona=persona,
        product_context=product_context,
        scenario=scenario,
        current_frustration=baseline_frustration,
    )

    conversation_context = _build_conversation_context(
        messages=conversation_history or [],
        user_agent_message=user_agent_message,
    )

    user_prompt = f"""Here is the conversation so far:
{conversation_context}

Generate the NEXT customer message as your assigned persona in STRICT JSON format."""

    customer_message = None
    final_frustration = baseline_frustration

    try:
        if groq_client.api_key:
            result = groq_client.generate_json(
                model=settings.GROQ_SIMULATOR_MODEL,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.7,
                max_tokens=1024,
            )
            
            if isinstance(result, dict) and "customer_message" in result:
                customer_message = result.get("customer_message", "").strip()
                final_frustration = int(result.get("internal_frustration_level", baseline_frustration))
    except Exception as e:
        print(f"[simulator_agent] API error: {e}")

    # Fallback if generation failed
    if not customer_message:
        customer_message = "I am very frustrated with this situation. Are you going to help me or not?"
        final_frustration = min(100, baseline_frustration + 10)

    # Clean up any stray quotes
    customer_message = customer_message.strip('"').strip("'")
    final_frustration = max(0, min(100, final_frustration))

    return {
        "agent": "customer_simulator",
        "turn_index": turn_index + 1,
        "customer_message": customer_message,
        "internal_frustration_level": final_frustration,
        "metadata": {
            "tone": "frustrated" if final_frustration > 60 else "concerned" if final_frustration > 35 else "calm",
            "language": "en",
        },
    }