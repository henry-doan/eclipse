# Eclipse — Simple Dark Mode Chrome Extension

A minimal **Manifest V3** Chrome extension that applies a dark-mode filter to any website,
toggled from a small popup, and **remembered per site**. Deliberately lightweight — no
frameworks, no build step, no DOM analysis.

## Install (load unpacked)

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `eclipse` folder (the one containing
   `manifest.json`).
4. Eclipse appears in your toolbar. Click it on any website and flip the switch.

To update after editing files, click the **refresh/reload** icon on the Eclipse card in
`chrome://extensions`.

## Using it

- Click the toolbar icon to open the popup, then toggle **On/Off**.
- The change applies to the current tab immediately — no reload needed.
- Your choice is saved **per domain**: turning it on for `github.com` doesn't affect
  `google.com`. When you revisit a site, it restores that site's setting on load.
- When dark mode is on for a tab, the toolbar badge shows **ON**.
- On pages Chrome doesn't allow extensions to touch (e.g. `chrome://`, the Web Store, PDFs),
  the popup shows a short note instead of a toggle.

## How it works

The dark effect is the classic MVP technique: invert the whole page and rotate the hue by 180°
so colors stay roughly right, then **re-invert** media (images, video, canvas, iframes) so
photos look normal.

```css
html { filter: invert(1) hue-rotate(180deg); }
img, picture, video, canvas, iframe, embed, object { filter: invert(1) hue-rotate(180deg); }
```

Three pieces work together:

- **Content script** (`src/content/darkMode.js`) — registered for all `http`/`https` pages and
  run at `document_start`. On load it reads this site's saved preference from
  `chrome.storage.local` and applies the filter *before the page paints*, so an enabled site
  doesn't flash white on refresh. It also listens for on/off messages from the popup.
- **Popup** (`src/popup/*`) — reads the active tab's domain, shows the current state, and on
  toggle writes the new value to storage and tells the page to apply it right away. If the page
  loaded before the extension was installed (so no content script is present yet), it falls back
  to injecting the script with the `scripting` API — which then self-applies from storage.
- **Background service worker** (`src/background/background.js`) — keeps the toolbar badge in
  sync with the ON/OFF state for each tab.

### Storage shape

One key per site in `chrome.storage.local`:

```
"eclipse:github.com"  -> true
"eclipse:google.com"  -> false
```

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
