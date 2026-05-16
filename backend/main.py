import asyncio
import json
import logging
import os
import random
import re
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.data_loader import build_video_list

app = FastAPI()

_json_path = Path(os.getenv("TIKTOK_JSON_PATH", "./user_data_tiktok.json"))
_video_dir = Path(os.getenv("TIKTOK_VIDEO_DIR", "/mnt/d/tiktoks"))
_videos: list[dict] = build_video_list(_json_path, _video_dir)

app.mount("/media", StaticFiles(directory=_video_dir, check_dir=False), name="media")

_loudness_file = _video_dir / "_loudness.json"
_loudness_cache: dict[str, float] = {}
if _loudness_file.exists():
    try:
        raw = json.loads(_loudness_file.read_text())
        _loudness_cache = {k: v for k, v in raw.items() if v is not None}
    except Exception:
        pass


async def _analyze_loudness(video_path: Path) -> float | None:
    try:
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-nostdin", "-i", str(video_path),
            "-af", "loudnorm=print_format=json", "-f", "null", "-",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        out, _ = await proc.communicate()
        text = out.decode(errors="replace")
        m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', text, re.DOTALL)
        if m:
            return float(json.loads(m.group())["input_i"])
        logging.warning("loudnorm: no JSON match for %s\nlast 500 chars: %s", video_path.name, text[-500:])
    except Exception as e:
        logging.warning("loudnorm: exception for %s: %s", video_path.name, e)
    return None


@app.get("/api/videos")
def get_videos():
    return {"total": len(_videos), "videos": _videos}


@app.get("/api/random")
def get_random():
    return random.choice(_videos)


@app.get("/api/loudness/{video_id}")
async def get_loudness(video_id: str):
    if video_id in _loudness_cache:
        return {"lufs": _loudness_cache[video_id]}
    video_path = _video_dir / f"{video_id}.mp4"
    if not video_path.exists():
        return {"lufs": None}
    lufs = await _analyze_loudness(video_path)
    if lufs is not None:
        _loudness_cache[video_id] = lufs
        try:
            _loudness_file.write_text(json.dumps(_loudness_cache))
        except Exception:
            pass
    return {"lufs": lufs}
