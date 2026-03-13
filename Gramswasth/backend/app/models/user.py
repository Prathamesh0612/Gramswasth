import uuid
from datetime import datetime
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(15), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'patient', 'doctor', 'pharmacy'
    village = db.Column(db.String(100))
    age = db.Column(db.Integer)
    password_hash = db.Column(db.Text, nullable=False)
    plain_password = db.Column(db.String(100)) # Temporarily saving for user reference
    blood_group = db.Column(db.String(10))
    allergies = db.Column(db.Text) # Stored as comma-separated string or JSON
    emergency_contact_name = db.Column(db.String(100))
    emergency_contact_phone = db.Column(db.String(15))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    doctor_profile = db.relationship('Doctor', backref='user', uselist=False, cascade="all, delete-orphan")
    medicines = db.relationship('Medicine', backref='pharmacy', cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'phone': self.phone,
            'role': self.role,
            'village': self.village,
            'age': self.age,
            'blood_group': self.blood_group,
            'allergies': self.allergies.split(',') if self.allergies else [],
            'emergency_contact_name': self.emergency_contact_name,
            'emergency_contact_phone': self.emergency_contact_phone,
            'created_at': self.created_at.isoformat()
        }
