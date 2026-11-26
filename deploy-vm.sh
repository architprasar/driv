#!/usr/bin/env bash
set -euo pipefail

# OUTDATED: this script starts daphne (no longer installed), sets no secret key,
# uses SQLite, runs no lifecycle worker and skips the launch check.
# Use the Docker Compose deployment instead: deployment/DEPLOY.md
if [[ "${DRIVIO_ALLOW_LEGACY_DEPLOY:-}" != "1" ]]; then
  echo "[deploy][error] deploy-vm.sh is outdated and unsafe. Follow deployment/DEPLOY.md instead." >&2
  exit 1
fi

log() { echo "[deploy] $*"; }
fail() { echo "[deploy][error] $*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

# ── Mode selection ────────────────────────────────────────────────────────────
MODE="${1:-}"
if [[ "${MODE}" != "dev" && "${MODE}" != "prod" ]]; then
  echo "Usage: bash deploy-vm.sh [dev|prod]"
  echo "  dev   — uses the VM's public IP, HTTP only"
  echo "  prod  — uses driviocars.com, HTTPS-ready (run certbot separately)"
  exit 1
fi

if [[ "${EUID}" -eq 0 ]]; then
  fail "Run this script as a non-root user with sudo access."
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_USER="$(whoami)"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

if [[ "${MODE}" == "prod" ]]; then
  PUBLIC_HOST="driviocars.com"
  ALLOWED_HOSTS="localhost,127.0.0.1,driviocars.com,www.driviocars.com"
  CORS_ALLOWED_ORIGINS="https://driviocars.com,https://www.driviocars.com"
  NEXT_PUBLIC_API_URL="https://driviocars.com/api"
  NGINX_SERVER_NAME="driviocars.com www.driviocars.com"
else
  PUBLIC_HOST="${PUBLIC_HOST:-$(curl -sf --max-time 5 ifconfig.me || hostname -I 2>/dev/null | awk '{print $1}')}"
  PUBLIC_HOST="${PUBLIC_HOST// /}"
  [[ -n "${PUBLIC_HOST}" ]] || fail "Could not determine PUBLIC_HOST. Set it explicitly: PUBLIC_HOST=1.2.3.4 bash deploy-vm.sh dev"
  ALLOWED_HOSTS="localhost,127.0.0.1,${PUBLIC_HOST}"
  CORS_ALLOWED_ORIGINS="http://${PUBLIC_HOST},http://localhost:${FRONTEND_PORT}"
  NEXT_PUBLIC_API_URL="http://${PUBLIC_HOST}/api"
  NGINX_SERVER_NAME="${PUBLIC_HOST}"
fi

API_SERVER_URL="http://127.0.0.1:${BACKEND_PORT}/api"

log "Mode: ${MODE}"
log "Public host: ${PUBLIC_HOST}"
log "Project directory: ${APP_DIR}"

# ── System packages ───────────────────────────────────────────────────────────
install_system_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    log "Installing system packages with apt..."
    sudo apt-get update
    sudo apt-get install -y curl git build-essential python3 python3-venv python3-pip ca-certificates gnupg nginx

    if ! command -v node >/dev/null 2>&1; then
      log "Installing Node.js 20..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    fi
  elif command -v dnf >/dev/null 2>&1; then
    log "Installing system packages with dnf..."
    sudo dnf install -y curl git gcc gcc-c++ make python3 python3-pip python3-virtualenv nginx
    if ! command -v node >/dev/null 2>&1; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo dnf install -y nodejs
    fi
  elif command -v yum >/dev/null 2>&1; then
    log "Installing system packages with yum..."
    sudo yum install -y curl git gcc gcc-c++ make python3 python3-pip python3-virtualenv nginx
    if ! command -v node >/dev/null 2>&1; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo yum install -y nodejs
    fi
  else
    fail "Unsupported package manager. Supports apt, dnf, or yum."
  fi
}

# ── Env files ─────────────────────────────────────────────────────────────────
write_env_files() {
  log "Writing frontend env file..."
  cat > "${APP_DIR}/.env.production.local" <<ENV
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
API_SERVER_URL=${API_SERVER_URL}
ENV

  log "Writing backend env file..."
  cat > "${APP_DIR}/backend/.env.production" <<ENV
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=${ALLOWED_HOSTS}
CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS}
ENV
}

# ── Main ──────────────────────────────────────────────────────────────────────
install_system_packages
require_cmd node
require_cmd npm
require_cmd python3

log "Installing frontend dependencies..."
cd "${APP_DIR}"
npm ci

if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2..."
  sudo npm install -g pm2
fi

log "Creating Python virtual environment..."
cd "${APP_DIR}/backend"
python3 -m venv venv
./venv/bin/pip install --upgrade pip wheel
./venv/bin/pip install -r requirements.txt

write_env_files

log "Running Django migrations and collectstatic..."
set -a
source "${APP_DIR}/backend/.env.production"
set +a
./venv/bin/python manage.py migrate --noinput
./venv/bin/python manage.py collectstatic --noinput

log "Building Next.js frontend..."
cd "${APP_DIR}"
export NEXT_PUBLIC_API_URL
export API_SERVER_URL
npm run build

log "Writing PM2 ecosystem config..."
cat > "${APP_DIR}/ecosystem.config.js" <<ECOSYSTEM
module.exports = {
  apps: [
    {
      name: "drivio-backend",
      cwd: "${APP_DIR}/backend",
      script: "${APP_DIR}/backend/venv/bin/daphne",
      args: "-b 0.0.0.0 -p ${BACKEND_PORT} config.asgi:application",
      interpreter: "none",
      env: {
        DJANGO_DEBUG: "False",
        DJANGO_ALLOWED_HOSTS: "${ALLOWED_HOSTS}",
        CORS_ALLOWED_ORIGINS: "${CORS_ALLOWED_ORIGINS}",
      },
    },
    {
      name: "drivio-frontend",
      cwd: "${APP_DIR}",
      script: "npm",
      args: "start -- -p ${FRONTEND_PORT} -H 0.0.0.0",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_API_URL: "${NEXT_PUBLIC_API_URL}",
        API_SERVER_URL: "${API_SERVER_URL}",
      },
    },
  ],
};
ECOSYSTEM

log "Starting services with PM2..."
pm2 start "${APP_DIR}/ecosystem.config.js" --update-env
pm2 save

if command -v systemctl >/dev/null 2>&1; then
  log "Configuring PM2 startup for reboot persistence..."
  sudo env PATH="$PATH" pm2 startup systemd -u "${DEPLOY_USER}" --hp "${HOME}" >/dev/null
  pm2 save
fi

log "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/drivio > /dev/null <<NGINX
server {
    listen 80;
    server_name ${NGINX_SERVER_NAME};

    location /media/ {
        alias ${APP_DIR}/backend/media/;
    }

    location /static/ {
        alias ${APP_DIR}/backend/staticfiles/;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/drivio /etc/nginx/sites-enabled/drivio
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

log "Deployment complete."
if [[ "${MODE}" == "prod" ]]; then
  log "App: https://driviocars.com (run certbot to activate HTTPS)"
  log "Next step: sudo certbot --nginx -d driviocars.com -d www.driviocars.com"
else
  log "App: http://${PUBLIC_HOST}"
fi
log "PM2 status: pm2 status"
