/**
 * Card name matching utilities.
 * Uses EXACT full-name matching (case-insensitive) to avoid
 * false positives like "Chaos Orb" matching "Chaos Confetti".
 */

/**
 * Normalizes a card name for consistent comparison.
 * - Lowercased
 * - Trimmed
 * - Collapsed whitespace
 * - Removed non-printable characters
 */
export function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, ''); // keep ASCII + Latin Extended
}

/**
 * Creates a Set of normalized card names for O(1) lookup.
 */
export function createCardIndex(cardNames: string[]): Set<string> {
  return new Set(cardNames.map(normalizeCardName));
}

/**
 * Checks if a card name is in the wishlist index.
 * Handles double-faced cards by checking both the full name
 * and the front face name (before "//").
 *
 * @example
 * isCardInWishlist("Delver of Secrets // Insectile Aberration", index)
 * // matches if "delver of secrets" OR "delver of secrets // insectile aberration" is in index
 */
export function isCardInWishlist(
  cardName: string,
  wishlistIndex: Set<string>,
): boolean {
  const normalized = normalizeCardName(cardName);
  if (wishlistIndex.has(normalized)) {
    return true;
  }

  // Check front face of double-faced cards
  if (normalized.includes(' // ')) {
    const frontFace = normalized.split(' // ')[0].trim();
    if (wishlistIndex.has(frontFace)) {
      return true;
    }
  }

  // Check if any wishlist card is a front face of this double-faced card
  // e.g., wishlist has "Delver of Secrets // Insectile Aberration"
  // but page shows only "Delver of Secrets"
  for (const wishlistCard of wishlistIndex) {
    if (wishlistCard.includes(' // ')) {
      const wishlistFront = wishlistCard.split(' // ')[0].trim();
      if (wishlistFront === normalized) {
        return true;
      }
    }
  }

  return false;
}
