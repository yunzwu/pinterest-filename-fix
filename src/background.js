const MENU_ID = "pinterest-download-with-filename";

browser.contextMenus.create({
  id: MENU_ID,
  title: "Download Pinterest image with proper filename",
  contexts: ["image"]
});

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
  }
  return ".jpg";
}

/**
 * Download image with proper filename
 */
async function downloadWithFilename(imageUrl, title, imageAlt, pinId, imageId) {
  const ext = getExtensionFromUrl(imageUrl);
  const base =
    sanitizeBaseName(title) ||
    sanitizeBaseName(imageAlt) ||
    sanitizeBaseName(pinId) ||
    sanitizeBaseName(imageId) ||
    "pinterest-image";

  const filename = `Pinterest/${base}${ext}`;

  await browser.downloads.download({
    url: imageUrl,
    filename,
    conflictAction: "uniquify"
  });
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg?.type === "DOWNLOAD_IMAGE") {
    await downloadWithFilename(msg.imageUrl, msg.title, msg.imageAlt, msg.pinId, msg.imageId);
    return;
  }
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  const imageUrl = info.srcUrl;
  if (!imageUrl || !tab?.id) return;

  let meta = {};
  try {
    meta = await browser.tabs.sendMessage(tab.id, { type: "GET_PIN_META" });
  } catch {
  }

  await downloadWithFilename(imageUrl, meta.title, meta.imageAlt, meta.pinId, meta.imageId);
});

