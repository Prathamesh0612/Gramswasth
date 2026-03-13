from flask import Blueprint
from app.models.user import User
from app.models.doctor import Doctor
from app.models.consultation import Consultation
from app.models.medicine import Medicine
from app.utils.response import success

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
def get_stats():
    user_count = User.query.count()
    doctor_count = Doctor.query.count()
    consultation_count = Consultation.query.count()
    medicine_count = Medicine.query.count()
    
    return success({
        "counts": {
            "users": user_count,
            "doctors": doctor_count,
            "consultations": consultation_count,
            "medicines": medicine_count
        }
    })

@admin_bp.route('/users', methods=['GET'])
def list_users():
    users = User.query.all()
    return success([u.to_dict() for u in users])
