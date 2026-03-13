import random
from app.extensions import db
from app.models.doctor import Doctor
from flask import current_app

class EmergencyHandler:
    def __init__(self):
        # Severe conditions that auto-trigger SOS
        self.critical_conditions = ['cond_angina', 'cond_stroke', 'cond_heart_attack', 'cond_severe_blood_loss']
        
    def check_is_emergency(self, symptoms, predicted_condition):
        """Used by the AI symptom checker to flag auto-emergencies."""
        is_critical = predicted_condition in self.critical_conditions
        
        # Also check raw keywords
        urgent_keywords = ['chest pain', 'unconscious', 'bleeding heavily', 'can\'t breathe', 'stroke']
        for s in symptoms:
            if any(k in s.lower() for k in urgent_keywords):
                is_critical = True
                break
                
        return {
            "is_emergency": is_critical,
            "action_required": "Immediate medical attention needed" if is_critical else None
        }

    def handle_sos(self, alert):
        """Find an available doctor and emit an SOS event using Socket.IO"""
        try:
            from app.extensions import socketio
            
            # Find an online/available doctor (could be expanded with geography)
            doc = Doctor.query.filter_by(is_available=True).first()
            
            if doc:
                alert.doctor_id = doc.id
                alert.status = 'assigned'
                db.session.commit()
                
                # Emit targeted alert to the assigned doctor
                payload = {
                    'alert_id': alert.id,
                    'patient_id': alert.patient_id,
                    'patient_name': alert.patient.name if alert.patient else 'Unknown',
                    'location': alert.location,
                    'timestamp': alert.created_at.isoformat()
                }
                socketio.emit('emergency_alert', payload, room=f"user_{doc.id}")
            else:
                # No specific doctor available -> broadcast to all doctors online
                payload = {
                    'alert_id': alert.id,
                    'patient_id': alert.patient_id,
                    'patient_name': alert.patient.name if alert.patient else 'Unknown',
                    'location': alert.location,
                    'timestamp': alert.created_at.isoformat(),
                    'unassigned': True
                }
                socketio.emit('emergency_alert', payload, room="doctors_online")
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Failed to dispatch SOS: {e}")
