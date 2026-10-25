#!/usr/bin/env python3
"""Render a clearly labeled, time-compressed visual replay from sanitized asciicast captures."""
from __future__ import annotations

import json
import hashlib
import re
import subprocess
from pathlib import Path
from datetime import datetime, timezone

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "public/evidence/authenticated-research-20261025"
OUTPUT = ROOT / "public/judge-evidence/authenticated-research-terminal-replay-20261025.mp4"
MANIFEST = OUTPUT.with_suffix(".json")
WIDTH, HEIGHT, FPS = 1280, 720, 12
SPEED = 0.5  # Playback is 2×; original UTC timestamps remain visible in captured output.
BG = (7, 13, 13)
PANEL = (13, 24, 23)
MINT = (111, 231, 194)
TEXT = (222, 234, 229)
MUTED = (133, 157, 148)

SEGMENTS = [
    ("DIRECT STREAMABLE HTTP MCP", "mcp.cast", "MSFT · all five tools discovered · research job reached complete"),
    ("PUBLISHED NPM STDIO BRIDGE", "stdio.cast", "@tidelight/mcp 0.1.2 · all five tools discovered · no job submitted"),
    ("PYTHON CLIENT RESEARCH", "python.cast", "NVDA · initial poll hit quota limit · later completion is linked separately"),
    ("PUBLISHED NPM + PYPI CROSS-SDK", "published-poll.cast", "@tidelight/sdk started AAPL · PyPI tidelight polled the same job to complete"),
]

def font(path: str, size: int):
    return ImageFont.truetype(path, size)

REGULAR = font("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 17)
MONO = font("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 14)
SMALL = font("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
TITLE = font("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)

ANSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")

def read_segment(filename: str):
    rows = [json.loads(line) for line in (EVIDENCE / filename).read_text().splitlines()]
    events = []
    for elapsed, kind, value in rows[1:]:
        if kind != "o":
            continue
        value = ANSI.sub("", value).replace("\r", "")
        for line in value.splitlines():
            if line.strip():
                events.append((float(elapsed) * SPEED, line))
    return events

def split_line(line: str, limit: int = 116):
    return [line[i:i + limit] for i in range(0, len(line), limit)] or [""]

def frame(segment_title: str, segment_note: str, visible: list[str], elapsed: float, index: int):
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((28, 24, WIDTH - 28, HEIGHT - 24), radius=18, fill=PANEL, outline=(34, 61, 55), width=2)
    draw.text((54, 45), "TIDELIGHT  /  JUDGE EVIDENCE", font=SMALL, fill=MINT)
    draw.text((54, 72), "Authenticated research client traces", font=TITLE, fill=TEXT)
    draw.rounded_rectangle((54, 117, WIDTH - 54, 184), radius=10, fill=(8, 17, 16), outline=(37, 72, 62), width=1)
    draw.text((72, 128), segment_title, font=SMALL, fill=MINT)
    draw.text((72, 151), segment_note, font=REGULAR, fill=TEXT)
    draw.rounded_rectangle((54, 202, WIDTH - 54, 629), radius=10, fill=(3, 8, 8), outline=(26, 44, 40), width=1)
    draw.text((72, 216), f"Recorded stdout  ·  playback 2×  ·  replay time {elapsed:.1f}s", font=SMALL, fill=MUTED)
    visible_rows = []
    for line in visible:
        visible_rows.extend(split_line(line))
    visible_rows = visible_rows[-24:]
    y = 246
    for row in visible_rows:
        draw.text((72, y), row, font=MONO, fill=TEXT)
        y += 15
    draw.text((54, 650), "VISUAL REPLAY OF ORIGINAL SANITIZED ASCIICAST OUTPUT · SEE LINKED CAST + JSON FOR SOURCE", font=SMALL, fill=MUTED)
    draw.text((WIDTH - 104, 650), f"{index:02d}", font=SMALL, fill=MINT)
    return img

def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
        "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "22",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT),
    ], stdin=subprocess.PIPE)
    assert proc.stdin is not None
    index = 0
    try:
        for title, cast_file, note in SEGMENTS:
            events = read_segment(cast_file)
            if not events:
                continue
            lines: list[str] = []
            segment_duration = events[-1][0] + 2.5
            event_index = 0
            for tick in range(int(segment_duration * FPS)):
                replay_time = tick / FPS
                while event_index < len(events) and events[event_index][0] <= replay_time:
                    lines.append(events[event_index][1])
                    event_index += 1
                proc.stdin.write(frame(title, note, lines, replay_time, index).tobytes())
                index += 1
        proc.stdin.close()
        if proc.wait() != 0:
            raise RuntimeError("ffmpeg could not encode the authenticated research replay")
    except Exception:
        if proc.stdin and not proc.stdin.closed:
            proc.stdin.close()
        proc.wait()
        OUTPUT.unlink(missing_ok=True)
        raise
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height",
        "-of", "json", str(OUTPUT),
    ], text=True))
    sources = {}
    for _, cast_file, _ in SEGMENTS:
        data = (EVIDENCE / cast_file).read_bytes()
        sources[f"/evidence/authenticated-research-20261025/{cast_file}"] = hashlib.sha256(data).hexdigest()
    manifest = {
        "kind": "visual_replay_of_sanitized_terminal_recordings",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Original asciicast v2 stdout captures; no requests were rerun during rendering.",
        "playback_speed": "2x; original timestamps remain in the captured event output and linked source casts.",
        "video": {
            "path": f"/judge-evidence/{OUTPUT.name}",
            "sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
            "duration_seconds": round(float(probe["format"]["duration"]), 2),
            "bytes": OUTPUT.stat().st_size,
            "codec": probe["streams"][0]["codec_name"],
            "width": probe["streams"][0]["width"],
            "height": probe["streams"][0]["height"],
        },
        "source_cast_sha256": sources,
        "limitations": [
            "This is a visual replay generated from actual sanitized terminal stdout; it is not a browser screen recording.",
            "The npm stdio segment verifies tool discovery and submitted no research job.",
            "The Python source-checkout recording shows a polling quota error; separate follow-up JSON records later completion.",
            "The direct Streamable HTTP MCP and published npm plus PyPI cross-SDK traces record completed jobs.",
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(OUTPUT)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
