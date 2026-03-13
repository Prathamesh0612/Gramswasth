import uuid
from datetime import datetime
from app.extensions import db

class Medicine(db.Model):
    __tablename__ = 'medicines'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, default=0)
    price = db.Column(db.Numeric(8,2))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'pharmacy_id': str(self.pharmacy_id),
            'name': self.name,
            'quantity': self.quantity,
            'price': float(self.price) if self.price is not None else None,
            'updated_at': self.updated_at.isoformat()
        }
