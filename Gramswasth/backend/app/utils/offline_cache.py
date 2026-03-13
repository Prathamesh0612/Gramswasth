"""
Offline-first caching system for minimal data storage
Designed for low-bandwidth & low-resource environments
"""
import json
import sqlite3
import os
from datetime import datetime, timedelta
from pathlib import Path

class OfflineCache:
    """Lightweight offline cache using SQLite for resource efficiency"""
    
    def __init__(self, user_id=None):
        # Create cache directory
        cache_dir = Path(os.path.expanduser('~/.telehealth_cache'))
        cache_dir.mkdir(exist_ok=True)
        
        # Database file per user for privacy
        self.user_id = user_id or 'global'
        self.db_path = cache_dir / f'cache_{self.user_id}.db'
        self._init_db()
    
    def _init_db(self):
        """Initialize SQLite cache database with minimal schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Cache table - stores cached API responses
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hits INTEGER DEFAULT 0
            )
        ''')
        
        # Sync queue - tracks changes that need to sync to server
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                data TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_retry TIMESTAMP
            )
        ''')
        
        # Metadata table - stores app state
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get(self, key):
        """Get value from cache if not expired"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT value, expires_at FROM cache 
            WHERE key = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
        ''', (key,))
        
        result = cursor.fetchone()
        if result:
            # Increment hit count
            cursor.execute('UPDATE cache SET hits = hits + 1 WHERE key = ?', (key,))
            conn.commit()
            try:
                return json.loads(result[0])
            except json.JSONDecodeError:
                return result[0]
        
        conn.close()
        return None
    
    def set(self, key, value, ttl_hours=24):
        """Set cache value with TTL (time to live)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        expires_at = None
        if ttl_hours:
            expires_at = (datetime.utcnow() + timedelta(hours=ttl_hours)).isoformat()
        
        value_str = json.dumps(value) if not isinstance(value, str) else value
        
        cursor.execute('''
            INSERT OR REPLACE INTO cache (key, value, expires_at)
            VALUES (?, ?, ?)
        ''', (key, value_str, expires_at))
        
        conn.commit()
        conn.close()
    
    def delete(self, key):
        """Delete cache entry"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM cache WHERE key = ?', (key,))
        conn.commit()
        conn.close()
    
    def clear_expired(self):
        """Clean up expired cache entries"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM cache WHERE expires_at < datetime("now")')
        conn.commit()
        conn.close()
    
    # Sync Queue Methods
    def queue_sync(self, endpoint, method, data):
        """Queue a change for sync to server"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        data_str = json.dumps(data) if not isinstance(data, str) else data
        cursor.execute('''
            INSERT INTO sync_queue (endpoint, method, data)
            VALUES (?, ?, ?)
        ''', (endpoint, method, data_str))
        
        conn.commit()
        conn.close()
    
    def get_pending_syncs(self):
        """Get all pending items to sync"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, endpoint, method, data FROM sync_queue 
            WHERE status = 'pending' 
            ORDER BY created_at ASC
            LIMIT 50
        ''')
        
        items = []
        for row in cursor.fetchall():
            items.append({
                'id': row[0],
                'endpoint': row[1],
                'method': row[2],
                'data': json.loads(row[3])
            })
        
        conn.close()
        return items
    
    def mark_sync_complete(self, sync_id):
        """Mark sync item as complete"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE sync_queue SET status = ? WHERE id = ?',
            ('completed', sync_id)
        )
        conn.commit()
        conn.close()
    
    def mark_sync_failed(self, sync_id):
        """Mark sync as failed and update retry time"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE sync_queue SET status = ?, last_retry = datetime("now") WHERE id = ?',
            ('pending', sync_id)
        )
        conn.commit()
        conn.close()
    
    def get_cache_stats(self):
        """Get cache usage statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*), SUM(length(value)) FROM cache')
        count, size = cursor.fetchone()
        
        cursor.execute('SELECT COUNT(*) FROM sync_queue WHERE status = "pending"')
        pending_syncs = cursor.fetchone()[0]
        
        conn.close()
        return {
            'cache_entries': count or 0,
            'cache_size_bytes': size or 0,
            'pending_syncs': pending_syncs
        }
