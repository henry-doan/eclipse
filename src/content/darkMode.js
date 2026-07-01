/* Eclipse MVP — content script.
   Applies (or removes) a dark-mode CSS filter on the page, driven by the
   per-site preference saved in chrome.storage.local. Runs at document_start
   so a saved "ON" site is dark before it paints, and survives page reloads. */

(() => {
  const STYLE_ID = "eclipse-dark-style";
  const host = location.hostname;
  const storageKey = "eclipse:" + host;

  /* The MVP dark-mode technique: invert the whole page and rotate hue so
     colors stay roughly right, then RE-invert media so photos/video look
     normal. (Future: a smarter per-element color engine can replace this.) */
  const CSS = [
    ":root { background-color: #fafafa !important; }",
    "html { filter: invert(1) hue-rotate(180deg) !important; }",
    "img, picture, video, canvas, iframe, embed, object {",
    "  filter: invert(1) hue-rotate(180deg) !important;",
    "}",
  ].join("\n");

  const setDark = (on) => {
    const existing = document.getElementById(STYLE_ID);
    if (on && !existing) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      (document.head || document.documentElement).appendChild(style);
    } else if (!on && existing) {
      existing.remove();
    }
  };

  const applyFromStorage = () => {
    chrome.storage.local.get(storageKey).then((res) => {
      const enabled = !!res[storageKey];
      setDark(enabled);
      // Keep the toolbar badge in sync after reloads/navigation.
      chrome.runtime.sendMessage({ cmd: "badge", enabled }).catch(() => {});
    });
  };

  // Register the popup message listener exactly once, even if this script is
  // re-injected via the scripting API.
  if (!window.__eclipseInit) {
    window.__eclipseInit = true;
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.cmd === "set") {
        setDark(!!msg.enabled);
        sendResponse({ ok: true });
      } else if (msg && msg.cmd === "ping") {
        sendResponse({ ok: true });
      }
      return true;
    });
  }

  // Always apply the current saved state on (re)injection.
  applyFromStorage();
})();
