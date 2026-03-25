(() => {
  const root = document.getElementById("highlights-root");
  if (!root) return;

  const PREVIEW_LEN = 150;

  const LABEL = {
    zh: {
      readMore: "閱讀更多",
      readLess: "收合",
      source: "公告原文",
      empty: "尚無活動集錦，管理員可在後台新增。",
    },
    en: {
      readMore: "Read more",
      readLess: "Show less",
      source: "Original article",
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

  async function loadData() {
    try {
      const r = await fetch("/api/highlights");
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
    if (chars.length <= PREVIEW_LEN) {
      return { short: t, full: t, needsToggle: false };
    }
    return {
      short: chars.slice(0, PREVIEW_LEN).join("") + "…",
      full: t,
      needsToggle: true,
    };
  }

  function bindToggle(article) {
    const btn = article.querySelector(".hl-readmore");
    const shortEl = article.querySelector(".hl-body-short");
    const fullEl = article.querySelector(".hl-body-full");
    if (!btn || !shortEl || !fullEl) return;
    if (btn.hidden) return;
    btn.addEventListener("click", () => {
      const open = article.classList.toggle("hl-item--open");
      shortEl.hidden = open;
      fullEl.hidden = !open;
      btn.textContent = open ? lab("readLess") : lab("readMore");
    });
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
        const { short, full, needsToggle } = truncatePreview(bodyFull);
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
        const readMoreBtn = needsToggle
          ? `<button type="button" class="hl-readmore">${esc(lab("readMore"))}</button>`
          : "";
        const detail =
          url && /^https?:\/\//i.test(url)
            ? `<a class="hl-detail" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(
                lab("source")
              )}</a>`
            : "";
        return `
          <article class="hl-item${revClass}">
            <div class="hl-media">${imgHtml}</div>
            <div class="hl-text">
              <h3 class="hl-title">${esc(title || "—")}</h3>
              <div class="hl-body">
                <p class="hl-body-short">${esc(short)}</p>
                <p class="hl-body-full" hidden>${esc(full)}</p>
                ${readMoreBtn}
              </div>
              ${detail}
            </div>
          </article>
        `;
      })
      .join("");

    root.querySelectorAll(".hl-item").forEach(bindToggle);
  }

  async function init() {
    cached = await loadData();
    render();
  }

  window.addEventListener("immba:langchange", () => render());

  init();
})();
