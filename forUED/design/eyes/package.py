"""Build the offline handoff from public artwork and design files only."""
import json
import posixpath
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "output" / "jarvis-eyes-v0.3.zip"
ASSETS = ROOT / "design" / "eyes"
FILES = [
    "docs/jarvis-eyes-handoff.md", "docs/jarvis-eye-transitions.md",
    "docs/jarvis-eye-interaction-design.md", "docs/eyes-mode-transition.png",
    "prototypes/eyes-design/index.html", "prototypes/eyes-design/server.mjs",
    "tests/eye-handoff.test.mjs",
]
FILES += ["design/eyes/" + name for name in (
    "README.md", "artwork.js", "transitions.js", "frames.js", "manifest.json",
    "export-frame.html", "export.mjs", "example-session.mjs", "package.py",
    "examples/work-listening-320x240-still.png",
    "examples/work-listening-320x240-still.be.rgb565",
)]
manifest = json.loads((ASSETS / "manifest.json").read_text())
for definition in manifest["states"].values():
    for variant in definition["variants"].values():
        FILES.append("design/eyes/" + variant["frame"])

readme = """# Jarvis 眼神设计交付包 v0.3

从[交付指南](docs/jarvis-eyes-handoff.md)开始。解压后可直接打开[交互预览](prototypes/eyes-design/index.html)，或用[帧导出页](design/eyes/export-frame.html)为显示驱动准备 PNG 和 RGB565。

开发者可运行 `node --test tests/eye-handoff.test.mjs` 和 `node design/eyes/export.mjs check`。需要本地 HTTP 服务时运行 `npm run eyes:preview`。项目验收历史可在完整工程中查看。
"""

def packaged_content(name, included):
    data = (ROOT / name).read_bytes()
    if name != "docs/jarvis-eye-interaction-design.md":
        return data
    # Historical project links are informative but not needed to use the kit.
    def adjust_link(match):
        label, href = match.groups()
        path = href.split("#")[0]
        destination = posixpath.normpath(posixpath.join(posixpath.dirname(name), path))
        if not path or "://" in path or destination in included:
            return match.group()
        return f"{label}（完整项目内的 {destination}）"
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", adjust_link, data.decode()).encode()

def write_member(archive, name, content):
    entry = ZipInfo(name, (2026, 11, 8, 0, 0, 0))
    entry.external_attr = 0o100644 << 16
    archive.writestr(entry, content, compress_type=ZIP_DEFLATED)

if __name__ == "__main__":
    DEST.parent.mkdir(parents=True, exist_ok=True)
    included = set(FILES)
    if len(included) != len(FILES):
        raise ValueError("Duplicate handoff path")
    tmp = DEST.with_suffix(".tmp")
    with ZipFile(tmp, "w") as archive:
        write_member(archive, "README.md", readme.encode())
        write_member(archive, "package.json", json.dumps({
            "name": "jarvis-eye-design", "version": "0.3.0", "private": True,
            "type": "module", "scripts": {"eyes:preview": "node prototypes/eyes-design/server.mjs"}
        }, indent=2).encode())
        for name in sorted(included):
            write_member(archive, name, packaged_content(name, included))
    tmp.replace(DEST)
    print(f"{DEST.name}: {len(included) + 2} files, {DEST.stat().st_size} bytes")
