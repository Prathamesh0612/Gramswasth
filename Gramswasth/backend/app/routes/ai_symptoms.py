from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.ai_service import AIService
from app.services.enhanced_ai_service import EnhancedAIService, HealthTipGenerator
from app.services.emergency_handler import EmergencyHandler
from app.utils.response import success, error
from app.utils.sync_manager import OfflineDataManager

ai_bp = Blueprint('ai', __name__)
ai_service = AIService()
enhanced_ai = EnhancedAIService()

@ai_bp.route('/symptoms', methods=['POST'])
def check_symptoms():
    """Basic symptom checking (original endpoint)"""
    data = request.get_json()
    symptoms = data.get('symptoms', [])
    
    if not isinstance(symptoms, list):
        return error("Symptoms must be a list", 400)
        
    result = ai_service.check_symptoms(symptoms)
    return success(result)

@ai_bp.route('/symptoms/enhanced', methods=['POST'])
def check_symptoms_enhanced():
    """Enhanced symptom checking with fuzzy matching and health tips"""
    data = request.get_json()
    symptoms = data.get('symptoms', [])
    offline_mode = data.get('offline_mode', False)
    
    if not isinstance(symptoms, list):
        return error("Symptoms must be a list", 400)
    
    if not symptoms:
        return error("Please provide at least one symptom", 400)
    
    # Get enhanced diagnosis
    diagnosis = enhanced_ai.check_symptoms(symptoms, fuzzy=True)
    
    # Add health tips
    diagnosis['health_tips'] = HealthTipGenerator.get_tips(diagnosis.get('condition', 'fever'))
    
    # Check if emergency
    emergency_handler = EmergencyHandler()
    emergency_check = emergency_handler.check_is_emergency(symptoms, diagnosis.get('condition'))
    
    diagnosis['emergency_alert'] = emergency_check
    
    return success(diagnosis)

@ai_bp.route('/rules', methods=['GET'])
def get_rules():
    """Get symptom rules for offline use"""
    return success(ai_service.rules)

@ai_bp.route('/rules/download', methods=['GET'])
@jwt_required()
def download_offline_rules():
    """Download complete rules for offline mode"""
    offline_manager = OfflineDataManager(get_jwt_identity())
    rules_data = enhanced_ai.get_rules_for_offline()
    
    # Cache the rules
    offline_manager.cache_ai_rules(rules_data['rules'], ttl=720)
    
    return success({
        'rules': rules_data['rules'],
        'cached': True,
        'cache_ttl_hours': 720
    })

@ai_bp.route('/health-tips/<condition>', methods=['GET'])
def get_health_tips(condition):
    """Get health tips for a condition"""
    tips = HealthTipGenerator.get_tips(condition)
    
    return success({
        'condition': condition,
        'tips': tips,
        'offline_mode': True
    })
