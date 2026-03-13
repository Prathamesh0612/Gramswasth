import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-fallback')

    # Auto-fix database URL prefixes for psycopg2 compatibility
    _raw_db_url = os.environ.get('DATABASE_URL', 'sqlite:///telehealth.db')
    if _raw_db_url.startswith('postgresql+psycopg://'):
        _raw_db_url = _raw_db_url.replace('postgresql+psycopg://', 'postgresql://', 1)
    elif _raw_db_url.startswith('postgres://'):
        _raw_db_url = _raw_db_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = _raw_db_url

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-fallback-secret-key-that-is-at-least-32-bytes-long')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours

    # Frontend URL for CORS
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    # Redis (optional - falls back to SQLite-based cache if not configured)
    REDIS_URL = os.environ.get('REDIS_URL', None)

    # Cloudinary image upload
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')
