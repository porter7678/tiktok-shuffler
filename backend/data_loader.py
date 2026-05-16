import json
import logging
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

_VIDEO_ID_RE = re.compile(r'/video/(\d+)')


def load_videos(path: str | Path) -> list[dict]:
    with open(path) as f:
        raw = json.load(f)

    items = raw["Likes and Favorites"]["Like List"]["ItemFavoriteList"]

    videos = []
    for item in items:
        match = _VIDEO_ID_RE.search(item["link"])
        if not match:
            logger.warning("No video ID found in link: %s", item["link"])
            continue

        video_id = match.group(1)
        liked_at = datetime.fromisoformat(item["date"].replace(" ", "T")).isoformat()

        videos.append({
            "id": video_id,
            "liked_at": liked_at,
            "original_url": item["link"],
        })

    videos.sort(key=lambda v: v["liked_at"], reverse=True)
    return videos


def scan_available_ids(video_dir: str | Path) -> tuple[set[str], set[str]]:
    mp4_ids: set[str] = set()
    jpg_ids: set[str] = set()
    try:
        for entry in os.scandir(video_dir):
            if entry.name.endswith(".mp4"):
                mp4_ids.add(entry.name[:-4])
            elif entry.name.endswith(".jpg"):
                jpg_ids.add(entry.name[:-4])
    except FileNotFoundError:
        logger.warning("TIKTOK_VIDEO_DIR not found: %s", video_dir)
    return mp4_ids, jpg_ids


def _load_info_metadata(video_dir: Path, video_id: str) -> dict:
    info_path = Path(video_dir) / f"{video_id}.info.json"
    try:
        with open(info_path) as f:
            info = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"description": None, "uploader": None, "uploader_url": None, "channel": None}
    raw_date = info.get("upload_date") or None  # "YYYYMMDD"
    upload_date = None
    if raw_date and len(raw_date) == 8:
        upload_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
    return {
        "description": info.get("description") or None,
        "uploader": info.get("uploader") or None,
        "uploader_url": info.get("uploader_url") or None,
        "channel": info.get("channel") or None,
        "upload_date": upload_date,
    }


def build_video_list(json_path: str | Path, video_dir: str | Path) -> list[dict]:
    t0 = time.monotonic()
    videos = load_videos(json_path)
    mp4_ids, jpg_ids = scan_available_ids(video_dir)

    available = [v for v in videos if v["id"] in mp4_ids]

    for v in available:
        vid_id = v["id"]
        v["local_video_url"] = f"/media/{vid_id}.mp4"
        v["local_thumbnail_url"] = f"/media/{vid_id}.jpg" if vid_id in jpg_ids else None

    with ThreadPoolExecutor(max_workers=16) as pool:
        metadata = list(pool.map(lambda v: _load_info_metadata(video_dir, v["id"]), available))
    for v, meta in zip(available, metadata):
        v.update(meta)

    if len(available) > 1:
        timestamps = [datetime.fromisoformat(v["liked_at"]) for v in available]
        oldest = min(timestamps)
        span = (max(timestamps) - oldest).total_seconds()
        for v, ts in zip(available, timestamps):
            v["recency"] = (ts - oldest).total_seconds() / span if span > 0 else 1.0
    else:
        for v in available:
            v["recency"] = 1.0

    logger.info("Loaded %d videos in %.1fs", len(available), time.monotonic() - t0)
    return available
