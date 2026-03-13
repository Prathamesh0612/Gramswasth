from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.emergency import EmergencyAlert
from app.models.doctor import Doctor
from app.utils.response import success, error
from app.utils.decorators import role_required

emergency_bp = Blueprint('emergency', __name__)

@emergency_bp.route('/sos', methods=['POST'])
@jwt_required()
def trigger_sos():
    """Trigger SOS for patient. Auto-finds doctor + emits socket to doctors."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    if claims.get('role') != 'patient':
        return error("Only patients can trigger SOS", 403)
        
    data = request.get_json() or {}
    
    alert = EmergencyAlert(
        patient_id=user_id,
        location=data.get('location', 'Unknown location'),
        status='pending'
    )
    db.session.add(alert)
    db.session.commit()
    
    # Delegate to EmergencyHandler logic (which notifies doctors via socket)
    from app.services.emergency_handler import EmergencyHandler
    handler = EmergencyHandler()
    handler.handle_sos(alert)
    
    return success(alert.to_dict(), 201)

@emergency_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_emergencies():
    user_id = get_jwt_identity()
    role = get_jwt().get('role')
    
    if role == 'doctor':
        # Doctors see pending emergencies OR ones assigned to them
        emergencies = EmergencyAlert.query.filter(
            (EmergencyAlert.status == 'pending') | (EmergencyAlert.doctor_id == user_id)
        ).order_by(EmergencyAlert.created_at.desc()).all()
    else:
        # Patient sees their own history
        emergencies = EmergencyAlert.query.filter_by(patient_id=user_id).order_by(EmergencyAlert.created_at.desc()).all()
        
    return success([e.to_dict() for e in emergencies])

@emergency_bp.route('/<alert_id>/accept', methods=['PATCH'])
@jwt_required()
def accept_emergency(alert_id):
    user_id = get_jwt_identity()
    role = get_jwt().get('role')
    
    if role != 'doctor':
        return error("Only doctors can accept", 403)
        
    alert = EmergencyAlert.query.get(alert_id)
    if not alert: return error("Emergency not found", 404)
    if alert.status != "pending": return error("Already accepted", 400)
    
    alert.status = "assigned"
    alert.doctor_id = user_id
    db.session.commit()
    
    try:
        from app.extensions import socketio
        socketio.emit('emergency_accepted', {
            'alert_id': alert_id,
            'doctor_id': user_id,
            'location': alert.location
        }, room=f'user_{alert.patient_id}')
    except:
        pass
    
    return success(alert.to_dict())

@emergency_bp.route('/<alert_id>/resolve', methods=['PATCH'])
@jwt_required()
def resolve_emergency(alert_id):
    alert = EmergencyAlert.query.get(alert_id)
    if not alert: return error("Emergency not found", 404)
    alert.status = "resolved"
    db.session.commit()
    return success(alert.to_dict())
