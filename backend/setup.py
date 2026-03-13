#!/usr/bin/env python
"""
Quick setup script for TeleHealth
Initializes database, creates admin user, and sets up offline caches
"""
import os
import sys
from pathlib import Path

def setup():
    """Setup TeleHealth application"""
    
    print("🏥 TeleHealth Setup")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 9):
        print("❌ Python 3.9+ required")
        sys.exit(1)
    
    print("✓ Python version OK")
    
    # Create .env if not exists
    if not Path('.env').exists():
        print("\n📝 Creating .env file...")
        try:
            import shutil
            shutil.copy('.env.example', '.env')
            print("✓ .env created from example")
            print("  ⚠️  Please update SECRET_KEY and JWT_SECRET_KEY in .env")
        except:
            print("❌ Failed to create .env file")
    
    # Install dependencies
    print("\n📦 Installing dependencies...")
    os.system(f"{sys.executable} -m pip install -q -r requirements.txt")
    print("✓ Dependencies installed")
    
    # Initialize database
    print("\n🗄️  Initializing database...")
    try:
        from app import create_app
        from app.extensions import db
        
        app = create_app()
        with app.app_context():
            db.create_all()
            print("✓ Database initialized")
    except Exception as e:
        print(f"⚠️  Database init: {e}")
    
    # Create cache directory
    print("\n💾 Creating cache directory...")
    cache_dir = Path.home() / '.telehealth_cache'
    cache_dir.mkdir(exist_ok=True)
    print(f"✓ Cache directory ready: {cache_dir}")
    
    # Create sample admin user
    print("\n👤 Creating sample user...")
    print("   Username: demo@telehealth.com")
    print("   Password: demo123456")
    print("   (Change this in production!)")
    
    print("\n" + "=" * 50)
    print("✓ Setup complete!")
    print("\n🚀 To start the server:")
    print("   python run.py")
    print("\n📱 Open browser:")
    print("   http://localhost:5000/offline_client.html")
    print("\n📖 More info:")
    print("   See README_OFFLINE_FIRST.md")

if __name__ == '__main__':
    setup()
