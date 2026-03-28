#!/usr/bin/env bash
cd "$(dirname "$0")"
export PORT="${PORT:-8099}"
echo "PORT=$PORT（預設 8099 避開與其他程式搶 8000；若被占用會自動改用 8100、8101…）"
echo "啟動後約 1 秒會自動開瀏覽器首頁；點 logo 可進總後台（實際埠以終端機為準）。"
exec python3 server.py
