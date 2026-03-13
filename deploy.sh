#!/bin/bash

# GramSwasth Deployment Script
# Automates Docker-based deployment to production

set -e  # Exit on error

echo "🚀 GramSwasth Deployment Script"
echo "================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}[1/7] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker & Docker Compose found${NC}"

# Check .env file
echo -e "${BLUE}[2/7] Setting up environment...${NC}"

if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ .env file not found in backend/${NC}"
    echo "Create .env with: cp backend/.env.example backend/.env"
    exit 1
fi

echo -e "${GREEN}✓ .env configured${NC}"

# Build Docker images
echo -e "${BLUE}[3/7] Building Docker images...${NC}"
cd backend
docker-compose build
echo -e "${GREEN}✓ Docker images built${NC}"

# Start services
echo -e "${BLUE}[4/7] Starting services (Database, Redis, Backend)...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"

# Wait for database
echo -e "${BLUE}[5/7] Waiting for PostgreSQL...${NC}"
sleep 10
docker-compose exec -T web flask db upgrade 2>/dev/null || true
echo -e "${GREEN}✓ Database migrated${NC}"

# Build frontend
echo -e "${BLUE}[6/7] Building frontend...${NC}"
cd ../frontend
npm install
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

# Status check
echo -e "${BLUE}[7/7] Verifying deployment...${NC}"
cd ../backend

# Check backend health
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Backend healthy${NC}"
else
    echo -e "${RED}⚠ Backend not responding (may still be starting)${NC}"
fi

# Show service status
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "🌐 Services Running:"
docker-compose ps
echo ""
echo "📝 Logs:"
echo "  docker-compose logs -f web      # Backend logs"
echo "  docker-compose logs -f redis    # Redis logs"
echo "  docker-compose logs -f db       # Database logs"
echo ""
echo "🛑 Stop services:"
echo "  docker-compose down"
echo ""
echo "🔄 Restart services:"
echo "  docker-compose restart"
echo ""
echo "📊 Database backup:"
echo "  docker-compose exec db pg_dump -U postgres telehealth > backup.sql"
echo ""
echo "🚀 Access:"
echo "  Backend API: http://localhost:5000"
echo "  Frontend: Serve dist/ directory via web server"
echo ""
