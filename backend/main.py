import asyncio
import json
import logging
import os
import random
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
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

_marks_file = _video_dir / "_marks.json"
_marks: dict[str, dict] = {}
if _marks_file.exists():
    try:
        _marks = json.loads(_marks_file.read_text())
    except Exception:
        pass

for v in _videos:
    m = _marks.get(v["id"], {})
    v["liked_marked_at"] = m.get("liked")
    v["favorited_marked_at"] = m.get("favorited")


def _save_marks() -> None:
    tmp = _marks_file.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(_marks))
    tmp.replace(_marks_file)


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


@app.post("/api/marks/{video_id}")
def set_mark(video_id: str, payload: dict):
    kind = payload.get("kind")
    value = payload.get("value")
    if kind not in ("liked", "favorited"):
        raise HTTPException(status_code=400, detail="kind must be 'liked' or 'favorited'")
    entry = _marks.setdefault(video_id, {})
    if value:
        entry[kind] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "")
    else:
        entry.pop(kind, None)
    if not entry:
        _marks.pop(video_id, None)
    _save_marks()
    for v in _videos:
        if v["id"] == video_id:
            v["liked_marked_at"] = _marks.get(video_id, {}).get("liked")
            v["favorited_marked_at"] = _marks.get(video_id, {}).get("favorited")
            return v
    return {"id": video_id, "liked_marked_at": None, "favorited_marked_at": None}


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
