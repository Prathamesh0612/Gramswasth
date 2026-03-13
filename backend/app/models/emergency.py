import uuid
from datetime import datetime
from app.extensions import db

class EmergencyAlert(db.Model):
    __tablename__ = 'emergency_alerts'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    doctor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    status = db.Column(db.String(20), default='pending')  # pending, assigned, resolved
    location = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'patient_id': str(self.patient_id),
            'doctor_id': str(self.doctor_id) if self.doctor_id else None,
            'status': self.status,
            'location': self.location,
            'created_at': self.created_at.isoformat()
        }
