#!/usr/bin/env bash
set -euo pipefail

MSG="${1:-update}"

git add -A
git commit -m "$MSG" || echo "[push] Nothing new to commit."
git push origin main

echo "[push] Done. https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)"
