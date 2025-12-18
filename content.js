/**
 * Content script for Pinterest pages.
 * Intercepts the "Download image" button to download with proper filenames.
 */

// Regex for download button text (all languages in one pattern)
const DOWNLOAD_REGEX = /\b(baixar|download|descargar|télécharger|herunterladen)\b/i;

// Debounce flag to prevent double downloads
let isDownloading = false;

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
 * Get the best image URL from the page
 */
function getBestImageUrl() {
  // Try og:image first
  const metaImg = document.querySelector('meta[property="og:image"]');
  if (metaImg?.content) return metaImg.content;

  // Try main pin image
  const mainImg = document.querySelector('[data-test-id="pin-closeup-image"] img');
  if (mainImg?.src) return mainImg.src;

  // Fallback: largest pinimg.com image
  const images = document.querySelectorAll('img[src*="pinimg.com"]');
  let best = null;
  let bestSize = 0;
  for (const img of images) {
    const size = img.naturalWidth * img.naturalHeight;
    if (size > bestSize) {
      bestSize = size;
      best = img.src;
    }
  }
  return best;
}

/**
 * Handle download button click
 */
function handleDownloadClick(event) {
  // Early exit if already downloading
  if (isDownloading) return;
  
  // Check if it's a download button
  if (!isDownloadButton(event.target)) return;

  // Get image URL
  const imageUrl = getBestImageUrl();
  if (!imageUrl) {
    console.log("[Pinterest Fix] No image found");
    return;
  }

  // Prevent Pinterest's default download
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  // Debounce
  isDownloading = true;
  setTimeout(() => { isDownloading = false; }, 500);

  // Get title for filename
  const metaTitle = document.querySelector('meta[property="og:title"]');
  const title = metaTitle?.content || document.title || "";
  const pinMatch = location.pathname.match(/\/pin\/(\d+)/);
  const pinId = pinMatch?.[1] || "";

  console.log("[Pinterest Fix] Downloading:", imageUrl, "as:", title || pinId);

  // Send to background script
  browser.runtime.sendMessage({
    type: "DOWNLOAD_IMAGE",
    imageUrl,
    title: title.trim(),
    pinId
  });
}

// Single event listener in capture phase
document.addEventListener("click", handleDownloadClick, true);

// Message listener for context menu
browser.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "GET_PIN_META") return;
  
  const metaTitle = document.querySelector('meta[property="og:title"]');
  const pinMatch = location.pathname.match(/\/pin\/(\d+)/);
  
  return Promise.resolve({
    title: (metaTitle?.content || document.title || "").trim(),
    pinId: pinMatch?.[1] || ""
  });
});

console.log("[Pinterest Fix] Content script loaded");
