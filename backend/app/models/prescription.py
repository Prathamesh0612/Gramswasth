import uuid
from datetime import datetime
from app.extensions import db

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    consultation_id = db.Column(db.String(36), db.ForeignKey('consultations.id', ondelete='CASCADE'), nullable=False)
    doctor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    patient_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    medicines = db.Column(db.JSON, nullable=False)  # [{name, dose, duration, instructions}]
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'consultation_id': str(self.consultation_id),
            'doctor_id': str(self.doctor_id),
            'patient_id': str(self.patient_id),
            'medicines': self.medicines,
            'notes': self.notes,
            'created_at': self.created_at.isoformat()
        }
