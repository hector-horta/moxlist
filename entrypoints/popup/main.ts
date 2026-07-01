/**
 * MoxList — Popup UI Logic
 *
 * Handles:
 * - Displaying wishlist status
 * - Sync button (calls background to fetch API)
 * - Manual import (text paste)
 * - Card list display with search
 * - Settings toggles
 * - Clear wishlist
 */

import type { WishlistData, MoxListSettings, MoxListMessage, MoxListResponse } from '@/utils/types';

// --- DOM Elements ---
const statusValue = document.getElementById('status-value')!;
const cardCount = document.getElementById('card-count')!;
const lastUpdated = document.getElementById('last-updated')!;

const btnSync = document.getElementById('btn-sync') as HTMLButtonElement;
const btnVisit = document.getElementById('btn-visit') as HTMLButtonElement;



const listCard = document.getElementById('list-card')!;
const btnToggleList = document.getElementById('btn-toggle-list')!;
const listToggleIcon = document.getElementById('list-toggle-icon')!;
const listContent = document.getElementById('list-content')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const cardList = document.getElementById('card-list')!;

const toggleEnabled = document.getElementById('toggle-enabled') as HTMLInputElement;
const toggleBadge = document.getElementById('toggle-badge') as HTMLInputElement;

const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

// --- State ---
let currentWishlist: WishlistData | null = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', init);

async function init(): Promise<void> {
  await loadState();
  bindEvents();
}

// --- Load State ---
async function loadState(): Promise<void> {
  try {
    const [wishlistRes, settingsRes] = await Promise.all([
      sendMessage({ type: 'GET_WISHLIST' }),
      sendMessage({ type: 'GET_SETTINGS' }),
    ]);

    if (wishlistRes.success && wishlistRes.data) {
      currentWishlist = wishlistRes.data as WishlistData;
      updateStatusUI(currentWishlist);
    } else {
      updateStatusEmpty();
    }

    if (settingsRes.success && settingsRes.data) {
      const settings = settingsRes.data as MoxListSettings;
      toggleEnabled.checked = settings.enabled;
      toggleBadge.checked = settings.showBadge;
    }
  } catch {
    updateStatusError('Error loading status');
  }
}

// --- Event Bindings ---
function bindEvents(): void {
  // Sync
  btnSync.addEventListener('click', handleSync);

  // Visit Moxfield
  btnVisit.addEventListener('click', () => {
    browser.tabs.create({ url: 'https://www.moxfield.com/wishlist' });
  });



  // Toggle list section
  btnToggleList.addEventListener('click', () => {
    const isHidden = listContent.hidden;
    listContent.hidden = !isHidden;
    listToggleIcon.classList.toggle('open', isHidden);
  });

  // Search
  searchInput.addEventListener('input', () => {
    renderCardList(searchInput.value);
  });

  // Settings
  toggleEnabled.addEventListener('change', () => {
    sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { enabled: toggleEnabled.checked },
    });
  });

  toggleBadge.addEventListener('change', () => {
    sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { showBadge: toggleBadge.checked },
    });
  });

  // Clear
  btnClear.addEventListener('click', handleClear);
}

// --- Sync ---
async function handleSync(): Promise<void> {
  btnSync.disabled = true;
  const originalHTML = btnSync.innerHTML;
  btnSync.innerHTML = '<span class="spinner"></span> Syncing...';

  try {
    const response = await sendMessage({ type: 'SYNC_WISHLIST' });

    if (response.success && response.data) {
      currentWishlist = response.data as WishlistData;
      updateStatusUI(currentWishlist);
      showToast(`✅ ${currentWishlist.cards.length} cards synced successfully`);
    } else if (!response.success) {
      if (response.errorCode === 'AUTH_REQUIRED') {
        browser.tabs.create({ url: 'https://moxfield.com/account/signin' });
      }
      showToast(`❌ ${response.error || 'Unknown error'}`, 'error');
    }
  } catch (err) {
    showToast('❌ Connection error', 'error');
  } finally {
    btnSync.disabled = false;
    btnSync.innerHTML = originalHTML;
  }
}



// --- Clear ---
async function handleClear(): Promise<void> {
  if (!currentWishlist?.cards?.length) return;

  btnClear.disabled = true;
  try {
    await sendMessage({ type: 'CLEAR_WISHLIST' });
    currentWishlist = null;
    updateStatusEmpty();
    showToast('🗑️ Wishlist cleared');
  } catch {
    showToast('❌ Error clearing wishlist', 'error');
  } finally {
    btnClear.disabled = false;
  }
}

// --- UI Updates ---
function updateStatusUI(data: WishlistData): void {
  const count = data.cards.length;

  statusValue.textContent = '✅ Active';
  statusValue.className = 'status-value status-active';

  cardCount.textContent = `${count} card${count === 1 ? '' : 's'}`;
  cardCount.className = 'status-value status-active';

  const date = new Date(data.lastUpdated);
  lastUpdated.textContent = formatDate(date);
  lastUpdated.title = date.toISOString();

  // Show card list section
  listCard.hidden = false;
  renderCardList('');
}

function updateStatusEmpty(): void {
  statusValue.textContent = '⚠️ No wishlist';
  statusValue.className = 'status-value status-empty';
  cardCount.textContent = '—';
  cardCount.className = 'status-value';
  lastUpdated.textContent = '—';
  listCard.hidden = true;
}

function updateStatusError(msg: string): void {
  statusValue.textContent = `❌ ${msg}`;
  statusValue.className = 'status-value status-error';
}

function renderCardList(filter: string): void {
  if (!currentWishlist?.cards?.length) {
    cardList.innerHTML = '<li class="empty-message">No cards found</li>';
    return;
  }

  const normalized = filter.toLowerCase().trim();
  const filtered = normalized
    ? currentWishlist.cards.filter((c) => c.toLowerCase().includes(normalized))
    : currentWishlist.cards;

  const sorted = [...filtered].sort((a, b) => a.localeCompare(b));

  if (sorted.length === 0) {
    cardList.innerHTML = '<li class="empty-message">No results</li>';
    return;
  }

  cardList.innerHTML = sorted
    .map(
      (name) => `<li><span class="card-crown">👑</span> ${escapeHtml(name)}</li>`,
    )
    .join('');
}

// --- Helpers ---
function sendMessage(message: MoxListMessage): Promise<MoxListResponse> {
  return browser.runtime.sendMessage(message) as Promise<MoxListResponse>;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
