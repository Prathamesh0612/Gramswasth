#!/usr/bin/env bash
# Quick Start Script for TeleHealth

echo "🏥 TeleHealth - Quick Start Guide"
echo "=================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.9+"
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Navigate to backend
cd "$(dirname "$0")"

# Create venv
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install packages
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Setup env
if [ ! -f .env ]; then
    echo "⚙️  Setting up environment..."
    cp .env.example .env
    # Generate random secret key
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/change-this-to-a-random-secret-key/$SECRET/" .env
fi

# Initialize database
echo "🗄️  Initializing database..."
export FLASK_APP=run.py
flask db upgrade 2>/dev/null || echo "⚠️  Database migration skipped"

# Create cache dir
mkdir -p ~/.telehealth_cache

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the server:"
echo "   source venv/bin/activate  (if not already activated)"
echo "   python run.py"
echo ""
echo "📱 Then open in browser:"
echo "   http://localhost:5000/offline_client.html"
echo ""
echo "📚 For more info, see:"
echo "   - README_OFFLINE_FIRST.md  (Features)"
echo "   - DEPLOYMENT.md             (Production)"
echo "   - FEATURES.md               (Complete overview)"
echo ""
