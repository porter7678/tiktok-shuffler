# TikTok Downloader

Downloads every liked video from your TikTok export to a local directory (`/mnt/d/tiktoks` by default).

## Prerequisites

- **Python deps** — run `uv sync` from the project root (adds `yt-dlp` to the venv).
- **ffmpeg** — optional but recommended. TikTok videos are typically served as pre-muxed mp4 files so ffmpeg is not needed in most cases. If you ever see a download fail with "ffmpeg not found", install it:
  - WSL: `sudo apt install ffmpeg`
  - Or download a Windows build and ensure `ffmpeg.exe` is on your PATH.

## First run

Create the output directory if it doesn't exist yet:

```bash
mkdir -p /mnt/d/tiktoks
```

Run a smoke test on the first 10 videos:

```bash
uv run python scripts/download_tiktoks.py --limit 10
```

If that looks good, kick off the full run (this will take a while — ~4,666 videos):

```bash
uv run python scripts/download_tiktoks.py
```

You can stop with `Ctrl-C` at any time and resume later — already-downloaded videos are skipped automatically.

## Output layout

```
/mnt/d/tiktoks/
├── 7631024397754600735.mp4         # video file
├── 7631024397754600735.info.json   # yt-dlp metadata (uploader, description, duration, …)
├── 7631024397754600735.jpg         # thumbnail
├── ...
└── _failures.json                  # ids that couldn't be downloaded + error reason
```

## Failures

Many videos will fail — deleted, private, or region-locked content is expected. They land in `_failures.json` and are silently skipped on subsequent runs.

To retry all previously failed videos:

```bash
uv run python scripts/download_tiktoks.py --retry-failed
```

## Private / restricted videos

If you see errors like `You do not have permission to view this post`, yt-dlp needs your TikTok login cookies. Pass them from your browser:

```bash
# Pull cookies from Edge (easiest on Windows/WSL — Edge is always installed)
uv run python scripts/download_tiktoks.py --browser edge

# Or Chrome / Firefox
uv run python scripts/download_tiktoks.py --browser chrome
uv run python scripts/download_tiktoks.py --browser firefox
```

If browser cookie extraction doesn't work from WSL, export cookies manually:
1. Install the **"Get cookies.txt LOCALLY"** extension in Chrome/Edge
2. Visit tiktok.com while logged in, click the extension, export
3. Save the file somewhere (e.g. `~/tiktok-cookies.txt`) and pass it:
   ```bash
   uv run python scripts/download_tiktoks.py --cookies ~/tiktok-cookies.txt
   ```

Once you have cookies working, re-run with `--retry-failed` to pick up the previously blocked videos:

```bash
uv run python scripts/download_tiktoks.py --browser edge --retry-failed
```

## All options

| Flag | Default | Description |
|---|---|---|
| `--output-dir` | `/mnt/d/tiktoks` | Where to save files |
| `--json-path` | `./user_data_tiktok.json` | Path to your TikTok data export |
| `--limit N` | *(none)* | Stop after N videos (for testing) |
| `--retry-failed` | off | Re-attempt videos in the failure manifest |
| `--browser BROWSER` | *(none)* | Pull TikTok cookies from `chrome`, `edge`, or `firefox` |
| `--cookies FILE` | *(none)* | Path to a Netscape-format cookies file |

The `--json-path` default also respects the `TIKTOK_JSON_PATH` environment variable.

## WSL path note

`/mnt/d/tiktoks` in WSL maps to `D:\tiktoks` in Windows Explorer. Both paths point to the same files.
