/**
 * MoxList — Content Script
 *
 * Runs on ALL Moxfield pages.
 * Detects card names in the DOM, checks against the cached wishlist,
 * and highlights matches with a 👑 crown emoji.
 * Also shows a floating badge with the count of matched cards.
 *
 * Uses MutationObserver for dynamic SPA content changes.
 */

import { getWishlist, getSettings, onWishlistChanged } from '@/utils/storage';
import { createCardIndex, isCardInWishlist } from '@/utils/card-matcher';
import type { WishlistData, MoxListSettings, MoxListMessage } from '@/utils/types';

// Marker attribute to avoid re-processing elements
const PROCESSED_ATTR = 'data-moxlist-processed';
const CROWN_CLASS = 'moxlist-crown';
const BADGE_ID = 'moxlist-badge';

let wishlistIndex: Set<string> = new Set();
let settings: MoxListSettings = { enabled: true, showBadge: true };
let matchCount = 0;
let observer: MutationObserver | null = null;

export default defineContentScript({
  matches: ['*://*.moxfield.com/*'],
  runAt: 'document_idle',

  async main() {
    console.log('[MoxList] Content script loaded');

    // Load wishlist and settings
    const [wishlistData, currentSettings] = await Promise.all([
      getWishlist(),
      getSettings(),
    ]);

    settings = currentSettings;

    if (wishlistData?.cards?.length) {
      wishlistIndex = createCardIndex(wishlistData.cards);
    }

    if (!settings.enabled || wishlistIndex.size === 0) {
      console.log('[MoxList] Disabled or no wishlist cards');
      return;
    }

    // Inject styles
    injectStyles();

    // Initial scan
    scanPage();

    // Watch for DOM changes (Moxfield is a SPA)
    startObserver();

    // Listen for wishlist updates from background
    browser.runtime.onMessage.addListener((message: MoxListMessage) => {
      if (message.type === 'WISHLIST_UPDATED') {
        const data = message.data as unknown as WishlistData;
        wishlistIndex = createCardIndex(data.cards);
        resetHighlights();
        scanPage();
      }
    });

    // Listen for storage changes
    onWishlistChanged((data) => {
      if (data) {
        wishlistIndex = createCardIndex(data.cards);
      } else {
        wishlistIndex = new Set();
      }
      resetHighlights();
      scanPage();
    });
  },
});

/**
 * Injects the CSS styles for crown badges and the floating counter.
 */
function injectStyles(): void {
  const style = document.createElement('style');
  style.id = 'moxlist-styles';
  style.textContent = `
    .${CROWN_CLASS} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85em;
      margin-right: 3px;
      cursor: default;
      animation: moxlist-pop 0.3s ease-out;
      filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.6));
    }

    @keyframes moxlist-pop {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.3); }
      100% { transform: scale(1); opacity: 1; }
    }

    #${BADGE_ID} {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #ffd700;
      padding: 10px 18px;
      border-radius: 50px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.4),
        0 0 15px rgba(255, 215, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(255, 215, 0, 0.2);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      cursor: default;
      user-select: none;
      opacity: 0;
      transform: translateY(20px);
      animation: moxlist-slide-in 0.4s ease-out 0.5s forwards;
    }

    #${BADGE_ID}:hover {
      transform: translateY(-2px);
      box-shadow:
        0 6px 25px rgba(0, 0, 0, 0.5),
        0 0 20px rgba(255, 215, 0, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 215, 0, 0.4);
    }

    #${BADGE_ID} .moxlist-badge-count {
      background: rgba(255, 215, 0, 0.15);
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 13px;
      border: 1px solid rgba(255, 215, 0, 0.3);
    }

    @keyframes moxlist-slide-in {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Scans the entire page for card name elements and highlights matches.
 */
function scanPage(): void {
  if (wishlistIndex.size === 0) return;

  const elementsToProcess = new Set<HTMLElement>();

  // Strategy 1: Links to card pages (/cards/...)
  // These are the most reliable selectors across all Moxfield views
  const cardLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/cards/"]'
  );
  for (const link of cardLinks) {
    elementsToProcess.add(link);
  }

  // Strategy 2: Elements with card data attributes
  const cardElements = document.querySelectorAll<HTMLElement>(
    '[data-card-name], [data-name]'
  );
  for (const el of cardElements) {
    elementsToProcess.add(el);
  }

  // Strategy 3: Deck table rows — text view
  // In text view, card names appear as link text inside table rows
  const tableLinks = document.querySelectorAll<HTMLAnchorElement>(
    'table a, .deckbox a, [class*="deck"] a'
  );
  for (const link of tableLinks) {
    elementsToProcess.add(link);
  }

  // Process each unique element exactly once
  matchCount = 0;
  for (const el of elementsToProcess) {
    processCardElement(el);
  }

  // Update badge
  updateBadge();
}

/**
 * Processes a single card element (typically an <a> link).
 * Extracts the card name from the text content and checks against wishlist.
 */
function processCardElement(el: HTMLElement): void {
  // Skip hidden elements to prevent cards in invisible SPA views or containers from inflating the count
  if (el.offsetWidth === 0 && el.offsetHeight === 0) {
    return;
  }
  const name = extractCardName(el);
  if (!name) return;
  processCardWithName(el, name);
}



/**
 * Core processor for highlighting cards with safety checks for SPA updates.
 */
function processCardWithName(el: HTMLElement, name: string): void {
  const processedName = el.getAttribute(PROCESSED_ATTR);

  // If already processed and the card name hasn't changed
  if (processedName === name) {
    if (isCardInWishlist(name, wishlistIndex)) {
      matchCount++;
      addCrown(el);
    }
    return;
  }

  // Name changed or first time processing:
  // 1. Remove old crown if any
  removeCrown(el);

  // 2. Save the current card name as the processed marker
  el.setAttribute(PROCESSED_ATTR, name);

  // 3. Apply crown if match
  if (isCardInWishlist(name, wishlistIndex)) {
    addCrown(el);
    matchCount++;
  }
}

/**
 * Removes the crown element from an element.
 */
function removeCrown(el: HTMLElement): void {
  const crown = el.querySelector(`.${CROWN_CLASS}`);
  if (crown) crown.remove();
}

/**
 * Extracts a card name from an element.
 * Tries multiple strategies in order of reliability.
 */
function extractCardName(el: HTMLElement): string | null {
  // 1. Data attributes (most reliable)
  const dataName = el.getAttribute('data-card-name')
    || el.getAttribute('data-name')
    || el.getAttribute('aria-label');
  if (dataName) return dataName.trim();

  // 2. Title attribute
  if (el.title) return el.title.trim();

  // 3. Direct text nodes first (avoids grabbing text from child elements like badges or variant spans)
  let text = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === 3) { // Node.TEXT_NODE
      text += child.nodeValue || '';
    }
  }
  text = text.trim();

  // Fallback to full textContent if there is no direct text node (e.g., highly nested structures)
  if (!text) {
    text = el.textContent?.trim() || '';
  }

  if (text && text.length > 0 && text.length < 100) {
    // Remove quantity prefixes that might be in the same element (e.g. "2x Sol Ring")
    const cleaned = text.replace(/^\d+x?\s+/i, '').trim();
    
    // Remove trailing variation/edition details in parentheses or brackets (e.g. "Dramatic Reversal (Foil)")
    const withoutSuffix = cleaned.replace(/\s*[([].*?[\])]\s*$/, '').trim();
    
    return withoutSuffix || null;
  }

  return null;
}

/**
 * Adds a 👑 crown emoji before the card name in the element.
 */
function addCrown(el: HTMLElement): void {
  // Don't add if already has a crown
  if (el.querySelector(`.${CROWN_CLASS}`)) return;

  const crown = document.createElement('span');
  crown.className = CROWN_CLASS;
  crown.textContent = '👑';
  crown.title = 'In your MoxList wishlist';

  // Insert crown at the beginning of the element
  el.insertBefore(crown, el.firstChild);
}

/**
 * Updates or creates the floating badge showing match count.
 */
function updateBadge(): void {
  if (!settings.showBadge) {
    removeBadge();
    return;
  }

  let badge = document.getElementById(BADGE_ID);

  if (matchCount === 0) {
    removeBadge();
    return;
  }

  if (!badge) {
    badge = document.createElement('div');
    badge.id = BADGE_ID;
    document.body.appendChild(badge);
  }

  badge.innerHTML = `
    <span>👑</span>
    <span><span class="moxlist-badge-count">${matchCount}</span> wishlist card${matchCount === 1 ? '' : 's'}</span>
  `;
}

/**
 * Removes the floating badge.
 */
function removeBadge(): void {
  const badge = document.getElementById(BADGE_ID);
  if (badge) badge.remove();
}

/**
 * Removes all highlights and resets state.
 */
function resetHighlights(): void {
  // Remove all crowns
  const crowns = document.querySelectorAll(`.${CROWN_CLASS}`);
  for (const crown of crowns) {
    crown.remove();
  }

  // Clear processed markers
  const processed = document.querySelectorAll(`[${PROCESSED_ATTR}]`);
  for (const el of processed) {
    el.removeAttribute(PROCESSED_ATTR);
  }

  // Remove badge
  removeBadge();

  matchCount = 0;
}

/**
 * Starts a MutationObserver to detect dynamically loaded content.
 * Moxfield is a SPA, so content changes without full page reloads.
 */
function startObserver(): void {
  if (observer) observer.disconnect();

  // Debounce scan calls to avoid excessive processing during rapid mutations
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  observer = new MutationObserver((mutations) => {
    let shouldScan = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
      if (mutation.type === 'characterData') {
        shouldScan = true;
        break;
      }
    }

    if (!shouldScan) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      scanPage();
    }, 200);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
