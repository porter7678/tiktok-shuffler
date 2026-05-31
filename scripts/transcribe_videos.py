"""Transcribe downloaded TikTok videos to text using faster-whisper."""

import argparse
import ctypes
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path


def _preload_nvidia_libs() -> None:
    """Load CUDA shared libraries from pip-installed nvidia-* packages before ctranslate2 needs them."""
    try:
        import site
        sp = site.getsitepackages()[0]
    except Exception:
        return
    for pkg, lib in [("cuda_runtime", "libcudart.so.12"), ("cublas", "libcublas.so.12")]:
        path = os.path.join(sp, "nvidia", pkg, "lib", lib)
        if os.path.exists(path):
            try:
                ctypes.CDLL(path)
            except OSError:
                pass


_preload_nvidia_libs()


_FAILURES_FILE = "_transcription_failures.json"
_FLUSH_EVERY = 10


def _fmt_duration(seconds: float) -> str:
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h{m:02d}m"
    if m:
        return f"{m}m{s:02d}s"
    return f"{s}s"


def _load_failures(output_dir: Path) -> dict:
    path = output_dir / _FAILURES_FILE
    if path.exists():
        return json.loads(path.read_text())
    return {}


def _save_failures(output_dir: Path, failures: dict) -> None:
    tmp = (output_dir / _FAILURES_FILE).with_suffix(".json.tmp")
    tmp.write_text(json.dumps(failures, indent=2))
    tmp.replace(output_dir / _FAILURES_FILE)


def _detect_device() -> str:
    try:
        import ctranslate2
        return "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
    except Exception:
        return "cpu"


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe TikTok videos with faster-whisper")
    parser.add_argument("--output-dir", default="/mnt/d/tiktoks",
                        help="Directory containing downloaded videos (default: /mnt/d/tiktoks)")
    parser.add_argument("--model", default="medium",
                        choices=["tiny", "base", "small", "medium", "large-v2", "large-v3"],
                        help="Whisper model size (default: medium)")
    parser.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"],
                        help="Compute device (default: auto-detect)")
    parser.add_argument("--language", default=None,
                        help="Force language code, e.g. 'en' (default: auto-detect per video)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Stop after transcribing N videos (useful for smoke testing)")
    parser.add_argument("--retry-failed", action="store_true",
                        help="Re-attempt videos listed in the failure manifest")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)

    device = _detect_device() if args.device == "auto" else args.device
    compute_type = "int8_float32" if device == "cuda" else "int8"

    print(f"Loading {args.model!r} model on {device} ({compute_type})...")
    from faster_whisper import WhisperModel
    model = WhisperModel(args.model, device=device, compute_type=compute_type)
    print("Model ready.\n")

    failures = _load_failures(output_dir)
    mp4_files = sorted(output_dir.glob("*.mp4"))

    pending = [
        f for f in mp4_files
        if not (output_dir / f"{f.stem}.txt").exists()
        and (args.retry_failed or f.stem not in failures)
    ]
    if args.limit is not None:
        pending = pending[: args.limit]

    n_total = len(pending)
    already_done = len(mp4_files) - len([f for f in mp4_files if not (output_dir / f"{f.stem}.txt").exists()])
    print(f"Found {len(mp4_files)} videos · {already_done} already transcribed · {n_total} to process")
    if n_total == 0:
        print("Nothing to do.")
        return
    print()

    n_done = 0
    n_failed = 0
    failures_since_flush = 0
    work_start: float | None = None

    for i, mp4_path in enumerate(pending, 1):
        vid_id = mp4_path.stem
        txt_path = output_dir / f"{vid_id}.txt"
        prefix = f"[{i}/{n_total}] {vid_id}"

        if work_start is None:
            work_start = time.monotonic()

        try:
            import av as _av
            with _av.open(str(mp4_path)) as container:
                has_audio = bool(container.streams.audio)

            if not has_audio:
                txt_path.write_text("", encoding="utf-8")
                failures.pop(vid_id, None)
                n_done += 1
                elapsed = time.monotonic() - work_start
                avg = elapsed / n_done
                eta_str = f"eta ~{_fmt_duration(avg * (n_total - n_done))}" if n_done < n_total else "done"
                timing = f"  [{n_done}/{n_total} · elapsed {_fmt_duration(elapsed)} · {eta_str}]"
                print(f"{prefix}  ok [no audio]{timing}")
                continue

            segments, info = model.transcribe(
                str(mp4_path),
                beam_size=5,
                language=args.language,
                vad_filter=True,
            )
            text = " ".join(s.text.strip() for s in segments).strip()
            txt_path.write_text(text, encoding="utf-8")
            failures.pop(vid_id, None)
            n_done += 1

            elapsed = time.monotonic() - work_start
            avg = elapsed / n_done
            eta_str = f"eta ~{_fmt_duration(avg * (n_total - n_done))}" if n_done < n_total else "done"
            timing = f"  [{n_done}/{n_total} · elapsed {_fmt_duration(elapsed)} · {eta_str}]"
            print(f"{prefix}  ok [{info.language}]{timing}")

        except Exception as exc:
            error_msg = str(exc).splitlines()[-1] if str(exc) else repr(exc)
            failures[vid_id] = {
                "error": error_msg,
                "tried_at": datetime.now(timezone.utc).isoformat(),
            }
            n_failed += 1
            failures_since_flush += 1
            if failures_since_flush >= _FLUSH_EVERY:
                _save_failures(output_dir, failures)
                failures_since_flush = 0
            print(f"{prefix}  fail: {error_msg[:80]}")

    _save_failures(output_dir, failures)
    print()
    print(f"Done.  transcribed={n_done}  failed={n_failed}")


if __name__ == "__main__":
    main()
