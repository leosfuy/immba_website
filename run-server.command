#!/bin/bash
cd "$(dirname "$0")"
echo "正在啟動 imMBA 本機網站（勿關閉此視窗）…"
echo "約 1 秒後會自動開啟瀏覽器首頁；請點頂部 logo 進總後台。"
echo "（若未跳出瀏覽器，請看下方網址手動貼上）"
echo ""
python3 server.py
echo ""
echo "伺服器已結束。按 Enter 關閉視窗。"
read -r
