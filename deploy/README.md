# Déploiement Stride Dashboard sur VPS OVH

## Prérequis

- VPS OVH avec Ubuntu 24.04
- Accès SSH (utilisateur `ubuntu`)
- (Optionnel) Un nom de domaine pointant vers l'IP du VPS

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  VPS Ubuntu 24.04 (51.83.41.100)                    │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Docker Compose                               │  │
│  │                                               │  │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────────┐  │  │
│  │  │  Caddy  │──▶│ Next.js │──▶│  MariaDB    │  │  │
│  │  │  :80    │   │  :3000  │   │   :3306     │  │  │
│  │  │  :443   │   │         │   │             │  │  │
│  │  └─────────┘   └─────────┘   └─────────────┘  │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Volumes persistants :                              │
│  - mariadb_data (données BDD)                       │
│  - caddy_data (certificats SSL)                     │
└─────────────────────────────────────────────────────┘
```

## Étapes de déploiement

### 1. Connexion au serveur

```bash
ssh ubuntu@51.83.41.100
```

### 2. Installation du serveur

```bash
# Télécharger et exécuter le script d'installation
curl -sSL https://raw.githubusercontent.com/VOTRE_REPO/stride-next/main/deploy/setup-server.sh | bash

# Ou manuellement :
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh
```

Le script installe :
- Docker + Docker Compose
- Firewall (ufw) avec ports 22, 80, 443
- 2GB de swap
- Outils (htop, vim, git)

**Important** : Déconnectez-vous et reconnectez-vous après l'installation pour activer Docker sans sudo.

### 3. Copier le projet sur le serveur

**Option A : Git clone (recommandé)**
```bash
cd /opt/stride
git clone https://github.com/VOTRE_REPO/stride-next.git .
```

**Option B : SCP depuis votre machine locale**
```bash
# Depuis votre machine locale
scp -r . ubuntu@51.83.41.100:/opt/stride/
```

**Option C : rsync (meilleur pour les mises à jour)**
```bash
# Depuis votre machine locale
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  . ubuntu@51.83.41.100:/opt/stride/
```

### 4. Configuration

```bash
cd /opt/stride

# Copier le template de configuration
cp .env.production.example .env.production

# Éditer avec vos valeurs
nano .env.production
```

Variables à configurer :
- `DB_PASSWORD` : Mot de passe MariaDB
- `DB_ROOT_PASSWORD` : Mot de passe root MariaDB
- `GARMIN_USERNAME` / `GARMIN_PASSWORD` : Identifiants Garmin Connect
- `GEMINI_API_KEY` : Clé API Google Gemini
- `BETTER_AUTH_SECRET` : Générer avec `openssl rand -base64 32`
- `BETTER_AUTH_URL` : URL de votre application

### 5. Déploiement

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Le script :
1. Vérifie la configuration
2. Build l'image Docker Next.js
3. Démarre tous les services
4. Applique les migrations Prisma
5. Vérifie que l'application répond

### 6. Configuration HTTPS (avec domaine)

Si vous avez un nom de domaine :

1. Pointez votre domaine vers l'IP du VPS (enregistrement A DNS)

2. Modifiez le Caddyfile :
```bash
nano Caddyfile
```

Remplacez :
```
:80 {
    reverse_proxy app:3000
    encode gzip
}
```

Par :
```
stride.votre-domaine.com {
    reverse_proxy app:3000
    encode gzip
}
```

3. Redémarrez Caddy :
```bash
docker compose restart caddy
```

Caddy obtiendra automatiquement un certificat Let's Encrypt.

## Commandes utiles

```bash
# Voir tous les logs
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f app
docker compose logs -f db
docker compose logs -f caddy

# Redémarrer un service
docker compose restart app

# Arrêter tous les services
docker compose down

# Redémarrer tous les services
docker compose restart

# Voir l'état des services
docker compose ps

# Accéder au shell de l'app
docker compose exec app sh

# Accéder à la BDD
docker compose exec db mariadb -ustride -p stride

# Backup de la base de données
docker compose exec db mysqldump -ustride -p stride > backup.sql

# Restaurer un backup
docker compose exec -T db mariadb -ustride -p stride < backup.sql
```

## Mise à jour de l'application

```bash
cd /opt/stride

# Récupérer les changements
git pull

# Rebuild et redéployer
./deploy/deploy.sh
```

## Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker compose logs app

# Vérifier si la BDD est prête
docker compose logs db

# Vérifier les variables d'environnement
docker compose exec app env | grep -E "DATABASE|GARMIN|GEMINI"
```

### Erreur de connexion à la BDD

```bash
# Vérifier que MariaDB est healthy
docker compose ps

# Tester la connexion
docker compose exec db mariadb -ustride -p -e "SHOW DATABASES;"

# Si la BDD est corrompue, réinitialiser (ATTENTION: perte de données)
docker compose down -v
./deploy/deploy.sh
```

### Problème de certificat SSL

```bash
# Vérifier les logs Caddy
docker compose logs caddy

# Forcer le renouvellement
docker compose restart caddy
```

### Mémoire insuffisante

```bash
# Vérifier l'utilisation mémoire
free -h

# Augmenter le swap si nécessaire
sudo fallocate -l 4G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
```

## Sécurité

1. **Changez les mots de passe par défaut** dans `.env.production`
2. **N'exposez jamais** le port 3306 (MariaDB) publiquement
3. **Gardez le système à jour** : `sudo apt update && sudo apt upgrade`
4. **Configurez fail2ban** pour bloquer les tentatives de brute-force SSH :
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```
