#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# ClipOps — Restaurar un respaldo de la base de datos
#
# Uso:
#   bash scripts/restore-db.sh <archivo.sql.gz>                 # restaura a PRODUCCIÓN (sobrescribe)
#   bash scripts/restore-db.sh <archivo.sql.gz> <db_destino>    # restaura a otra DB (prueba segura)
#
# La forma con <db_destino> distinta crea una base temporal y restaura ahí,
# sin tocar producción → ideal para PROBAR que un respaldo sirve.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_CONTAINER="clipops-db"

get_env() { grep -E "^$1=" "$APP_DIR/.env" 2>/dev/null | head -n1 | cut -d= -f2-; }
PGUSER="$(get_env POSTGRES_USER)"; PGUSER="${PGUSER:-clipops}"
PGDB="$(get_env POSTGRES_DB)"; PGDB="${PGDB:-clipops}"

FILE="${1:?USO: bash scripts/restore-db.sh <archivo.sql.gz> [db_destino]}"
TARGET_DB="${2:-$PGDB}"

[ -f "$FILE" ] || { echo "No existe el archivo: $FILE" >&2; exit 1; }

if [ "$TARGET_DB" = "$PGDB" ]; then
  echo "⚠️  Vas a restaurar sobre PRODUCCIÓN ('$PGDB'). Ctrl+C para cancelar."
  echo "    Continúo en 5 s..."
  sleep 5
else
  echo "Creando base de prueba '$TARGET_DB' (no toca producción)..."
  docker exec "$DB_CONTAINER" psql -U "$PGUSER" -d postgres \
    -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";" \
    -c "CREATE DATABASE \"$TARGET_DB\";"
fi

echo "Restaurando $FILE -> '$TARGET_DB'..."
gunzip -c "$FILE" | docker exec -i "$DB_CONTAINER" psql -U "$PGUSER" -d "$TARGET_DB" -q

echo "✅ Restauración completada en '$TARGET_DB'."
