import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-fallback')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///telehealth.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-fallback-secret-key-that-is-at-least-32-bytes-long')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours

    # URLs for CORS and absolute links
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:5000')

    # Redis (optional - falls back to SQLite-based cache if not configured)
    REDIS_URL = os.environ.get('REDIS_URL', None)

    # Cloudinary image upload
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')
