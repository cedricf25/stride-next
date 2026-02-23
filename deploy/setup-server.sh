#!/bin/bash
# ============================================
# Script d'installation du serveur VPS OVH
# Ubuntu 24.04
# ============================================

set -e  # Exit on error

echo "======================================"
echo "  Stride Dashboard - Setup VPS"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
# 1. Update system
# ============================================
echo ""
echo "1. Mise à jour du système..."
sudo apt update && sudo apt upgrade -y
print_status "Système mis à jour"

# ============================================
# 2. Install Docker
# ============================================
echo ""
echo "2. Installation de Docker..."

# Remove old versions
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

print_status "Docker installé"

# ============================================
# 3. Configure firewall
# ============================================
echo ""
echo "3. Configuration du firewall..."

sudo apt install -y ufw

# Allow SSH (important: do this first!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

print_status "Firewall configuré (SSH, HTTP, HTTPS)"

# ============================================
# 4. Create app directory
# ============================================
echo ""
echo "4. Création du répertoire application..."

APP_DIR="/opt/stride"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

print_status "Répertoire $APP_DIR créé"

# ============================================
# 5. Install useful tools
# ============================================
echo ""
echo "5. Installation d'outils utiles..."

sudo apt install -y htop vim git

print_status "Outils installés (htop, vim, git)"

# ============================================
# 6. Configure swap (for small VPS)
# ============================================
echo ""
echo "6. Configuration du swap..."

if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_status "Swap de 2GB configuré"
else
    print_warning "Swap déjà configuré"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "======================================"
echo -e "${GREEN}  Installation terminée !${NC}"
echo "======================================"
echo ""
echo "Prochaines étapes :"
echo "  1. Déconnectez-vous et reconnectez-vous pour activer Docker sans sudo"
echo "     $ exit && ssh ubuntu@votre-vps"
echo ""
echo "  2. Clonez votre projet ou copiez les fichiers dans /opt/stride"
echo "     $ cd /opt/stride"
echo ""
echo "  3. Créez le fichier .env.production avec vos variables"
echo "     $ cp .env.production.example .env.production"
echo "     $ nano .env.production"
echo ""
echo "  4. Lancez le déploiement"
echo "     $ ./deploy/deploy.sh"
echo ""
