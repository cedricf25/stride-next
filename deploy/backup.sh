#!/bin/bash
# ============================================
# Script de backup Stride Dashboard
# ============================================

set -e

BACKUP_DIR="/opt/stride/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="stride_backup_${DATE}.sql.gz"

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Backup de la base de données..."

# Load env
source /opt/stride/.env.production

# Dump and compress
docker compose exec -T db mysqldump -ustride -p"$DB_PASSWORD" stride | gzip > "$BACKUP_DIR/$BACKUP_FILE"

echo -e "${GREEN}[✓]${NC} Backup créé : $BACKUP_DIR/$BACKUP_FILE"

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t stride_backup_*.sql.gz | tail -n +8 | xargs -r rm --

echo "Backups conservés :"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  Aucun backup"

# ============================================
# Pour automatiser avec cron (quotidien à 3h) :
# crontab -e
# 0 3 * * * /opt/stride/deploy/backup.sh >> /var/log/stride-backup.log 2>&1
# ============================================
