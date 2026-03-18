# imMBA 網站視覺翻新（不動功能版）

這是一份「全新檔案」建立的示範網站：保留導覽列 + 下拉式選單的互動精神（桌機 hover / focus-within；手機點擊展開），並把整體配色與氛圍改成更先進的科技感（玻璃霧面、霓虹重點色、柔和漸層背景）。

## 檔案結構

- `index.html`
- `assets/styles.css`
- `assets/app.js`
- `assets/favicon.svg`

## 本機預覽

任一方式即可：

- 直接用瀏覽器開啟 `index.html`
- 或在此資料夾啟動簡易伺服器（避免某些瀏覽器限制）：

```bash
cd "/Users/leeangel/Desktop/2"
python3 -m http.server 5173
```

然後開啟 `http://localhost:5173/`。

## 你要「完全對齊原站」的下一步

如果你把原站的 HTML（或整包網站檔案）放進此專案，我可以做到：

- 結構/連結/下拉功能 1:1 保留
- 只改 CSS：全站配色、字體、背景、按鈕、卡片、hover 動效、排版密度

