"""Runtime source sync for the Vantage render worker.

RunPod's image builder currently can't reach npm registries, so new renderer
releases can't be baked in. The image already contains all node_modules; this
script refreshes renderer sources from the public worker repo at container
start (GitHub is reachable), then launches the normal handler.
"""

import io
import os
import tarfile
import traceback
import urllib.request

REPO_TARBALL = "https://codeload.github.com/asapbuyco-source/vantage-worker/tar.gz/refs/heads/main"
ALLOWED_PREFIXES = ("renderer/src/", "renderer/scripts/")


def sync_sources() -> None:
    with urllib.request.urlopen(REPO_TARBALL, timeout=30) as response:
        archive = response.read()
    updated = 0
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        for member in tar.getmembers():
            parts = member.name.split("/", 1)
            if len(parts) != 2:
                continue
            relative = parts[1]
            if not (relative.startswith(ALLOWED_PREFIXES) or relative == "handler.py"):
                continue
            target = os.path.join("/app", relative)
            if member.isdir():
                os.makedirs(target, exist_ok=True)
                continue
            source = tar.extractfile(member)
            if source is None:
                continue
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "wb") as destination:
                destination.write(source.read())
            updated += 1
    print(f"[runtime-sync] refreshed {updated} files from main", flush=True)


if __name__ == "__main__":
    try:
        sync_sources()
        with open("/app/.sources-synced", "w", encoding="utf-8") as marker:
            marker.write("1")
    except Exception:
        traceback.print_exc()
        print("[runtime-sync] failed — using baked sources", flush=True)
    os.execvp("python3", ["python3", "-u", "/app/handler.py"])
