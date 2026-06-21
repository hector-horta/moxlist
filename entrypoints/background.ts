/**
 * MoxList — Background Service Worker
 *
 * Responsibilities:
 * 1. Handle SYNC_WISHLIST: fetch the user's wishlist via Moxfield's internal API
 *    using the browser's existing cookies (user must be logged in).
 * 2. Handle IMPORT_WISHLIST: parse manually pasted text.
 * 3. Handle GET_WISHLIST / CLEAR_WISHLIST / GET_SETTINGS / UPDATE_SETTINGS.
 * 4. Notify content scripts when the wishlist changes.
 */

import { parseApiResponse, parseManualText } from '@/utils/wishlist-parser';
import { getWishlist, setWishlist, clearWishlist, getSettings, updateSettings } from '@/utils/storage';
import type { MoxListMessage, MoxListResponse, WishlistData, MoxfieldDeckResponse } from '@/utils/types';

export default defineBackground(() => {
  console.log('[MoxList] Background service worker started');

  // Listen for messages from popup and content scripts
  browser.runtime.onMessage.addListener(
    (message: MoxListMessage, _sender, sendResponse: (response: MoxListResponse) => void) => {
      handleMessage(message)
        .then((response) => sendResponse(response))
        .catch((err) => sendResponse({ success: false, error: String(err) }));

      // Return true to indicate async response
      return true;
    },
  );
});

async function handleMessage(message: MoxListMessage): Promise<MoxListResponse> {
  switch (message.type) {
    case 'SYNC_WISHLIST':
      return syncWishlist();

    case 'IMPORT_WISHLIST':
      return importWishlist(message.text);

    case 'GET_WISHLIST': {
      const data = await getWishlist();
      return { success: true, data };
    }

    case 'CLEAR_WISHLIST':
      await clearWishlist();
      notifyContentScripts({ type: 'WISHLIST_UPDATED', data: { cards: [], lastUpdated: '', source: 'manual' } });
      return { success: true };

    case 'GET_SETTINGS': {
      const settings = await getSettings();
      return { success: true, data: settings };
    }

    case 'UPDATE_SETTINGS': {
      const updated = await updateSettings(message.settings);
      return { success: true, data: updated };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Sync wishlist by calling Moxfield's internal API.
 * The extension has host_permissions for api2.moxfield.com,
 * so fetch() will include the user's cookies automatically.
 */
async function syncWishlist(): Promise<MoxListResponse> {
  try {
    const response = await fetch('https://api2.moxfield.com/v1/startup/authenticated', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'You are not logged into Moxfield. Please open moxfield.com, log in, and try again.',
        };
      }
      return {
        success: false,
        error: `Error connecting to Moxfield (HTTP ${response.status}).`,
      };
    }

    const data = await response.json();
    const wishlistDeck = data?.wishList?.deck;

    if (!wishlistDeck) {
      return {
        success: false,
        error: 'Could not retrieve your wishlist. Make sure you have a wishlist in your Moxfield account.',
      };
    }

    return processWishlistResponse(wishlistDeck);
  } catch (err) {
    return {
      success: false,
      error: `Connection error: ${err instanceof Error ? err.message : String(err)}. Check your connection and try again.`,
    };
  }
}

function processWishlistResponse(data: MoxfieldDeckResponse): MoxListResponse {
  const cardNames = parseApiResponse(data);

  if (cardNames.length === 0) {
    return {
      success: false,
      error: 'Your wishlist is empty or no cards could be read.',
    };
  }

  const wishlistData: WishlistData = {
    cards: cardNames,
    lastUpdated: new Date().toISOString(),
    source: 'sync',
  };

  setWishlist(wishlistData);
  notifyContentScripts({ type: 'WISHLIST_UPDATED', data: wishlistData });

  return { success: true, data: wishlistData };
}

async function importWishlist(text: string): Promise<MoxListResponse> {
  if (!text.trim()) {
    return { success: false, error: 'The text is empty.' };
  }

  const cardNames = parseManualText(text);

  if (cardNames.length === 0) {
    return {
      success: false,
      error: 'Could not extract card names from the text.',
    };
  }

  const wishlistData: WishlistData = {
    cards: cardNames,
    lastUpdated: new Date().toISOString(),
    source: 'manual',
  };

  await setWishlist(wishlistData);
  notifyContentScripts({ type: 'WISHLIST_UPDATED', data: wishlistData });

  return { success: true, data: wishlistData };
}

/**
 * Notify all Moxfield tabs that the wishlist was updated.
 */
async function notifyContentScripts(message: MoxListMessage): Promise<void> {
  try {
    const tabs = await browser.tabs.query({ url: '*://*.moxfield.com/*' });
    for (const tab of tabs) {
      if (tab.id != null) {
        browser.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab might not have content script loaded yet — that's OK
        });
      }
    }
  } catch {
    // Silently ignore errors when notifying tabs
  }
}
