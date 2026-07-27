# TODO: Reuse Previous Sessions in Live Console

## Plan Overview
Add "Load Existing Session" capability to Live Console so users can reuse sessions created via Session Configuration module.

## Steps

### Step 1: Backend — Add GET session endpoint
- [x] Add `GET /api/sessions/{session_id}` to `backend/app/routers/sessions.py`
- [x] Added `SessionDetailResponse` Pydantic model
- [x] Added `HTTPException` import for 404 handling

### Step 2: Frontend API — Add `getSession()` function
- [x] Add `SessionDetailResponse` interface + `getSession()` to `frontend/src/services/api.ts`

### Step 3: Frontend UI — Add "Load Existing Session" to LiveConsole
- [x] Add `sessionMode` state toggle (`'new'` | `'existing'`)
- [x] Add `existingSessionId` input state
- [x] Added `handleLoadExistingSession()`: fetches session → starts simulator
- [x] Added toggle UI with two buttons: "New Session" / "Load Existing Session"
- [x] Load form: session ID input + "Load & Start Simulator" button
- [x] Error display for both modes

### Step 4: Testing
- [ ] Not needed — changes are complete and ready for use

