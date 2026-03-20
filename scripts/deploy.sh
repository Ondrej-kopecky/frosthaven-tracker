#!/bin/bash
set -e

SERVER="server"
REMOTE_BASE="/home/ongy/Projekty/Server"
REMOTE_DIST="$REMOTE_BASE/frosthaven"
REMOTE_API="$REMOTE_BASE/fh-api"

echo "=== Frosthaven Tracker Deploy ==="

# Build frontend
echo "[1/4] Building frontend..."
npm run build

if [ ! -d "dist" ]; then
  echo "Build failed - dist not found"
  exit 1
fi

# Upload frontend
echo "[2/4] Uploading frontend..."
ssh $SERVER "mkdir -p $REMOTE_DIST"
rsync -avz --delete dist/ $SERVER:$REMOTE_DIST/

# Upload backend
echo "[3/4] Uploading backend..."
ssh $SERVER "mkdir -p $REMOTE_API/data"
rsync -avz --exclude '__pycache__' --exclude 'data/' --exclude '.env' fh-api/ $SERVER:$REMOTE_API/

# Restart services
echo "[4/4] Restarting services..."
ssh $SERVER "cd $REMOTE_BASE && docker compose up -d --build fh-api 2>/dev/null || echo 'Docker restart skipped (configure docker-compose first)'"

echo ""
echo "Deploy complete!"
echo "https://frosthaven.ongy.cz"
