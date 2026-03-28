(() => {
  const root = document.getElementById("highlights-root");
  if (!root) return;

  const PREVIEW_LEN = 150;

  const LABEL = {
    zh: {
      readMore: "閱讀更多",
      empty: "尚無活動集錦，管理員可在後台新增。",
    },
    en: {
      readMore: "Read more",
      empty: "No highlights yet.",
    },
  };

  let cached = null;

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function currentLang() {
    return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "zh";
  }

  function lab(key) {
    return LABEL[currentLang()][key] || LABEL.zh[key];
  }

  function getApiOrigin() {
    try {
      const params = new URLSearchParams(window.location.search);
      const o = (params.get("api") || "").trim();
      if (o && /^https?:\/\//i.test(o)) return o.replace(/\/$/, "");
      const proto = window.location.protocol;
      if (proto === "file:" || proto === "blob:") return "http://127.0.0.1:8099";
      return "";
    } catch {
      return "http://127.0.0.1:8099";
    }
  }

  async function loadData() {
    const origin = getApiOrigin();
    const apiPath = origin ? `${origin}/api/highlights` : "/api/highlights";
    try {
      const r = await fetch(apiPath);
      if (r.ok) return await r.json();
    } catch (_) {
      /* ignore */
    }
    try {
      const r = await fetch("./data/highlights.json");
      if (r.ok) return await r.json();
    } catch (_) {
      /* ignore */
    }
    return null;
  }

  function resolveMoreUrl(data, lang) {
    const m = data?.moreUrl;
    if (typeof m === "string") return m;
    if (m && typeof m === "object") {
      return (lang === "en" ? m.en || m.zh : m.zh || m.en) || "#";
    }
    return "#";
  }

  function imgSrc(u) {
    const s = (u || "").trim();
    if (!s) return "";
    if (s.startsWith("//")) return "https:" + s;
    return s;
  }

  function pickImage(it) {
    return (
      (it.image || "").trim() ||
      (it.imageZh || "").trim() ||
      (it.imageEn || "").trim()
    );
  }

  function pickText(it, lang) {
    if (lang === "en") {
      const b = (it.bodyEn || "").trim();
      if (b) return b;
      return (it.bodyZh || "").trim();
    }
    const b = (it.bodyZh || "").trim();
    if (b) return b;
    return (it.bodyEn || "").trim();
  }

  function pickTitle(it, lang) {
    if (lang === "en") {
      const t = (it.titleEn || "").trim();
      if (t) return t;
      return (it.titleZh || "").trim();
    }
    const t = (it.titleZh || "").trim();
    if (t) return t;
    return (it.titleEn || "").trim();
  }

  function pickUrl(it, lang) {
    if (lang === "en") {
      const u = (it.urlEn || "").trim();
      if (u) return u;
      return (it.urlZh || "").trim();
    }
    const u = (it.urlZh || "").trim();
    if (u) return u;
    return (it.urlEn || "").trim();
  }

  function truncatePreview(text) {
    const t = (text || "").trim();
    const chars = [...t];
    if (chars.length <= PREVIEW_LEN) return t;
    return chars.slice(0, PREVIEW_LEN).join("") + "…";
  }

  function render() {
    const data = cached;
    const lang = currentLang();

    const moreEl = document.getElementById("highlights-more-link");
    if (moreEl && data) moreEl.setAttribute("href", resolveMoreUrl(data, lang));

    const emptyEl = document.getElementById("highlights-empty");
    if (!data || !Array.isArray(data.items)) {
      root.innerHTML = "";
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = lab("empty");
      }
      return;
    }

    const items = data.items.filter((it) => {
      const title = pickTitle(it, lang);
      const body = pickText(it, lang);
      const img = pickImage(it);
      return !!(title || body || img);
    });

    if (emptyEl) emptyEl.hidden = items.length > 0;

    if (items.length === 0) {
      root.innerHTML = "";
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = lab("empty");
      }
      return;
    }

    root.innerHTML = items
      .map((it, idx) => {
        const title = pickTitle(it, lang);
        const bodyFull = pickText(it, lang);
        const url = pickUrl(it, lang);
        const preview = truncatePreview(bodyFull);
        const im = imgSrc(pickImage(it));
        const revClass = idx % 2 === 1 ? " hl-item--reverse" : "";
        const placeholder =
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><rect fill="#e2e8f0" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="22">imMBA</text></svg>'
          );
        const imgHtml = im
          ? `<img class="hl-photo" src="${esc(im)}" alt="${esc(title)}" loading="lazy" />`
          : `<img class="hl-photo hl-photo--ph" src="${placeholder}" alt="" />`;
        const hasArticleUrl = url && /^https?:\/\//i.test(url);
        const readMoreLink = hasArticleUrl
          ? `<a class="hl-readmore" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(
              lab("readMore")
            )}</a>`
          : "";
        return `
          <article class="hl-item${revClass}">
            <div class="hl-media">${imgHtml}</div>
            <div class="hl-text">
              <h3 class="hl-title">${esc(title || "—")}</h3>
              <div class="hl-body">
                <p class="hl-body-preview">${esc(preview)}</p>
                ${readMoreLink}
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function init() {
    cached = await loadData();
    render();
  }

  window.addEventListener("immba:langchange", () => render());

  init();
})();
