import uuid
import random
from datetime import datetime, timedelta
from faker import Faker
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.doctor import Doctor
from app.models.consultation import Consultation
from app.models.prescription import Prescription
from app.models.health_record import HealthRecord
from app.models.medicine import Medicine
from app.models.message import Message
from app.models.emergency import EmergencyAlert

fake = Faker('en_IN')

# Define constraints
SPECIALIZATIONS = ['General Physician', 'Cardiologist', 'Pediatrician', 'Orthopedist', 'Neurologist', 'Ophthalmologist']
MEDICINE_NAMES = ['Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Azithromycin', 'Crocin', 'Dolo', 'Cetirizine', 'Allegra', 'Pantoprazole', 'Omeprazole', 'Metformin', 'Amlodipine', 'Aspirin', 'Atorvastatin', 'Metoprolol', 'Losartan', 'Albuterol', 'Gabapentin', 'Hydrochlorothiazide', 'Sertraline']
MEDICINE_TYPES = ['Tablet', 'Syrup', 'Capsule', 'Injection', 'Ointment']
ILLNESSES = ['Fever', 'Cold', 'Cough', 'Body Ache', 'Headache', 'Stomach Ache', 'Joint Pain', 'Eye Infection', 'Skin Rash', 'High BP']
VILLAGES = ['Mandvi', 'Bhuj', 'Anjar', 'Gandhidham', 'Rapar', 'Nakhatrana', 'Mundra', 'Bhachau']

def clear_db():
    print("Clearing existing data...")
    EmergencyAlert.query.delete()
    Message.query.delete()
    Prescription.query.delete()
    HealthRecord.query.delete()
    Medicine.query.delete()
    Consultation.query.delete()
    Doctor.query.delete()
    User.query.delete()
    db.session.commit()

def generate_users(role, count, start_phone):
    users = []
    print(f"Generating {count} {role}s...")
    for i in range(count):
        # We start with start_phone + i + 10 to ensure we don't naturally collide with the demo overrides
        phone = str(start_phone + i + 10)
        
        # Random chance of using exact demo numbers if they match our known lists
        if role == 'patient' and i == 0:
            phone = "9892090672"
            name = "Demo Patient"
        elif role == 'doctor' and i == 0:
            phone = "9100000001"
            name = "Demo Doctor"
        elif role == 'pharmacy' and i == 0:
            phone = "9200000001"
            name = "Demo Pharmacy"
        else:
            name = fake.name()
            if role == 'doctor':
                name = f"Dr. {name}"
            # No "Dr. Dr. name" if fake.name() already says Dr.
            if role == 'doctor' and "Dr. Dr." in name:
                name = name.replace("Dr. Dr.", "Dr.")

        user = User(
            id=str(uuid.uuid4()), # explicitly set UUID so relationships work before flush
            phone=phone,
            name=name,
            password_hash="123456",
            plain_password="123456",
            role=role,
            village=random.choice(VILLAGES),
            age=random.randint(5, 80) if role == 'patient' else None
        )
        users.append(user)
    db.session.add_all(users)
    db.session.flush()
    return users

def generate_doctors_profiles(doctor_users):
    print("Setting up doctor profiles...")
    doctors = []
    # Make sure we have at least one of each specialization so the frontend options work
    for i, user in enumerate(doctor_users):
        spec = SPECIALIZATIONS[i % len(SPECIALIZATIONS)]
        doc = Doctor(
            id=user.id,
            specialization=spec,
            is_available=random.choice([True, True, True, False]), # 75% available
        )
        doctors.append(doc)
    db.session.add_all(doctors)
    db.session.flush()

def generate_medicines(pharmacies, count=100):
    print(f"Generating {count} medicines...")
    medicines = []
    # Base real medicines first
    for name in MEDICINE_NAMES:
        pharmacy = random.choice(pharmacies)
        med = Medicine(
            id=str(uuid.uuid4()),
            pharmacy_id=pharmacy.id,
            name=name,
            quantity=random.randint(0, 1000),
            price=round(random.uniform(10.0, 500.0), 2)
        )
        medicines.append(med)
    
    # Generate rest
    for _ in range(count - len(MEDICINE_NAMES)):
        word = fake.word().capitalize()
        pharmacy = random.choice(pharmacies)
        med = Medicine(
            id=str(uuid.uuid4()),
            pharmacy_id=pharmacy.id,
            name=f"{word} {random.choice(['Plus', 'Forte', 'Max', 'XR'])}",
            quantity=random.randint(0, 500),
            price=round(random.uniform(5.0, 1000.0), 2)
        )
        medicines.append(med)
    db.session.add_all(medicines)
    db.session.flush()
    return medicines

def generate_consultations_and_prescriptions(patients, doctors, medicines, count=250):
    print(f"Generating {count} consultations and matching prescriptions/records...")
    
    for _ in range(count):
        patient = random.choice(patients)
        doctor = random.choice(doctors)
        
        # Random date in the past year
        days_ago = random.randint(0, 365)
        consult_date = datetime.utcnow() - timedelta(days=days_ago)
        
        status = random.choice(['completed', 'pending', 'cancelled', 'ongoing'])
        if days_ago > 30:
            status = 'completed' # Older ones are completed
            
        consultation = Consultation(
            id=str(uuid.uuid4()),
            patient_id=patient.id,
            doctor_id=doctor.id,
            status=status,
            type=random.choice(['audio', 'video', 'chat', 'normal']),
            notes=fake.sentence() if status == 'completed' else None,
            created_at=consult_date,
            updated_at=consult_date + timedelta(minutes=30)
        )
        db.session.add(consultation)

        # If completed, 70% chance of having a prescription
        if status == 'completed' and random.random() < 0.7:
            num_meds = random.randint(1, 4)
            prescribed_meds = random.sample(medicines, num_meds)
            
            meds_json = []
            for med in prescribed_meds:
                meds_json.append({
                    "id": med.id,
                    "name": med.name,
                    "dosage": random.choice(["1-0-1", "0-0-1", "1-1-1", "1-0-0"]),
                    "duration": f"{random.randint(3, 14)} days",
                    "instructions": random.choice(["After meals", "Before meals", "With water"])
                })
                
            prescription = Prescription(
                id=str(uuid.uuid4()),
                consultation_id=consultation.id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                medicines=meds_json,
                notes=fake.sentence(),
                created_at=consult_date + timedelta(minutes=15)
            )
            db.session.add(prescription)
            
            # Create a simple health record
            if random.random() < 0.5:
                hr = HealthRecord(
                    id=str(uuid.uuid4()),
                    patient_id=patient.id,
                    record_type='diagnosis',
                    data={"blood_pressure": f"{random.randint(110, 140)}/{random.randint(70, 90)}", "temperature": "98.6 F", "diagnosis": random.choice(ILLNESSES)},
                    created_at=consult_date
                )
                db.session.add(hr)

    db.session.flush()

def seed_db():
    app = create_app()
    with app.app_context():
        db.create_all()
        clear_db()
        
        # Use a fixed seed for reproducible mocks (optional)
        Faker.seed(42)
        random.seed(42)
        
        patients = generate_users('patient', 100, 9000000000)
        doctors_users = generate_users('doctor', 20, 9100000000)
        pharmacies = generate_users('pharmacy', 10, 9200000000)
        
        generate_doctors_profiles(doctors_users)
        
        medicines = generate_medicines(pharmacies, 100)
        
        generate_consultations_and_prescriptions(patients, doctors_users, medicines, 250)
        
        db.session.commit()
        print("\n✅ Success! Database populated with rich mock data.")

if __name__ == '__main__':
    seed_db()
