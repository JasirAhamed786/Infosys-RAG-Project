# Fix Plan: Intent & Knowledge Agents Not Working

## Issue Analysis
- **Simulator Agent**: ✅ Working perfectly (uses Groq streaming for customer messages)
- **Intent Agent**: ❌ Not working — empty/fallback results when `input_message=""` on first turn; potential model issues
- **Knowledge Agent**: ❌ Not working — Gemini model name may be outdated; empty query issues

## Root Causes Identified
1. **`simulator.py`** doesn't persist agent messages to MongoDB before running pipeline
2. **`start_simulator()`** passes empty `input_message=""` to full pipeline causing intent/knowledge failures
3. **Gemini model** `gemini-2.0-flash-exp` may be expired/invalid
4. **`simulator/message`** runs full pipeline (including simulator) again after streaming, duplicating work

## Implementation Steps

### Step 1: Fix `config.py` — Update Gemini model name
- [x] Change `gemini-2.0-flash-exp` → `gemini-2.0-flash`

### Step 2: Fix `pipeline.py` — Handle empty input gracefully
- [x] Skip intent/knowledge stages when `input_message` is empty string
- [x] Add more descriptive logging for stage failures

### Step 3: Fix `simulator.py` — Persist messages to MongoDB
- [x] Save first customer message to MongoDB on start
- [x] Handle first-turn scenario properly with empty input_message

### Step 4: Test and validate
- [x] Code changes complete
- [ ] Run the backend server and verify fixes
- [ ] Run the test suite `python -m tests.test_milestone2`

## Summary of Changes

### 1. `backend/app/core/config.py`
- Changed Gemini model from `gemini-2.0-flash-exp` (experimental/deprecated) to `gemini-2.0-flash` (stable)

### 2. `backend/app/orchestration/pipeline.py`
- **Critical fix**: Now extracts the **customer's last message** from conversation history for intent/knowledge analysis, instead of analyzing the agent's message (which was being passed as `input_message`)
- Skips intent/knowledge stages gracefully when no customer message is available (first turn)
- Added clear logging for what message is being analyzed

### 3. `backend/app/routers/simulator.py`
- `start_simulator()` now persists the first customer message to MongoDB so subsequent pipeline runs have conversation context
- Extracts frustration_level from pipeline result for persistence

