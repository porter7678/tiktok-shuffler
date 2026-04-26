import os
from pathlib import Path

from fastapi import FastAPI

from backend.data_loader import load_videos

app = FastAPI()

_json_path = Path(os.getenv("TIKTOK_JSON_PATH", "./user_data_tiktok.json"))
_videos: list[dict] = load_videos(_json_path)


@app.get("/api/videos")
def get_videos():
    return {"total": len(_videos), "videos": _videos}
