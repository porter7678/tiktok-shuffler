# TikTok Liked Videos Browser

A local web app for browsing and shuffling your TikTok liked videos. Videos play via TikTok's public embed player — no downloads required.

## Prerequisites

- Python 3.11+
- Node 18+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python package manager)

## Setup

1. Place your `user_data_tiktok.json` export file in the project root (or set the `TIKTOK_JSON_PATH` env var to point elsewhere).

2. Install Python dependencies:
   ```bash
   uv sync
   ```

3. Install and build the frontend:
   ```bash
   cd frontend && npm install && npm run build
   ```

## Running (production)

```bash
uv run uvicorn backend.main:app --port 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Dev mode

Run the backend and frontend separately so you get hot-reload on both:

```bash
# Terminal 1 — backend
uv run uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend (proxies /api to port 8000)
cd frontend && npm run dev
```

Then open the URL printed by Vite (default: [http://localhost:5173](http://localhost:5173)).

## Configuration

| Env var | Default | Description |
|---|---|---|
| `TIKTOK_JSON_PATH` | `./user_data_tiktok.json` | Path to your TikTok data export |
