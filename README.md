# Nova Trade Documents - Part 2 (Backend + React Frontend)

This repo is now split for easy Render deployment:
- `backend/` FastAPI + Neon PostgreSQL + background inbox trigger worker
- `frontend/` React (Vite) CG verification console

## What Part 2 Implements
- Simulated SU inbox trigger (`backend/inbox/<shipment_folder>/`)
- Multi-attachment shipment handling
- Per-document extraction + rule validation
- Cross-document consistency checks
- Router decision + editable draft reply
- Verified outputs stored in Neon PostgreSQL
- Queryable API endpoint for NL-style queries

## Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set in `.env`:
- `OPENAI_API_KEY`
- `DATABASE_URL` (Neon connection string with `sslmode=require`)

Run:
```bash
uvicorn app.main:app --reload --port 8000
```

## Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Simulated Inbox Trigger Flow
1. Create folder: `backend/inbox/<shipment_name>/`
2. Add `metadata.json` with `customer_name` and `subject`
3. Add attachments (`.pdf/.png/.jpg/.jpeg`)
4. Backend worker auto-detects and processes folder

## Render Deployment

### Backend (Web Service)
- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env vars:
  - `DATABASE_URL`
  - `OPENAI_API_KEY`

### Frontend (Static Site)
- Root directory: `frontend`
- Build: `npm install && npm run build`
- Publish directory: `dist`
- Env var:
  - `VITE_API_BASE_URL=https://<your-backend>.onrender.com/api`

## API Endpoints
- `GET /api/health`
- `POST /api/shipments/ingest`
- `POST /api/shipments/{shipment_id}/process`
- `GET /api/shipments`
- `GET /api/shipments/{shipment_id}`
- `POST /api/query`
