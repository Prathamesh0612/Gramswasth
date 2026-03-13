"""
Sync manager for handling offline changes and server synchronization
Lightweight implementation for resource-constrained environments
"""
import requests
import json
from datetime import datetime
from app.utils.offline_cache import OfflineCache

class SyncManager:
    """Manages synchronization of offline changes back to server"""
    
    def __init__(self, base_url, user_id=None, token=None):
        self.base_url = base_url.rstrip('/')
        self.user_id = user_id
        self.token = token
        self.cache = OfflineCache(user_id)
        self.max_retries = 3
    
    def sync_all(self):
        """Sync all pending changes to server"""
        pending = self.cache.get_pending_syncs()
        
        results = {
            'synced': 0,
            'failed': 0,
            'errors': []
        }
        
        for item in pending:
            try:
                success = self._sync_item(item)
                if success:
                    self.cache.mark_sync_complete(item['id'])
                    results['synced'] += 1
                else:
                    self.cache.mark_sync_failed(item['id'])
                    results['failed'] += 1
            except Exception as e:
                self.cache.mark_sync_failed(item['id'])
                results['failed'] += 1
                results['errors'].append({
                    'endpoint': item['endpoint'],
                    'error': str(e)
                })
        
        return results
    
    def _sync_item(self, item):
        """Sync a single item to server"""
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        url = f"{self.base_url}{item['endpoint']}"
        
        try:
            if item['method'].upper() == 'POST':
                response = requests.post(url, json=item['data'], headers=headers, timeout=5)
            elif item['method'].upper() == 'PUT':
                response = requests.put(url, json=item['data'], headers=headers, timeout=5)
            elif item['method'].upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=5)
            else:
                return False
            
            return response.status_code in [200, 201, 204]
        except (requests.RequestException, ConnectionError, TimeoutError):
            return False
    
    def queue_create(self, endpoint, data):
        """Queue a create operation"""
        self.cache.queue_sync(endpoint, 'POST', data)
    
    def queue_update(self, endpoint, data):
        """Queue an update operation"""
        self.cache.queue_sync(endpoint, 'PUT', data)
    
    def queue_delete(self, endpoint):
        """Queue a delete operation"""
        self.cache.queue_sync(endpoint, 'DELETE', {})
    
    def get_sync_status(self):
        """Get current sync status"""
        stats = self.cache.get_cache_stats()
        return {
            'has_pending': stats['pending_syncs'] > 0,
            'pending_count': stats['pending_syncs'],
            'cache_size_kb': stats['cache_size_bytes'] / 1024
        }


class OfflineDataManager:
    """Manages critical offline-first data for the app"""
    
    def __init__(self, user_id=None):
        self.cache = OfflineCache(user_id)
        self.user_id = user_id
    
    def cache_user_data(self, user_data, ttl=168):
        """Cache user profile (TTL: 1 week)"""
        self.cache.set(f'user:{self.user_id}', user_data, ttl)
    
    def get_user_data(self):
        """Get cached user data"""
        return self.cache.get(f'user:{self.user_id}')
    
    def cache_available_doctors(self, doctors, ttl=24):
        """Cache available doctors list (TTL: 24 hours)"""
        self.cache.set('doctors:available', doctors, ttl)
    
    def get_available_doctors(self):
        """Get cached doctors list"""
        return self.cache.get('doctors:available')
    
    def cache_health_records(self, records, ttl=168):
        """Cache user's health records (TTL: 1 week)"""
        self.cache.set(f'health_records:{self.user_id}', records, ttl)
    
    def get_health_records(self):
        """Get cached health records"""
        return self.cache.get(f'health_records:{self.user_id}')
    
    def cache_prescriptions(self, prescriptions, ttl=24):
        """Cache prescriptions (TTL: 24 hours)"""
        self.cache.set(f'prescriptions:{self.user_id}', prescriptions, ttl)
    
    def get_prescriptions(self):
        """Get cached prescriptions"""
        return self.cache.get(f'prescriptions:{self.user_id}')
    
    def cache_medicines(self, medicines, ttl=72):
        """Cache available medicines (TTL: 3 days)"""
        self.cache.set('medicines:available', medicines, ttl)
    
    def get_medicines(self):
        """Get cached medicines"""
        return self.cache.get('medicines:available')
    
    def cache_ai_rules(self, rules, ttl=720):
        """Cache AI symptom rules (TTL: 30 days)"""
        self.cache.set('ai:rules', rules, ttl)
    
    def get_ai_rules(self):
        """Get cached AI rules"""
        return self.cache.get('ai:rules')
    
    def cache_emergency_contacts(self, contacts, ttl=168):
        """Cache emergency contacts (TTL: 1 week)"""
        self.cache.set('emergency:contacts', contacts, ttl)
    
    def get_emergency_contacts(self):
        """Get cached emergency contacts"""
        return self.cache.get('emergency:contacts')
    
    def clear_all(self):
        """Clear all user-specific cached data"""
        prefixes = [f'user:{self.user_id}', f'health_records:{self.user_id}', 
                   f'prescriptions:{self.user_id}']
        for prefix in prefixes:
            self.cache.delete(prefix)
