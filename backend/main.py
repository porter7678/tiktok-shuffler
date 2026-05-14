import os
import random
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.data_loader import build_video_list

app = FastAPI()

_json_path = Path(os.getenv("TIKTOK_JSON_PATH", "./user_data_tiktok.json"))
_video_dir = Path(os.getenv("TIKTOK_VIDEO_DIR", "/mnt/d/tiktoks"))
_videos: list[dict] = build_video_list(_json_path, _video_dir)

app.mount("/media", StaticFiles(directory=_video_dir, check_dir=False), name="media")


@app.get("/api/videos")
def get_videos():
    return {"total": len(_videos), "videos": _videos}


@app.get("/api/random")
def get_random():
    return random.choice(_videos)
