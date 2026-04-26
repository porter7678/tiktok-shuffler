# TikTok Liked Videos Browser — Spec

## Overview

A local web app for browsing and shuffling your TikTok liked videos. The data source is a TikTok export JSON file (`user_data_tiktok.json`). Videos are played via TikTok's public embed player — no downloads required. The app runs locally via a FastAPI backend.

**Primary feature: shuffle.** The grid/timeline view is secondary.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Frontend | React (Vite), plain CSS (no UI library) |
| Data | Local JSON file — no database |
| Video playback | TikTok embed (`https://www.tiktok.com/embed/v2/{video_id}`) |
| Thumbnails | TikTok oEmbed API, proxied through backend, cached in memory |

---

## Project Structure

```
tiktok-browser/
├── backend/
│   ├── main.py            # FastAPI app
│   └── data_loader.py     # Parses user_data_tiktok.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── views/
│   │   │   ├── ShuffleView.jsx
│   │   │   └── GridView.jsx
│   │   └── components/
│   │       ├── VideoEmbed.jsx
│   │       ├── ThumbnailTile.jsx
│   │       └── MonthScrubber.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── user_data_tiktok.json  # Place export file here (or configure path)
└── README.md
```

---

## Data Model

### Source
`user_data_tiktok.json` → `["Likes and Favorites"]["Like List"]["ItemFavoriteList"]`

Each raw item:
```json
{
  "date": "2026-04-25 23:35:34",
  "link": "https://www.tiktokv.com/share/video/7631024397754600735/"
}
```

### Parsed Video Object (used throughout app)
```json
{
  "id": "7631024397754600735",
  "liked_at": "2026-04-25T23:35:34",
  "embed_url": "https://www.tiktok.com/embed/v2/7631024397754600735",
  "original_url": "https://www.tiktokv.com/share/video/7631024397754600735/"
}
```

**Extraction logic:** Parse the numeric video ID from the URL path segment `/video/(\d+)/`.

**Total videos:** ~4,666, spanning May 2020 – April 2026.

---

## Backend (FastAPI)

### Startup
- Load and parse `user_data_tiktok.json` once at startup into a list of video objects, sorted newest-first.
- Keep an in-memory thumbnail cache: `dict[video_id -> thumbnail_url | None]`.

### Endpoints

#### `GET /api/videos`
Returns the full list of parsed video objects (no thumbnails).

Response:
```json
{
  "total": 4666,
  "videos": [
    {
      "id": "...",
      "liked_at": "2026-04-25T23:35:34",
      "embed_url": "https://www.tiktok.com/embed/v2/...",
      "original_url": "https://..."
    }
  ]
}
```

#### `GET /api/thumbnail/{video_id}`
Fetches the thumbnail URL for a single video by proxying TikTok's oEmbed API.

- **oEmbed endpoint:** `https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/{video_id}`
- Returns `thumbnail_url` from oEmbed JSON response.
- Cache result in memory (even `null` for dead videos) so repeat calls don't re-fetch.
- Set a reasonable timeout (5s). On failure/timeout, return `{"thumbnail_url": null}`.

Response:
```json
{ "thumbnail_url": "https://p16-sign.tiktokcdn-us.com/..." }
```

#### `GET /api/random`
Returns a single random video object from the full list.

Response: same shape as a single item from `/api/videos`.

#### Static files
Serve the compiled React frontend from `frontend/dist/` at the root path `/`.

### Configuration
Accept the JSON file path via an environment variable `TIKTOK_JSON_PATH`, defaulting to `./user_data_tiktok.json`.

### Running
```bash
uvicorn backend.main:app --reload --port 8000
```

---

## Frontend (React + Vite)

### Vite Dev Proxy
In `vite.config.js`, proxy `/api` → `http://localhost:8000` so the dev server and backend don't conflict with CORS.

### App Shell (`App.jsx`)
- Fetches `/api/videos` once on mount. Stores video list in state.
- Two views, toggled by a top nav bar: **Shuffle** (default) and **Grid**.
- The nav bar is minimal — just a logo/title and two view toggle buttons.

---

## View 1: Shuffle (default view)

This is the primary feature. The UX goal is effortless, one-at-a-time video discovery.

### Layout
- Full-width, centered video embed (~390px wide, 16:9 or TikTok's native aspect ratio).
- Large **"Shuffle"** button below the player.
- A small **"Open on TikTok"** link beneath that opens `original_url` in a new tab.

### Behavior
1. On first load, automatically pick a random video and load it.
2. The "Shuffle" button calls `/api/random` and loads a new video.
3. **Replay behavior:** TikTok's embed player loops by default on most videos. If the user wants manual replay, provide a "Replay" button that reloads the iframe `src` (set `src` to empty then back to the embed URL). Do NOT auto-advance to the next video.
4. While the embed is loading, show a simple loading state (spinner or placeholder).

### VideoEmbed Component
- Renders an `<iframe>` with the TikTok embed URL.
- Props: `embedUrl`, `key` (change key to force remount on new video).
- iframe attributes: `allow="autoplay"`, `allowFullScreen`.

---

## View 2: Grid / Timeline

A scrollable grid of video thumbnails, organized chronologically with a month scrubber.

### Layout
- Left side (~80px wide): vertical **month scrubber** (fixed position).
- Right side: scrollable thumbnail grid — **3 columns**, thumbnails are square-ish tiles (roughly 9 visible on screen at once).

### Month Scrubber (`MonthScrubber.jsx`)
- Lists all months that have at least one liked video, formatted as e.g. `Apr '26`, `Mar '26`, etc., newest at top.
- Clicking a month label scrolls the grid to that month's section.
- As the user scrolls the grid, the scrubber highlights the currently visible month.
- Use `IntersectionObserver` on month-section headers in the grid to drive the active highlight.

### Grid (`GridView.jsx`)
- Videos are grouped by month. Each group has a sticky month header (e.g. `"April 2026 · 34 videos"`).
- Each tile is a `ThumbnailTile` component.
- Clicking a tile switches to Shuffle view and loads that specific video (pass the video object to the Shuffle view).

### ThumbnailTile Component (`ThumbnailTile.jsx`)
- Shows a fixed-size square tile (e.g. 160×160px or responsive).
- On mount (when tile enters viewport via `IntersectionObserver`), fetch `/api/thumbnail/{video_id}`.
- While loading: show a dark gray placeholder.
- If thumbnail loads: show the image, cropped/centered.
- If thumbnail is null (dead video): show the placeholder with a subtle ✕ or broken-image icon.
- On hover: slight scale or brightness effect.

---

## Key Implementation Notes

### Video ID extraction
Regex: `r'/video/(\d+)'` applied to each `link` field. If no match, skip that entry (log a warning).

### Thumbnail fetching strategy
Do **not** eagerly fetch all 4,666 thumbnails. Use `IntersectionObserver` in `ThumbnailTile` so thumbnails are only fetched when their tile scrolls into view. This avoids hammering TikTok's oEmbed API on load.

### TikTok embed behavior quirks
- The embed player is a sandboxed iframe. There is no reliable JS API to detect "video ended" without listening to `postMessage` events, which TikTok does not document publicly. Do not try to detect video end. Instead, provide a visible "Replay" button.
- The embed player shows TikTok's own UI (play button, like, share, etc.) — this is expected and fine.
- Some videos will show "Video unavailable" inside the iframe — this is expected for deleted/private videos. No special handling needed for v1.

### CORS
The oEmbed fetch is done server-side (FastAPI) to avoid browser CORS restrictions on TikTok's CDN.

### No persistence needed
No database. All state is in-memory. The video list is re-parsed from JSON on each server start.

---

## README (for the project)

Should include:
1. Prerequisites: Python 3.11+, Node 18+
2. Setup steps:
   - Place `user_data_tiktok.json` in project root (or set `TIKTOK_JSON_PATH` env var)
   - `pip install fastapi uvicorn httpx`
   - `cd frontend && npm install && npm run build`
3. Running: `uvicorn backend.main:app --port 8000` then open `http://localhost:8000`
4. Dev mode: run backend with `--reload`, run frontend with `npm run dev` (proxies `/api` to port 8000)

---

## Out of Scope for v1

- Dead link detection / pre-checking
- Filtering or search
- Favorited videos list
- Local video download / yt-dlp integration
- Any authentication
- Deployment / hosting
