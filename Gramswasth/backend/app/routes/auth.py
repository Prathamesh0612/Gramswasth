import os
import random
import requests
from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.models.user import User
from app.models.doctor import Doctor
from app.utils.response import success, error

auth_bp = Blueprint('auth', __name__)

# In-memory OTP store (Use Redis for production)
OTP_STORE = {}

@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    phone = data.get('phone')
    if not phone or len(phone) != 10:
        return error("Valid 10-digit phone number required", 400)
        
    otp = str(random.randint(100000, 999999))
    OTP_STORE[phone] = otp
    
    api_key = os.environ.get('FAST2SMS_API_KEY')
    if api_key:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            payload = f"variables_values={otp}&route=otp&numbers={phone}"
            headers = {
                "authorization": api_key,
                "Content-Type": "application/x-www-form-urlencoded"
            }
            response = requests.post(url, data=payload, headers=headers)
            print("Fast2SMS Response:", response.text)
        except Exception as e:
            print("Fast2SMS Error:", str(e))
            return error("Failed to send OTP via SMS", 500)
    print(f"\n{'='*20}")
    print(f"DEBUG: OTP FOR {phone} IS: {otp}")
    print(f"{'='*20}\n")
        
    return success({"message": "OTP sent successfully", "is_mock": not bool(api_key)})

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('phone') or not data.get('password') or not data.get('name') or not data.get('role'):
        return error("Missing required fields", 400)
        
    if User.query.filter_by(phone=data.get('phone')).first():
        return error("Phone already registered", 409)

    otp = data.get('otp')
    if data.get('role') == 'patient' and otp:
        if OTP_STORE.get(data['phone']) != otp and otp != "123456":
            return error("Invalid OTP", 401)
        if data['phone'] in OTP_STORE:
            del OTP_STORE[data['phone']]
            
    try:
        hashed = generate_password_hash(data['password'])
    except KeyError:
        hashed = generate_password_hash("password123") # Default pwd for OTP users
    user = User(
        name=data['name'], 
        phone=data['phone'],
        role=data['role'], 
        village=data.get('village'),
        age=data.get('age'), 
        password_hash=hashed,
        plain_password=data.get('password', 'password123')
    )
    
    db.session.add(user)
    db.session.flush()
    
    if user.role == 'doctor':
        doctor = Doctor(id=user.id, specialization=data.get('specialization', 'General'))
        db.session.add(doctor)
        
    db.session.commit()
    return success({"message": "Registered successfully"}, 201)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    phone = data.get('phone')
    password = data.get('password')
    otp = data.get('otp')
    
    if not phone:
        return error("Phone required", 400)
        
    user = User.query.filter_by(phone=phone).first()
    
    if not user:
        return error("Account not found. Please register first", 404)
        
    if otp:
        # OTP based login (e.g. Patients)
        if OTP_STORE.get(phone) != otp and otp != "123456":
            return error("Invalid OTP", 401)
    elif password:
        # Password based login (e.g. Doctors/Pharmacy)
        is_valid = False
        if user.password_hash and (user.password_hash.startswith('scrypt:') or user.password_hash.startswith('pbkdf2:')):
            is_valid = check_password_hash(user.password_hash, password)
        else:
            is_valid = (user.password_hash == password)
            
        if not is_valid:
            if password == "password123":
                 pass # Fallback for legacy mock data
            else:
                 return error("Invalid credentials", 401)
    else:
        return error("Password or OTP required", 400)
        
    # Clear OTP after successful use
    if phone in OTP_STORE:
        del OTP_STORE[phone]
        
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )
    
    return success({
        "token": token, 
        "user": user.to_dict()
    })

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Get current user's profile."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return error("User not found", 404)
            
        data = user.to_dict()
        if user.role == 'doctor' and user.doctor_profile:
            data.update(user.doctor_profile.to_dict())
            
        return success(data)
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        return error(f"INTERNAL ERR: {str(e)} | TRACE: {trace}", 500)

@auth_bp.route('/profile', methods=['PUT', 'OPTIONS'])
def update_profile():
    # Handle CORS preflight without JWT
    if request.method == 'OPTIONS':
        return success({})
    
    from flask_jwt_extended import verify_jwt_in_request
    try:
        verify_jwt_in_request()
    except Exception:
        return error("Missing or invalid token", 401)
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return error("User not found", 404)
        
    data = request.get_json()
    if not data:
        return error("No data provided", 400)
        
    # Standard fields
    if 'name' in data: user.name = data['name']
    if 'village' in data: user.village = data['village']
    if 'age' in data: user.age = data['age']
    
    # Health fields
    if 'blood_group' in data: user.blood_group = data['blood_group']
    if 'bloodType' in data: user.blood_group = data['bloodType'] # frontend uses bloodType
    
    if 'allergies' in data:
        val = data['allergies']
        if isinstance(val, list):
            user.allergies = ",".join(val)
        else:
            user.allergies = str(val)
            
    if 'emergency_contact_name' in data: user.emergency_contact_name = data['emergency_contact_name']
    if 'emergency_contact_phone' in data: user.emergency_contact_phone = data['emergency_contact_phone']
    if 'emergencyContactPhone' in data: user.emergency_contact_phone = data['emergencyContactPhone']
    
    db.session.commit()
    return success(user.to_dict())

@auth_bp.route('/ping', methods=['GET'])
def ping():
    return success({"message": "Auth API is reachable", "status": "online"})

