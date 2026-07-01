/**
 * Types for Moxfield API responses (reverse-engineered, unofficial).
 * These may change if Moxfield updates their internal API.
 */

/** A single card entry in a Moxfield deck/wishlist */
export interface MoxfieldCard {
  /** Unique card identifier on Moxfield */
  id: string;
  /** Scryfall ID */
  scryfall_id?: string;
  /** Card name (English) */
  name: string;
  /** Set code */
  set?: string;
  /** Collector number */
  cn?: string;
}

/** A board entry (mainboard, sideboard, considering, etc.) */
export interface MoxfieldBoardEntry {
  quantity: number;
  card: MoxfieldCard;
}

/** Board map from Moxfield API response */
export interface MoxfieldBoard {
  [cardId: string]: MoxfieldBoardEntry;
}

/** Deck/Wishlist response from Moxfield API */
export interface MoxfieldDeckResponse {
  id: string;
  name: string;
  publicId: string;
  boards: {
    mainboard?: { cards: MoxfieldBoard };
    sideboard?: { cards: MoxfieldBoard };
    commanders?: { cards: MoxfieldBoard };
    companions?: { cards: MoxfieldBoard };
    considering?: { cards: MoxfieldBoard };
    wishlist?: { cards: MoxfieldBoard };
    [key: string]: { cards: MoxfieldBoard } | undefined;
  };
}

// --- MoxList internal types ---

/** Stored wishlist data */
export interface WishlistData {
  /** Card names, normalized to lowercase and trimmed */
  cards: string[];
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Source of the data */
  source: 'sync';
}

/** Extension settings */
export interface MoxListSettings {
  /** Whether highlighting is enabled */
  enabled: boolean;
  /** Show floating badge with match count */
  showBadge: boolean;
}

/** Default settings */
export const DEFAULT_SETTINGS: MoxListSettings = {
  enabled: true,
  showBadge: true,
};

/** Messages between extension components */
export type MoxListMessage =
  | { type: 'GET_WISHLIST' }
  | { type: 'SYNC_WISHLIST' }

  | { type: 'CLEAR_WISHLIST' }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<MoxListSettings> }
  | { type: 'WISHLIST_UPDATED'; data: WishlistData }
  | { type: 'HIGHLIGHT_MATCHES'; count: number };

export type MoxListResponse =
  | { success: true; data?: unknown }
  | { success: false; error: string; errorCode?: string };
