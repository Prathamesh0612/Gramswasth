from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.doctor import Doctor
from app.utils.response import success, error
from app.utils.decorators import role_required

doctors_bp = Blueprint('doctors', __name__)

@doctors_bp.route('/available', methods=['GET'])
def list_available_doctors():
    doctors = Doctor.query.filter_by(is_available=True).all()
    return success([d.to_dict() for d in doctors])

@doctors_bp.route('/<doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    """Fetch single doctor profile (needed for booking workflow)."""
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return error("Doctor not found", 404)
    return success(doctor.to_dict())

@doctors_bp.route('/availability', methods=['PATCH'])
@jwt_required()
def toggle_availability():
    """Doctors toggle their online/offline state. Patients should not access this."""
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return error("Only doctors can update availability", 403)
        
    data = request.get_json()
    user_id = get_jwt_identity()
    doctor = Doctor.query.get(user_id)
    
    if not doctor:
        return error("Doctor profile not found", 404)
    
    if data and 'is_available' in data:
        doctor.is_available = bool(data['is_available'])
        db.session.commit()
        
    return success(doctor.to_dict())
