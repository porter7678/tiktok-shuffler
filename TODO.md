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

**Checkpoint:** Run backend and frontend. Confirm `/api/videos` returns all ~4,666 videos and the React app logs the count.

---

## Milestone 2: Shuffle View (core feature) ✅

- [x] `GET /api/random` endpoint — returns one randomly selected video object
- [x] `VideoEmbed.jsx` component — renders TikTok embed iframe
- [x] `ShuffleView.jsx` — auto-fetch on mount, Shuffle/Replay/"Open on TikTok" controls
- [x] Loading state while embed is initializing

**Checkpoint:** Open the app. A random TikTok loads automatically. Shuffle picks a new one. Replay reloads the current video. Open on TikTok works.

---

## Milestone 3: Offline Downloads ✅ (in progress)

Download all liked videos to local storage so the app can run without TikTok network calls.

- [x] `uv sync` picks up new `yt-dlp` dependency
- [x] `scripts/download_tiktoks.py` — yt-dlp download script
  - [x] Imports `load_videos` from `backend.data_loader` (no duplication)
  - [x] Per-video: `<id>.mp4`, `<id>.info.json`, `<id>.jpg` written to `TIKTOK_VIDEO_DIR`
  - [x] Idempotent: skip if video file already exists; skip if in failure manifest (unless `--retry-failed`)
  - [x] Failure manifest at `<output_dir>/_failures.json`, flushed every 10 failures so Ctrl-C doesn't lose progress
  - [x] CLI flags: `--output-dir`, `--json-path`, `--limit N`, `--retry-failed`
  - [x] Per-item progress line + overall elapsed/ETA timing
- [x] `scripts/README.md` — prerequisites, usage examples, output layout, WSL path note
- [x] First full run completes; `_failures.json` reviewed (3,724 downloaded, 924 failures, ~4,648 total processed)

**Checkpoint:** `uv run python scripts/download_tiktoks.py --limit 10` downloads 10 videos (or fewer if some fail). Re-run is fully skipped. Full run finishes without crashing.

---

## Milestone 4: Backend Serves Local Files

Cut the backend over from JSON-only to serving on-disk videos.

- [x] Scan `TIKTOK_VIDEO_DIR` at startup for `*.mp4` files; build available-ID set
- [x] Filter `load_videos` output to on-disk IDs only
- [x] Replace `embed_url` field with `local_video_url` (`/media/<id>.mp4`) and `local_thumbnail_url` (`/media/<id>.jpg`)
- [x] Mount `StaticFiles` at `/media` pointing to `TIKTOK_VIDEO_DIR`
- [x] Remove `GET /api/thumbnail/{video_id}` (oEmbed proxy never existed — no-op)
- [x] Add `TIKTOK_VIDEO_DIR` env var (default `/mnt/d/tiktoks`)
- [x] Proxy `/media` in `vite.config.js`

**Checkpoint:** `GET /api/random` returns a `local_video_url`; `curl http://localhost:8000/<local_video_url>` streams the mp4.

---

## Milestone 5: Frontend Plays Local Files

Replace the TikTok embed iframe with a native `<video>` element.

- [x] Add `VideoPlayer.jsx` — `<video src={src} controls loop autoPlay>`, remount on key change
- [x] Update `ShuffleView.jsx` to use `VideoPlayer` instead of `VideoEmbed`
- [x] Update `ThumbnailTile.jsx` — created in M6
- [x] Remove `VideoEmbed.jsx` and the oEmbed thumbnail-fetch logic (no oEmbed logic existed)
- [x] Remove "Replay" button (native `<video controls>` handles that)

**Checkpoint:** Open the app. A random video plays in a native player. Shuffle loads a new one. Grid thumbnails show from local files.

---

## Milestone 6: Grid View — Structure & Layout

*(Previously Milestone 3 — targeting embed architecture, now updated for local files.)*

- [x] `GridView.jsx` — groups videos by year-month, sticky month headers, 3-column CSS grid of `ThumbnailTile` placeholders
- [x] `MonthScrubber.jsx` — fixed left column, click-to-scroll, `IntersectionObserver` highlight
- [x] Nav bar in `App.jsx` — toggle between Shuffle and Grid views

**Checkpoint:** Grid shows all available videos grouped by month. Scrubber scrolls and highlights correctly.

---

## Milestone 7: Polish & README Finalization

- [ ] Visual consistency pass — fonts, colors, spacing cohesive across both views
- [ ] Error states: if `/api/random` fails, show an error message with a retry button
- [ ] Handle missing/malformed JSON file — backend logs a clear error on startup
- [ ] Build frontend for production and confirm FastAPI serves it from `frontend/dist/`
- [ ] Update README with final setup flow (including downloader step)
- [ ] Test full production flow: only uvicorn running, no Vite dev server

**Checkpoint:** `npm run build` + uvicorn + open `http://localhost:8000`. Everything works from the compiled build.


## Other items:
- [X] Add a 2x speed button. When I hover my mouse over the button, I want it to playback at 2x speed.
- [X] Audio levels are inconsistent across videos. Can we normalize those?
- [x] Add a "favorites" feature so I can mark certain videos as extra special and have a separate shuffle for those. Actually I want to be able to like them (I know these are technically all "liked" videos but I want a way to mark some as "extra liked") and also to mark them as favorites. So two different categories.
- [ ] I want a button to replay a video. Because sometime I want to start a video over before it's finished.
- [ ] Add a search feature based on video descriptions and artist
- [ ] How hard would it be to get captions for each of these? If so, I could add a search feature.

- [ ] Add ability to go backwards/forwards in the shuffle history. Maybe we store this locally, and that way I don't see a repeat until I've gone through all the videos? At which point we would reshuffle
- [ ] Add a thing that pops up after watching like 20 videos that says "oi bruv, you've been watching for a while. Do you want to keep watching?" and if they say yes, they have to enter a number (in plain english) of how many more videos they want to watch before the popup shows again. And when it pops up it should have a button that kills the app.
- 