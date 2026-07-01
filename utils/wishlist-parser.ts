/**
 * Wishlist parser — handles Moxfield API JSON responses.
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
