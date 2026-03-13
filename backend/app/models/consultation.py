import uuid
from datetime import datetime
from app.extensions import db

class Consultation(db.Model):
    __tablename__ = 'consultations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    doctor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    status = db.Column(db.String(20), default='pending') # pending, accepted, ongoing, completed, cancelled
    type = db.Column(db.String(20), default='normal') # normal, emergency
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('User', foreign_keys=[patient_id], backref='consultations')
    prescriptions = db.relationship('Prescription', backref='consultation', cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'patient_id': str(self.patient_id),
            'doctor_id': str(self.doctor_id) if self.doctor_id else None,
            'status': self.status,
            'type': self.type,
            'notes': self.notes,
            'meeting_id': str(self.id),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
