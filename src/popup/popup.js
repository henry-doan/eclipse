/* Eclipse — popup logic.
   Shows the mode list, reflects the active tab's saved mode, and on selection
   writes storage + applies the mode to the live page immediately. */

let modesEl, siteEl, main, unsupported;

/* The order/labels shown in the popup. "off" clears any mode.
   Badge codes here mirror the ones in the content script. */
const MODES = [
  { id: "off", emoji: "☀️", label: "Off", badge: "" },
  { id: "dark", emoji: "🌙", label: "Dark Mode", badge: "DARK" },
  { id: "leprechaun", emoji: "🍀", label: "Leprechaun", badge: "LEP" },
  { id: "dracula", emoji: "🧛", label: "Dracula", badge: "DRAC" },
  { id: "mermaid", emoji: "🧜‍♀️", label: "Mermaid", badge: "MER" },
  { id: "warm", emoji: "🌅", label: "Warm Mode", badge: "WARM" },
  { id: "reading", emoji: "📖", label: "Reading Mode", badge: "READ" },
  { id: "contrast", emoji: "👓", label: "High Contrast", badge: "HC" },
];

let tabId = null;
let storageKey = null;
let current = "off";

const isWebUrl = (url) => /^https?:\/\//i.test(url || "");

const normalize = (v) => {
  if (v === true) return "dark"; // migrate old boolean values
  if (typeof v === "string" && MODES.some((m) => m.id === v)) return v;
  return "off";
};

const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const renderList = () => {
  modesEl.replaceChildren();
  MODES.forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mode" + (m.id === current ? " active" : "");
    btn.innerHTML = `<span class="emoji">${m.emoji}</span><span class="lbl">${m.label}</span><span class="tick">●</span>`;
    btn.addEventListener("click", () => select(m.id));
    modesEl.appendChild(btn);
  });
};

const applyToPage = async (mode) => {
  try {
    await chrome.tabs.sendMessage(tabId, { cmd: "set", mode });
    return;
  } catch (e) {
    // Content script not present yet (page opened before install): inject it,
    // and it self-applies the mode we just saved to storage.
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content/darkMode.js"] });
    } catch (err) {
      // Truly unsupported page — nothing else to do.
    }
  }
};

const badgeFor = (mode) => {
  const m = MODES.find((x) => x.id === mode);
  return m ? m.badge : "";
};

const select = async (mode) => {
  current = mode;
  renderList();
  if (storageKey) await chrome.storage.local.set({ [storageKey]: mode });
  await applyToPage(mode);
  chrome.runtime.sendMessage({ cmd: "badge", tabId, text: badgeFor(mode) }).catch(() => {});
};

const init = async () => {
  modesEl = document.getElementById("modes");
  siteEl = document.getElementById("site");
  main = document.getElementById("main");
  unsupported = document.getElementById("unsupported");

  const tab = await getActiveTab();
  if (!tab || !isWebUrl(tab.url)) {
    main.hidden = true;
    unsupported.hidden = false;
    return;
  }
  tabId = tab.id;
  const host = new URL(tab.url).hostname;
  storageKey = "eclipse:" + host;
  siteEl.textContent = host;

  const stored = await chrome.storage.local.get(storageKey);
  current = normalize(stored[storageKey]);
  renderList();
};

document.addEventListener("DOMContentLoaded", init);
