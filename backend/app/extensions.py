import os
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
import redis

db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()
migrate = Migrate()

# Redis client for caching, sessions, and rate limiting
redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
try:
    redis_client = redis.from_url(redis_url, decode_responses=True)
    redis_client.ping()  # Test connection
    print("✓ Redis connected")
except Exception as e:
    print(f"⚠ Redis unavailable: {e}. Using in-memory fallback.")
    redis_client = None

# Use Redis as a message queue if REDIS_URL is provided (needed for production scaling)
socketio = SocketIO(
    cors_allowed_origins="*", 
    async_mode="threading", 
    message_queue=redis_url if redis_client else None
)
