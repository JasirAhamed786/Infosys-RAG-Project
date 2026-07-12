"""llm_client.py

Unified LLM client interface (scaffolding only)

Design goals:
- Provide a single interface for Groq and Gemini.
- Include a clear "model_tier" parameter so later Milestones can switch models
  or route by task complexity.

NOTE:
- This phase does not make real network calls.
- Functions return mock structured outputs or raise NotImplementedError.

TODO: Milestone 2/3/4 - Replace mocks with real Groq/Gemini calls.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal


ModelTier = Literal["small", "medium", "large"]
Provider = Literal["groq", "gemini"]


@dataclass(frozen=True)
class LLMRequest:
    provider: Provider
    model_name: str
    model_tier: ModelTier
    prompt: str
    json_mode: bool = True


class LLMClient:
    def generate_json(self, req: LLMRequest) -> dict[str, Any]:
        """Generate a JSON response.

        TODO: Milestone 2/3 - Implement real provider calls.
        """

        # TODO: Replace with real calls.
        return {
            "mock": True,
            "provider": req.provider,
            "model_name": req.model_name,
            "model_tier": req.model_tier,
            "output": {
                "message": "Mock LLM response",
            },
        }


llm_client = LLMClient()

