import json
from datetime import datetime
from pathlib import Path

HISTORY_PATH = Path(__file__).resolve().parent / "chat_history.json"


def _load_history():
    if not HISTORY_PATH.exists():
        return []
    try:
        return json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def append_message(role, content, mode):
    history = _load_history()
    history.append(
        {
            "role": role,
            "content": content,
            "mode": mode,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )
    HISTORY_PATH.write_text(json.dumps(history, indent=2), encoding="utf-8")


def get_history(limit=50):
    history = _load_history()
    if limit is None:
        return history
    return history[-limit:]
