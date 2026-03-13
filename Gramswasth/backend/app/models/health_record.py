import uuid
from datetime import datetime
from app.extensions import db

class HealthRecord(db.Model):
    __tablename__ = 'health_records'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    record_type = db.Column(db.String(50))  # 'symptom_log', 'image', 'diagnosis'
    data = db.Column(db.JSON)
    image_url = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'patient_id': str(self.patient_id),
            'record_type': self.record_type,
            'data': self.data,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat()
        }
