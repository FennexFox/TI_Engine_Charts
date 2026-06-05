"""Small Terra Invicta template helpers used by the engine chart builder."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable


APP_ID = "1176470"


def json_default(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def print_json(value: Any, *, compact: bool = False) -> None:
    if compact:
        print(json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=json_default))
    else:
        print(json.dumps(value, ensure_ascii=False, indent=2, default=json_default))


def candidate_steamapps_dirs() -> Iterable[Path]:
    yield Path("C:/Program Files (x86)/Steam/steamapps")
    yield Path("C:/Program Files/Steam/steamapps")
    yield Path("D:/SteamLibrary/steamapps")
    yield Path("E:/SteamLibrary/steamapps")


def candidate_templates_dirs() -> Iterable[Path]:
    for steamapps in candidate_steamapps_dirs():
        yield steamapps / "common" / "Terra Invicta" / "TerraInvicta_Data" / "StreamingAssets" / "Templates"


def resolve_templates_dir(templates_arg: str | None) -> Path | None:
    if templates_arg:
        path = Path(templates_arg).expanduser()
        if not path.is_dir():
            raise FileNotFoundError(f"Templates directory not found: {path}")
        return path
    for path in candidate_templates_dirs():
        if (path / "TITraitTemplate.json").is_file():
            return path
    return None


def load_named_templates(templates_dir: Path | None, filename: str) -> dict[str, dict[str, Any]]:
    if templates_dir is None:
        return {}
    path = templates_dir / filename
    if not path.is_file():
        return {}
    stat = path.stat()
    return _load_named_templates_cached(str(path.resolve()), stat.st_size, stat.st_mtime_ns)


@lru_cache(maxsize=None)
def _load_named_templates_cached(path_value: str, size: int, mtime_ns: int) -> dict[str, dict[str, Any]]:
    path = Path(path_value)
    with path.open("r", encoding="utf-8-sig") as handle:
        raw = json.load(handle)
    if not isinstance(raw, list):
        return {}
    return {item["dataName"]: item for item in raw if isinstance(item, dict) and item.get("dataName")}


def as_float(value: Any, default: float = 0.0) -> float:
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return default
    return default


def file_fingerprint(path: Path | None) -> dict[str, Any] | None:
    if path is None or not path.is_file():
        return None
    stat = path.stat()
    return {"path": str(path), "size": stat.st_size, "mtime_ns": stat.st_mtime_ns}


def detect_game_version(templates_dir: Path, explicit_version: str | None = None) -> dict[str, str | None]:
    """Return best-effort version metadata for the local Terra Invicta install."""

    if explicit_version:
        return {"version": explicit_version, "source": "argument", "steamBuildId": steam_build_id(templates_dir)}

    install_root = templates_dir.parents[2] if len(templates_dir.parents) >= 3 else templates_dir
    aidump_version = parse_aidump_version(install_root / "AIDump.txt")
    build_id = steam_build_id(templates_dir)
    if aidump_version:
        return {"version": aidump_version, "source": "AIDump.txt", "steamBuildId": build_id}
    if build_id:
        return {"version": f"Steam build {build_id}", "source": "Steam appmanifest", "steamBuildId": build_id}
    return {"version": "unknown", "source": None, "steamBuildId": None}


def parse_aidump_version(path: Path) -> str | None:
    if not path.is_file():
        return None
    try:
        first_line = path.read_text(encoding="utf-8-sig", errors="replace").splitlines()[0]
    except IndexError:
        return None
    match = re.search(r"\bVersion:\s*([0-9]+(?:\.[0-9]+)+)", first_line)
    return match.group(1) if match else None


def steam_build_id(templates_dir: Path) -> str | None:
    appmanifest = find_steam_appmanifest(templates_dir)
    if appmanifest is None:
        return None
    text = appmanifest.read_text(encoding="utf-8", errors="replace")
    match = re.search(r'"buildid"\s+"([^"]+)"', text)
    return match.group(1) if match else None


def find_steam_appmanifest(templates_dir: Path) -> Path | None:
    resolved = templates_dir.resolve()
    for steamapps in candidate_steamapps_dirs():
        common = (steamapps / "common").resolve()
        try:
            resolved.relative_to(common)
        except ValueError:
            continue
        manifest = steamapps / f"appmanifest_{APP_ID}.acf"
        if manifest.is_file():
            return manifest
    return None
