#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> server deps"
(cd "$ROOT/server" && go mod tidy)

echo "==> web deps"
(cd "$ROOT/web" && npm install)

echo "==> client deps"
(cd "$ROOT/client" && npm install)

echo "Done. Start API: cd server && go run ./cmd/server"
echo "Start web: cd web && npm run dev"
echo "Start client: cd client && npm run dev"
echo "Windows installer: cd client && npm run dist:win"
