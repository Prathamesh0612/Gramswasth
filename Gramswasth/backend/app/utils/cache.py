"""
Unified cache layer: Redis (preferred) with automatic fallback to SQLite.
This means the app works out of the box without Redis configured.
Set REDIS_URL env var to enable Redis.
"""
import json
import os
from datetime import datetime, timedelta
from flask import current_app

# ── Redis client (lazy-initialised once) ──────────────────────────────────────
_redis_client = None

def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        redis_url = current_app.config.get('REDIS_URL') if current_app else os.environ.get('REDIS_URL')
        if redis_url:
            import redis
            client = redis.from_url(redis_url, decode_responses=True, socket_timeout=2)
            client.ping()  # test the connection
            _redis_client = client
            return _redis_client
    except Exception:
        pass
    return None


# ── Fallback in-memory dict (per-process, reset on restart) ──────────────────
_mem_cache: dict = {}


def cache_set(key: str, value, ttl_seconds: int = 3600):
    """Store a value. Uses Redis if available, else in-memory."""
    serialised = json.dumps(value)
    r = _get_redis()
    if r:
        try:
            r.setex(key, ttl_seconds, serialised)
            return
        except Exception:
            pass
    # In-memory fallback
    _mem_cache[key] = {
        'v': serialised,
        'exp': datetime.utcnow() + timedelta(seconds=ttl_seconds)
    }


def cache_get(key: str):
    """Retrieve a value. Returns None if missing or expired."""
    r = _get_redis()
    if r:
        try:
            raw = r.get(key)
            if raw is not None:
                return json.loads(raw)
            return None
        except Exception:
            pass
    # In-memory fallback
    entry = _mem_cache.get(key)
    if entry:
        if datetime.utcnow() < entry['exp']:
            return json.loads(entry['v'])
        del _mem_cache[key]
    return None


def cache_delete(key: str):
    """Delete a cached key."""
    r = _get_redis()
    if r:
        try:
            r.delete(key)
            return
        except Exception:
            pass
    _mem_cache.pop(key, None)


def cache_delete_pattern(pattern: str):
    """Delete all keys matching a glob pattern (Redis only; no-op on fallback)."""
    r = _get_redis()
    if r:
        try:
            keys = r.keys(pattern)
            if keys:
                r.delete(*keys)
        except Exception:
            pass


def cache_stats() -> dict:
    """Return basic cache statistics."""
    r = _get_redis()
    if r:
        try:
            info = r.info('memory')
            return {
                'backend': 'redis',
                'used_memory_human': info.get('used_memory_human', 'unknown'),
            }
        except Exception:
            pass
    return {
        'backend': 'in-memory',
        'entries': len(_mem_cache),
    }
