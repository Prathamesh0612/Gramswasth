from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.prescription import Prescription
from app.models.consultation import Consultation
from app.utils.response import success, error

prescriptions_bp = Blueprint('prescriptions', __name__)


@prescriptions_bp.route('', methods=['GET'])
@jwt_required()
def list_prescriptions():
    """List prescriptions for the current user (patient or doctor)."""
    user_id = get_jwt_identity()
    role = get_jwt().get('role')

    if role == 'doctor':
        presc = Prescription.query.filter_by(doctor_id=user_id).all()
    else:
        presc = Prescription.query.filter_by(patient_id=user_id).all()

    return success([p.to_dict() for p in presc])


@prescriptions_bp.route('/<pid>', methods=['GET'])
@jwt_required()
def get_prescription(pid):
    """Get a single prescription by ID."""
    user_id = get_jwt_identity()
    p = Prescription.query.get_or_404(pid)

    # Only patient or the prescribing doctor can view
    if str(p.patient_id) != str(user_id) and str(p.doctor_id) != str(user_id):
        return error("Access denied", 403)

    return success(p.to_dict())


@prescriptions_bp.route('', methods=['POST'])
@jwt_required()
def create_prescription():
    """Doctor creates a prescription for a consultation."""
    from app.utils.decorators import role_required
    user_id = get_jwt_identity()
    role = get_jwt().get('role')

    if role != 'doctor':
        return error("Doctor access required", 403)

    data = request.get_json()
    if not data:
        return error("Request body required", 400)

    consultation_id = data.get('consultation_id')
    patient_id = data.get('patient_id')
    medicines = data.get('medicines')

    if not consultation_id or not patient_id or not medicines:
        return error("consultation_id, patient_id, and medicines are required", 400)

    # Verify the consultation belongs to this doctor
    consult = Consultation.query.get(consultation_id)
    if not consult:
        return error("Consultation not found", 404)
    if str(consult.doctor_id) != str(user_id):
        return error("This consultation is not assigned to you", 403)

    p = Prescription(
        consultation_id=consultation_id,
        doctor_id=user_id,
        patient_id=patient_id,
        medicines=medicines,
        notes=data.get('notes'),
    )
    db.session.add(p)

    # Mark consultation as completed when prescription is written
    consult.status = 'completed'
    db.session.commit()

    # Notify patient via socket
    try:
        from app.extensions import socketio
        socketio.emit('prescription_ready', {
            'consultation_id': consultation_id,
            'prescription': p.to_dict()
        }, room=f'user_{patient_id}')
    except Exception:
        pass

    return success(p.to_dict(), 201)
