# TikTok Liked Videos Browser — Spec

> **Migration status:** The downloader (`scripts/download_tiktoks.py`) is implemented and this SPEC describes the **target** offline-first architecture. The backend and frontend still use the TikTok embed flow; cutover to local file playback is the next milestone.

## Overview

A local web app for browsing and shuffling your TikTok liked videos. The data source is a TikTok export JSON file (`user_data_tiktok.json`) — used only to get the list of video IDs to download. Videos are downloaded offline using yt-dlp to a local directory (default: `/mnt/d/tiktoks`). During browsing, playback uses a plain `<video>` element served by FastAPI — no embed player, no TikTok network calls required.

**Primary feature: shuffle.** The grid/timeline view is secondary.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Frontend | React (Vite), plain CSS (no UI library) |
| Data | Local JSON file — no database |
| Downloader | yt-dlp (Python library), `scripts/download_tiktoks.py` |
| Local video storage | `/mnt/d/tiktoks/` (configurable via `TIKTOK_VIDEO_DIR`) |
| Video playback | Local `<video>` tag; files served by FastAPI `StaticFiles` |
| Thumbnails | `<id>.jpg` written by yt-dlp alongside the video — no oEmbed calls |

---

## Project Structure

```
tiktok-shuffler/
├── backend/
│   ├── main.py            # FastAPI app
│   └── data_loader.py     # Parses user_data_tiktok.json + checks disk for available videos
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── views/
│   │   │   ├── ShuffleView.jsx
│   │   │   └── GridView.jsx
│   │   └── components/
│   │       ├── VideoPlayer.jsx     # <video> tag (replaces VideoEmbed iframe)
│   │       ├── ThumbnailTile.jsx
│   │       └── MonthScrubber.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── scripts/
│   ├── download_tiktoks.py # yt-dlp download script
│   └── README.md           # downloader usage instructions
├── user_data_tiktok.json   # TikTok export (place here or set TIKTOK_JSON_PATH)
└── README.md

# Outside the repo (not committed):
# /mnt/d/tiktoks/           Downloaded videos, thumbnails, and metadata
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
  "local_video_url": "/media/7631024397754600735.mp4",
  "local_thumbnail_url": "/media/7631024397754600735.jpg",
  "original_url": "https://www.tiktokv.com/share/video/7631024397754600735/"
}
```

**Extraction logic:** Parse the numeric video ID from the URL path segment `/video/(\d+)/`.

**Available videos:** Only videos whose `.mp4` exists on disk are included in API responses. Videos in `_failures.json` or not yet downloaded are excluded.

**Total videos in export:** ~4,666, spanning May 2020 – April 2026.

---

## Downloader (`scripts/download_tiktoks.py`)

Downloads the full liked-video list to `TIKTOK_VIDEO_DIR`. See `scripts/README.md` for usage.

### Per-video artifacts
For each video ID, yt-dlp writes three files to the output directory:
- `<id>.mp4` — video file (best available quality)
- `<id>.info.json` — full yt-dlp metadata dump (uploader, description, duration, etc.)
- `<id>.jpg` — thumbnail image

### Failure manifest
Videos that can't be downloaded (deleted, private, region-locked) are recorded in `_failures.json`:
```json
{
  "7631024397754600735": {
    "error": "[TikTok] 7631024397754600735: Video is unavailable",
    "tried_at": "2026-04-28T21:30:00+00:00"
  }
}
```
Re-runs skip known failures unless `--retry-failed` is passed.

---

## Backend (FastAPI)

### Startup
- Load and parse `user_data_tiktok.json` once at startup.
- Scan `TIKTOK_VIDEO_DIR` for `.mp4` files; build a set of available video IDs.
- Only expose videos that are both in the JSON and on disk.
- Sort available videos newest-first.

### Endpoints

#### `GET /api/videos`
Returns all available (on-disk) video objects.

Response:
```json
{
  "total": 3812,
  "videos": [
    {
      "id": "...",
      "liked_at": "2026-04-25T23:35:34",
      "local_video_url": "/media/....mp4",
      "local_thumbnail_url": "/media/....jpg",
      "original_url": "https://..."
    }
  ]
}
```

#### `GET /api/random`
Returns a single random video object from the available list.

Response: same shape as a single item from `/api/videos`.

#### `GET /media/{filename}` (StaticFiles mount)
Serves files directly from `TIKTOK_VIDEO_DIR`. FastAPI's `StaticFiles` is mounted at `/media` pointing to the configured download directory.

### Configuration

| Env var | Default | Description |
|---|---|---|
| `TIKTOK_JSON_PATH` | `./user_data_tiktok.json` | Path to TikTok data export |
| `TIKTOK_VIDEO_DIR` | `/mnt/d/tiktoks` | Directory containing downloaded videos |

### Running
```bash
uvicorn backend.main:app --reload --port 8000
```

---

## Frontend (React + Vite)

### Vite Dev Proxy
In `vite.config.js`, proxy `/api` and `/media` → `http://localhost:8000`.

### App Shell (`App.jsx`)
- Fetches `/api/videos` once on mount. Stores video list in state.
- Two views, toggled by a top nav bar: **Shuffle** (default) and **Grid**.

---

## View 1: Shuffle (default view)

### Layout
- Full-width, centered video player (~390px wide).
- Large **"Shuffle"** button below the player.
- A small **"Open on TikTok"** link beneath that opens `original_url` in a new tab.

### Behavior
1. On first load, automatically pick a random video and load it.
2. The "Shuffle" button calls `/api/random` and loads a new video.
3. The `<video>` element has `controls loop` — the browser's native controls handle replay.

### VideoPlayer Component
- Renders a `<video>` element pointing to `local_video_url`.
- Props: `src`, `key` (change key to force remount on new video).
- Attributes: `controls`, `loop`, `autoPlay`.

---

## View 2: Grid / Timeline

A scrollable grid of video thumbnails, organized chronologically with a month scrubber.

### Layout
- Left side (~80px wide): vertical **month scrubber** (fixed position).
- Right side: scrollable thumbnail grid — **3 columns**, thumbnails are square-ish tiles (roughly 9 visible on screen at once).

### Month Scrubber (`MonthScrubber.jsx`)
- Lists all months that have at least one available video, formatted as e.g. `Apr '26`.
- Clicking a month label scrolls the grid to that month's section.
- Uses `IntersectionObserver` on month-section headers to highlight the currently visible month.

### Grid (`GridView.jsx`)
- Videos are grouped by month, each group has a sticky month header (e.g. `"April 2026 · 34 videos"`).
- Each tile is a `ThumbnailTile` component.
- Clicking a tile switches to Shuffle view and loads that specific video.

### ThumbnailTile Component (`ThumbnailTile.jsx`)
- Shows a fixed-size square tile (160×160px or responsive).
- `src` is `local_thumbnail_url` — no lazy-fetch needed, the URL is already known.
- While loading: show a dark gray placeholder.
- If thumbnail loads: show the image, cropped/centered.
- If thumbnail is null (video has no `.jpg` on disk): show the placeholder with a broken-image icon.
- On hover: slight scale or brightness effect.

---

## Key Implementation Notes

### Video ID extraction
Regex: `r'/video/(\d+)'` applied to each `link` field. If no match, skip that entry (log a warning).

### On-disk availability check
At startup, scan `TIKTOK_VIDEO_DIR` for `*.mp4` files and build a `set[str]` of IDs. Only videos in that set are returned by the API. Re-scan on restart (no live watching needed for v1).

### CORS
Not a concern for local file serving — everything is same-origin through FastAPI.

### No persistence needed
No database. All state is in-memory. Re-parsed from JSON + disk scan on each server start.

---

## README (for the project)

Should include:
1. Prerequisites: Python 3.11+, Node 18+, ffmpeg, uv
2. Setup steps:
   - Place `user_data_tiktok.json` in project root
   - `uv sync`
   - `cd frontend && npm install && npm run build`
   - Run the downloader: `uv run python scripts/download_tiktoks.py` (see `scripts/README.md`)
3. Running: `uvicorn backend.main:app --port 8000` then open `http://localhost:8000`
4. Dev mode: backend with `--reload`, frontend with `npm run dev`

---

## Out of Scope

- Re-downloading videos that change after the first download
- Dead link detection / pre-checking at browse time
- Filtering or search
- Favorited videos list (separate from liked)
- Any authentication
- Deployment / hosting
- Disk-space monitoring for the video directory
- Backend/frontend migration off the iframe embed *(the next milestone after download is complete)*
