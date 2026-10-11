"""Export the complete static game within a floppy disk budget."""

import hashlib
import json
import shutil
import subprocess
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from cyclopts import App

app = App()


@app.default
def build() -> None:
    """Create a compact game and ZIP in artifacts/floppy without changing dist."""
    project = Path(__file__).resolve().parent.parent
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required; run npm ci first")
    result = subprocess.run(
        [
            node,
            "-e",
            "require('./scripts/floppy_assets.cjs').build().catch(e=>{console.error(e);process.exitCode=1})",
        ],
        cwd=project,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if result.returncode:
        raise RuntimeError(f"Image export failed: {result.stderr.strip()}")
    report = json.loads(result.stdout)
    output = project / "artifacts" / "floppy"
    archive = output / "AgentPippo-floppy.zip"
    with zipfile.ZipFile(
        archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
    ) as bundle:
        for entry in report["files"]:
            bundle.write(output / "game" / entry["name"], entry["name"])
    raw = archive.read_bytes()
    if len(raw) > 1_400_000:
        raise RuntimeError(f"ZIP exceeds the floppy budget: {len(raw)} bytes")
    report.update(
        timestamp=datetime.now(UTC).isoformat(),
        zipBytes=len(raw),
        zipSha256=hashlib.sha256(raw).hexdigest(),
        gameBytes=sum(entry["bytes"] for entry in report["files"]),
    )
    (output / "manifest.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {key: value for key, value in report.items() if key != "files"}, indent=2
        )
    )


if __name__ == "__main__":
    app()
