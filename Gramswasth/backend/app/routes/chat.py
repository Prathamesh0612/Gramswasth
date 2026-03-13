"""
Redis-based chat endpoints (no Socket.IO required)
Messages stored in Redis for real-time polling
Fallback to database if Redis unavailable
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db, redis_client
from app.models.consultation import Consultation
from app.models.message import Message
import json
from datetime import datetime
from app.utils.response import success, error

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/consultations/<consultation_id>/message', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def send_message(consultation_id):
    if request.method == 'OPTIONS':
        return success()
    """Send a message via Redis (polling-based) and persist to DB"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Verify user is part of this consultation
    consultation = Consultation.query.get(consultation_id)
    if not consultation or (str(consultation.patient_id) != str(user_id) and str(consultation.doctor_id) != str(user_id)):
        return error('Unauthorized', 403)
        
    # Save to database
    message = Message(
        consultation_id=consultation.id,
        sender_id=user_id,
        text=data.get('message', ''),
        image_url=data.get('image')
    )
    
    db.session.add(message)
    consultation.last_message = data.get('message', '')
    consultation.last_update = datetime.utcnow()
    db.session.commit()
    
    message_dict = message.to_dict()
    
    # Store in Redis (fast, real-time polling) optional
    if redis_client:
        try:
            redis_key = f"messages:{consultation_id}"
            redis_client.lpush(redis_key, json.dumps(message_dict))
            redis_client.expire(redis_key, 86400)  # Keep for 24 hours
        except Exception as e:
            print(f"Redis error: {e}")
            
    return success(message_dict, 201)


@chat_bp.route('/consultations/<consultation_id>/messages', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_messages(consultation_id):
    if request.method == 'OPTIONS':
        return success()
    """Get all messages for a consultation"""
    user_id = get_jwt_identity()
    
    # Verify user is part of this consultation
    consultation = Consultation.query.get(consultation_id)
    if not consultation or (str(consultation.patient_id) != str(user_id) and str(consultation.doctor_id) != str(user_id)):
        return error('Unauthorized', 403)
    
    messages = Message.query.filter_by(consultation_id=consultation.id).order_by(Message.created_at.asc()).all()
    
    return success([m.to_dict() for m in messages], 200)
