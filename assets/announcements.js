(() => {
  const root = document.getElementById("announcements-root");
  if (!root) return;

  const CTA = { zh: "查看詳情", en: "Details" };

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

  async function loadData() {
    try {
      const r = await fetch("/api/announcements");
      if (r.ok) return await r.json();
    } catch (_) {
      /* ignore */
    }
    try {
      const r = await fetch("./data/announcements.json");
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

  function parseDateKey(s) {
    const m = String(s || "").match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (!m) return 0;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  }

  /** TOP 置頂維持在最前，其餘依日期新→舊 */
  function sortAnnouncementItems(items) {
    const top = [];
    const rest = [];
    for (const it of items) {
      if ((it.tag || "") === "TOP") top.push(it);
      else rest.push(it);
    }
    const byNewest = (a, b) => parseDateKey(b.date) - parseDateKey(a.date);
    top.sort(byNewest);
    rest.sort(byNewest);
    return [...top, ...rest];
  }

  function normalizeItem(it) {
    if (it.titleZh != null || it.urlZh != null) {
      return {
        id: it.id,
        tag: it.tag || "",
        date: it.date || "",
        titleZh: it.titleZh || "",
        titleEn: it.titleEn || it.titleZh || "",
        urlZh: it.urlZh || it.url || "#",
        urlEn: it.urlEn || it.urlZh || it.url || "#",
      };
    }
    return {
      id: it.id,
      tag: it.tag || "",
      date: it.date || "",
      titleZh: it.title || "",
      titleEn: it.titleEn || it.title || "",
      urlZh: it.url || "#",
      urlEn: it.urlEn || it.url || "#",
    };
  }

  function tagClass(tag) {
    if (tag === "TOP") return "tag";
    if (!tag) return "tag tag--soft";
    return "tag tag--alt";
  }

  function render() {
    const data = cached;
    const lang = currentLang();
    if (!data || !Array.isArray(data.items)) {
      root.innerHTML = '<p class="ann-error">無法載入公告資料。</p>';
      return;
    }

    const more = document.getElementById("news-more-link");
    if (more) more.setAttribute("href", resolveMoreUrl(data, lang));

    const items = sortAnnouncementItems(data.items.map(normalizeItem));

    root.innerHTML = items
      .map((item) => {
        const title = lang === "en" ? item.titleEn || item.titleZh : item.titleZh;
        // 英文介面一律優先英文詳情網址（與中文同一則公告對應的英文版）
        const url =
          lang === "en"
            ? item.urlEn && item.urlEn !== "#"
              ? item.urlEn
              : item.urlZh
            : item.urlZh;
        const t = item.tag || "";
        const tagHtml = t
          ? `<div class="${tagClass(t)}">${esc(t)}</div>`
          : `<div class="tag tag--soft">${lang === "en" ? "News" : "公告"}</div>`;
        // 整張卡可點，與「點哪則就開哪則」一致；避免巢狀 <a>，CTA 改為 span
        return `
          <a class="ann-card-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
            <article class="card ann-card">
              ${tagHtml}
              <h3 class="card-title">${esc(title)}</h3>
              <p class="card-meta">${esc(item.date || "")}</p>
              <span class="card-cta ann-card-cta">${esc(CTA[lang])}</span>
            </article>
          </a>
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
