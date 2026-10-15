"""RunPod serverless worker: full-resolution Remotion renders for Vantage.

Input (job["input"]):
  spec            RenderSpec JSON (asset URLs must be publicly reachable)
  renderId        backend render job id
  callbackUrl     backend endpoint that accepts the finished MP4
  callbackSecret  shared secret sent as x-worker-secret
  scale           render scale (default 1 — full res)

The handler reuses the production render CLI (renderer/scripts/render.mts),
so worker output is identical to the Railway renderer, only at full scale.
"""

import json
import os
import subprocess
import tempfile

import requests
import runpod

RENDERER_DIR = "/app/renderer"


def run_render(job):
    inp = job.get("input", {}) or {}
    spec = inp.get("spec")
    render_id = inp.get("renderId") or "render"
    callback = inp.get("callbackUrl")
    secret = inp.get("callbackSecret") or os.environ.get("CALLBACK_SECRET", "")
    scale = inp.get("scale", 1)

    if not spec or not callback:
        return {"error": "spec and callbackUrl are required"}

    work = tempfile.mkdtemp(prefix="render-")
    spec_path = os.path.join(work, "spec.json")
    out_path = os.path.join(work, "out.mp4")
    log_path = os.path.join(work, "progress.ndjson")

    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(spec, f)

    cmd = [
        "npx", "--no-install", "tsx", "scripts/render.mts",
        "--spec", spec_path,
        "--out", out_path,
        "--log", log_path,
        "--scale", str(scale),
    ]
    print("render cmd:", " ".join(cmd), flush=True)
    proc = subprocess.run(cmd, cwd=RENDERER_DIR, timeout=60 * 50)
    if proc.returncode != 0:
        return {"error": f"renderer exited with code {proc.returncode}"}
    if not os.path.exists(out_path):
        return {"error": "renderer produced no output"}

    size = os.path.getsize(out_path)
    meta = spec.get("meta", {}) or {}
    duration = round(sum(float(s.get("duration", 0) or 0) for s in spec.get("scenes", [])), 1)
    print(f"rendered {size} bytes, uploading to {callback}", flush=True)

    with open(out_path, "rb") as fh:
        resp = requests.post(
            callback,
            data={
                "renderId": render_id,
                "duration": duration,
                "width": meta.get("width", ""),
                "height": meta.get("height", ""),
            },
            files={"file": ("render.mp4", fh, "video/mp4")},
            headers={"x-worker-secret": secret},
            timeout=900,
        )
    resp.raise_for_status()

    return {
        "ok": True,
        "sizeBytes": size,
        "durationSeconds": duration,
        "uploadStatus": resp.status_code,
    }


runpod.serverless.start({"handler": run_render})
