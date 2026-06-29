#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# ClipOps — Backup diario de la base de datos (PostgreSQL)
#
# Hace un pg_dump DENTRO del contenedor de la DB y guarda un archivo
# comprimido .sql.gz con la fecha en el host. Conserva los últimos
# KEEP_DAYS días y borra los más viejos. Pensado para correr por cron.
#
# Uso manual:   bash scripts/backup-db.sh
# Por cron:     30 3 * * *  cd ~/ClipOps && bash scripts/backup-db.sh >> ~/clipops-backups/backup.log 2>&1
# ─────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${CLIPOPS_BACKUP_DIR:-$HOME/clipops-backups}"
KEEP_DAYS=14
DB_CONTAINER="clipops-db"

# Lee solo las 2 variables que necesita del .env (sin exponer secretos).
get_env() { grep -E "^$1=" "$APP_DIR/.env" 2>/dev/null | head -n1 | cut -d= -f2-; }
PGUSER="$(get_env POSTGRES_USER)"; PGUSER="${PGUSER:-clipops}"
PGDB="$(get_env POSTGRES_DB)"; PGDB="${PGDB:-clipops}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT="$BACKUP_DIR/clipops_${STAMP}.sql.gz"

echo "[$(date '+%F %T')] Respaldando base '$PGDB' -> $OUT"

# --clean --if-exists: el dump incluye los DROP, así el restore es idempotente.
docker exec "$DB_CONTAINER" pg_dump -U "$PGUSER" -d "$PGDB" --clean --if-exists \
  | gzip -c > "$OUT"

# Salvaguarda: si el respaldo quedó vacío (DB caída, etc.), lo borra y falla.
if [ ! -s "$OUT" ]; then
  echo "[$(date '+%F %T')] ERROR: respaldo vacío, eliminado." >&2
  rm -f "$OUT"
  exit 1
fi

# Limpia respaldos más viejos que KEEP_DAYS.
find "$BACKUP_DIR" -name 'clipops_*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "[$(date '+%F %T')] OK ($(du -h "$OUT" | cut -f1)) · total: $(ls -1 "$BACKUP_DIR"/clipops_*.sql.gz | wc -l) respaldos"
