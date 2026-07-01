# MoxList — Wishlist Highlighter for Moxfield

MoxList is a cross-browser browser extension (compatible with both Chrome and Firefox) developed in TypeScript using the **WXT (Web Extension Toolkit)** framework. 

The extension highlights all cards from your Moxfield wishlist with a crown emoji (👑) and updates a floating counter badge in the bottom-right corner whenever they appear on any Moxfield page (such as other users' decklists, card searches, user profiles, trade pages, collections, etc.).

---

## Key Features

*   **One-Click Auto Sync**: Retrieves your Moxfield wishlist directly using your active session cookies in a single click.
*   **Automatic Login Redirect**: If you're not logged into Moxfield when syncing, the extension automatically opens the Moxfield sign-in page so you can authenticate and try again.
*   **Resilient Visual Highlights**: Prepends a 👑 emoji to matched card names and shows a floating counter badge ("X wishlist cards") with smooth transitions and animations.
*   **React/SPA Compatibility**: Uses a specialized MutationObserver that watches both DOM changes and text mutations (`characterData`), ensuring recycled React elements are re-scanned when browsing, paginating, or filtering.
*   **Variation and Suffix Normalization**: Extracts core card names by prioritizing direct text nodes, ignoring variant badges like `(Foil)`, `(Borderless)`, or collector numbers nested inside sub-elements.
*   **Double-Faced Card (DFC) Support**: Handles dual-sided cards (e.g., highlighting "Delver of Secrets // Insectile Aberration" by matching either the full name or the front face).
*   **Exact Matching**: Case-insensitive full-name comparison to avoid false positives (e.g., matching "Chaos Confetti" when "Chaos Orb" is in the wishlist).
*   **Premium Theme**: User interface styled with a dark navy theme and gold accents matching Moxfield's aesthetic.

---

## Directory Structure & Architecture

### Directory Layout

```
d:\dev\moxlist\
├── wxt.config.ts                    # WXT configuration (metadata, permissions, and targets)
├── package.json                     # Scripts and project dependencies (WXT, TypeScript)
├── tsconfig.json                    # TypeScript compiler configuration
├── public/                          # Static assets
│   ├── icon.svg                     # Vector source icon (Dorada crown)
│   └── icon/                        # PNG sizes required by browsers
├── utils/                           # Modular logical utilities
│   ├── types.ts                     # TypeScript interfaces and contracts
│   ├── storage.ts                   # Typed wrapper for browser.storage.local
│   ├── card-matcher.ts              # Normalization and exact matching algorithms
│   └── wishlist-parser.ts           # Parser for Moxfield API JSON responses
└── entrypoints/                     # Extension entry points
    ├── background.ts                # Service Worker handling API sync and messaging
    ├── content.ts                   # Content script for DOM scanning and highlighting
    └── popup/                       # Browser action toolbar popup
        ├── index.html
        ├── main.ts
        └── style.css
```

### Data Flow

```
[Moxfield Tab] ──(Cookies)──> [background.ts] ──(POST /startup/authenticated)──> [Moxfield API]
                                     │
                             (wishList.deck)
                                     ▼
                            [processApiResponse]
                                     ▼
                            [storage.ts (Save)]
                                     │
                             (WISHLIST_UPDATED)
                                     ▼
                              [content.ts] ──(DOM Scan & MutationObserver)──> Inject 👑 + Badge
```

---

## Tech Stack

*   **Core**: Vanilla TypeScript / JavaScript.
*   **Framework**: [WXT (Web Extension Toolkit)](https://wxt.dev/) — Automatically compiles Manifest V3 for Chrome and Manifest V2 for Firefox.
*   **Bundler**: Vite 8+ (configured internally by WXT).
*   **Styling**: Vanilla CSS (adaptive dark mode with HSL tailored colors and keyframe animations).

---

## API Details

Automatic synchronization fetches data from Moxfield's private, internal session endpoint:
*   **URL**: `POST https://api2.moxfield.com/v1/startup/authenticated`
*   **Headers**: `Content-Type: application/json`
*   **Body**: `{}`
*   **Authentication**: Session cookies (`credentials: 'include'`) sent securely from the Background Service Worker.

This endpoint returns a single unified JSON payload containing the authenticated profile details in `refresh` and the wishlist deck structure in `wishList.deck`, which contains the list of cards.

---

## Prerequisites

*   [Node.js](https://nodejs.org/) v20 or higher.
*   `npm` (installed with Node.js).

---

## Installation & Local Development Guide

### 1. Clone the repository
```bash
git clone https://github.com/hector-horta/moxlist.git
cd moxlist
```

### 2. Install dependencies
```bash
npm install
```

### 3. Development and Build Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Starts development server with HMR (Hot Module Replacement) in Google Chrome |
| `npm run dev:firefox` | Starts development server with HMR in Mozilla Firefox |
| `npm run compile` | Runs TypeScript compilation verification (`tsc --noEmit`) |
| `npm run build` | Builds the production extension for **Chrome (Manifest V3)** under `.output/chrome-mv3/` |
| `npm run build:firefox` | Builds the production extension for **Firefox (Manifest V2)** under `.output/firefox-mv2/` |
| `npm run zip` | Packages the Chrome build into a ZIP file for distribution |
| `npm run zip:firefox` | Packages the Firefox build into a ZIP file for distribution |

---

## How to Load the Extension in Your Browser

### Google Chrome / Chromium-based
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** (switch in the top-right corner).
3. Click **Load unpacked** in the top-left.
4. Select the build directory: `d:\dev\moxlist\.output\chrome-mv3\`.

### Mozilla Firefox
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file inside the build directory: `d:\dev\moxlist\.output\firefox-mv2/manifest.json`.

---

## License and Disclaimer

This project is an open-source tool developed solely for personal and community use. MoxList is **not** affiliated, associated, authorized, endorsed by, or in any way officially connected with Moxfield or Wizards of the Coast. The automatic sync feature relies on private endpoints and its stability depends on Moxfield maintaining their current internal API structure.
