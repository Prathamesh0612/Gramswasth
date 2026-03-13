import uuid
from datetime import datetime
from app.extensions import db

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    consultation_id = db.Column(db.String(36), db.ForeignKey('consultations.id', ondelete='CASCADE'), nullable=False)
    sender_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    text = db.Column(db.Text)
    image_url = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'consultation_id': str(self.consultation_id),
            'sender_id': str(self.sender_id),
            'text': self.text,
            'image': self.image_url,
            'timestamp': self.created_at.isoformat()
        }
