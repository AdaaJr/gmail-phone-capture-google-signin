// contentScript.js — extract phone numbers in Gmail and send to BG for Sheets append
(function() {
  const PHONE_REGEX = /(?:\+?\d{1,3}[\s\-.]?)?(?:\(?\d{2,4}\)?[\s\-.]?)?\d{3,4}[\s\-.]?\d{3,4}(?:[\s\-.]?\d{2,4})?/g;
  const E164_CLEAN = /[^\d+]/g;

  let lastToken = "";

  function normalize(raw) {
    const cleaned = (raw || "").replace(E164_CLEAN, "");
    if ((cleaned.match(/\d/g) || []).length < 8) return null;
    if (!cleaned.startsWith("+") && /^0\d{9}$/.test(cleaned)) return "+33" + cleaned.slice(1);
    return cleaned.startsWith("+") ? cleaned : cleaned;
  }

  function meta() {
    const subjectEl = document.querySelector('h2.hP');
    const fromEl = document.querySelector('.gD');
    const subject = subjectEl ? subjectEl.textContent.trim() : "";
    const from = fromEl ? (fromEl.getAttribute('email') || fromEl.textContent.trim()) : "";
    const bodies = Array.from(document.querySelectorAll('div.a3s.aiL, div.a3s'));
    const text = bodies.map(b => (b.innerText || "")).join("\n");
    return { subject, from, text };
  }

  function dedupe(list) { return Array.from(new Set(list.filter(Boolean))); }

  async function loadFilters() {
    const { filters, enabled } = await chrome.storage.sync.get(["filters","enabled"]);
    return { filters: filters || {}, enabled: enabled ?? true };
  }

  function matchFilters(meta, filters) {
    const s = (meta.subject || "").toLowerCase();
    const f = (meta.from || "").toLowerCase();
    const b = (meta.text || "").toLowerCase();

    const anyIncl = (arr, hay) => (Array.isArray(arr) && arr.length) ? arr.some(x => hay.includes(String(x).toLowerCase().trim())) : true;
    const allIncl = (arr, hay) => (Array.isArray(arr) && arr.length) ? arr.every(x => hay.includes(String(x).toLowerCase().trim())) : true;
    const regexOK = (pattern, hay) => {
      if (!pattern) return true;
      try { return new RegExp(pattern, 'i').test(hay); } catch(e){ return true; }
    };

    const subjAny = anyIncl(filters.subjectIncludes, s);
    const subjAll = filters.requireAllSubject ? allIncl(filters.subjectIncludes, s) : true;
    const subjRe  = regexOK(filters.subjectRegex, s);

    const fromAny = anyIncl(filters.fromIncludes, f);
    let domainOK = true;
    if (Array.isArray(filters.fromDomainWhitelist) && filters.fromDomainWhitelist.length) {
      const dom = (f.split("@")[1] || "").toLowerCase();
      domainOK = filters.fromDomainWhitelist.map(x=>String(x).toLowerCase().trim()).includes(dom);
    }

    const bodyAny = anyIncl(filters.bodyIncludes, b);
    const bodyAll = filters.requireAllBody ? allIncl(filters.bodyIncludes, b) : true;
    const bodyRe  = regexOK(filters.bodyRegex, b);

    const ignoreRe = filters.ignoreReplies && /^re:/i.test(meta.subject || "");
    const ignoreFwd = filters.ignoreForwards && /^fwd:/i.test(meta.subject || "");

    return !ignoreRe && !ignoreFwd && subjAny && subjAll && subjRe && fromAny && domainOK && bodyAny && bodyAll && bodyRe;
  }

  async function scan() {
    const { filters, enabled } = await loadFilters();
    if (!enabled) return;
    const m = meta();
    if (!matchFilters(m, filters)) return;
    const raw = (m.text || "").match(PHONE_REGEX) || [];
    const phones = dedupe(raw.map(normalize));
    if (phones.length === 0) return;
    chrome.runtime.sendMessage({ type: "APPEND_SHEET", payload: {
      subject: m.subject, from: m.from, phones, threadUrl: location.href, capturedAt: new Date().toISOString()
    }});
  }

  const obs = new MutationObserver(() => {
    const token = location.href.split("#")[1] || "";
    if (token && token !== lastToken) {
      lastToken = token;
      setTimeout(scan, 1200);
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(scan, 1800);

  // Allow testing from popup/options
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "TEST_MATCH") {
      (async () => {
        const { filters } = await loadFilters();
        const m = meta();
        const match = matchFilters(m, filters || {});
        const phones = dedupe(((m.text || "").match(PHONE_REGEX) || []).map(normalize));
        sendResponse({ ok: true, meta: m, match, phones });
      })();
      return true;
    }
  });
})();