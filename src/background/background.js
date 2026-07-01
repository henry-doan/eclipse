/* Eclipse — background service worker (MV3).
   Minimal by design: it reflects the ON/OFF state on the toolbar badge for
   the tab that reported it. All the real work happens in the content script
   and popup. */

const ACCENT = "#6c5ce7";

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: ACCENT });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.cmd !== "badge") return;
  const tabId = msg.tabId != null ? msg.tabId : sender.tab && sender.tab.id;
  if (tabId == null) return;
  chrome.action.setBadgeText({ tabId, text: msg.text || "" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: ACCENT });
});
