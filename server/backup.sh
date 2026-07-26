#!/bin/bash
# Daily backup of the jyut-sync sqlite volume (users' only cross-device backup).
set -e
DEST=/home/nik/backups/jyut
STAMP=$(date +%Y%m%d)
docker run --rm -v homelab_jyut-sync-data:/data -v "$DEST":/backup alpine:latest \
  sh -c "cp /data/jyut.db /backup/jyut-$STAMP.db 2>/dev/null && cp /data/jyut.db-wal /backup/jyut-$STAMP.db-wal 2>/dev/null || true"
# keep 14 days
find "$DEST" -name 'jyut-*.db*' -mtime +14 -delete 2>/dev/null || true
