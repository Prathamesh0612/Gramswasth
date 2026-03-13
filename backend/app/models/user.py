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
            'created_at': self.created_at.isoformat()
        }
