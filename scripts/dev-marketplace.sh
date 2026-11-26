#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
frontend_port="${FRONTEND_PORT:-3001}"
backend_port="${BACKEND_PORT:-8002}"
python_bin="${PYTHON_BIN:-$PWD/backend/venv/bin/python}"
uvicorn_bin="$(dirname "$python_bin")/uvicorn"
"$python_bin" - "$frontend_port" "$backend_port" <<'PY'
import socket,sys
for port in sys.argv[1:]:
    with socket.socket() as listener:
        try: listener.bind(('127.0.0.1',int(port)))
        except OSError: sys.exit(f'Port {port} is occupied. Reuse that service or set FRONTEND_PORT and BACKEND_PORT to free ports.')
PY
export FRONTEND_URL="http://localhost:$frontend_port"
export NEXT_PUBLIC_API_URL="http://127.0.0.1:$backend_port/api"
export NEXT_PUBLIC_API_ORIGIN="http://127.0.0.1:$backend_port"
export NEXT_PUBLIC_WS_URL="ws://127.0.0.1:$backend_port"
export API_SERVER_URL="$NEXT_PUBLIC_API_URL"
pids=()
cleanup() { for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM
(cd backend && "$python_bin" manage.py migrate --noinput)
(cd backend && exec "$uvicorn_bin" config.asgi:application --host 127.0.0.1 --port "$backend_port" --reload) & pids+=("$!")
(cd backend && exec "$python_bin" manage.py marketplace_worker --interval 5) & pids+=("$!")
npm run dev -- --port "$frontend_port" & pids+=("$!")
wait
