/**
 * Storage utilities — typed wrapper around browser.storage.local.
 */

import type { WishlistData, MoxListSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

const KEYS = {
  WISHLIST: 'moxlist_wishlist',
  SETTINGS: 'moxlist_settings',
} as const;

// --- Wishlist ---

export async function getWishlist(): Promise<WishlistData | null> {
  const result = await browser.storage.local.get(KEYS.WISHLIST);
  return (result[KEYS.WISHLIST] as WishlistData) ?? null;
}

export async function setWishlist(data: WishlistData): Promise<void> {
  await browser.storage.local.set({ [KEYS.WISHLIST]: data });
}

export async function clearWishlist(): Promise<void> {
  await browser.storage.local.remove(KEYS.WISHLIST);
}

// --- Settings ---

export async function getSettings(): Promise<MoxListSettings> {
  const result = await browser.storage.local.get(KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(result[KEYS.SETTINGS] as Partial<MoxListSettings>) };
}

export async function updateSettings(
  partial: Partial<MoxListSettings>,
): Promise<MoxListSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await browser.storage.local.set({ [KEYS.SETTINGS]: updated });
  return updated;
}

// --- Storage change listener ---

export function onWishlistChanged(
  callback: (data: WishlistData | null) => void,
): void {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEYS.WISHLIST]) {
      callback(changes[KEYS.WISHLIST].newValue as WishlistData | null ?? null);
    }
  });
}
