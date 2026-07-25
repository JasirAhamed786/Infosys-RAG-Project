"""
llm_client.py

Unified LLM client interface for Groq and Gemini.

Provides:
- GroqClient: For Llama models (simulator + intent/sentiment)
- GeminiClient: For Gemini models (knowledge recommendation)
- Streaming support for the simulator agent (stream=True)
- Retry-with-backoff for 429 rate limit errors
- JSON-only mode with parsing + retry for intent/sentiment agent
"""

from __future__ import annotations

import json
import re as re_module
import time
from dataclasses import dataclass
from typing import Any, Callable, Generator, Literal

from app.core.config import settings

ModelTier = Literal["small", "medium", "large"]
Provider = Literal["groq", "gemini"]


@dataclass(frozen=True)
class LLMRequest:
    provider: Provider
    model_name: str
    model_tier: ModelTier
    prompt: str
    system_prompt: str | None = None
    json_mode: bool = True
    temperature: float = 0.7
    max_tokens: int = 1024


class LLMError(Exception):
    """Base exception for LLM client errors."""
    pass


class RateLimitError(LLMError):
    """Raised when we hit a 429 rate limit after all retries."""
    pass


class JSONParseError(LLMError):
    """Raised when the model returns malformed JSON after retries."""
    pass


def _retry_with_backoff(func: Callable, max_retries: int = None, base_delay: float = None) -> Any:
    """Retry a function with exponential backoff on rate limit errors."""
    max_retries = max_retries or settings.MAX_RETRIES
    base_delay = base_delay or settings.RETRY_BASE_DELAY

    for attempt in range(max_retries + 1):
        try:
            return func()
        except RateLimitError:
            if attempt >= max_retries:
                raise
            delay = base_delay * (2 ** attempt)
            print(f"[llm_client] Rate limited. Retrying in {delay:.1f}s (attempt {attempt + 1}/{max_retries})...")
            time.sleep(delay)

    raise RateLimitError(f"Rate limited after {max_retries} retries")


def _parse_json_response(text: str, max_retries: int = 2) -> dict[str, Any]:
    """Parse JSON from LLM response, with retry logic."""
    cleaned = text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0].strip()
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0].strip()

    for attempt in range(max_retries + 1):
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            if attempt >= max_retries:
                raise JSONParseError(
                    f"Failed to parse LLM JSON response after {max_retries} retries. "
                    f"Error: {e}. Raw text: {cleaned[:500]}"
                )
            cleaned = cleaned.strip()
            if cleaned.endswith(","):
                cleaned = cleaned[:-1]
            json_match = re_module.search(r"\{.*\}", cleaned, re_module.DOTALL)
            if json_match:
                cleaned = json_match.group(0)

    raise JSONParseError("Failed to parse JSON response")


class GroqClient:
    """Client for Groq API (Llama models)."""

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        if not self.api_key:
            print("[GroqClient] WARNING: GROQ_API_KEY not set. Mock responses will be used.")

    def _get_client(self):
        """Lazy import and create Groq client."""
        from groq import Groq
        return Groq(api_key=self.api_key)

    def _call_groq(self, model: str, messages: list[dict[str, str]], json_mode: bool = False, temperature: float = 0.7, max_tokens: int = 1024, stream: bool = False) -> Any:
        if not self.api_key:
            raise LLMError("GROQ_API_KEY not configured")
        client = self._get_client()
        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        try:
            return client.chat.completions.create(**kwargs)
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "rate limit" in error_str:
                raise RateLimitError(f"Groq rate limited: {e}")
            raise LLMError(f"Groq API error: {e}")

    def generate_json(self, model: str, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> dict[str, Any]:
        def _do_generate():
            response = self._call_groq(
                model=model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                json_mode=True, temperature=temperature, max_tokens=max_tokens,
            )
            text = response.choices[0].message.content
            if not text:
                raise LLMError("Empty response from Groq")
            return text
        try:
            text = _retry_with_backoff(_do_generate)
            return _parse_json_response(text)
        except JSONParseError as e:
            print(f"[GroqClient] JSON parse error: {e}")
            return {"error": "json_parse_failed", "raw": text if 'text' in locals() else "unknown"}

    def generate_stream(self, model: str, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Generator[str, None, None]:
        if not self.api_key:
            yield "[ERROR: GROQ_API_KEY not configured]"
            return
        def _do_stream():
            return self._call_groq(
                model=model, messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                json_mode=False, temperature=temperature, max_tokens=max_tokens, stream=True,
            )
        try:
            stream = _retry_with_backoff(_do_stream)
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
        except Exception as e:
            yield f"[Stream error: {e}]"


class GeminiClient:
    """Client for Google Gemini API (using google-genai package)."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
            print("[GeminiClient] WARNING: GEMINI_API_KEY not set. Mock responses will be used.")

    def _get_client(self):
        """Lazy import and create Gemini client."""
        from google import genai
        return genai.Client(api_key=self.api_key)

    def generate_json(self, model: str, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> dict[str, Any]:
        """Generate a JSON response from Gemini. Uses retry-with-backoff for rate limits and JSON parsing retry."""
        if not self.api_key:
            print("[GeminiClient] WARNING: GEMINI_API_KEY not set. Returning mock.")
            return {"error": "GEMINI_API_KEY not configured", "mock": True}

        def _do_generate():
            from google.genai import types
            client = self._get_client()
            full_prompt = f"{system_prompt}\n\n{user_prompt}" if system_prompt else user_prompt
            response = client.models.generate_content(
                model=model,
                contents=full_prompt,
                config=types.GenerateContentConfig(temperature=temperature, max_output_tokens=max_tokens),
            )
            return response.text

        try:
            text = _retry_with_backoff(_do_generate)
            return _parse_json_response(text)
        except (RateLimitError, JSONParseError, Exception) as e:
            print(f"[GeminiClient] Error: {e}")
            return {"error": str(e), "results": [], "note": "Gemini API call failed"}


# Singleton instances
groq_client = GroqClient()
gemini_client = GeminiClient()
