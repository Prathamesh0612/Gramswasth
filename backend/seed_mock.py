from app import create_app
from app.extensions import db, bcrypt
from app.models.user import User
from app.models.doctor import Doctor

def seed_mock_data():
    app = create_app()
    with app.app_context():
        # Unified password for all mock accounts
        pwd_hash = "123456"
        
        # 3 Patients
        patients = [
            {"phone": "9000000001", "name": "Rahul Sharma", "village": "Mandvi", "age": 28},
            {"phone": "9000000002", "name": "Sita Devi", "village": "Kutch", "age": 35},
            {"phone": "9000000003", "name": "Amit Patel", "village": "Bhuj", "age": 42},
        ]

        # 6 Specialist Doctors
        doctors = [
            {"phone": "9100000001", "name": "Dr. Verma", "spec": "General Physician"},
            {"phone": "9100000002", "name": "Dr. Reddy", "spec": "Cardiologist"},
            {"phone": "9100000003", "name": "Dr. Kapoor", "spec": "Pediatrician"},
            {"phone": "9100000004", "name": "Dr. Singh", "spec": "Orthopedist"},
            {"phone": "9100000005", "name": "Dr. Joshi", "spec": "Neurologist"},
            {"phone": "9100000006", "name": "Dr. Nair", "spec": "Ophthalmologist"},
        ]
        
        # 1 Pharmacy
        pharmacies = [
            {"phone": "9200000001", "name": "GramCare Pharmacy", "village": "Mandvi"}
        ]

        # Keep the original bypass number for backward compatibility as Patient
        patients.append({"phone": "9892090672", "name": "Demo Patient", "village": "Mandvi", "age": 30})

        def create_or_update(phone, name, role, extra=None):
            user = User.query.filter_by(phone=phone).first()
            if not user:
                print(f"Creating {role} {name} ({phone})...")
                user = User(
                    phone=phone,
                    name=name,
                    password_hash=pwd_hash,
                    plain_password=pwd_hash, # Saving plain password for easy demo reference
                    role=role,
                    village=extra.get('village', 'Mandvi') if extra else 'Mandvi',
                    age=extra.get('age', 35) if extra else 35
                )
                db.session.add(user)
                db.session.flush()
                
                if role == 'doctor':
                    doc = Doctor(id=user.id, specialization=extra.get('spec', 'General Medicine'), is_available=True)
                    db.session.add(doc)
            else:
                user.role = role
                user.name = name
                user.plain_password = pwd_hash # Ensure plain password is set for existing mock users
                if role == 'doctor' and not user.doctor_profile:
                    doc = Doctor(id=user.id, specialization=extra.get('spec', 'General Medicine'), is_available=True)
                    db.session.add(doc)
                elif role == 'doctor' and user.doctor_profile:
                    user.doctor_profile.is_available = True
            return user

        for p in patients: create_or_update(p['phone'], p['name'], 'patient', p)
        for d in doctors: create_or_update(d['phone'], d['name'], 'doctor', d)
        for ph in pharmacies: create_or_update(ph['phone'], ph['name'], 'pharmacy', ph)
        
        db.session.commit()
        print("Extended Mock data synchronization complete.")

if __name__ == "__main__":
    seed_mock_data()
