"""
Offline medicine search and information system
Works without internet connectivity
"""
import json
import os
from datetime import datetime
from app.utils.offline_cache import OfflineCache

class MedicineSearch:
    """Local medicine search with offline capability"""
    
    # Common medicines database - can be expanded
    MEDICINE_DB = {
        'paracetamol': {
            'generic_name': 'Acetaminophen',
            'common_brands': ['Crocin', 'Tylenol', 'Dolo'],
            'uses': ['Fever reduction', 'Pain relief', 'Headache'],
            'dosage': '500-1000mg every 4-6 hours',
            'max_daily': '3000-4000mg',
            'side_effects': ['Liver damage (overdose)', 'Allergic reaction'],
            'precautions': ['Do not take with alcohol', 'Not for liver disease patients'],
            'storage': 'Room temperature, away from moisture'
        },
        'ibuprofen': {
            'generic_name': 'Ibuprofen',
            'common_brands': ['Brufen', 'Combiflam'],
            'uses': ['Fever', 'Inflammation', 'Pain', 'Joint pain'],
            'dosage': '200-400mg every 4-6 hours',
            'max_daily': '1200-2400mg',
            'side_effects': ['Stomach upset', 'Ulcers (prolonged use)', 'Allergic reaction'],
            'precautions': ['Take with food', 'Not for pregnancy', 'Avoid with blood thinners'],
            'storage': 'Room temperature'
        },
        'aspirin': {
            'generic_name': 'Acetylsalicylic acid',
            'common_brands': ['Aspirin', 'Ecosprin'],
            'uses': ['Pain relief', 'Fever', 'Heart protection', 'Blood thinner'],
            'dosage': '75-325mg daily',
            'max_daily': '4000mg',
            'side_effects': ['Stomach issues', 'Bleeding risk', 'Allergic reaction'],
            'precautions': ['Not for bleeding disorders', 'Avoid with alcohol', 'Not for kids'],
            'storage': 'Cool, dry place'
        },
        'cough_syrup': {
            'generic_name': 'Dextromethorphan/Codeine based',
            'common_brands': ['Strepsils', 'Benadryl', 'Robitussin'],
            'uses': ['Cough suppression', 'Throat relief'],
            'dosage': 'Follow pack instructions',
            'max_daily': 'Follow pack',
            'side_effects': ['Drowsiness', 'Dizziness'],
            'precautions': ['Do not drive', 'Avoid with alcohol'],
            'storage': 'Room temperature'
        },
        'antibiotics_amoxicillin': {
            'generic_name': 'Amoxicillin',
            'common_brands': ['Amoxil', 'Augmentin (with Clavulanic acid)'],
            'uses': ['Bacterial infections', 'Throat infection', 'Ear infection'],
            'dosage': '250-500mg three times daily',
            'max_daily': '3000mg',
            'side_effects': ['Allergic reaction', 'Diarrhea', 'Nausea'],
            'precautions': ['Complete full course', 'Tell doctor of allergies', 'Do not share'],
            'storage': 'Room temperature, keep dry'
        },
        'antacid': {
            'generic_name': 'Calcium carbonate/Ranitidine',
            'common_brands': ['Digene', 'Eno', 'Omeprazole'],
            'uses': ['Acidity', 'Heartburn', 'Indigestion'],
            'dosage': 'Follow pack instructions',
            'max_daily': 'Follow pack',
            'side_effects': ['Constipation', 'Diarrhea'],
            'precautions': ['Do not overuse', 'Consult for prolonged issues'],
            'storage': 'Cool, dry place'
        },
        'antihistamine': {
            'generic_name': 'Cetirizine/Loratadine',
            'common_brands': ['Allergan', 'Avil', 'Cetrizine'],
            'uses': ['Allergies', 'Itching', 'Allergic reactions'],
            'dosage': '10mg once daily',
            'max_daily': '20mg',
            'side_effects': ['Drowsiness', 'Headache'],
            'precautions': ['Do not drive', 'Not with alcohol'],
            'storage': 'Room temperature'
        }
    }
    
    def __init__(self, user_id=None):
        self.user_id = user_id
        self.cache = OfflineCache(user_id)
    
    def search_medicine(self, query, limit=5):
        """
        Search medicines by name with fuzzy matching
        Returns partial results for low bandwidth
        """
        if not query or len(query) < 2:
            return {'error': 'Search query too short', 'results': []}
        
        query_lower = query.lower()
        results = []
        
        for med_key, med_data in self.MEDICINE_DB.items():
            # Match in generic name
            if query_lower in med_key or query_lower in med_data['generic_name'].lower():
                results.append({
                    'key': med_key,
                    'name': med_data.get('generic_name', med_key),
                    'brands': med_data.get('common_brands', [])[:2],  # Only 2 brands for minimal size
                    'uses': med_data.get('uses', [])[:2]  # Only 2 uses
                })
            
            # Match in brand names
            for brand in med_data.get('common_brands', []):
                if query_lower in brand.lower():
                    results.append({
                        'key': med_key,
                        'name': med_data.get('generic_name', med_key),
                        'brands': med_data.get('common_brands', [])[:2],
                        'uses': med_data.get('uses', [])[:2]
                    })
                    break
        
        # Remove duplicates
        seen = set()
        unique_results = []
        for r in results:
            key = r['key']
            if key not in seen:
                seen.add(key)
                unique_results.append({k: v for k, v in r.items() if k != 'key'})
        
        return {
            'query': query,
            'count': len(unique_results),
            'results': unique_results[:limit]
        }
    
    def get_medicine_details(self, medicine_name):
        """Get detailed information about a medicine"""
        med_key = medicine_name.lower().replace(' ', '_')
        
        for key in self.MEDICINE_DB:
            if key == med_key or med_key in key:
                details = self.MEDICINE_DB[key].copy()
                details['medicine'] = key
                return {
                    'found': True,
                    'details': details
                }
        
        return {'found': False, 'message': 'Medicine not found in database'}
    
    def suggest_alternatives(self, medicine_name):
        """Suggest alternative medicines for same condition"""
        med_data = self.get_medicine_details(medicine_name)
        
        if not med_data['found']:
            return {'alternatives': []}
        
        conditions = med_data['details'].get('uses', [])
        alternatives = []
        
        for med_key, med_info in self.MEDICINE_DB.items():
            if med_key != medicine_name.lower().replace(' ', '_'):
                # Check if it treats same conditions
                med_uses = med_info.get('uses', [])
                match = any(c.lower() in ' '.join(med_uses).lower() for c in conditions)
                
                if match:
                    alternatives.append({
                        'name': med_key,
                        'generic': med_info.get('generic_name'),
                        'brands': med_info.get('common_brands', [])[:2]
                    })
        
        return {'alternatives': alternatives[:3]}
    
    def cache_medicine_db(self):
        """Cache full medicine database for offline use"""
        self.cache.set('medicines:db', self.MEDICINE_DB, ttl=720)
    
    def get_nearby_pharmacies(self, location=None):
        """Get cached nearby pharmacies (requires online data fetch first)"""
        if location:
            key = f'pharmacies:{location}'
        else:
            key = 'pharmacies:current'
        
        return self.cache.get(key)
    
    def rate_medicine(self, medicine_name, rating, review=None):
        """Cache user's medicine review (for sync later)"""
        review_data = {
            'medicine': medicine_name,
            'rating': rating,
            'review': review,
            'timestamp': datetime.utcnow().isoformat(),
            'synced': False
        }
        
        self.cache.queue_sync('/api/pharmacy/reviews', 'POST', review_data)
        return {'message': 'Review saved locally, will sync when online'}
