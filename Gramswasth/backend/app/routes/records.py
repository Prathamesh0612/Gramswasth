from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.health_record import HealthRecord
from app.utils.response import success, error
import os

records_bp = Blueprint('records', __name__)

@records_bp.route('', methods=['GET'])
@jwt_required()
def get_my_records():
    user_id = get_jwt_identity()
    records = HealthRecord.query.filter_by(patient_id=user_id).all()
    return success([r.to_dict() for r in records])

@records_bp.route('/symptoms', methods=['POST'])
@jwt_required()
def log_symptoms():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    record = HealthRecord(
        patient_id=user_id,
        record_type='symptom_log',
        data=data.get('symptoms')
    )
    
    db.session.add(record)
    db.session.commit()
    
    return success(record.to_dict(), 201)
@records_bp.route('/image', methods=['POST'])
@jwt_required()
def upload_record_image():
    if 'image' not in request.files:
        return error("No image field in request", 400)
        
    file = request.files['image']
    if not file or file.filename == '':
        return error("No file selected", 400)
    
    user_id = get_jwt_identity()
    
    try:
        from app.utils.image_upload import upload_image
        image_url = upload_image(file)
        
        if not image_url:
            return error("Upload failed - could not save image", 500)
        
        # Save record to database
        record = HealthRecord(
            patient_id=user_id,
            record_type='image',
            image_url=image_url
        )
        
        db.session.add(record)
        db.session.commit()
        
        # Return image URL directly for immediate use
        return success({
            'image_url': image_url,
            'record_id': record.id
        }, 201)
    except Exception as e:
        import traceback
        from flask import current_app
        current_app.logger.error(f"Upload error: {type(e).__name__}: {e}")
        traceback.print_exc()
        return error(f"Upload error: {str(e)}", 500)
@records_bp.route('/static/<folder>/<filename>')
def serve_upload(folder, filename):
    from flask import send_from_directory
    from app.utils.image_upload import _UPLOAD_DIR
    return send_from_directory(os.path.join(_UPLOAD_DIR, folder), filename)
