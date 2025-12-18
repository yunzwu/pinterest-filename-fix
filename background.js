/**
 * Background script for Pinterest Filename Fix extension.
 * Handles downloads with proper filenames.
 */

const MENU_ID = "pinterest-download-with-filename";

browser.contextMenus.create({
  id: MENU_ID,
  title: "Download Pinterest image with proper filename",
  contexts: ["image"]
});

/**
 * Sanitize a string to be safe for use as a filename.
 * Removes filesystem-illegal characters on Windows/macOS/Linux.
 */
function sanitizeBaseName(s) {
  return (s || "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * Extract file extension from a URL, defaulting to .jpg if not found.
 */
function getExtensionFromUrl(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (m) return "." + m[1].toLowerCase();
  } catch {
    // Invalid URL, fall through to default
  }
  // If Pinterest/CDN URL has no extension, default to .jpg
  return ".jpg";
}

/**
 * Download image with proper filename
 */
async function downloadWithFilename(imageUrl, title, pinId) {
  const ext = getExtensionFromUrl(imageUrl);
  const base =
    sanitizeBaseName(title) ||
    sanitizeBaseName(pinId) ||
    "pinterest-image";

  const filename = `Pinterest/${base}${ext}`;

  await browser.downloads.download({
    url: imageUrl,
    filename,
    conflictAction: "uniquify"
  });
}

// Handle messages from content script (download button intercept)
browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg?.type === "DOWNLOAD_IMAGE") {
    await downloadWithFilename(msg.imageUrl, msg.title, msg.pinId);
    return;
  }
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  const imageUrl = info.srcUrl;
  if (!imageUrl || !tab?.id) return;

  // Ask the content script (on pinterest.com) for a good name.
  let meta = {};
  try {
    meta = await browser.tabs.sendMessage(tab.id, { type: "GET_PIN_META" });
  } catch {
    // Content script not available (e.g., not on pinterest.com)
  }

  await downloadWithFilename(imageUrl, meta.title, meta.pinId);
});
