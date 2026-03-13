from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.medicine import Medicine
from app.utils.response import success, error
from app.utils.decorators import role_required

pharmacy_bp = Blueprint('pharmacy', __name__)

@pharmacy_bp.route('/inventory', methods=['GET'])
@jwt_required()
@role_required('pharmacy')
def get_my_inventory():
    user_id = get_jwt_identity()
    medicines = Medicine.query.filter_by(pharmacy_id=user_id).all()
    return success([m.to_dict() for m in medicines])

@pharmacy_bp.route('/inventory', methods=['POST'])
@jwt_required()
@role_required('pharmacy')
def add_medicine():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    medicine = Medicine(
        pharmacy_id=user_id,
        name=data['name'],
        quantity=data.get('quantity', 0),
        price=data.get('price')
    )
    
    db.session.add(medicine)
    db.session.commit()
    
    return success(medicine.to_dict(), 201)

@pharmacy_bp.route('/search', methods=['GET'])
def search_medicines():
    name = request.args.get('name', '')
    medicines = Medicine.query.filter(Medicine.name.ilike(f'%{name}%')).all()
    return success([m.to_dict() for m in medicines])
@pharmacy_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_pharmacies():
    """List all pharmacies with their medicines (for patients to find nearby shops)."""
    from app.models.user import User
    pharmacy_users = User.query.filter_by(role='pharmacy').all()
    results = []
    for u in pharmacy_users:
        data = {
            'id': u.id,
            'name': u.name,
            'village': u.village,
            'distanceKm': random.uniform(0.5, 5.0), # Mock distance for now
            'medicines': [m.to_dict() for m in u.medicines]
        }
        results.append(data)
    return success(results)

import random # for mock distance
