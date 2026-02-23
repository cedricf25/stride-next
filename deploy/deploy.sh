#!/bin/bash
# ============================================
# Script de déploiement Stride Dashboard
# ============================================

set -e  # Exit on error

echo "======================================"
echo "  Stride Dashboard - Déploiement"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ============================================
# Pre-flight checks
# ============================================
echo ""
echo "Vérifications préalables..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error "Fichier .env.production manquant !"
    echo "Créez-le à partir du template :"
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production"
    exit 1
fi

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker n'est pas démarré ou vous n'avez pas les permissions"
    echo "Essayez : sudo systemctl start docker"
    echo "Ou reconnectez-vous après avoir été ajouté au groupe docker"
    exit 1
fi

print_status "Vérifications OK"

# ============================================
# Load environment variables
# ============================================
source .env.production
export DB_PASSWORD
export DB_ROOT_PASSWORD

# ============================================
# Build and deploy
# ============================================
echo ""
echo "Construction et déploiement..."

# Pull latest images
echo "→ Téléchargement des images..."
docker compose pull caddy db

# Build app
echo "→ Construction de l'application..."
docker compose build --no-cache app

# Stop existing containers
echo "→ Arrêt des anciens conteneurs..."
docker compose down --remove-orphans || true

# Start services
echo "→ Démarrage des services..."
docker compose up -d

print_status "Services démarrés"

# ============================================
# Wait for database
# ============================================
echo ""
echo "Attente de la base de données..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T db mariadb -ustride -p"$DB_PASSWORD" -e "SELECT 1" stride > /dev/null 2>&1; then
        print_status "Base de données prête"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Tentative $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "La base de données n'a pas démarré à temps"
    docker compose logs db
    exit 1
fi

# ============================================
# Run migrations
# ============================================
echo ""
echo "Application des migrations Prisma..."

docker compose exec -T app npx prisma db push --skip-generate

print_status "Migrations appliquées"

# ============================================
# Health check
# ============================================
echo ""
echo "Vérification de l'application..."

sleep 5

if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|302"; then
    print_status "Application accessible"
else
    print_warning "L'application ne répond pas encore (peut prendre quelques secondes)"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "======================================"
echo -e "${GREEN}  Déploiement terminé !${NC}"
echo "======================================"
echo ""
echo "Services :"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Commandes utiles :"
echo "  Voir les logs       : docker compose logs -f"
echo "  Logs app seulement  : docker compose logs -f app"
echo "  Redémarrer          : docker compose restart"
echo "  Arrêter             : docker compose down"
echo "  Status              : docker compose ps"
echo ""
echo "Accès :"
echo "  http://$(curl -s ifconfig.me 2>/dev/null || echo 'VOTRE_IP')"
echo ""
