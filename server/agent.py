import os
import time
from vector_db import get_vector_store
from database import DATABASE_URL
from cache import get_summary, get_cached_response, set_cached_response
import pandas as pd
import re

try:
    from dotenv import load_dotenv
    _ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(dotenv_path=_ENV_PATH)
except Exception:
    pass

try:
    from google import genai
    _HAS_GEMINI = True
except Exception:
    _HAS_GEMINI = False

vector_db = get_vector_store()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
AGENT_PLANNER = os.getenv("AGENT_PLANNER", "0") == "1"
AGENT_MAX_STEPS = int(os.getenv("AGENT_MAX_STEPS", "3") or 3)

_LAST_CALL_TS = 0

_GENAI_CLIENT = None
if GEMINI_API_KEY and _HAS_GEMINI:
    _GENAI_CLIENT = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = (
    "You are a business analytics assistant. Use the provided context to answer. "
    "If the answer is not in the context, say you don't have enough data."
)

FRIENDLY_PROMPT = (
    "You are a friendly, concise assistant. Be warm and conversational. "
    "If the user greets you or asks about well-being, respond naturally."
)

def search_docs(query):
    docs = vector_db.similarity_search(query, k=3)
    return "\n\n".join(d.page_content for d in docs) if docs else ""

def sql_analysis(_query, chat_id=None):
    table = _table_name_for_chat(chat_id)
    df = pd.read_sql(f"SELECT * FROM {table}", DATABASE_URL)
    return df


def _dataset_insights(df):
    if df is None or df.empty:
        return "No rows found in the sales table."

    numeric_cols = df.select_dtypes(include="number")
    stats = ""
    if not numeric_cols.empty:
        stats = numeric_cols.describe().transpose().to_string()

    nulls = df.isna().sum().sort_values(ascending=False)
    top_nulls = nulls[nulls > 0].head(10).to_string()

    return (
        "Top rows:\n"
        f"{df.head(5).to_string()}\n\n"
        "Column summary (numeric):\n"
        f"{stats if stats else 'No numeric columns found.'}\n\n"
        "Missing values (top 10):\n"
        f"{top_nulls if top_nulls else 'No missing values detected.'}"
    )

def is_greeting(query):
    text = re.sub(r"[^a-z ]", " ", query.lower()).strip()
    greetings = [
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
        "how are you",
        "whats up",
        "what's up",
        "how is it going",
    ]
    return any(greet in text for greet in greetings)


def ask_agent(query, chat_id=None):
    if is_greeting(query):
        prompt = f"{FRIENDLY_PROMPT}\n\nUser: {query}\nAssistant:"
        return _invoke_model(prompt)

    cached = get_cached_response(query, chat_id=chat_id)
    if cached:
        return _ensure_bullets(cached)

    lowered = query.lower()
    summary = get_summary(chat_id=chat_id)
    if summary and ("analytics" in lowered or "insight" in lowered or "summary" in lowered):
        set_cached_response(query, summary, chat_id=chat_id)
        return _ensure_bullets(summary)

    response = _agentic_answer(query, chat_id=chat_id)
    set_cached_response(query, response, chat_id=chat_id)
    return _ensure_bullets(response)


def ask_agent_with_trace(query, chat_id=None):
    if is_greeting(query):
        prompt = f"{FRIENDLY_PROMPT}\n\nUser: {query}\nAssistant:"
        return _invoke_model(prompt), []

    cached = get_cached_response(query, chat_id=chat_id)
    if cached:
        return _ensure_bullets(cached), [{"tool": "cache", "args": {}, "result": "Used cached response"}]

    lowered = query.lower()
    summary = get_summary(chat_id=chat_id)
    if summary and ("analytics" in lowered or "insight" in lowered or "summary" in lowered):
        set_cached_response(query, summary, chat_id=chat_id)
        return _ensure_bullets(summary), [{"tool": "use_summary", "args": {}, "result": "Used cached dataset summary"}]

    response, trace = _agentic_answer(query, chat_id=chat_id, return_trace=True)
    set_cached_response(query, response, chat_id=chat_id)
    return _ensure_bullets(response), trace


def _agentic_answer(query, chat_id=None, return_trace=False):
    state = {
        "query": query,
        "chat_id": chat_id,
        "tool_results": [],
        "notes": [],
    }
    trace = _agent_loop(state)

    final = _final_answer(state)
    return (final, trace) if return_trace else final


def _agent_loop(state):
    trace = []
    for _ in range(max(1, AGENT_MAX_STEPS)):
        plan = _decide_next_step(state)
        if not plan:
            break
        if plan.get("stop") is True:
            trace.append({"tool": "stop", "args": {}, "result": "Planner stopped."})
            break
        tool_name = (plan.get("tool") or "").strip()
        tool_args = plan.get("args") or {}
        result = _run_tool(tool_name, tool_args)
        step = {"tool": tool_name, "args": tool_args, "result": result}
        state["tool_results"].append(step)
        trace.append(step)
        if _should_stop(state, last_result=result):
            break
    return trace


def _decide_next_step(state):
    if AGENT_PLANNER:
        plan = _plan_next_step(state)
        if plan:
            return plan
    return _heuristic_plan(state)


def _plan_next_step(state):
    tools = [
        {
            "name": "search_docs",
            "description": "Search uploaded PDF text chunks using vector similarity.",
            "args": {"query": "string"},
        },
        {
            "name": "sql_preview",
            "description": "Load the sales table and compute dataset insights.",
            "args": {"query": "string"},
        },
        {
            "name": "report_overview",
            "description": "Summarize recent conversation into a short business report overview.",
            "args": {"limit": "number", "title": "string"},
        },
        {
            "name": "use_summary",
            "description": "Use cached dataset summary if available.",
            "args": {},
        },
        {
            "name": "stop",
            "description": "Stop planning and produce final answer.",
            "args": {},
        },
    ]

    prompt = (
        "You are a planner for a business analytics assistant. "
        "Pick the next best tool to use, or stop if ready to answer. "
        "Return ONLY JSON with keys: tool, args, stop, note. "
        "If stopping, set stop true and tool to \"stop\".\n\n"
        f"User query: {state['query']}\n\n"
        f"Tool results so far:\n{_format_tool_results(state['tool_results'])}\n\n"
        f"Available tools:\n{tools}\n"
    )
    plan = _call_planner(prompt)
    if not plan:
        return _fallback_plan(state)
    if plan.get("note"):
        state["notes"].append(plan["note"])
    return plan


def _heuristic_plan(state):
    query = (state.get("query") or "").lower()
    tool_results = state.get("tool_results", [])

    def _already_used(tool):
        return any(item.get("tool") == tool for item in tool_results)

    if any(word in query for word in ["pdf", "document", "policy", "contract", "report text"]):
        if not _already_used("search_docs"):
            return {"tool": "search_docs", "args": {"query": state["query"]}, "stop": False}

    if any(word in query for word in ["summary", "insight", "trend", "kpi", "dashboard", "analysis"]):
        if not _already_used("use_summary"):
            return {"tool": "use_summary", "args": {"chat_id": state.get("chat_id")}, "stop": False}
        if not _already_used("sql_preview"):
            return {"tool": "sql_preview", "args": {"query": state["query"], "chat_id": state.get("chat_id")}, "stop": False}

    if not _already_used("sql_preview"):
        return {"tool": "sql_preview", "args": {"query": state["query"], "chat_id": state.get("chat_id")}, "stop": False}

    return {"tool": "stop", "args": {}, "stop": True}


def _run_tool(tool_name, tool_args):
    if tool_name == "search_docs":
        query = tool_args.get("query") or ""
        return search_docs(query)
    if tool_name == "sql_preview":
        query = tool_args.get("query") or ""
        chat_id = tool_args.get("chat_id")
        try:
            df = sql_analysis(query, chat_id=chat_id)
            return _dataset_insights(df)
        except Exception as exc:
            return f"SQL preview error: {exc}"
    if tool_name == "use_summary":
        return get_summary(chat_id=tool_args.get("chat_id")) or "No cached summary available."
    if tool_name == "report_overview":
        title = tool_args.get("title") or "Business AI Agent Report"
        return (
            f"{title}\n"
            "This report focuses on dataset-driven insights only."
        )
    return f"Unknown tool: {tool_name}"


def _final_answer(state):
    tool_context = _format_tool_results(state["tool_results"])
    notes = "\n".join(state["notes"]) if state["notes"] else ""
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"User question: {state['query']}\n\n"
        f"Tool results:\n{tool_context}\n\n"
        f"Planner notes:\n{notes}\n\n"
        "Answer in clear bullet points only and include any key numbers. "
        "If the answer is not in the tool results, say you don't have enough data."
    )
    return _ensure_bullets(_invoke_model(prompt))


def _format_tool_results(tool_results):
    if not tool_results:
        return "No tools used yet."
    lines = []
    for item in tool_results:
        tool = item.get("tool")
        args = item.get("args")
        result = item.get("result")
        lines.append(f"- tool: {tool}")
        lines.append(f"  args: {args}")
        lines.append(f"  result: {str(result)[:2000]}")
    return "\n".join(lines)


def _parse_json_object(text):
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        import json

        return json.loads(match.group(0))
    except Exception:
        return None


def _call_planner(prompt):
    for _ in range(2):
        raw = _invoke_model(prompt)
        plan = _parse_json_object(raw)
        if plan:
            return plan
        prompt = (
            "Return ONLY valid JSON. Do not include any extra text.\n\n"
            + prompt
        )
    return None


def _fallback_plan(state):
    if not state["tool_results"]:
        return {"tool": "sql_preview", "args": {"query": state["query"]}, "stop": False}
    return {"tool": "stop", "args": {}, "stop": True}


def _should_stop(state, last_result=None):
    if last_result is None:
        return False
    if isinstance(last_result, str):
        if "error" in last_result.lower():
            return True
        if "no cached summary" in last_result.lower() and len(state["tool_results"]) > 1:
            return False
    return False

def _table_name_for_chat(chat_id):
    if not chat_id:
        return "sales"
    safe = re.sub(r"[^a-zA-Z0-9_]", "_", str(chat_id))
    return f"sales_{safe}"

def _invoke_model(prompt):
    global _LAST_CALL_TS
    now = time.time()
    min_gap = 12.5  # free tier: ~5 req/min
    if now - _LAST_CALL_TS < min_gap:
        time.sleep(min_gap - (now - _LAST_CALL_TS))
    if not GEMINI_API_KEY:
        return (
            "Gemini API key is missing. Set GEMINI_API_KEY in server/.env "
            "and restart the backend."
        )
    if not _HAS_GEMINI:
        return (
            "Missing dependency: google-genai. "
            "Install it with `pip install -U google-genai` and restart."
        )
    for attempt in range(3):
        try:
            result = _GENAI_CLIENT.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )
            _LAST_CALL_TS = time.time()
            if getattr(result, "text", None):
                return result.text
            return "No response returned from Gemini."
        except Exception as exc:
            message = str(exc)
            if "RESOURCE_EXHAUSTED" in message or "429" in message:
                time.sleep(2 + attempt * 2)
                continue
            return f"Gemini error: {message}"
    return (
        "Gemini rate limit hit (free tier is 5 requests/minute). "
        "Please wait a bit and try again, or upgrade billing for higher limits."
    )

def _ensure_bullets(text):
    if not text:
        return text
    stripped = text.strip()
    if stripped.startswith(("-", "•", "*")):
        return text
    lines = [line.strip() for line in stripped.splitlines() if line.strip()]
    if not lines:
        return text
    if len(lines) == 1:
        sentences = _split_into_sentences(lines[0])
        if sentences:
            return "\n".join(f"- {s}" for s in sentences)
    return "\n".join(f"- {line}" for line in lines)


def _split_into_sentences(text):
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    cleaned = [p.strip() for p in parts if p.strip()]
    return cleaned
