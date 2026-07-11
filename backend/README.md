# Backend (FastAPI)

## Setup
```bash
cd backend
python -m venv .venv
.\./.venv/Scripts/activate
pip install -r requirements.txt
```

## Env
Copy env example:
```bash
cd ..
copy .env.example .env
```
Fill `MONGODB_URI`.

## Run
```bash
uvicorn app.main:app --reload --port 8000
```

## Test (quick)
- POST /api/health
- POST /api/sessions
- POST /api/knowledge/upload
- POST /api/knowledge/query

