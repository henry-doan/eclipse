# Eclipse — Display Modes Chrome Extension

A minimal **Manifest V3** Chrome extension that applies one of several display modes to any
website from a small popup, and **remembers your choice per site**. Deliberately lightweight —
no frameworks, no build step, no DOM analysis.

## Modes

- ☀️ **Off** — the page as-is.
- 🌙 **Dark Mode** — invert + hue-rotate (media re-inverted so photos look normal).
- 🎨 **OLED Black** — like Dark, but forced to true black for OLED screens.
- 🧛 **Dracula** — a solid dark red-plum themed background with light text (editor-style).
- 🧜‍♀️ **Mermaid** — a solid deep-blue themed background with light text (editor-style).
- 🌅 **Warm Mode** — a warm, blue-light-reducing tint; keeps the page light.
- 📖 **Reading Mode** — dims and warms slightly for comfortable reading; keeps the page light.
- 👓 **High Contrast** — boosts contrast for legibility.

## Install (load unpacked)

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `eclipse` folder (the one containing
   `manifest.json`).
4. Eclipse appears in your toolbar. Click it on any website and flip the switch.

To update after editing files, click the **refresh/reload** icon on the Eclipse card in
`chrome://extensions`.

## Using it

- Click the toolbar icon to open the popup, then pick a mode (or **Off**).
- The change applies to the current tab immediately — no reload needed.
- Your choice is saved **per domain**: setting Dark on `github.com` doesn't affect
  `google.com`. When you revisit a site, it restores that site's mode on load.
- When a mode is active for a tab, the toolbar badge shows a short code (DARK, OLED, DRAC, MER,
  WARM, READ, HC).
- On pages Chrome doesn't allow extensions to touch (e.g. `chrome://`, the Web Store, PDFs),
  the popup shows a short note instead of the mode list.

## How it works

Each mode is a CSS `filter` on the page. The inverting modes (Dark, OLED) also **re-invert**
media (images, video, canvas, iframes) so photos look normal; the tinting modes (Warm, Reading,
High Contrast) leave the page light and just adjust it. All mode definitions live in one table in
the content script.

Three pieces work together:

- **Content script** (`src/content/darkMode.js`) — registered for all `http`/`https` pages and
  run at `document_start`. On load it reads this site's saved mode from `chrome.storage.local`
  and applies it *before the page paints*, so a themed site doesn't flash. It also listens for
  mode changes from the popup.
- **Popup** (`src/popup/*`) — reads the active tab's domain, shows the mode list with the
  current one highlighted, and on selection writes the mode to storage and tells the page to
  apply it right away. If the page loaded before the extension was installed (no content script
  yet), it falls back to injecting the script with the `scripting` API — which then self-applies
  from storage.
- **Background service worker** (`src/background/background.js`) — keeps the toolbar badge in
  sync with the ON/OFF state for each tab.

### Storage shape

One key per site in `chrome.storage.local`, holding the mode name:

```
"eclipse:github.com"  -> "dark"
"eclipse:reddit.com"  -> "reading"
"eclipse:google.com"  -> "off"
```

(Old boolean values from the on/off version are migrated: `true` is read as `"dark"`.)

## Permissions (and why)

- **storage** — remember the on/off choice per site.
- **activeTab** — read the current tab's URL and act on it when you open the popup.
- **scripting** — inject the content script on pages that were already open before install.

## File structure

```
eclipse-mvp/
├── manifest.json
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── content/
    │   └── darkMode.js      # applies/removes the filter; self-applies from storage at load
    ├── background/
    │   └── background.js    # service worker; toolbar badge sync
    └── popup/
        ├── popup.html       # title, toggle switch, status, current site
        ├── popup.css        # compact dark popup UI
        └── popup.js         # read/write per-site state, flip the live tab
```

## Known MVP limitations

The invert-filter approach is simple and fast but not perfect: some sites that already ship a
dark theme will look *lighter* when toggled on, background images get inverted, and heavy
`filter` use on huge pages can cost a little performance. That's expected for an MVP.

## Future hooks (intentionally not built)

Clear seams are left for later, without adding complexity now:

- a smarter color engine (map colors instead of inverting)
- per-element styling / a site allowlist of selectors to skip
- AI theme generation
- brightness / contrast sliders in the popup
- a WebGL shader mode

Each would slot in behind the same popup toggle and per-site storage that already exist.
