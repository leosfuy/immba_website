#!/usr/bin/env bash
cd "$(dirname "$0")"
export PORT="${PORT:-8000}"
echo "Using PORT=$PORT"
exec python3 server.py
