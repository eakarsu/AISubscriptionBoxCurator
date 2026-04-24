#!/bin/bash

# ============================================
# AI Subscription Box Curator - Start Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${PURPLE}============================================${NC}"
echo -e "${PURPLE}  AI Subscription Box Curator${NC}"
echo -e "${PURPLE}============================================${NC}"
echo ""

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
    echo -e "${GREEN}✓ Loaded .env file${NC}"
else
    echo -e "${RED}✗ .env file not found! Please create one.${NC}"
    exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# ============================================
# Clean up used ports
# ============================================
echo -e "\n${YELLOW}Cleaning up ports...${NC}"

cleanup_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}  Killing processes on port $port: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    else
        echo -e "${GREEN}  Port $port is free${NC}"
    fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT

# ============================================
# Check PostgreSQL
# ============================================
echo -e "\n${YELLOW}Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
    if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${RED}✗ PostgreSQL is not running. Please start it first.${NC}"
        echo -e "${YELLOW}  Try: brew services start postgresql${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ============================================
# Create database if not exists
# ============================================
echo -e "\n${YELLOW}Setting up database...${NC}"

DB_NAME=${DB_NAME:-ai_sub_box_curator}
DB_USER=${DB_USER:-postgres}

if psql -U "$DB_USER" -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}✓ Database '$DB_NAME' exists${NC}"
else
    echo -e "${YELLOW}  Creating database '$DB_NAME'...${NC}"
    createdb -U "$DB_USER" -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} "$DB_NAME" 2>/dev/null || {
        echo -e "${YELLOW}  Trying with default user...${NC}"
        createdb "$DB_NAME" 2>/dev/null || {
            echo -e "${RED}✗ Could not create database. Please create it manually:${NC}"
            echo -e "${CYAN}  createdb $DB_NAME${NC}"
            exit 1
        }
    }
    echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"
fi

# ============================================
# Install dependencies
# ============================================
echo -e "\n${YELLOW}Installing dependencies...${NC}"

cd "$PROJECT_DIR/backend"
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}  Installing backend dependencies...${NC}"
    npm install --silent 2>&1 | tail -1
else
    echo -e "${GREEN}  Backend dependencies already installed${NC}"
fi

cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}  Installing frontend dependencies...${NC}"
    npm install --silent 2>&1 | tail -1
else
    echo -e "${GREEN}  Frontend dependencies already installed${NC}"
fi

# ============================================
# Seed database
# ============================================
echo -e "\n${YELLOW}Seeding database...${NC}"
cd "$PROJECT_DIR/backend"
node src/seed.js
echo -e "${GREEN}✓ Database seeded successfully${NC}"

# ============================================
# Start services with hot reload
# ============================================
echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}  Starting services...${NC}"
echo -e "${BLUE}============================================${NC}"

# Cleanup function for graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    cleanup_port $BACKEND_PORT
    cleanup_port $FRONTEND_PORT
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend with nodemon (hot reload)
echo -e "${CYAN}  Starting backend on port $BACKEND_PORT (with hot reload)...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon src/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# Start frontend with Vite (hot reload built-in)
echo -e "${CYAN}  Starting frontend on port $FRONTEND_PORT (with hot reload)...${NC}"
cd "$PROJECT_DIR/frontend"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!

sleep 2

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}  🚀 Application is running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e ""
echo -e "  ${CYAN}Frontend:${NC}  http://localhost:$FRONTEND_PORT"
echo -e "  ${CYAN}Backend:${NC}   http://localhost:$BACKEND_PORT"
echo -e "  ${CYAN}API:${NC}       http://localhost:$BACKEND_PORT/api"
echo -e ""
echo -e "  ${YELLOW}Login:${NC}     admin@example.com / password123"
echo -e ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e ""

# Wait for child processes
wait
