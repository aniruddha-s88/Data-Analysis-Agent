# Business AI Agent

## Overview
Business AI Agent is a full-stack analytics assistant that lets users:
- Upload CSV/Excel data per chat
- Upload PDFs for semantic search
- Ask questions and get model-generated answers with traceable tool steps
- Generate professional PDF and DOCX reports
- Auto-build dashboards (KPIs + pie + bar + line charts) per chat

Each chat keeps its **own dataset and dashboard**. Dashboards only appear when:
1. A dataset is uploaded in that chat, and
2. The user requests a dashboard (e.g., “Build a dashboard for this dataset”)

## Architecture

### Backend (FastAPI)
- **Data ingestion:** CSV/Excel uploads are stored in a Postgres table scoped by chat ID.
- **PDF ingestion:** PDF text is embedded and stored in Chroma for similarity search.
- **LLM answers:** Gemini is used to generate answers from retrieved context and SQL insights.
- **Reports:** Generates polished PDF and DOCX reports from the current chat’s dataset.
- **Dashboards:** Aggregates KPI metrics and chart data from the current chat’s dataset.

### Frontend (React)
- **ChatGPT-style sidebar:** New chat, load history, refresh dashboard, rename/delete chats.
- **Per-chat memory:** Messages and dashboards stored in localStorage.
- **Dashboard view:** Professional KPI cards + pie, bar, and line charts.

## Backend Dependencies (requirements.txt)
This project uses the following Python packages:
- `fastapi`: API framework
- `uvicorn`: ASGI server
- `python-multipart`: file uploads
- `pandas`: data processing and aggregation
- `sqlalchemy`: database ORM/engine
- `psycopg2-binary`: Postgres driver
- `python-dotenv`: load environment variables
- `google-generativeai`: Gemini API client
- `reportlab`: PDF report generation
- `python-docx`: DOCX report generation
- `langchain-huggingface`: embedding wrapper
- `langchain-chroma`: Chroma vector store integration
- `sentence-transformers`: embedding model
- `chromadb`: vector database backend

## Frontend Dependencies (package.json)
Key frontend packages:
- `react`, `react-dom`, `react-scripts`
- `axios` (API calls)
- `bootstrap` (base UI utilities)
- `chart.js`, `react-chartjs-2` (dashboard charts)

## Environment Variables (server/.env)
Required:
- `GEMINI_API_KEY`
Optional:
- `GEMINI_MODEL` (defaults to `gemini-3-flash-preview`)
- `AGENT_PLANNER` (`1` to enable multi-step planning)

## Run Locally

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

## Notes
- Dashboard and reports are **per chat** and tied to the dataset uploaded in that chat.
- If no dataset is uploaded for a chat, the dashboard will not render.
- Free-tier Gemini limits are handled with throttling and retries.
