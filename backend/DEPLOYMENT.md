# 🚀 TeleHealth Deployment Guide

## Quick Start Comparison

| Method | Setup Time | Effort | Best For |
|--------|-----------|--------|----------|
| Local Development | 2 min | Low | Testing, Development |
| Docker Compose | 3 min | Very Low | Small deployments |
| Minimal Server | 10 min | Low | Production, Rural areas |
| Multi-server | 30 min | Medium | High traffic, Scaling |

---

## 🏃 Method 1: Quick Local Development (2 minutes)

```bash
# Clone repo
cd backend

# Setup
python setup.py

# Or manual steps:
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
flask db upgrade

# Run
python run.py
```

**Access**: http://localhost:5000/offline_client.html

---

## 🐳 Method 2: Docker Compose (3 minutes)

### Requirements
- Docker Engine
- Docker Compose

### Setup

```bash
# Start everything
docker-compose up --build

# First time only - initialize DB
docker exec telehealth-app flask db upgrade
```

**Services Running**:
- API: http://localhost:5000
- PostgreSQL: localhost:5432
- Client: http://localhost:5000/offline_client.html

### Stop
```bash
docker-compose down
```

### Useful Commands
```bash
# View logs
docker-compose logs -f web

# Reset database
docker-compose down -v
docker-compose up --build

# Scale workers (not recommended for single-core)
docker-compose up --build --scale worker=2
```

---

## 💾 Method 3: Minimal Virtual Server (10 minutes)

### System Requirements
- OS: Ubuntu 20.04+ / Debian 11+
- CPU: 1 core (2+ recommended)
- RAM: 1GB (512MB minimum)
- Storage: 5GB

### Setup Steps

**Step 1: Install System Dependencies**
```bash
sudo apt-get update
sudo apt-get install -y \
    python3.11 python3-pip python3-venv \
    postgresql postgresql-contrib \
    nginx \
    git \
    curl
```

**Step 2: Create App User**
```bash
sudo useradd -m -s /bin/bash telehealth
sudo su - telehealth
```

**Step 3: Setup Application**
```bash
# Clone repository
git clone <repo-url> telehealth
cd telehealth/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
nano .env  # Edit SECRET_KEY and DATABASE_URL
```

**Step 4: Configure PostgreSQL**
```bash
# As root
sudo -u postgres psql

# In PostgreSQL:
CREATE DATABASE telehealth;
CREATE USER telehealth_user WITH PASSWORD 'secure_password';
ALTER ROLE telehealth_user SET client_encoding TO 'utf8';
ALTER ROLE telehealth_user SET default_transaction_isolation TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE telehealth TO telehealth_user;
\q
```

**Step 5: Initialize Database**
```bash
# As telehealth user
flask db upgrade
```

**Step 6: Setup Systemd Service**
```bash
# As root
sudo nano /etc/systemd/system/telehealth.service
```

Paste:
```ini
[Unit]
Description=TeleHealth API Service
After=network.target postgresql.service

[Service]
Type=notify
User=telehealth
WorkingDirectory=/home/telehealth/telehealth/backend
Environment="PATH=/home/telehealth/telehealth/backend/venv/bin"
ExecStart=/home/telehealth/telehealth/backend/venv/bin/gunicorn \
    --worker-class=eventlet \
    --workers=1 \
    --bind=127.0.0.1:5000 \
    --timeout=120 \
    --access-logfile - \
    --error-logfile - \
    run:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Step 7: Enable Service**
```bash
sudo systemctl daemon-reload
sudo systemctl enable telehealth
sudo systemctl start telehealth
sudo systemctl status telehealth
```

**Step 8: Setup Nginx Reverse Proxy**
```bash
sudo nano /etc/nginx/sites-available/telehealth
```

Paste:
```nginx
server {
    listen 80;
    server_name _;

    # For HTTPS (recommended)
    # listen 443 ssl;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Serve offline client
    location ~* \.(html|js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;
    gzip_proxied any;
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/telehealth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 9: Verify Setup**
```bash
# Check API
curl http://localhost/api/health

# Check logs
sudo journalctl -u telehealth -f
```

### Access Application
- API: http://your-server-ip/api
- Client: http://your-server-ip

---

## 📊 Performance Tuning

### For Low-Spec Servers (1GB RAM)

**python.py**:
```python
# Reduce workers
app = create_app()
app.config['DATABASE_ECHO'] = False

# Limit concurrent connections
# In nginx:
# worker_connections 100;
# keepalive_timeout 30s;
```

**Nginx config**:
```nginx
worker_processes 1;  # Match CPU cores
worker_connections 64;

proxy_buffering off;
client_body_buffer_size 1M;
client_max_body_size 10M;
```

**Database**:
```sql
-- PostgreSQL tuning for 1GB RAM
ALTER SYSTEM SET shared_buffers = '128MB';
ALTER SYSTEM SET effective_cache_size = '512MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Reload
SELECT pg_reload_conf();
```

---

## 🔒 Security Checklist

- [ ] Change `SECRET_KEY` in .env
- [ ] Change `JWT_SECRET_KEY` in .env
- [ ] Change database password
- [ ] Enable HTTPS/SSL
- [ ] Setup firewall (ufw/iptables)
- [ ] Regular backups
- [ ] Monitor logs
- [ ] Update packages regularly

```bash
# Firewall setup
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 🔄 Backup & Restore

### Daily Backup
```bash
#!/bin/bash
# /home/telehealth/backup.sh

BACKUP_DIR="/home/telehealth/backups"
DATE=$(date +\%Y-\%m-\%d)

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U telehealth_user telehealth | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Cache backup
tar -czf $BACKUP_DIR/cache_$DATE.tar.gz ~/.telehealth_cache/

# Keep 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Cron Job
```bash
# Add to telehealth crontab (crontab -e)
0 2 * * * /home/telehealth/backup.sh >> /home/telehealth/backup.log 2>&1
```

---

## 🚀 Production Deployment Checklist

```
[ ] Server provisioned
[ ] SSH key authentication
[ ] Firewall rules enabled
[ ] Database backup scheduled
[ ] SSL certificate installed
[ ] Environment variables set
[ ] Database migrations run
[ ] Cache directory created
[ ] Service systemd configured
[ ] Nginx reverse proxy setup
[ ] Log rotation configured
[ ] Monitoring setup (optional)
[ ] Tested API endpoints
[ ] Tested offline client
[ ] Smoke tested sync
```

---

## 📈 Monitoring & Logs

### View Logs
```bash
# Service logs
sudo journalctl -u telehealth -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
tail -f /home/telehealth/telehealth/backend/app.log
```

### Health Check
```bash
# API status
curl http://localhost/api/health

# Detailed status
curl http://localhost/api/status

# Database connectivity
curl http://localhost/api/db-status
```

---

## 🔄 Updating Application

```bash
# Pull latest
cd /home/telehealth/telehealth
git pull

# Install new dependencies
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Run migrations
cd backend
flask db upgrade

# Restart service
sudo systemctl restart telehealth
```

---

## Troubleshooting

### Service won't start
```bash
sudo journalctl -u telehealth -n 50
```

### Database connection error
```bash
# Test connection
psql -U telehealth_user -d telehealth -h localhost
```

### Port already in use
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
```

### Out of disk space
```bash
# Find large files
du -sh /* | sort -rh | head

# Clear cache
rm -rf ~/.telehealth_cache/*
```

---

## Next Steps

1. ✅ Deploy application
2. ✅ Test API endpoints
3. ✅ Create admin user
4. ✅ Setup monitoring
5. ✅ Configure backups
6. ✅ Announce to users
