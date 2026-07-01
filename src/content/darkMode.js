/* Eclipse — content script.
   Applies one of several display "modes" to the page, driven by the per-site
   preference saved in chrome.storage.local. Runs at document_start so a saved
   mode is applied before the page paints, and survives reloads.

   NOTE: the file keeps its original name for a stable manifest; it now handles
   multiple modes, not just dark. */

(() => {
  const STYLE_ID = "eclipse-mode-style";
  const host = location.hostname;
  const storageKey = "eclipse:" + host;

  const MEDIA = "img, picture, video, canvas, iframe, embed, object";

  /* Each mode: the root filter, whether media must be re-inverted (only the
     inverting modes need that), an optional forced page background, and the
     short toolbar badge code. */
  const MODES = {
    dark: {
      badge: "DARK",
      invertMedia: true,
      bg: "#fafafa",
      filter: "invert(1) hue-rotate(180deg)",
    },
    oled: {
      badge: "OLED",
      invertMedia: true,
      bg: "#ffffff", // invert of pure white = pure #000, i.e. true black
      filter: "invert(1) hue-rotate(180deg) brightness(0.92)",
    },
    dracula: {
      badge: "DRAC",
      type: "theme",
      // solid themed surface, like an editor color scheme
      theme: { bg: "#2a1620", panel: "#3a2230", fg: "#f8f8f2", accent: "#ff79c6", link: "#ff5555" },
    },
    mermaid: {
      badge: "MER",
      type: "theme",
      theme: { bg: "#0e2a3a", panel: "#123a4f", fg: "#e6f6ff", accent: "#67e8f9", link: "#8be9fd" },
    },
    warm: {
      badge: "WARM",
      invertMedia: false,
      bg: null,
      filter: "sepia(0.35) saturate(1.2) brightness(0.98)", // blue-light cut
    },
    reading: {
      badge: "READ",
      invertMedia: false,
      bg: null,
      filter: "sepia(0.22) brightness(0.9) contrast(0.92)", // dim, paper-ish
    },
    contrast: {
      badge: "HC",
      invertMedia: false,
      bg: null,
      filter: "contrast(1.5) saturate(1.1) brightness(1.03)",
    },
  };

  /* A "theme" mode forces its own colors, like an editor color scheme: a solid
     themed background, themed text, and themed panels for inputs/code. This
     overrides the page's own colors (so it can look off on complex sites — the
     tradeoff for a real themed background rather than a filter tint). */
  const themeCSS = (t) => [
    `:root, html, body { background-color: ${t.bg} !important; }`,
    // strip page backgrounds so the themed canvas shows through
    `body * { background-color: transparent !important; }`,
    // themed text + hairline borders everywhere
    `body, body * { color: ${t.fg} !important; border-color: rgba(255,255,255,0.10) !important; }`,
    // links / accents
    `a, a * { color: ${t.link} !important; }`,
    `h1, h2, h3, h4, h5, h6, strong, b { color: ${t.accent} !important; }`,
    // give interactive + code surfaces a readable themed panel
    `input, textarea, select, button, code, pre, kbd, samp, blockquote, table, th, td {`,
    `  background-color: ${t.panel} !important; color: ${t.fg} !important;`,
    `}`,
    `::placeholder { color: ${t.fg}88 !important; }`,
    // leave real media alone
    `img, picture, video, canvas, svg image { background-color: transparent !important; }`,
  ].join("\n");

  const buildCSS = (mode) => {
    const m = MODES[mode];
    if (!m) return "";
    if (m.type === "theme") return themeCSS(m.theme);
    let css = "";
    if (m.bg) css += `:root { background-color: ${m.bg} !important; }\n`;
    css += `html { filter: ${m.filter} !important; }\n`;
    if (m.invertMedia) css += `${MEDIA} { filter: invert(1) hue-rotate(180deg) !important; }\n`;
    return css;
  };

  const setMode = (mode) => {
    const existing = document.getElementById(STYLE_ID);
    const css = buildCSS(mode); // "" for off / unknown mode
    if (css) {
      const style = existing || document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = css;
      if (!existing) (document.head || document.documentElement).appendChild(style);
    } else if (existing) {
      existing.remove();
    }
  };

  // Normalize older/boolean values: true -> "dark", anything falsy -> off.
  const normalize = (v) => {
    if (v === true) return "dark";
    if (typeof v === "string" && MODES[v]) return v;
    return "off";
  };

  const applyFromStorage = () => {
    chrome.storage.local.get(storageKey).then((res) => {
      const mode = normalize(res[storageKey]);
      setMode(mode);
      const badge = MODES[mode] ? MODES[mode].badge : "";
      chrome.runtime.sendMessage({ cmd: "badge", text: badge }).catch(() => {});
    });
  };

  // Register the popup message listener exactly once.
  if (!window.__eclipseInit) {
    window.__eclipseInit = true;
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.cmd === "set") {
        setMode(msg.mode);
        sendResponse({ ok: true });
      } else if (msg && msg.cmd === "ping") {
        sendResponse({ ok: true });
      }
      return true;
    });
  }

  applyFromStorage();
})();
