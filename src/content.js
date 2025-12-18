

const DOWNLOAD_REGEX = /\b(baixar|download|descargar|télécharger|herunterladen)\b/i;
const CLICKABLE_SELECTOR = "button,[role=\"button\"],a";

let isDownloading = false;
let metaCache = { href: "", title: "", pinId: "", imageUrl: "" };

/**
 * Check if element or its parents are the download button (max 5 levels)
 */
function isDownloadButton(el) {
  for (let i = 0; i < 5 && el; i++, el = el.parentElement) {
    const text = el.textContent;
    if (text && DOWNLOAD_REGEX.test(text)) return true;
    
    const aria = el.getAttribute?.("aria-label");
    if (aria && DOWNLOAD_REGEX.test(aria)) return true;
  }
  return false;
}

/**
 * Cache page title/pin for this URL to avoid repeated DOM queries
 */
function getPageMeta() {
  const href = location.href;
  if (metaCache.href === href) return metaCache;

  const metaTitle = document.querySelector('meta[property="og:title"]');
  const pinMatch = href.match(/\/pin\/(\d+)/);

  metaCache = {
    href,
    title: (metaTitle?.content || document.title || "").trim(),
    pinId: pinMatch?.[1] || "",
    imageUrl: ""
  };

  return metaCache;
}

/**
 * Get the best image URL from the page, with a cheap fallback
 */
function getBestImageUrl() {
  const meta = getPageMeta();
  if (meta.imageUrl) return meta.imageUrl;

  const metaImg = document.querySelector('meta[property="og:image"]');
  if (metaImg?.content) return (meta.imageUrl = metaImg.content);

  const mainImg =
    document.querySelector('[data-test-id="pin-closeup-image"] img') ||
    document.querySelector('[data-test-id="pin-closeup-image"]');
  if (mainImg?.src) return (meta.imageUrl = mainImg.src);

  const images = document.querySelectorAll('[data-test-id="pin-closeup"] img[src*="pinimg.com"], img[src*="pinimg.com"]');
  let best = null;
  let bestSize = 0;
  let checked = 0;
  for (const img of images) {
    if (++checked > 30) break; // avoid scanning huge feeds
    const size = img.naturalWidth * img.naturalHeight;
    if (size > bestSize) {
      bestSize = size;
      best = img.src;
    }
  }
  if (!best) return null;

  meta.imageUrl = best;
  return meta.imageUrl;
}

/**
 * Handle download button click
 */
function handleDownloadClick(event) {
  if (isDownloading) return;
  const buttonLike = event.target.closest(CLICKABLE_SELECTOR);
  if (!buttonLike || !isDownloadButton(buttonLike)) return;

  const imageUrl = getBestImageUrl();
  if (!imageUrl) {
    console.log("[Pinterest Fix] No image found");
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  isDownloading = true;
  setTimeout(() => { isDownloading = false; }, 500);

  const meta = getPageMeta();

  console.log("[Pinterest Fix] Downloading:", imageUrl, "as:", meta.title || meta.pinId);

  browser.runtime.sendMessage({
    type: "DOWNLOAD_IMAGE",
    imageUrl,
    title: meta.title,
    pinId: meta.pinId
  });
}

document.addEventListener("click", handleDownloadClick, true);

browser.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "GET_PIN_META") return;

  const meta = getPageMeta();
  return Promise.resolve({ title: meta.title, pinId: meta.pinId });
});

console.log("[Pinterest Fix] Content script loaded");

