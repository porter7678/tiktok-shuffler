import json
import logging
import re
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
            "embed_url": f"https://www.tiktok.com/embed/v2/{video_id}",
            "original_url": item["link"],
        })

    videos.sort(key=lambda v: v["liked_at"], reverse=True)
    return videos
