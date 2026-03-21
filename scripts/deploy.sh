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

# Upload frontend (clean old files first to avoid stale cache)
echo "[2/4] Uploading frontend..."
ssh $SERVER "rm -rf $REMOTE_DIST/* && mkdir -p $REMOTE_DIST"
scp -r dist/* $SERVER:$REMOTE_DIST/

# Upload backend
echo "[3/4] Uploading backend..."
ssh $SERVER "mkdir -p $REMOTE_API/data"
scp -r fh-api/*.py fh-api/requirements.txt $SERVER:$REMOTE_API/ 2>/dev/null || true

# Restart services
echo "[4/4] Restarting services..."
ssh $SERVER "cd $REMOTE_BASE && docker compose restart frosthaven fh-api 2>/dev/null || docker restart frosthaven fh-api 2>/dev/null || echo 'Docker restart skipped'"

echo ""
echo "Deploy complete!"
echo "https://frosthaven.ongy.cz"
