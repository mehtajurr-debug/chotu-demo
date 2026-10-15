#!/usr/bin/env python3
"""Generate Bangla voice clips for the Chotu demo with the Gemini TTS API.

Usage (from the project folder):
    python generate_voice.py                 # make all clips that don't exist yet
    python generate_voice.py --only welcome  # test a single clip first
    python generate_voice.py --force         # redo everything
    python generate_voice.py --voice Achird  # try another voice
    python generate_voice.py --model gemini-3.8-flash-lite-tts   # cheaper/faster model

The API key is read from the GEMINI_API_KEY environment variable or from a
.env file next to this script (line:  GEMINI_API_KEY=your-key-here).
Never paste the key into chat or commit .env to git.

No extra packages needed (standard library only).
"""
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
DEFAULT_MODEL = "gemini-3.8-flash-tts"
DEFAULT_VOICE = "Sulafat"  # "Warm" in Google's voice list
DEFAULT_STYLE = "warm, calm and clear, speaking slowly like a caring family member"


def load_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()
    env_file = HERE / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("No API key found. Put GEMINI_API_KEY=... in a .env file next to this script.")


def synthesize(text, key, model, voice, style):
    body = {
        "model": model,
        "input": [{
            "type": "user_input",
            "content": [{
                "type": "text",
                "text": text,
                "annotations": [{"type": "speech_metadata", "style": style}],
            }],
        }],
        "response_format": {"type": "audio"},  # unary default is a ready-to-play WAV
        "generation_config": {"speech_config": [{"voice": voice}]},
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers={"x-goog-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    last_err = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            audio = None
            for step in data.get("steps", []):
                if step.get("type") == "model_output":
                    for part in step.get("content", []):
                        if part.get("type") == "audio":
                            audio = part.get("data")
            if not audio:
                raise RuntimeError("No audio in response: " + json.dumps(data)[:300])
            return base64.b64decode(audio)
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            last_err = f"HTTP {e.code}: {detail}"
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(3 * (attempt + 1))
                continue
            break  # 400/401/403 etc. will not fix themselves
        except Exception as e:  # network hiccup
            last_err = str(e)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(last_err)


def expand(config):
    """Turn lines.json into a flat list of (file_id, text, when)."""
    out = []
    for line in config["lines"]:
        if line.get("per_elder"):
            for slug, name in config["elders"].items():
                out.append((f"{line['id']}_{slug}", line["text"].replace("{name}", name), line.get("when", "")))
        else:
            out.append((line["id"], line["text"], line.get("when", "")))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="generate only this clip id, e.g. welcome or reminder_night_baba")
    ap.add_argument("--force", action="store_true", help="regenerate clips that already exist")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--voice", default=DEFAULT_VOICE)
    ap.add_argument("--style", default=DEFAULT_STYLE)
    ap.add_argument("--lines", default=str(HERE / "lines.json"))
    ap.add_argument("--out", default=str(HERE / "audio"))
    args = ap.parse_args()

    key = load_key()
    config = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    clips = expand(config)
    if args.only:
        clips = [c for c in clips if c[0] == args.only]
        if not clips:
            sys.exit(f"No clip with id '{args.only}'.")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {}
    failures = []
    for i, (cid, text, when) in enumerate(clips, 1):
        path = out_dir / f"{cid}.wav"
        manifest[cid] = {"file": f"audio/{cid}.wav", "text": text, "when": when}
        if path.exists() and not args.force:
            print(f"[{i}/{len(clips)}] skip   {cid} (exists)")
            continue
        try:
            path.write_bytes(synthesize(text, key, args.model, args.voice, args.style))
            print(f"[{i}/{len(clips)}] made   {cid}")
        except Exception as e:
            failures.append(cid)
            print(f"[{i}/{len(clips)}] FAILED {cid}: {e}")
            if "HTTP 40" in str(e):  # key/model/request problem: stop early
                break
        time.sleep(1)

    # Merge with any existing manifest so --only does not wipe it
    mpath = out_dir / "manifest.json"
    existing = json.loads(mpath.read_text(encoding="utf-8")) if mpath.exists() else {}
    existing.update(manifest)
    mpath.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nDone. {len(clips) - len(failures)} ok, {len(failures)} failed. Manifest: {mpath}")
    if failures:
        print("Failed:", ", ".join(failures))
        sys.exit(1)


if __name__ == "__main__":
    main()
