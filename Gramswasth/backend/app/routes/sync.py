"""
Sync API endpoint for offline-first architecture
Minimal implementation for low-resource deployment
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.sync_manager import SyncManager, OfflineDataManager
from app.utils.response import success, error
from app.extensions import db
from app.models.consultation import Consultation
from app.models.health_record import HealthRecord
from app.models.prescription import Prescription

sync_bp = Blueprint('sync', __name__)

@sync_bp.route('/status', methods=['GET'])
@jwt_required()
def get_sync_status():
    """Get current sync status - minimal data response"""
    user_id = get_jwt_identity()
    manager = OfflineDataManager(user_id)
    
    return success({
        'status': manager.cache.get_cache_stats(),
        'last_sync': manager.cache.get(f'sync:last_sync:{user_id}') or None
    })

@sync_bp.route('/data', methods=['POST'])
@jwt_required()
def sync_offline_data():
    """
    Sync offline changes back to server
    Minimal payload approach for low-bandwidth environments
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    results = {
        'synced_items': [],
        'errors': []
    }
    
    # Sync consultations
    if 'consultations' in data:
        for consultation in data.get('consultations', []):
            try:
                if consultation.get('id'):
                    # Update existing
                    c = Consultation.query.get(consultation['id'])
                    if c and c.patient_id == user_id:
                        for key, val in consultation.items():
                            if key != 'id' and hasattr(c, key):
                                setattr(c, key, val)
                else:
                    # Create new
                    c = Consultation(
                        patient_id=user_id,
                        doctor_id=consultation.get('doctor_id'),
                        status=consultation.get('status', 'pending'),
                        type=consultation.get('type', 'normal'),
                        notes=consultation.get('notes')
                    )
                    db.session.add(c)
                
                db.session.commit()
                results['synced_items'].append({'type': 'consultation', 'id': c.id})
            except Exception as e:
                results['errors'].append({'type': 'consultation', 'error': str(e)})
    
    # Sync health records
    if 'health_records' in data:
        for record in data.get('health_records', []):
            try:
                if record.get('id'):
                    r = HealthRecord.query.get(record['id'])
                    if r and r.user_id == user_id:
                        for key, val in record.items():
                            if key != 'id' and hasattr(r, key):
                                setattr(r, key, val)
                else:
                    r = HealthRecord(
                        patient_id=user_id,
                        record_type=record.get('record_type'),
                        data=record.get('data')
                    )
                    db.session.add(r)
                
                db.session.commit()
                results['synced_items'].append({'type': 'health_record', 'id': r.id})
            except Exception as e:
                results['errors'].append({'type': 'health_record', 'error': str(e)})
    
    # Update last sync time
    manager = OfflineDataManager(user_id)
    manager.cache.set(f'sync:last_sync:{user_id}', {
        'timestamp': str(datetime.utcnow()),
        'items_synced': len(results['synced_items'])
    }, ttl=168)
    
    return success({
        'synced': len(results['synced_items']),
        'failed': len(results['errors']),
        'items': results['synced_items'],
        'errors': results['errors']
    })

@sync_bp.route('/pull', methods=['GET'])
@jwt_required()
def pull_offline_data():
    """
    Pull critical data for offline use
    Minimal payload - only essential fields
    """
    user_id = get_jwt_identity()
    manager = OfflineDataManager(user_id)
    
    # Check cache first
    cached = {
        'consultations': manager.get('consultations'),
        'health_records': manager.get('health_records'),
        'prescriptions': manager.get('prescriptions'),
        'ai_rules': manager.get('ai_rules')
    }
    
    if all(cached.values()):
        return success({'cached': True, 'data': cached})
    
    # Fetch fresh data if not cached
    try:
        consultations = Consultation.query.filter_by(patient_id=user_id).all()
        health_records = HealthRecord.query.filter_by(patient_id=user_id).all()
        prescriptions = Prescription.query.filter_by(patient_id=user_id).all()
        
        # Load AI rules
        from app.services.ai_service import AIService
        ai_service = AIService()
        
        data_to_cache = {
            'consultations': [c.to_dict() for c in consultations],
            'health_records': [r.to_dict() for r in health_records],
            'prescriptions': [p.to_dict() for p in prescriptions],
            'ai_rules': ai_service.rules
        }
        
        # Cache the data
        manager.cache_prescriptions(data_to_cache['prescriptions'], ttl=24)
        manager.cache_health_records(data_to_cache['health_records'], ttl=24)
        manager.cache_ai_rules(data_to_cache['ai_rules'], ttl=720)
        
        return success({'cached': False, 'data': data_to_cache})
    
    except Exception as e:
        return error(f"Failed to pull data: {str(e)}", 500)

@sync_bp.route('/clear', methods=['POST'])
@jwt_required()
def clear_offline_data():
    """Clear offline cache for user (useful for logout)"""
    user_id = get_jwt_identity()
    manager = OfflineDataManager(user_id)
    manager.clear_all()
    
    return success({'message': 'Offline cache cleared'})

