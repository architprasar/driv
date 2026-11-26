#!/usr/bin/env bash
# One-shot local dev bootstrap: installs deps for both frontend and backend,
# then runs both servers together. Ctrl+C stops both.
set -euo pipefail

log() { echo "[setup] $*"; }
fail() { echo "[setup][error] $*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

require_cmd node
require_cmd npm
require_cmd python3

# ── Frontend deps ────────────────────────────────────────────────────────────
log "Installing frontend dependencies (npm install)..."
cd "${APP_DIR}"
npm install

[[ -f "${APP_DIR}/.env.local" ]] || cat > "${APP_DIR}/.env.local" <<ENV
NEXT_PUBLIC_API_URL=http://127.0.0.1:${BACKEND_PORT}/api
NEXT_PUBLIC_API_ORIGIN=http://127.0.0.1:${BACKEND_PORT}
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:${BACKEND_PORT}
ENV

# ── Backend deps ─────────────────────────────────────────────────────────────
log "Setting up Python virtual environment..."
cd "${APP_DIR}/backend"
if [[ ! -d venv ]]; then
  python3 -m venv venv
fi
./venv/bin/pip install --upgrade pip wheel >/dev/null
log "Installing backend dependencies (this can take a minute)..."
./venv/bin/pip install -r requirements.txt

log "Applying database migrations..."
./venv/bin/python manage.py migrate --noinput

# ── Run both servers ─────────────────────────────────────────────────────────
cleanup() {
  log "Stopping servers..."
  [[ -n "${BACKEND_PID:-}" ]] && kill "${BACKEND_PID}" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "${FRONTEND_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

log "Starting backend on http://127.0.0.1:${BACKEND_PORT} ..."
cd "${APP_DIR}/backend"
./venv/bin/python manage.py runserver "0.0.0.0:${BACKEND_PORT}" &
BACKEND_PID=$!

log "Starting frontend on http://localhost:${FRONTEND_PORT} ..."
cd "${APP_DIR}"
npm run dev -- -p "${FRONTEND_PORT}" &
FRONTEND_PID=$!

log ""
log "Drivio is running:"
log "  Frontend: http://localhost:${FRONTEND_PORT}"
log "  Backend:  http://127.0.0.1:${BACKEND_PORT}/api"
log "Press Ctrl+C to stop both."

wait
