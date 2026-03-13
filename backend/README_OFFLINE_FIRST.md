# TeleHealth - Offline-First Healthcare Assistant

A lightweight, resource-efficient healthcare application designed for offline-first operation in low-bandwidth and rural environments.

## 🌟 Key Features

### Offline-First Architecture
- **Complete offline functionality** - Works without internet connection
- **Smart caching** - Minimal data storage using SQLite  
- **Automatic sync** - Seamlessly syncs when connection returns
- **Resource-friendly** - Optimized for low-spec devices

### Healthcare Services
- 🩺 **AI Symptom Checker** - Rule-based offline diagnosis with fuzzy matching
- 💊 **Medicine Database** - Offline medicine search with details and alternatives
- 🚨 **Emergency Service** - Emergency contacts and first aid guides
- ❤️ **Health Tracking** - Local health records and prescriptions
- 👨‍⚕️ **Consultations** - Connect with doctors (online when available)

### Deployment Options
- Docker containerization for easy deployment
- Minimal resource footprint (runs on single core, <100MB RAM)
- SQLite for zero database setup or PostgreSQL for production

## 📋 Requirements

- Python 3.9+
- 50MB disk space minimum
- Works on low-spec devices (1GB RAM)

## 🚀 Quick Start

### 1. Local Development Setup

```bash
# Clone/navigate to project
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env

# Initialize database
flask db upgrade

# Run server
python run.py
```

Server will start at `http://localhost:5000`

### 2. Docker Deployment (Recommended)

```bash
# With Docker Compose (includes PostgreSQL)
docker-compose up --build

# Or standalone Docker (uses SQLite)
docker build -t telehealth .
docker run -p 5000:5000 \
  -e DATABASE_URL=sqlite:///telehealth.db \
  -e SECRET_KEY=your-secret-key \
  telehealth
```

### 3. Web Client

Open in browser:
```
http://localhost:5000/offline_client.html
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Symptoms (Offline)
- `POST /api/ai/symptoms/enhanced` - Check symptoms with diagnosis
- `GET /api/ai/health-tips/<condition>` - Get health tips

### Medicine (Offline)
- `GET /api/medicine/search?query=paracetamol` - Search medicines
- `GET /api/medicine/details/<name>` - Get medicine details
- `GET /api/medicine/common` - Get common medicines list

### Sync
- `POST /api/sync/data` - Sync offline changes to server
- `GET /api/sync/pull` - Pull data for offline use
- `GET /api/sync/status` - Check sync status

### Health Records
- `GET /api/records` - Get health records
- `POST /api/records` - Create health record

### Consultations
- `POST /api/consultations` - Create consultation
- `GET /api/consultations` - List consultations

## 💾 Offline Data Storage

Cached locally in `~/.telehealth_cache/` with SQLite:

```
cache_<user_id>.db
├── cache table (API responses)
├── sync_queue table (pending changes)
└── metadata table (app state)
```

**TTL (Time to Live) Strategy:**
- User profile: 1 week
- Health records: 1 week  
- Prescriptions: 24 hours
- AI rules: 30 days
- Doctors list: 24 hours
- Medicines: 3 days

## 🔄 Sync Mechanism

### How it Works
1. **Offline**: Changes saved locally in sync_queue
2. **Online**: Automatically syncs with `/api/sync/data`
3. **Pull**: Fetch fresh data with `/api/sync/pull`
4. **Status**: Check with `/api/sync/status`

### Example Sync Flow
```python
# Client-side (local storage)
manager = OfflineDataManager(user_id)
manager.cache_health_records(data)  # Cached offline

# Later when online
sync = SyncManager(base_url, user_id, token)
result = sync.sync_all()  # Syncs to server
```

## 📊 Sample Data Sizes

- User profile: ~500 bytes
- Health record: ~1KB
- Consultation: ~2KB  
- Complete medicine DB: ~100KB
- AI rules: ~5KB

**Total cached per user: ~200KB maximum**

## 🛡️ Security

- JWT authentication
- Password hashing with bcrypt
- CORS protection
- User data isolation
- Local cache encryption recommended

## 📱 Mobile Compatibility

Works on:
- Android (via WebView or PWA)
- iOS (via WebView or PWA)
- Low-bandwidth networks (2G/3G)
- Offline HTML5 client included

## 🔧 Configuration

Key settings in `.env`:

```env
# Database
DATABASE_URL=sqlite:///telehealth.db

# Cache
OFFLINE_CACHE_DIR=~/.telehealth_cache
MAX_SYNC_RETRY=3
SYNC_BATCH_SIZE=50

# Server
FLASK_ENV=production
SECRET_KEY=your-secure-key
JWT_SECRET_KEY=your-jwt-key
```

## 📈 Performance Tips

1. **Minimize API calls** - Use offline data when available
2. **Batch sync** - Sync multiple changes at once
3. **Clean cache** - Regularly clear expired entries
4. **Use SQLite** - Lower overhead than PostgreSQL for small deployments

## 🐛 Troubleshooting

### App won't start
```bash
# Check Python version
python --version  # Needs 3.9+

# Verify dependencies
pip install -r requirements.txt

# Initialize DB
flask db upgrade
```

### Sync not working
- Check internet connection
- Verify API endpoint is accessible
- Check logs: `flask --app run.py shell`

### Cache issues
- Clear cache: `rm -rf ~/.telehealth_cache/`
- Or via API: `POST /api/sync/clear` (authenticated)

## 📚 API Examples

### Check Symptoms
```bash
curl -X POST http://localhost:5000/api/ai/symptoms/enhanced \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["fever", "cough"]}'
```

### Search Medicine
```bash
curl http://localhost:5000/api/medicine/search?query=paracetamol
```

### Sync Changes
```bash
curl -X POST http://localhost:5000/api/sync/data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "consultations": [{...}],
    "health_records": [{...}]
  }'
```

## 🌍 Deployment on Low-Resource Server

### Minimal VPS (1GB RAM, 1 CPU)
```bash
# Install minimal packages
apt-get update && apt-get install -y python3 python3-pip sqlite3

# Deploy
cd /opt/telehealth
git clone ...
pip install -r requirements.txt
gunicorn --worker-class=eventlet -w 1 --bind 0.0.0.0:5000 run:app
```

### Using Docker (Recommended)
```bash
docker-compose up -d
# Automatically handles dependencies and scaling
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check logs: `docker logs telehealth-app`

## 📄 License

MIT License - See LICENSE file

---

**Designed for healthcare access in offline and low-bandwidth environments.**
