#!/usr/bin/env python3
"""
本機整合伺服器：靜態網頁 + 公告 API + 後台。
用法：
  cd /Users/leeangel/Desktop/2
  pip install -r requirements.txt
  python3 server.py
預設埠 8000：http://localhost:8000/
後台：http://localhost:8000/admin

若對外開放，請在反向代理或防火牆層限制 /admin、/admin-highlights 與 PUT /api/*。
"""
import html as html_lib
import json
import os
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import Flask, Response, abort, jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "announcements.json"
HIGHLIGHTS_PATH = ROOT / "data" / "highlights.json"
HIGHLIGHTS_UPLOAD_DIR = ROOT / "uploads" / "highlights"

# 部分環境 Python 無法驗證 HTTPS 憑證時，對外抓取仍須連線；設為 1 則略過驗證（僅用於讀取官網與翻譯 API）
_INSECURE_SSL = os.environ.get("IMMBA_INSECURE_SSL", "1") == "1"

app = Flask(__name__)


@app.before_request
def _cors_preflight():
    if request.method == "OPTIONS" and request.path.startswith("/api/"):
        return Response(status=204)


@app.after_request
def _cors_headers(resp):
    if request.path.startswith("/api/"):
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


def _ssl_context():
    if _INSECURE_SSL:
        return ssl._create_unverified_context()
    return ssl.create_default_context()


def _http_get(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; imMBA-admin/1.0)"},
    )
    with urllib.request.urlopen(req, context=_ssl_context(), timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


_TAIPEI_TZ = timezone(timedelta(hours=8))


def _taipei_today_str() -> str:
    return datetime.now(_TAIPEI_TZ).strftime("%Y/%m/%d")


def _is_safe_fetch_url(raw: str) -> bool:
    """避免 SSRF：僅允許 http(s)，並阻擋常見內網／本機位址。"""
    try:
        parts = urllib.parse.urlsplit(raw)
        if parts.scheme not in ("http", "https"):
            return False
        host = (parts.hostname or "").lower().strip("[]")
        if not host:
            return False
        if host in ("localhost", "0.0.0.0", "::1", "169.254.169.254"):
            return False
        if host.endswith(".local") or host.endswith(".localhost"):
            return False
        if host.startswith("127."):
            return False
        if host.startswith("10."):
            return False
        if host.startswith("192.168."):
            return False
        if host.startswith("172."):
            segs = host.split(".")
            if len(segs) >= 2 and segs[0] == "172":
                try:
                    b2 = int(segs[1])
                    if 16 <= b2 <= 31:
                        return False
                except ValueError:
                    pass
        return True
    except Exception:
        return False


def _normalize_date_fragment(s: str) -> str | None:
    s = (s or "").strip()[:40]
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
    m = re.match(r"^(\d{4})/(\d{2})/(\d{2})", s)
    if m:
        return f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
    return None


def _extract_date_from_html(html: str) -> tuple[str | None, str]:
    """回傳 (YYYY/MM/DD 或 None, 來源說明)。"""
    m = re.search(r'<p class="date">\s*(\d{4}/\d{2}/\d{2})\s*</p>', html)
    if m:
        return m.group(1), "immba_p"

    for pat in (
        r'<meta[^>]+property=["\']article:published_time["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']article:published_time["\']',
        r'<meta[^>]+name=["\']date["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+property=["\']og:updated_time["\'][^>]+content=["\']([^"\']+)["\']',
    ):
        m = re.search(pat, html, re.I)
        if m:
            norm = _normalize_date_fragment(m.group(1))
            if norm:
                return norm, "meta"

    m = re.search(r'<time[^>]+datetime=["\']([^"\']+)["\']', html, re.I)
    if m:
        norm = _normalize_date_fragment(m.group(1))
        if norm:
            return norm, "time"

    m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', html)
    if m:
        norm = _normalize_date_fragment(m.group(1))
        if norm:
            return norm, "jsonld"

    return None, ""


def _strip_html_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s)


def _is_generic_page_title(t: str) -> bool:
    low = (t or "").strip().lower()
    if len(low) < 4:
        return True
    needles = (
        "mba program in international management",
        "輔仁大學國際經營管理",
        "國際經營管理碩士班",
    )
    return any(n in low for n in needles)


def _abs_url(page_url: str, src: str) -> str:
    src = (src or "").strip()
    if not src or src in ("#", "about:blank"):
        return ""
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("http"):
        return src
    parts = urllib.parse.urlsplit(page_url)
    if src.startswith("/"):
        return f"{parts.scheme}://{parts.netloc}{src}"
    return urllib.parse.urljoin(page_url, src)


def _extract_first_image_url(html: str, page_url: str) -> str:
    m = re.search(
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        html,
        re.I,
    )
    if m:
        u = _abs_url(page_url, m.group(1).strip())
        if u and u not in ("https://#", "http://#"):
            return u
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.I):
        u = _abs_url(page_url, m.group(1).strip())
        if not u:
            continue
        low = u.lower()
        if any(x in low for x in ("icon", "logo", "pixel", "spacer", "blank")):
            continue
        return u
    return ""


def _extract_article_body_text(html: str, max_len: int = 12000) -> str:
    h = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", html)
    h = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", h)
    start_m = re.search(
        r'<div class="col-12 col-md-9">\s*<h3[^>]*>.*?</h3>',
        h,
        re.I | re.DOTALL,
    )
    start = start_m.end() if start_m else h.find("</header>")
    if start < 0:
        start = 0
    chunk = h[start : start + 100000]
    texts = []
    for pm in re.finditer(r"<p[^>]*>(.*?)</p>", chunk, re.I | re.DOTALL):
        inner = pm.group(1)
        if re.search(r"<img\b", inner, re.I):
            continue
        t = html_lib.unescape(re.sub(r"<[^>]+>", "", inner))
        t = re.sub(r"\s+", " ", t).strip()
        if len(t) > 12 and not re.match(r"^[\d\s\/\-\.:：，。]+$", t):
            texts.append(t)
    body = " ".join(texts)
    if len(body) < 40:
        t = html_lib.unescape(re.sub(r"<[^>]+>", " ", chunk))
        body = re.sub(r"\s+", " ", t).strip()
    return body[:max_len]


def _extract_article_title_from_html(html: str) -> str | None:
    """從一般新聞／公告內頁擷取標題（優先 og:title，其次第一個 h3、h1）。"""
    m = re.search(
        r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']*)["\']',
        html,
        re.I,
    )
    if not m:
        m = re.search(
            r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']og:title["\']',
            html,
            re.I,
        )
    if m:
        t = html_lib.unescape(_strip_html_tags(m.group(1))).strip()
        t = re.sub(r"\s+", " ", t)
        if t and not _is_generic_page_title(t):
            return t

    for m in re.finditer(r"<h3[^>]*>(.*?)</h3>", html, re.I | re.DOTALL):
        t = html_lib.unescape(_strip_html_tags(m.group(1)))
        t = re.sub(r"\s+", " ", t).strip()
        if t and not _is_generic_page_title(t):
            return t

    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.DOTALL)
    if m:
        t = html_lib.unescape(_strip_html_tags(m.group(1)))
        t = re.sub(r"\s+", " ", t).strip()
        if t and not _is_generic_page_title(t):
            return t
    return None


def _load_data():
    with DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def _save_data(data):
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/admin")
def admin_page():
    return send_from_directory(ROOT, "admin.html")


@app.get("/assets/<path:name>")
def assets(name):
    return send_from_directory(ROOT / "assets", name)


@app.get("/data/announcements.json")
def announcements_file():
    return send_from_directory(ROOT / "data", "announcements.json")


@app.get("/data/highlights.json")
def highlights_file():
    return send_from_directory(ROOT / "data", "highlights.json")


@app.get("/api/announcements")
def api_get_announcements():
    return jsonify(_load_data())


@app.get("/api/announcements/fetch-meta")
def api_fetch_meta():
    """從任意公告／文章網址抓取 HTML，嘗試解析日期；解析不到則用臺北當日（外部站常無統一格式）。"""
    raw = request.args.get("url", "").strip()
    if not raw:
        abort(400)
    if not _is_safe_fetch_url(raw):
        return jsonify({"ok": False, "error": "不支援的網址（僅限 http/https，且不可為內網位址）"}), 200

    try:
        html = _http_get(raw, timeout=22)
    except urllib.error.HTTPError as e:
        return jsonify({"ok": False, "error": f"無法開啟網頁：HTTP {e.code}"}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": f"無法開啟網頁：{e}"}), 200

    date_str, src = _extract_date_from_html(html)
    if date_str:
        return jsonify({"ok": True, "date": date_str, "dateSource": src or "parsed"})
    fallback = _taipei_today_str()
    return jsonify(
        {
            "ok": True,
            "date": fallback,
            "dateSource": "fallback",
            "hint": "頁面上未偵測到日期，已使用今日（臺北）",
        }
    )


@app.get("/api/announcements/fetch-title")
def api_fetch_title():
    """從公告／文章網址 HTML 擷取標題（供英文欄位對齊官網英文頁）。"""
    raw = request.args.get("url", "").strip()
    if not raw:
        abort(400)
    if not _is_safe_fetch_url(raw):
        return jsonify({"ok": False, "error": "不支援的網址"}), 200
    try:
        page_html = _http_get(raw, timeout=22)
    except urllib.error.HTTPError as e:
        return jsonify({"ok": False, "error": f"無法開啟網頁：HTTP {e.code}"}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 200
    title = _extract_article_title_from_html(page_html)
    if not title:
        return jsonify({"ok": False, "error": "無法從頁面解析標題"}), 200
    return jsonify({"ok": True, "title": title})


def _lingva_zh_to_en(s: str) -> str | None:
    """Lingva 公開介接備援（zh → en）。"""
    chunk = (s or "").strip()[:500]
    if not chunk:
        return None
    enc = urllib.parse.quote(chunk, safe="")
    url = f"https://lingva.ml/api/v1/zh/en/{enc}"
    try:
        raw = _http_get(url, timeout=25)
        data = json.loads(raw)
    except Exception:
        return None
    if data.get("error"):
        return None
    out = (data.get("translation") or "").strip()
    return out or None


@app.post("/api/translate")
def api_translate():
    """繁中 → 英文：先 MyMemory，失敗或無結果則改走 Lingva。"""
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"ok": True, "text": ""})

    def one_chunk_mymemory(s: str, pair: str) -> str:
        q = urllib.parse.quote(s[:450])
        url = f"https://api.mymemory.translated.net/get?q={q}&langpair={pair}"
        try:
            raw = _http_get(url, timeout=25)
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError, urllib.error.URLError, OSError, ValueError):
            return ""
        out = (data.get("responseData") or {}).get("translatedText") or ""
        if "MYMEMORY WARNING" in out:
            out = out.split("MYMEMORY WARNING", 1)[0].strip()
        return out

    def translate_chunk(s: str) -> str:
        for pair in ("zh|en", "zh-TW|en"):
            out = one_chunk_mymemory(s, pair)
            if out.strip() and out.strip() != s.strip():
                return out
        lv = _lingva_zh_to_en(s)
        if lv:
            return lv
        raise RuntimeError("翻譯服務暫時無法使用，請稍後再試或手動填英文標題")

    # 粗略分段避免單次過長
    if len(text) <= 450:
        try:
            out = translate_chunk(text)
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 200
        return jsonify({"ok": True, "text": out})

    parts = []
    step = 400
    for i in range(0, len(text), step):
        chunk = text[i : i + step]
        try:
            parts.append(translate_chunk(chunk))
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 200
    return jsonify({"ok": True, "text": " ".join(parts)})


@app.put("/api/announcements")
def api_put_announcements():
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or "items" not in body:
        abort(400)
    if not isinstance(body["items"], list):
        abort(400)
    _save_data(body)
    return jsonify({"ok": True})


def _default_highlights():
    return {
        "moreUrl": {
            "zh": "https://www.management.fju.edu.tw/subweb/immba/news.php",
            "en": "https://www.management.fju.edu.tw/esubweb/immbaengindex/subindex.php",
        },
        "items": [],
    }


def _load_highlights():
    if not HIGHLIGHTS_PATH.is_file():
        return _default_highlights()
    try:
        with HIGHLIGHTS_PATH.open(encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return _default_highlights()
    if not isinstance(data, dict):
        return _default_highlights()
    du = _default_highlights()
    if not isinstance(data.get("moreUrl"), dict):
        data["moreUrl"] = du["moreUrl"]
    else:
        data["moreUrl"].setdefault("zh", du["moreUrl"]["zh"])
        data["moreUrl"].setdefault("en", du["moreUrl"]["en"])
    if not isinstance(data.get("items"), list):
        data["items"] = []
    return data


def _save_highlights(data):
    HIGHLIGHTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with HIGHLIGHTS_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.get("/api/highlights")
def api_highlights_get():
    return jsonify(_load_highlights())


@app.put("/api/highlights")
def api_highlights_put():
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or "items" not in body:
        abort(400)
    if not isinstance(body["items"], list):
        abort(400)
    base = _load_highlights()
    out = {
        "moreUrl": base["moreUrl"],
        "items": body["items"],
    }
    mu = body.get("moreUrl")
    if isinstance(mu, dict):
        out["moreUrl"] = {
            "zh": (mu.get("zh") or base["moreUrl"]["zh"]).strip(),
            "en": (mu.get("en") or base["moreUrl"]["en"]).strip(),
        }
    _save_highlights(out)
    return jsonify({"ok": True})


@app.post("/api/highlights/scrape")
def api_highlights_scrape():
    body = request.get_json(silent=True) or {}
    url_zh = (body.get("urlZh") or "").strip()
    url_en = (body.get("urlEn") or "").strip()
    out = {
        "ok": True,
        "titleZh": "",
        "titleEn": "",
        "bodyZh": "",
        "bodyEn": "",
        "imageZh": "",
        "imageEn": "",
    }
    if url_zh:
        if not _is_safe_fetch_url(url_zh):
            out["warnZh"] = "中文網址不支援或禁止存取"
        else:
            try:
                hz = _http_get(url_zh, timeout=24)
                out["titleZh"] = _extract_article_title_from_html(hz) or ""
                out["bodyZh"] = _extract_article_body_text(hz) or ""
                out["imageZh"] = _extract_first_image_url(hz, url_zh) or ""
            except urllib.error.HTTPError as e:
                out["errorZh"] = f"HTTP {e.code}"
            except Exception as e:
                out["errorZh"] = str(e)
    if url_en:
        if not _is_safe_fetch_url(url_en):
            out["warnEn"] = "英文網址不支援或禁止存取"
        else:
            try:
                he = _http_get(url_en, timeout=24)
                out["titleEn"] = _extract_article_title_from_html(he) or ""
                out["bodyEn"] = _extract_article_body_text(he) or ""
                out["imageEn"] = _extract_first_image_url(he, url_en) or ""
            except urllib.error.HTTPError as e:
                out["errorEn"] = f"HTTP {e.code}"
            except Exception as e:
                out["errorEn"] = str(e)
    return jsonify(out)


@app.post("/api/highlights/upload")
def api_highlights_upload():
    HIGHLIGHTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if "file" not in request.files:
        abort(400)
    f = request.files["file"]
    if not f or not f.filename:
        abort(400)
    ext = Path(f.filename).suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        return jsonify({"ok": False, "error": "僅支援 jpg / png / webp / gif"}), 200
    name = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + os.urandom(4).hex() + ext
    path = HIGHLIGHTS_UPLOAD_DIR / name
    f.save(path)
    return jsonify({"ok": True, "url": f"/uploads/highlights/{name}"})


@app.get("/uploads/highlights/<path:name>")
def serve_highlights_upload(name):
    return send_from_directory(HIGHLIGHTS_UPLOAD_DIR, name)


@app.route("/admin-highlights", methods=["GET"])
@app.route("/admin-highlights/", methods=["GET"])
@app.route("/admin-highlights.html", methods=["GET"])
@app.route("/admin/highlights", methods=["GET"])
@app.route("/admin/highlights/", methods=["GET"])
def admin_highlights_page():
    """活動集錦後台（多路徑避免打錯；須由本專案 python3 server.py 啟動，靜態伺服器無此路由）。"""
    return send_from_directory(ROOT, "admin-highlights.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"imMBA 伺服器已啟動：http://127.0.0.1:{port}/  （同 http://localhost:{port}/）")
    print(f"後台：http://127.0.0.1:{port}/admin")
    print(f"活動集錦後台：http://127.0.0.1:{port}/admin-highlights")
    app.run(host="0.0.0.0", port=port, debug=False)
