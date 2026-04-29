# TODO — TikTok Liked Videos Browser

Work through these milestones in order. Each one should leave the app in a working, testable state before moving on.

---

## Milestone 1: Project Scaffold ✅

Get the skeleton in place so both backend and frontend can run, talk to each other, and confirm the data loads correctly.

- [x] Create project directory structure as specified in SPEC.md
- [x] Initialize Python backend: `backend/main.py` and `backend/data_loader.py`
  - [x] `data_loader.py` parses `user_data_tiktok.json`, extracts the Like List, and returns a list of parsed video objects (id, liked_at, embed_url, original_url)
  - [x] Video ID extraction via regex on the `link` field; skip and warn on non-matches
  - [x] `main.py` loads data at startup, exposes a single `GET /api/videos` endpoint
- [x] Initialize React frontend with Vite
  - [x] `vite.config.js` proxy: `/api` → `http://localhost:8000`
  - [x] `App.jsx` fetches `/api/videos` on mount, logs the count to console
- [x] Write `README.md` with setup and run instructions

**Checkpoint:** Run backend (`uvicorn backend.main:app --reload --port 8000`) and frontend (`npm run dev`). Confirm `/api/videos` returns all ~4,666 videos and the React app logs the count.

---

## Milestone 2: Shuffle View (core feature) ✅

Build the primary feature end-to-end before touching the grid.

- [x] `GET /api/random` endpoint — returns one randomly selected video object
- [x] `VideoEmbed.jsx` component — renders TikTok embed iframe with correct attributes (`allowFullScreen`); accepts `embedUrl` and `key` as props
- [x] `ShuffleView.jsx`
  - [x] On mount, auto-fetches `/api/random` and loads the first video
  - [x] Renders `VideoEmbed` centered, ~390px wide
  - [x] "Shuffle" button — fetches `/api/random`, updates current video
  - [x] "Replay" button — remounts the iframe by briefly clearing then restoring `src`
  - [x] "Open on TikTok" link — opens `original_url` in new tab
  - [x] Loading state while embed is initializing
- [x] `App.jsx` renders `ShuffleView` as the default view (no nav switching yet)

**Checkpoint:** Open the app. A random TikTok loads automatically. Shuffle picks a new one. Replay reloads the current video. Open on TikTok works.

---

## Milestone 3: Grid View — Structure & Layout

Build the grid without thumbnails first (placeholders only), so the layout and month grouping are solid before adding async complexity.

- [ ] `GET /api/videos` response confirmed sorted newest-first
- [ ] `GridView.jsx`
  - [ ] Groups videos by year-month
  - [ ] Renders a sticky month section header for each group (e.g. `"April 2026 · 34 videos"`)
  - [ ] Renders a 3-column CSS grid of placeholder tiles
  - [ ] Each placeholder tile is a fixed square (160×160px), dark gray background
- [ ] `MonthScrubber.jsx`
  - [ ] Renders a fixed left-side column listing all months with videos (newest at top), formatted as `Apr '26`
  - [ ] Clicking a month label scrolls the grid to that month's section header
  - [ ] Uses `IntersectionObserver` on section headers to highlight the currently visible month as the user scrolls
- [ ] Nav bar in `App.jsx` — toggle between Shuffle and Grid views

**Checkpoint:** Grid view shows all ~4,666 placeholder tiles grouped by month. Month scrubber scrolls and highlights correctly. Nav toggles between views cleanly.

---

## Milestone 4: Grid View — Thumbnails

Layer in async thumbnail loading on top of the working grid.

- [ ] `GET /api/thumbnail/{video_id}` endpoint
  - [ ] Fetches TikTok oEmbed API server-side: `https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/{video_id}`
  - [ ] Returns `{ "thumbnail_url": "..." }` or `{ "thumbnail_url": null }` on failure/timeout
  - [ ] Caches results in-memory (both hits and nulls) so re-fetches are free
- [ ] `ThumbnailTile.jsx`
  - [ ] Uses `IntersectionObserver` — only fires the thumbnail fetch when tile enters viewport
  - [ ] States: placeholder → loading → image (or dead placeholder with broken-image icon)
  - [ ] Hover effect: slight scale or brightness change
  - [ ] On click: switch to Shuffle view and load this specific video

**Checkpoint:** Scroll through the grid — thumbnails load progressively as tiles enter view. Clicking a tile opens it in Shuffle view. Dead/private videos show a subtle broken state.

---

## Milestone 5: Polish & README Finalization

Tighten up the experience and make sure the project is easy to hand to someone else.

- [ ] Visual consistency pass — fonts, colors, spacing cohesive across both views
- [ ] Error states: if `/api/random` fails, show an error message with a retry button
- [ ] Handle the case where the JSON file is missing or malformed — backend should log a clear error on startup rather than crashing silently
- [ ] Build frontend for production (`npm run build`) and confirm FastAPI serves it correctly from `frontend/dist/`
- [ ] Update README with any gotchas discovered during development
- [ ] Test full production flow: only the backend running, no Vite dev server

**Checkpoint:** Run `npm run build`, start uvicorn, open `http://localhost:8000`. Everything works from the compiled build with no dev server.
