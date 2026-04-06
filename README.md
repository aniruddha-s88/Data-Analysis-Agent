# Business AI Agent

A full-stack analytics assistant that lets teams chat with their data, generate executive-ready reports, and auto-build dashboards per conversation.

## Highlights
- Upload CSV/Excel per chat and get answers grounded in that dataset.
- Upload PDFs for semantic search and Q&A.
- Generate polished PDF and DOCX executive reports.
- Build KPI cards plus pie, bar, and line charts on demand.
- Keep datasets and dashboards scoped to each chat.

## How It Works
The backend stores each chat's dataset in Postgres, builds summaries, and exposes endpoints for Q&A, reports, and dashboards. PDFs are embedded into a Chroma vector store for semantic retrieval. The frontend provides a ChatGPT-style workflow with chat history and a dashboard panel.

## Tech Stack
- Backend: FastAPI, Pandas, SQLAlchemy, Postgres, ChromaDB, Gemini, ReportLab, python-docx
- Frontend: React, Chart.js, Axios

## Quick Start

### Backend
```
pip install -r requirements.txt
uvicorn server.main:app --reload
```

### Frontend
```
cd client
npm install
npm start
```

The frontend expects the API at `http://localhost:8000` and allows CORS from `http://localhost:3000`.

## Environment Variables
Create `server/.env`:
```
GEMINI_API_KEY=your_key_here
AGENT_PLANNER=
AGENT_MAX_STEPS=
```

Optional:
```
GEMINI_MODEL=gemini-3-flash-preview
```

## API Endpoints (Backend)
- `POST /upload-csv/` — Upload CSV or Excel for a chat
- `POST /upload-pdf/` — Upload PDF for semantic search
- `GET /ask/` — Ask a question, returns answer + trace
- `GET /history/` — Recent chat history
- `GET /report/` — PDF report
- `GET /report-docx/` — DOCX report
- `GET /dashboard-data/` — KPI + chart data for the dashboard

## Notes
- Each chat keeps its own dataset and dashboard state.
- Dashboards render only after a dataset is uploaded in that chat and a dashboard is requested.
- If you commit to GitHub, do not commit real API keys in `server/.env`.

## License
MIT
