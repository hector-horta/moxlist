/**
 * Wishlist parser — handles both API JSON and manual text import.
 */

import type { MoxfieldDeckResponse, MoxfieldBoard } from './types';

/**
 * Extracts card names from a Moxfield API deck/wishlist JSON response.
 * Iterates through all boards and collects unique card names.
 */
export function parseApiResponse(data: MoxfieldDeckResponse): string[] {
  const names = new Set<string>();

  if (!data?.boards) return [];

  for (const boardKey of Object.keys(data.boards)) {
    const board = data.boards[boardKey];
    if (!board?.cards) continue;

    extractFromBoard(board.cards, names);
  }

  return Array.from(names);
}

/**
 * Extracts card names from a single Moxfield board object.
 */
function extractFromBoard(board: MoxfieldBoard, names: Set<string>): void {
  for (const entryId of Object.keys(board)) {
    const entry = board[entryId];
    if (entry?.card?.name) {
      names.add(entry.card.name.trim());
    }
  }
}

/**
 * Parses a manually-imported wishlist text.
 * Supports common formats:
 *   - "1 Lightning Bolt"
 *   - "2x Sol Ring"
 *   - "Lightning Bolt"
 *   - "1x Lightning Bolt (M10)"    — strips set info in parens
 *   - "  3  Sol Ring  "            — handles extra whitespace
 *   - Empty lines and comments (#) are ignored
 */
export function parseManualText(text: string): string[] {
  const names = new Set<string>();
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    // Remove set info in parentheses: "Lightning Bolt (M10)" -> "Lightning Bolt"
    const withoutSet = line.replace(/\s*\([^)]*\)\s*$/, '').trim();

    // Try to match quantity prefix patterns:
    // "1 Lightning Bolt", "2x Sol Ring", "3X Card Name"
    const match = withoutSet.match(/^(\d+)\s*x?\s+(.+)$/i);

    if (match) {
      const cardName = match[2].trim();
      if (cardName) names.add(cardName);
    } else {
      // No quantity prefix — treat the whole line as a card name
      if (withoutSet) names.add(withoutSet);
    }
  }

  return Array.from(names);
}
