"""
Offline medicine search and pharmacy routes
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.medicine_search import MedicineSearch
from app.utils.response import success, error
from app.utils.sync_manager import OfflineDataManager

medicine_bp = Blueprint('medicine_search', __name__)

@medicine_bp.route('/search', methods=['GET', 'POST'])
def search_medicines():
    """
    Search for medicines offline or online
    GET: ?query=paracetamol&limit=5
    POST: {"query": "paracetamol", "limit": 5}
    """
    if request.method == 'POST':
        data = request.get_json()
        query = data.get('query', '').strip()
        limit = data.get('limit', 5)
    else:
        query = request.args.get('query', '').strip()
        limit = request.args.get('limit', 5, type=int)
    
    if not query:
        return error("Query parameter required", 400)
    
    medicine_search = MedicineSearch()
    results = medicine_search.search_medicine(query, limit=limit)
    
    return success({
        'offline_mode': True,
        'results': results['results'],
        'total': results['count'],
        'query': query
    })

@medicine_bp.route('/details/<medicine_name>', methods=['GET'])
def get_medicine_details(medicine_name):
    """Get detailed information about a medicine"""
    medicine_search = MedicineSearch()
    result = medicine_search.get_medicine_details(medicine_name)
    
    if not result['found']:
        return error("Medicine not found", 404)
    
    return success({
        'offline_mode': True,
        'medicine': medicine_name,
        'details': result['details']
    })

@medicine_bp.route('/alternatives/<medicine_name>', methods=['GET'])
def get_alternatives(medicine_name):
    """Get alternative medicines for same condition"""
    medicine_search = MedicineSearch()
    result = medicine_search.suggest_alternatives(medicine_name)
    
    return success({
        'medicine': medicine_name,
        'alternatives': result['alternatives'],
        'offline_mode': True
    })

@medicine_bp.route('/cache/download', methods=['POST'])
@jwt_required()
def download_medicine_cache():
    """Download medicine database for offline use"""
    user_id = get_jwt_identity()
    medicine_search = MedicineSearch(user_id)
    medicine_search.cache_medicine_db()
    
    manager = OfflineDataManager(user_id)
    manager.cache_medicines(medicine_search.MEDICINE_DB, ttl=720)
    
    return success({
        'message': 'Medicine database cached locally',
        'entries': len(medicine_search.MEDICINE_DB),
        'ttl_hours': 720
    })

@medicine_bp.route('/review', methods=['POST'])
@jwt_required()
def submit_medicine_review():
    """Submit a review for a medicine (queued for sync)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('medicine_name'):
        return error("Medicine name required", 400)
    
    medicine_search = MedicineSearch(user_id)
    result = medicine_search.rate_medicine(
        data.get('medicine_name'),
        data.get('rating'),
        data.get('review')
    )
    
    return success(result)

@medicine_bp.route('/common', methods=['GET'])
def get_common_medicines():
    """Get list of common medicines for offline reference"""
    medicine_search = MedicineSearch()
    
    # Return minimal data with just names and uses
    common = []
    for key, data in medicine_search.MEDICINE_DB.items():
        common.append({
            'name': data['generic_name'],
            'uses': data['uses'],
            'brands': data['common_brands'][:1]  # Minimal data
        })
    
    return success({
        'offline_mode': True,
        'count': len(common),
        'medicines': common[:20]  # Limit response size
    })
