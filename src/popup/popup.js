/* Eclipse MVP — popup logic.
   Reads the saved preference for the active tab's site, reflects it in the
   toggle, and on change writes storage + flips the live page immediately. */

const toggle = document.getElementById("toggle");
const statusEl = document.getElementById("status");
const dot = document.getElementById("dot");
const siteEl = document.getElementById("site");
const main = document.getElementById("main");
const unsupported = document.getElementById("unsupported");

let tabId = null;
let storageKey = null;

const isWebUrl = (url) => /^https?:\/\//i.test(url || "");

const render = (enabled) => {
  toggle.checked = enabled;
  statusEl.textContent = enabled ? "On" : "Off";
  dot.classList.toggle("on", enabled);
};

const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const init = async () => {
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
  render(!!stored[storageKey]);
};

const applyToPage = async (enabled) => {
  // Preferred path: message the already-injected content script.
  try {
    await chrome.tabs.sendMessage(tabId, { cmd: "set", enabled });
    return;
  } catch (e) {
    // No content script yet (e.g. the page loaded before the extension was
    // installed). Inject it — it self-applies the state we just saved.
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["src/content/darkMode.js"],
      });
    } catch (err) {
      // Truly unsupported page — nothing else to do.
    }
  }
};

toggle.addEventListener("change", async () => {
  const enabled = toggle.checked;
  render(enabled);
  if (storageKey) await chrome.storage.local.set({ [storageKey]: enabled });
  await applyToPage(enabled);
  chrome.runtime.sendMessage({ cmd: "badge", tabId, enabled }).catch(() => {});
});

init();
