from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.consultation import Consultation
from app.utils.response import success, error

consult_bp = Blueprint('consultations', __name__)

@consult_bp.route('', methods=['POST'])
@jwt_required()
def create_consultation():
    """Patient creates a request for consultation."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    if claims.get('role') != 'patient':
        return error("Only patients can create consultations", 403)
        
    data = request.get_json()
    doc_id = data.get('doctor_id')
    spec_id = data.get('specialization_id') # New preferred key
    spec_name = data.get('specialization') # Fallback
    
    # Map frontend IDs to DB strings
    spec_map = {
        'general': 'General Physician',
        'cardio': 'Cardiologist',
        'pediatric': 'Pediatrician',
        'ortho': 'Orthopedist',
        'neuro': 'Neurologist',
        'eye': 'Ophthalmologist'
    }
    search_spec = spec_map.get(spec_id, spec_name)

    from app.models.doctor import Doctor
    if not doc_id:
        if search_spec:
            # Try to find a doctor with matching specialization
            target_doc = Doctor.query.filter(Doctor.specialization.ilike(f"%{search_spec}%")).first()
            if target_doc:
                doc_id = target_doc.id
        
        # Fallback: pick the first available if none found
        if not doc_id:
            first_doc = Doctor.query.filter_by(is_available=True).first() or Doctor.query.first()
            if first_doc:
                doc_id = first_doc.id
            else:
                return error("No doctors available", 400)
            
    consultation = Consultation(
        patient_id=user_id,
        doctor_id=doc_id,
        status='pending',
        type=data.get('type', 'normal'),
        notes=data.get('notes')
    )
    
    db.session.add(consultation)
    db.session.commit()
    
    # Enrich the response with meeting_id (fallback to consultation id)
    c_dict = consultation.to_dict()
    c_dict['meeting_id'] = str(consultation.id)
    
    # Notify doctor
    try:
        from app.extensions import socketio
        socketio.emit('new_consultation_request', c_dict, room=f'user_{doc_id}')
    except Exception:
        pass
        
    return success(c_dict, 201)


@consult_bp.route('', methods=['GET'])
@jwt_required()
def list_consultations():
    user_id = get_jwt_identity()
    role = get_jwt().get('role')
    
    if role == 'doctor':
        # Unified View: Doctors see all 'pending' requests + anything assigned/active for them
        from sqlalchemy import or_
        consultations = Consultation.query.filter(
            or_(
                Consultation.status == 'pending',
                Consultation.doctor_id == user_id
            )
        ).order_by(Consultation.created_at.desc()).all()
    else:
        consultations = Consultation.query.filter_by(patient_id=user_id).order_by(Consultation.created_at.desc()).all()
        
    # Return enriched dict with names
    res = []
    for c in consultations:
        d = c.to_dict()
        if role == 'doctor':
            # Get patient name
            d['patient_name'] = c.patient.name if c.patient else 'Unknown'
            d['village'] = getattr(c.patient, 'village', '') if c.patient else ''
        else:
            # Get doctor name from User table using doctor_id
            from app.models.user import User
            doctor = User.query.filter_by(id=c.doctor_id).first() if c.doctor_id else None
            d['doctor_name'] = doctor.name if doctor else 'Unknown Doctor'
            d['specialization'] = getattr(doctor, 'specialization', 'General') if doctor else 'General'
        res.append(d)
        
    return success(res)


@consult_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_consultation(id):
    from app.models.user import User
    
    consultation = Consultation.query.get_or_404(id)
    d = consultation.to_dict()
    
    # Enrich with doctor name
    if consultation.doctor_id:
        doctor = User.query.filter_by(id=consultation.doctor_id).first()
        d['doctor_name'] = doctor.name if doctor else 'Unknown Doctor'
        d['specialization'] = getattr(doctor, 'specialization', 'General') if doctor else 'General'
    
    return success(d)


@consult_bp.route('/<id>/status', methods=['PATCH'])
@jwt_required()
def update_status(id):
    """Doctor side: Accepts, declines, or marks complete."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    consultation = Consultation.query.get_or_404(id)
    
    # Unified View check: 
    # If pending, any doctor can accept. 
    # If not pending, only the assigned doctor can modify.
    if consultation.status != 'pending' and str(consultation.doctor_id) != str(user_id):
        return error("Not your consultation", 403)
        
    new_status = data.get('status')
    if new_status not in ['accepted', 'ongoing', 'completed', 'cancelled']:
        return error("Invalid status", 400)
        
    # If accepting a pending one, assign to current doctor
    if consultation.status == 'pending' and new_status == 'accepted':
        consultation.doctor_id = user_id
        
    consultation.status = new_status
    db.session.commit()
    
    # Emit socket update to patient
    try:
        from app.extensions import socketio
        socketio.emit('consultation_status_update', {
            'consultation_id': id,
            'status': new_status
        }, room=f'user_{consultation.patient_id}')
    except Exception:
        pass
        
    return success(consultation.to_dict())

@consult_bp.route('/<id>/messages', methods=['GET'])
@jwt_required()
def get_messages(id):
    """Fetch historical messages for a consultation."""
    from app.models.message import Message
    messages = Message.query.filter_by(consultation_id=id).order_by(Message.created_at.asc()).all()
    return success([m.to_dict() for m in messages])


@consult_bp.route('/<id>/complete', methods=['PATCH'])
@jwt_required()
def complete_consultation(id):
    """Doctor marks consultation as completed and optionally writes a note."""
    user_id = get_jwt_identity()
    consultation = Consultation.query.get_or_404(id)
    
    if str(consultation.doctor_id) != str(user_id):
        return error("Not your consultation", 403)
    
    consultation.status = 'completed'
    db.session.commit()
    
    # Notify patient via socket
    try:
        from app.extensions import socketio
        # Notify patient their consultation is complete
        socketio.emit('consultation_status_update', {
            'consultation_id': id,
            'status': 'completed'
        }, room=f'consultation_{id}')
        # Also tell patient to check prescriptions
        socketio.emit('prescription_ready', {
            'consultation_id': id,
            'doctor_id': user_id
        }, room=f'consultation_{id}')
    except Exception:
        pass
    
    return success(consultation.to_dict())
