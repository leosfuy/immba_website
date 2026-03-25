(() => {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector("#navMenu");
  const items = Array.from(document.querySelectorAll(".nav-menu .nav-item"));

  if (!toggle || !menu) return;

  const i18n = {
    zh: {
      title: "輔仁大學國際經營管理碩士班（imMBA）",
      skip: "跳到主要內容",
      brandTitle: "輔仁大學國際經營管理碩士班",
      brandSubtitle: "imMBA · International MBA · AACSB",
      navAria: "主選單",
      menu: "選單",
      "nav.about": "簡介",
      "nav.about.features": "特色與排名",
      "nav.about.rules": "本單位規定及辦法",
      "nav.about.env": "學習環境",
      "nav.admissions": "招生資訊",
      "nav.admissions.mba": "MBA招生資訊",
      "nav.admissions.scholarships": "獎助學金資訊",
      "nav.curriculum": "課程資訊",
      "nav.curriculum.rules": "課程與修業規則",
      "nav.faculty": "師資介紹",
      "nav.guide": "imMBA全攻略",
      "nav.graduation": "畢業與離校",
      "nav.dual": "跨國雙碩士",
      "nav.exchange": "海外交換",
      "nav.gallery": "活動集錦",
      langSwitch: "EN",
      "banner.news": "公告",
      "banner.college": "輔大管理學院",
      "hero.titlePrefix": "用全英語學習，打造跨國商管視野",
      "hero.lead":
        "以國際化課程、產學鏈結與海外資源，讓你在校內就能接軌世界。",
      "hero.badge": "全英MBA",
      "hero.b1": "國際視野 × 跨域整合 × 數位創新",
      "hero.b2": "1+1 跨國雙碩士",
      "hero.b3": "全球姊妹校免學費出國交換",
      "hero.b4": "國際化MBA學習環境",
      "hero.foot": "碩士班每年10月和1月招生／五年一貫和國際行銷微學程每年5月申請",
      "hero.applyNow": "立即申請",
      "hero.learnMore": "了解課程特色",
      "hero.ctaAdmissions": "查看招生資訊",
      "hero.ctaNews": "最新公告",
      "news.title": "最新公告",
      "news.more": "更多公告",
      "news.details": "查看詳情",
      "news.tagAdmissions": "招生",
      "news.tagEvent": "活動",
      "news.item1.title": "（國際經管-全英MBA）115碩士招生口試通知",
      "news.item2.title": "Fall 2026 外國學生申請入學：第一梯次",
      "news.item3.title": "上週末的輔大開箱日，你也來逛校園了嗎？",
      "highlights.title": "活動集錦",
      "highlights.more": "更多活動",
      "highlights.empty": "尚無活動集錦，管理員可在後台新增。",
      "intro.title": "快速導覽",
      "intro.desc": "維持原本資訊入口的精神，但整體視覺全面升級。",
      "intro.card1.title": "招生資訊",
      "intro.card1.desc": "報名、甄試、口試、獎助學金。",
      "intro.card2.title": "課程資訊",
      "intro.card2.desc": "修業規則、課程地圖、學習資源。",
      "intro.card3.title": "海外與合作",
      "intro.card3.desc": "交換、雙碩士、國際夥伴。",
      "admission.title": "招生資訊",
      "admission.desc": "MBA招生資訊與獎助學金資訊。",
      "admission.mba.title": "MBA招生資訊",
      "admission.mba.li1": "報名與時程",
      "admission.mba.li2": "口試須知",
      "admission.mba.li3": "外國學生申請",
      "admission.sch.title": "獎助學金資訊",
      "admission.sch.li1": "入學獎學金",
      "admission.sch.li2": "外部資源",
      "admission.sch.li3": "申請條件",
      "common.learnMore": "前往詳情 →",
      "courses.title": "課程資訊",
      "courses.desc": "用更清晰的層級與科技感元件呈現。",
      "courses.step1": "商管核心、管理思維、專業英文。",
      "courses.step2": "國際企業、策略、行銷、資料導向決策。",
      "courses.step3": "專題、實作、產學合作與職涯加速。",
      "footer.linksTitle": "相關連結",
      "footer.contact": "聯絡我們",
      "footer.gallery": "活動集錦",
      "footer.news": "公告",
      "footer.infoTitle": "資訊",
    },
    en: {
      title: "imMBA · International MBA · Fu Jen Catholic University",
      skip: "Skip to content",
      brandTitle: "International MBA Program",
      brandSubtitle: "imMBA · International MBA · AACSB",
      navAria: "Main menu",
      menu: "Menu",
      "nav.about": "About",
      "nav.about.features": "Highlights & Ranking",
      "nav.about.rules": "Policies & Regulations",
      "nav.about.env": "Learning Environment",
      "nav.admissions": "Admissions",
      "nav.admissions.mba": "MBA Admissions",
      "nav.admissions.scholarships": "Scholarships",
      "nav.curriculum": "Curriculum",
      "nav.curriculum.rules": "Program Requirements",
      "nav.faculty": "Faculty",
      "nav.guide": "imMBA Guide",
      "nav.graduation": "Graduation",
      "nav.dual": "Dual Degree",
      "nav.exchange": "Exchange",
      "nav.gallery": "Highlights",
      langSwitch: "中文",
      "banner.news": "News",
      "banner.college": "College of Management",
      "hero.titlePrefix": "Learn in English. Build global business leadership",
      "hero.lead":
        "An international curriculum, industry collaboration, and global pathways—designed to help you connect with the world while studying in Taiwan.",
      "hero.badge": "English MBA",
      "hero.b1": "Global perspective × Cross-domain integration × Digital innovation",
      "hero.b2": "1+1 International Dual Degree",
      "hero.b3": "Tuition-waived exchange with global partner universities",
      "hero.b4": "Immersive international MBA learning environment",
      "hero.foot": "Admissions each Oct & Jan / Integrated master's and micro-program applications each May",
      "hero.applyNow": "Apply now",
      "hero.learnMore": "Explore curriculum",
      "hero.ctaAdmissions": "Admissions",
      "hero.ctaNews": "Latest news",
      "news.title": "Latest news",
      "news.more": "More",
      "news.details": "Details",
      "news.tagAdmissions": "Admissions",
      "news.tagEvent": "Event",
      "news.item1.title": "Interview Notice — 2026 Admissions",
      "news.item2.title": "Fall 2026 — International Student Application (Round 1)",
      "news.item3.title": "Campus Open Day Highlights",
      "highlights.title": "Highlights",
      "highlights.more": "More stories",
      "highlights.empty": "No highlights yet.",
      "intro.title": "Quick links",
      "intro.desc": "Same structure and behavior, refreshed visual style.",
      "intro.card1.title": "Admissions",
      "intro.card1.desc": "Timeline, requirements, interviews, scholarships.",
      "intro.card2.title": "Curriculum",
      "intro.card2.desc": "Program structure, requirements, learning resources.",
      "intro.card3.title": "Global pathways",
      "intro.card3.desc": "Exchange, dual degree, international partners.",
      "admission.title": "Admissions",
      "admission.desc": "MBA admissions and scholarship information.",
      "admission.mba.title": "MBA admissions",
      "admission.mba.li1": "Timeline & application",
      "admission.mba.li2": "Interview guidance",
      "admission.mba.li3": "International applicants",
      "admission.sch.title": "Scholarships",
      "admission.sch.li1": "Entrance scholarships",
      "admission.sch.li2": "External funding",
      "admission.sch.li3": "Eligibility",
      "common.learnMore": "Learn more →",
      "courses.title": "Curriculum",
      "courses.desc": "Clear hierarchy with modern UI components.",
      "courses.step1": "Core management, business thinking, academic English.",
      "courses.step2": "International business, strategy, marketing, data-driven decisions.",
      "courses.step3": "Projects, practice, industry collaboration and career acceleration.",
      "footer.linksTitle": "Links",
      "footer.contact": "Contact",
      "footer.gallery": "Highlights",
      "footer.news": "News",
      "footer.infoTitle": "Info",
    },
  };

  const getLang = () => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "zh") return saved;
    const attr = document.documentElement.getAttribute("data-lang");
    if (attr === "en" || attr === "zh") return attr;
    return "zh";
  };

  const setLang = (lang) => {
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-Hant");
    localStorage.setItem("lang", lang);

    // text nodes
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n") || "";
      const val = i18n[lang][key];
      if (typeof val !== "string") return;
      if (val.includes("<") && val.includes(">")) el.innerHTML = val;
      else el.textContent = val;
    });

    // attributes
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const spec = el.getAttribute("data-i18n-attr") || "";
      // format: "attr:key"
      const [attr, key] = spec.split(":");
      if (!attr || !key) return;
      const val = i18n[lang][key];
      if (typeof val !== "string") return;
      el.setAttribute(attr, val);
    });

    window.dispatchEvent(new CustomEvent("immba:langchange", { detail: { lang } }));
  };

  const langBtn = document.querySelector(".lang-switch");
  if (langBtn instanceof HTMLButtonElement) {
    langBtn.addEventListener("click", () => {
      const next = getLang() === "zh" ? "en" : "zh";
      setLang(next);
    });
  }

  // init language
  setLang(getLang());

  const setExpanded = (value) => {
    toggle.setAttribute("aria-expanded", String(value));
    menu.classList.toggle("is-open", value);
    if (!value) {
      items.forEach((li) => li.classList.remove("is-open"));
    }
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.contains("is-open");
    setExpanded(!isOpen);
  });

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (!menu.classList.contains("is-open")) return;
    if (target.closest(".nav")) return;
    setExpanded(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setExpanded(false);
  });

  // Mobile: tap top-level item to toggle its dropdown (does not change desktop behavior)
  const mq = window.matchMedia("(max-width: 900px)");
  const bindMobileDropdown = () => {
    items.forEach((li) => {
      const link = li.querySelector(":scope > .nav-link");
      const dropdown = li.querySelector(":scope > .dropdown");
      if (!link || !dropdown) return;

      link.addEventListener("click", (e) => {
        if (!mq.matches) return;
        // if menu isn't open, open it (safe)
        if (!menu.classList.contains("is-open")) setExpanded(true);
        e.preventDefault();
        const willOpen = !li.classList.contains("is-open");
        items.forEach((x) => x.classList.remove("is-open"));
        li.classList.toggle("is-open", willOpen);
      });
    });
  };
  bindMobileDropdown();
})();

