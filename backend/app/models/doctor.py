from app.extensions import db

class Doctor(db.Model):
    __tablename__ = 'doctors'
    
    id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    specialization = db.Column(db.String(100))
    is_available = db.Column(db.Boolean, default=False)
    is_on_emergency = db.Column(db.Boolean, default=False)
    rating = db.Column(db.Numeric(3,2), default=0.0)
    
    # Relationships
    consultations_as_doctor = db.relationship(
        'Consultation',
        primaryjoin="Doctor.id == foreign(Consultation.doctor_id)",
        backref='doctor_details',
        lazy='dynamic'
    )

    
    def to_dict(self):
        base_dict = self.user.to_dict() if self.user else {}
        base_dict.update({
            'specialization': self.specialization,
            'is_available': self.is_available,
            'is_on_emergency': self.is_on_emergency,
            'rating': float(self.rating) if self.rating else 0.0
        })
        return base_dict
