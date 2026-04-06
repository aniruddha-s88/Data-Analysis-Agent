from datetime import datetime

_summary_cache = {"value": None, "updated_at": None}
_summary_cache_by_chat = {}
_response_cache = {}


def set_summary(text, chat_id=None):
    if chat_id:
        _summary_cache_by_chat[chat_id] = {
            "value": text,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        return
    _summary_cache["value"] = text
    _summary_cache["updated_at"] = datetime.utcnow().isoformat() + "Z"


def get_summary(chat_id=None):
    if chat_id and chat_id in _summary_cache_by_chat:
        return _summary_cache_by_chat[chat_id]["value"]
    return _summary_cache["value"]


def set_cached_response(query, response, chat_id=None):
    key = f"{chat_id or 'global'}::{query.strip().lower()}"
    _response_cache[key] = response


def get_cached_response(query, chat_id=None):
    key = f"{chat_id or 'global'}::{query.strip().lower()}"
    return _response_cache.get(key)
