from flask_socketio import emit, join_room, leave_room, disconnect
from flask import request
from app.extensions import socketio
from app.models.user import User
import jwt

# We use the configured JWT secret to decode tokens manually in socket events
from flask import current_app

connected_users = {}  # user_id -> sid mapping

def verify_token(token):
    """Manually verify JWT token for socket connections."""
    try:
        secret = current_app.config['JWT_SECRET_KEY']
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        return decoded.get("sub")  # subject is the user_id
    except Exception as e:
        return None

@socketio.on('connect')
def handle_connect():
    pass # Wait for explicit auth event

@socketio.on('authenticate')
def handle_authenticate(data):
    """Client MUST send this immediately after connect with their JWT token."""
    token = data.get('token')
    user_id = verify_token(token)
    
    if not user_id:
        emit('auth_error', {'message': 'Invalid token'})
        disconnect()
        return
        
    # Valid auth: Store connection and join personal room
    connected_users[user_id] = request.sid
    # Join personal room for targeted alerts (e.g. SOS dispatch, consultation updates)
    personal_room = f"user_{user_id}"
    join_room(personal_room)
    
    # Also check role and join generic rooms if needed
    user = User.query.get(user_id)
    if user and user.role == "doctor":
        join_room("doctors_online")
        
    emit('authenticated', {'status': 'success', 'user_id': user_id})

@socketio.on('disconnect')
def handle_disconnect():
    for uid, sid in list(connected_users.items()):
        if sid == request.sid:
            del connected_users[uid]
            break

@socketio.on('join_consultation')
def handle_join_consultation(data):
    """Both Patient and Doctor join a room specific to their consultation ID"""
    consultation_id = data.get('consultation_id')
    if not consultation_id:
        return
    
    join_room(consultation_id)
    print(f"User {request.sid} joined consultation room: {consultation_id}")
    
    # Notify others in the room that someone joined
    emit('user_joined', {'sid': request.sid}, to=consultation_id, include_self=False)

@socketio.on('peer_ready')
def handle_peer_ready(data):
    """Notify other peer in the room that I am ready for WebRTC"""
    consultation_id = data.get('consultation_id')
    if not consultation_id:
        return
    
    print(f"Peer {request.sid} is ready in room: {consultation_id}")
    emit('peer_ready', {'sid': request.sid}, to=consultation_id, include_self=False)

# ── WebRTC Signaling relay ────────────────────────────────────────────────────
@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    consultation_id = data.get('consultation_id')
    offer = data.get('offer')
    if not consultation_id or not offer:
        return

    print(f"Forwarding offer from {request.sid} in room: {consultation_id}")
    emit('webrtc_offer', data, to=consultation_id, include_self=False)

@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    consultation_id = data.get('consultation_id')
    answer = data.get('answer')
    if not consultation_id or not answer:
        return

    print(f"Forwarding answer from {request.sid} in room: {consultation_id}")
    emit('webrtc_answer', data, to=consultation_id, include_self=False)

@socketio.on('webrtc_ice_candidate')
def handle_webrtc_ice(data):
    consultation_id = data.get('consultation_id')
    candidate = data.get('candidate')
    if not consultation_id or not candidate:
        return

    emit('webrtc_ice_candidate', data, to=consultation_id, include_self=False)

@socketio.on('send_message')
def handle_send_message(data):
    """Send a chat message to a specific consultation room"""
    consultation_id = data.get('consultation_id')
    sender_id = data.get('sender_id')
    
    if not consultation_id or not sender_id:
        return
        
    try:
        from app.extensions import db
        from app.models.message import Message
        from app.models.consultation import Consultation
        from datetime import datetime

        # Save to database
        message = Message(
            consultation_id=consultation_id,
            sender_id=sender_id,
            text=data.get('message', ''),
            image_url=data.get('image')
        )
        
        db.session.add(message)
        
        # update consultation metadata
        consultation = Consultation.query.get(consultation_id)
        if consultation:
            consultation.last_message = data.get('message', '')
            consultation.last_update = datetime.utcnow()
            
        db.session.commit()
    except Exception as e:
        print(f"Error saving socket message to DB: {e}")
    
    # Forward the chat message to everyone in the room
    emit('receive_message', data, to=consultation_id, include_self=False)
