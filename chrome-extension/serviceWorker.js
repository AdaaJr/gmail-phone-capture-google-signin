// serviceWorker.js — Google OAuth (launchWebAuthFlow) + Sheets append
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKENINFO = "https://www.googleapis.com/oauth2/v3/tokeninfo";
const SHEETS_APPEND = (id) => `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/phones!A:E:append?valueInputOption=RAW`;
const SHEETS_CREATE = "https://sheets.googleapis.com/v4/spreadsheets";

async function getConfig() {
  const s = await chrome.storage.sync.get(["googleClientId", "sheetId", "enabled", "scopes"]);
  return {
    clientId: s.googleClientId || "",
    sheetId: s.sheetId || "",
    enabled: s.enabled ?? true,
    scopes: s.scopes || ["https://www.googleapis.com/auth/spreadsheets"]
  };
}

async function ensureToken(interactive=true) {
  const cfg = await getConfig();
  if (!cfg.clientId) throw new Error("Client ID Google non configuré (Options).");
  const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
  const scopeParam = encodeURIComponent(cfg.scopes.join(" "));
  const authUrl = `${GOOGLE_AUTH_URL}?client_id=${encodeURIComponent(cfg.clientId)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopeParam}&prompt=consent`;
  const respUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive });
  const m = respUrl.match(/access_token=([^&]+)/);
  if (!m) throw new Error("Impossible de récupérer l'access_token");
  const accessToken = decodeURIComponent(m[1]);
  const expMatch = respUrl.match(/expires_in=([^&]+)/);
  const expiresIn = expMatch ? Number(decodeURIComponent(expMatch[1])) : 3600;
  const expiry = Date.now() + (expiresIn - 30) * 1000;
  await chrome.storage.local.set({ accessToken, tokenExpiry: expiry });
  return accessToken;
}

async function getValidToken() {
  const s = await chrome.storage.local.get(["accessToken", "tokenExpiry"]);
  if (s.accessToken && s.tokenExpiry && Date.now() < s.tokenExpiry) return s.accessToken;
  return ensureToken(true);
}

async function appendToSheet(rows) {
  const cfg = await getConfig();
  if (!cfg.sheetId) throw new Error("Sheet ID non configuré (Options).");
  const token = await getValidToken();
  const res = await fetch(SHEETS_APPEND(cfg.sheetId), {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: rows })
  });
  if (!res.ok) throw new Error("Sheets append error: " + await res.text());
  const data = await res.json();
  await chrome.storage.local.set({ lastSend: { ok:true, data, when: new Date().toISOString() } });
  return data;
}

async function createSpreadsheet(title="Gmail Phone Capture") {
  const token = await getValidToken();
  const res = await fetch(SHEETS_CREATE, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { title }, sheets: [{ properties: { title: "phones" } }] })
  });
  if (!res.ok) throw new Error("Sheets create error: " + await res.text());
  const data = await res.json();
  const id = data.spreadsheetId;
  await chrome.storage.sync.set({ sheetId: id });
  return id;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    enabled: true,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    filters: {
      subjectIncludes: [], subjectRegex: "", requireAllSubject: false,
      fromIncludes: [], fromDomainWhitelist: [],
      bodyIncludes: [], bodyRegex: "", requireAllBody: false,
      ignoreReplies: true, ignoreForwards: true
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "APPEND_SHEET") {
        const p = msg.payload || {};
        const rows = (p.phones || []).map(ph => [new Date().toISOString(), p.from||"", p.subject||"", ph, p.threadUrl||""]);
        const data = await appendToSheet(rows);
        sendResponse({ ok: true, data });
        return;
      }
      if (msg.type === "OAUTH_SIGNIN") {
        const tok = await ensureToken(true);
        sendResponse({ ok: true, token: tok });
        return;
      }
      if (msg.type === "SHEETS_CREATE") {
        const id = await createSpreadsheet(msg.title || "Gmail Phone Capture");
        sendResponse({ ok: true, sheetId: id });
        return;
      }
      if (msg.type === "GET_LAST") {
        const s = await chrome.storage.local.get(["lastSend"]);
        sendResponse({ ok: true, last: s.lastSend || null });
        return;
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true; // async
});