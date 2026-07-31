#!/bin/bash
# Daily backup of the jyut-sync sqlite volume (the learners' only cross-device copy).
#
#   backup.sh            take a snapshot, verify it, prune old ones
#   backup.sh --verify   integrity-check the newest existing snapshot and exit
#
# Uses VACUUM INTO rather than cp: it writes a consistent snapshot that already
# folds in the WAL, so a backup taken while the server is writing is still valid.
set -euo pipefail

DEST=${DEST:-/home/nik/backups/jyut}
VOLUME=${VOLUME:-homelab_jyut-sync-data}
IMAGE=${IMAGE:-node:24-alpine}
RETENTION_DAYS=${RETENTION_DAYS:-14}
STAMP=$(date +%Y%m%d)

mkdir -p "$DEST"

verify_script='
const { DatabaseSync } = require("node:sqlite");
const file = process.argv[1];
const db = new DatabaseSync(file, { readOnly: true });
const row = db.prepare("PRAGMA integrity_check").get();
const result = row.integrity_check ?? Object.values(row)[0];
if (result !== "ok") { console.error("integrity_check:", result); process.exit(1); }
const { n } = db.prepare("SELECT COUNT(*) n FROM sync").get();
db.close();
console.log(`verified ${file}: ok, ${n} sync accounts`);
'

if [[ ${1:-} == "--verify" ]]; then
  newest=$(ls -1t "$DEST"/jyut-*.db 2>/dev/null | head -1 || true)
  if [[ -z "$newest" ]]; then
    echo "no backups found in $DEST" >&2
    exit 1
  fi
  docker run --rm -v "$DEST":/backup "$IMAGE" \
    node -e "$verify_script" "/backup/$(basename "$newest")"
  exit 0
fi

snapshot_script='
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("/data/jyut.db", { readOnly: true });
db.prepare("VACUUM INTO ?").run(process.argv[1]);
db.close();
'

rm -f "$DEST/jyut-$STAMP.db"
docker run --rm -v "$VOLUME":/data:ro -v "$DEST":/backup "$IMAGE" \
  node -e "$snapshot_script" "/backup/jyut-$STAMP.db"

# A backup nobody checked is a backup nobody has.
docker run --rm -v "$DEST":/backup "$IMAGE" \
  node -e "$verify_script" "/backup/jyut-$STAMP.db"

sha256sum "$DEST/jyut-$STAMP.db" > "$DEST/jyut-$STAMP.db.sha256"

# Retention: drop snapshots and their checksums past the window.
find "$DEST" -name 'jyut-*.db' -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
find "$DEST" -name 'jyut-*.db.sha256' -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
# Legacy raw WAL copies from the previous cp-based script.
find "$DEST" -name 'jyut-*.db-wal' -delete 2>/dev/null || true

echo "backup ok: $DEST/jyut-$STAMP.db ($(du -h "$DEST/jyut-$STAMP.db" | cut -f1))"
