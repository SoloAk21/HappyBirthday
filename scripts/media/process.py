"""Prepare private media for the birthday experience.

Reads a selection file (kept in the git-ignored .private/ folder), never
modifies originals, and writes browser-friendly derivatives:

  videos -> H.264 MP4 (yuv420p, +faststart, audio stripped) + WebP poster
  images -> WebP at 2 widths (metadata, incl. GPS, is not carried over)
  stills -> WebP frames grabbed from a video at a timestamp

Usage:
  python scripts/media/process.py <source_dir> <selection.json> <out_dir>
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps

IMAGE_WIDTHS = (640, 1080)
VIDEO_MAX_W = 720


def run(cmd: list[str]) -> str:
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def probe(path: Path) -> dict:
    out = run([
        "ffprobe", "-v", "error", "-print_format", "json",
        "-show_format", "-show_streams", str(path),
    ])
    return json.loads(out)


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def webp_variants(img: Image.Image, out_dir: Path, asset_id: str) -> list[dict]:
    img = ImageOps.exif_transpose(img).convert("RGB")
    variants = []
    # Each target width, capped at the native width (no upscaling).
    for w in sorted({min(w, img.width) for w in IMAGE_WIDTHS}):
        target = img if img.width <= w else img.resize(
            (w, round(img.height * w / img.width)), Image.LANCZOS)
        name = f"{asset_id}-{target.width}.webp"
        # Fresh Image object -> no EXIF/GPS is written.
        clean = Image.new("RGB", target.size)
        clean.paste(target)
        clean.save(out_dir / name, "WEBP", quality=84, method=6)
        variants.append({"file": name, "width": target.width,
                         "height": target.height,
                         "bytes": (out_dir / name).stat().st_size})
    return variants


def process_video(src: Path, out_dir: Path, item: dict) -> dict:
    asset_id = item["id"]
    out = out_dir / f"{asset_id}.mp4"
    vf = f"scale='min({VIDEO_MAX_W},iw)':-2:flags=lanczos,format=yuv420p"
    cmd = ["ffmpeg", "-v", "error", "-y"]
    if "start" in item:
        cmd += ["-ss", str(item["start"])]
    cmd += ["-i", str(src)]
    if "duration" in item:
        cmd += ["-t", str(item["duration"])]
    cmd += ["-map", "0:v:0", "-an", "-map_metadata", "-1",
            "-vf", vf, "-r", "30",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "slow",
            "-crf", str(item.get("crf", 23)), "-movflags", "+faststart", str(out)]
    run(cmd)
    info = probe(out)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    poster_t = item.get("poster", 0.4)
    tmp = out_dir / f"{asset_id}.poster.png"
    run(["ffmpeg", "-v", "error", "-y", "-ss", str(poster_t), "-i", str(out),
         "-frames:v", "1", str(tmp)])
    with Image.open(tmp) as im:
        posters = webp_variants(im, out_dir, f"{asset_id}-poster")
    tmp.unlink()
    return {
        "kind": "video", "file": out.name, "width": int(v["width"]),
        "height": int(v["height"]),
        "duration": round(float(info["format"]["duration"]), 2),
        "bytes": out.stat().st_size, "poster": posters,
    }


def process_still(src: Path, out_dir: Path, item: dict) -> dict:
    tmp = out_dir / f"{item['id']}.still.png"
    run(["ffmpeg", "-v", "error", "-y", "-ss", str(item["at"]), "-i", str(src),
         "-frames:v", "1", str(tmp)])
    with Image.open(tmp) as im:
        variants = webp_variants(im, out_dir, item["id"])
    tmp.unlink()
    return {"kind": "image", "variants": variants}


def process_image(src: Path, out_dir: Path, item: dict) -> dict:
    with Image.open(src) as im:
        return {"kind": "image", "variants": webp_variants(im, out_dir, item["id"])}


def main() -> None:
    source_dir, selection_path, out_dir = map(Path, sys.argv[1:4])
    out_dir.mkdir(parents=True, exist_ok=True)
    selection = json.loads(selection_path.read_text(encoding="utf-8"))
    manifest = []
    for item in selection:
        src = source_dir / item["source"]
        src_info = probe(src)
        kind = item.get("type") or (
            "video" if src.suffix.lower() in {".mp4", ".mov"} else "image")
        if kind == "still":
            result = process_still(src, out_dir, item)
        elif kind == "video":
            result = process_video(src, out_dir, item)
        else:
            result = process_image(src, out_dir, item)
        vs = next(s for s in src_info["streams"] if s["codec_type"] == "video")
        manifest.append({
            "id": item["id"], "role": item.get("role"), **result,
            "source": {
                "file": item["source"], "sha256": sha(src),
                "codec": vs.get("codec_name"), "width": vs.get("width"),
                "height": vs.get("height"),
                "duration": float(src_info["format"].get("duration", 0)),
                "bytes": int(src_info["format"]["size"]),
            },
        })
        print(f"ok  {item['id']:<16} <- {item['source']}", flush=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
