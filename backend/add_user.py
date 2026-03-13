import sys
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.doctor import Doctor
from werkzeug.security import generate_password_hash

def add_user():
    app = create_app()
    with app.app_context():
        print("\n--- Add New User/Doctor to GramHealth ---")
        phone = input("Enter Phone Number (10 digits): ").strip()
        if len(phone) != 10 or not phone.isdigit():
            print("Error: Invalid phone number.")
            return

        # Check if exists
        existing = User.query.filter_by(phone=phone).first()
        if existing:
            print(f"Error: User with phone {phone} already exists ({existing.name}).")
            return

        name = input("Enter Full Name: ").strip()
        password = input("Enter Password (default '123456'): ").strip() or "123456"
        role = input("Enter Role (patient/doctor/pharmacy): ").strip().lower()
        
        if role not in ['patient', 'doctor', 'pharmacy']:
            print("Error: Invalid role.")
            return

        village = input("Enter Village/City: ").strip() or "General"
        
        user = User(
            name=name,
            phone=phone,
            role=role,
            password_hash=generate_password_hash(password),
            plain_password=password,
            village=village,
            age=30
        )
        
        db.session.add(user)
        db.session.flush()

        if role == 'doctor':
            spec = input("Enter Doctor Specialization (e.g. Cardiologist): ").strip() or "General Physician"
            doctor = Doctor(id=user.id, specialization=spec, is_available=True)
            db.session.add(doctor)

        try:
            db.session.commit()
            print(f"\nSUCCESS: {role.capitalize()} {name} added successfully!")
            print(f"Login with: {phone} / {password}")
        except Exception as e:
            db.session.rollback()
            print(f"Error: {e}")

if __name__ == "__main__":
    add_user()
