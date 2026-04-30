"""Download TikTok liked videos to a local directory using yt-dlp."""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import yt_dlp

sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.data_loader import load_videos

_FAILURES_FILE = "_failures.json"
_FLUSH_EVERY = 10
_EXCLUDE_SUFFIXES = {".json", ".jpg", ".webp", ".image", ".jpeg", ".part"}


def _fmt_duration(seconds: float) -> str:
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h{m:02d}m"
    if m:
        return f"{m}m{s:02d}s"
    return f"{s}s"


def _normalize_thumbnail(output_dir: Path, vid_id: str) -> None:
    """Rename <id>.image → <id>.jpg when TikTok serves a JPEG with a generic extension."""
    src = output_dir / f"{vid_id}.image"
    if not src.exists():
        return
    with open(src, "rb") as f:
        header = f.read(3)
    if header == b"\xff\xd8\xff":
        src.rename(output_dir / f"{vid_id}.jpg")


def _video_exists(output_dir: Path, vid_id: str) -> bool:
    return any(
        f.suffix not in _EXCLUDE_SUFFIXES
        for f in output_dir.glob(f"{vid_id}.*")
    )


def _load_failures(output_dir: Path) -> dict:
    path = output_dir / _FAILURES_FILE
    if path.exists():
        return json.loads(path.read_text())
    return {}


def _save_failures(output_dir: Path, failures: dict) -> None:
    (output_dir / _FAILURES_FILE).write_text(json.dumps(failures, indent=2))


def _count_pending(videos: list, output_dir: Path, failures: dict, retry_failed: bool) -> int:
    """Count how many videos actually need downloading (not already on disk or skipped)."""
    existing = {f.stem for f in output_dir.iterdir() if f.suffix not in _EXCLUDE_SUFFIXES}
    skip_failures = set() if retry_failed else set(failures.keys())
    return sum(1 for v in videos if v["id"] not in existing and v["id"] not in skip_failures)


def main() -> None:
    parser = argparse.ArgumentParser(description="Download TikTok liked videos via yt-dlp")
    parser.add_argument("--output-dir", default="/mnt/d/tiktoks",
                        help="Directory to save videos (default: /mnt/d/tiktoks)")
    parser.add_argument("--json-path",
                        default=os.getenv("TIKTOK_JSON_PATH", "./user_data_tiktok.json"),
                        help="Path to user_data_tiktok.json (default: $TIKTOK_JSON_PATH or ./user_data_tiktok.json)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Stop after processing N videos (useful for smoke testing)")
    parser.add_argument("--retry-failed", action="store_true",
                        help="Re-attempt videos listed in the failure manifest")
    parser.add_argument("--browser", metavar="BROWSER",
                        help="Pull TikTok cookies from this browser (e.g. chrome, edge, firefox). "
                             "Required for private/restricted videos.")
    parser.add_argument("--cookies", metavar="FILE",
                        help="Path to a Netscape-format cookies file exported from your browser.")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    videos = load_videos(args.json_path)
    if args.limit is not None:
        videos = videos[: args.limit]

    failures = _load_failures(output_dir)

    n_pending = _count_pending(videos, output_dir, failures, args.retry_failed)
    print(f"Found {len(videos)} videos in export · {n_pending} to download · {len(videos) - n_pending} already done")
    print()

    ydl_opts = {
        "outtmpl": str(output_dir / "%(id)s.%(ext)s"),
        "writeinfojson": True,
        "writethumbnail": True,
        "format": "bv*+ba/best",
        "sleep_interval": 3,
        "max_sleep_interval": 8,
        "quiet": True,
        "no_warnings": True,
    }
    if args.browser:
        ydl_opts["cookiesfrombrowser"] = (args.browser,)
    if args.cookies:
        ydl_opts["cookiefile"] = args.cookies

    total = len(videos)
    n_downloaded = 0
    n_skipped = 0
    n_failed = 0
    failures_since_flush = 0
    work_start: float | None = None

    for i, video in enumerate(videos, 1):
        vid_id = video["id"]
        url = video["original_url"]
        prefix = f"[{i}/{total}] {vid_id}"

        if _video_exists(output_dir, vid_id):
            print(f"{prefix}  skip (exists)")
            n_skipped += 1
            continue

        if vid_id in failures and not args.retry_failed:
            short_err = failures[vid_id]["error"][:60]
            print(f"{prefix}  skip (prev failure: {short_err})")
            n_skipped += 1
            continue

        if work_start is None:
            work_start = time.monotonic()

        ok = False
        error_msg = ""
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            _normalize_thumbnail(output_dir, vid_id)
            n_downloaded += 1
            failures.pop(vid_id, None)
            ok = True
        except yt_dlp.utils.DownloadError as exc:
            error_msg = str(exc).splitlines()[-1]
            failures[vid_id] = {
                "error": error_msg,
                "tried_at": datetime.now(timezone.utc).isoformat(),
            }
            n_failed += 1
            failures_since_flush += 1
            if failures_since_flush >= _FLUSH_EVERY:
                _save_failures(output_dir, failures)
                failures_since_flush = 0

        n_done = n_downloaded + n_failed
        elapsed = time.monotonic() - work_start
        avg = elapsed / n_done
        eta_str = f"eta ~{_fmt_duration(avg * (n_pending - n_done))}" if n_done < n_pending else "done"
        timing = f"  [{n_done}/{n_pending} · elapsed {_fmt_duration(elapsed)} · {eta_str}]"

        if ok:
            print(f"{prefix}  ok{timing}")
        else:
            print(f"{prefix}  fail: {error_msg[:60]}{timing}")

    _save_failures(output_dir, failures)

    print()
    print(f"Done.  total={total}  downloaded={n_downloaded}  skipped={n_skipped}  failed={n_failed}")


if __name__ == "__main__":
    main()
