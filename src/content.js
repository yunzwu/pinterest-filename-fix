const DOWNLOAD_REGEX = /\b(baixar|download|descargar|télécharger|herunterladen)\b/i;
const CLICKABLE_SELECTOR = "button,[role=\"button\"],a";
const GENERIC_TITLES = /^pinterest(\s*[-–—|:]\s*(home|início|inicio|accueil|startseite))?$/i;
const TITLE_SELECTORS = [
  '[data-test-id="pin-closeup"] h1',
  '[data-test-id="pinrep-title"]',
  '[data-test-id="pin-title"]',
  '[role="dialog"] h1',
  '[data-test-id="pin-closeup"] [data-test-id="title"]',
  '[data-test-id="CloseupPage"] h1',
  'div[data-test-id] h1'
];
const PRIORITY_IMAGE_SELECTORS = [
  '[data-test-id="pin-closeup-image"] img[src*="pinimg.com"]',
  '[data-test-id="closeup-image"] img[src*="pinimg.com"]',
  '[data-test-id="pin-closeup"] img[src*="pinimg.com"]',
  '[role="dialog"] img[src*="pinimg.com"]',
  '[data-test-id="pinRep"] img[src*="pinimg.com"]',
  'div[data-test-id="pin"] img[src*="pinimg.com"]'
];
const META_CACHE_TTL = 1200; // ms to refresh metadata on fast in-page navigation

let isDownloading = false;
let metaCache = { href: "", title: "", pinId: "", imageUrl: "", imageAlt: "", fetchedAt: 0 };

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
 * Get fresh metadata for the currently visible pin
 */
function getPageMeta() {
  const href = location.href;
  const now = Date.now();

  if (metaCache.href === href && now - metaCache.fetchedAt < META_CACHE_TTL) {
    return metaCache;
  }

  const pinMatch = href.match(/\/pin\/(\d+)/);
  let title = "";
  
  for (const selector of TITLE_SELECTORS) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && !GENERIC_TITLES.test(text)) {
      title = text;
      break;
    }
  }
  
  if (!title) {
    for (const h1 of document.querySelectorAll('h1')) {
      const text = h1.textContent?.trim();
      if (text && !GENERIC_TITLES.test(text) && text.length > 2 && text.length < 200) {
        title = text;
        break;
      }
    }
  }

  metaCache = {
    href,
    title,
    pinId: pinMatch?.[1] || "",
    imageUrl: "",
    imageAlt: "",
    fetchedAt: now
  };

  return metaCache;
}

/**
 * Get the best image URL from the page
 */
function getBestImageUrl(meta = getPageMeta()) {
  meta.imageUrl = "";
  meta.imageAlt = "";

  for (const selector of PRIORITY_IMAGE_SELECTORS) {
    const img = document.querySelector(selector);
    if (img?.src && img.src.includes('pinimg.com')) {
      meta.imageUrl = img.src;
      meta.imageAlt = img.alt?.trim() || "";
      return meta.imageUrl;
    }
  }

  const images = document.querySelectorAll('img[src*="pinimg.com"]');
  let bestImg = null;
  let bestSize = 0;
  let checked = 0;
  
  for (const img of images) {
    if (++checked > 50) break;
    if (img.naturalWidth < 200 || img.naturalHeight < 200) continue;
    if (img.src.includes('/user/') || img.src.includes('/board/')) continue;
    
    const size = img.naturalWidth * img.naturalHeight;
    if (size > bestSize) {
      bestSize = size;
      bestImg = img;
    }
  }
  
  if (bestImg) {
    meta.imageUrl = bestImg.src;
    meta.imageAlt = bestImg.alt?.trim() || "";
    return meta.imageUrl;
  }

  const metaImg = document.querySelector('meta[property="og:image"]');
  if (metaImg?.content && metaImg.content.includes('pinimg.com')) {
    meta.imageUrl = metaImg.content;
    return meta.imageUrl;
  }

  return null;
}

/**
 * Handle download button click
 */
function handleDownloadClick(event) {
  if (isDownloading) return;
  const buttonLike = event.target.closest(CLICKABLE_SELECTOR);
  if (!buttonLike || !isDownloadButton(buttonLike)) return;

  const meta = getPageMeta();
  const imageUrl = getBestImageUrl(meta);
  if (!imageUrl) {
    console.log("[Pinterest Fix] No image found");
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  isDownloading = true;
  setTimeout(() => { isDownloading = false; }, 500);

  let title = meta.title;
  if (GENERIC_TITLES.test(title)) title = "";

  let imageId = "";
  const urlMatch = imageUrl.match(/\/([a-f0-9]{6,})[^/]*\.[a-z]+$/i);
  if (urlMatch) imageId = urlMatch[1];

  const imageAlt = meta.imageAlt || "";
  const finalName = title || imageAlt || meta.pinId || imageId;
  console.log("[Pinterest Fix] Downloading:", imageUrl, "as:", finalName);

  browser.runtime.sendMessage({
    type: "DOWNLOAD_IMAGE",
    imageUrl,
    title,
    imageAlt,
    pinId: meta.pinId,
    imageId
  });
}

document.addEventListener("click", handleDownloadClick, true);

browser.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "GET_PIN_META") return;

  const meta = getPageMeta();
  return Promise.resolve({ title: meta.title, pinId: meta.pinId });
});

console.log("[Pinterest Fix] Content script loaded");
