#!/usr/bin/env python3
"""Convert exported preset JSON into built-in preset library entries."""

from __future__ import annotations

import argparse
import json
import re
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PRESET_LIBRARY_PATH = ROOT / "data" / "preset_library.json"
BUILT_IN_PRESET_FORMAT = "ti-engine-chart-built-in-presets/v1"
CHART_PRESET_FORMAT = "ti-engine-chart-named-preset/v1"
DESIGN_PRESET_FORMAT = "ti-engine-chart-design-preset/v1"
BUILT_IN_DESIGN_PREFIX = "built-in-design:"
BUILT_IN_CHART_PREFIX = "built-in-chart:"
SNAPSHOT_KEYS = ("designPresetLibrary", "dryMassPresetLibrary")


def load_json_object(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8-sig") as handle:
            payload = json.load(handle)
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON in {path}: {error}") from error
    if not isinstance(payload, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return payload


def write_json_object(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def clone_json(value: Any) -> Any:
    return deepcopy(value)


def sanitize_name(value: Any, fallback: str) -> str:
    name = str(value or "").strip()
    return name or fallback


def slugify(value: Any, fallback: str = "preset") -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"^built-in-(chart|design):", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or fallback


def strip_builtin_prefix(raw_id: str, prefix: str) -> str:
    return raw_id[len(prefix) :] if raw_id.startswith(prefix) else raw_id


def source_id(raw_id: Any, prefix: str, name: str) -> str:
    if isinstance(raw_id, str) and raw_id.strip():
        value = strip_builtin_prefix(raw_id.strip(), BUILT_IN_CHART_PREFIX)
        value = strip_builtin_prefix(value, BUILT_IN_DESIGN_PREFIX)
        return slugify(value, f"{prefix}-{slugify(name)}")
    return f"{prefix}-{slugify(name)}"


def runtime_design_id(raw_source_id: str) -> str:
    return f"{BUILT_IN_DESIGN_PREFIX}{raw_source_id}"


def unique_id(candidate: str, entries: list[dict[str, Any]]) -> str:
    taken = {entry.get("id") for entry in entries if isinstance(entry, dict)}
    if candidate not in taken:
        return candidate
    suffix = 2
    while f"{candidate}-{suffix}" in taken:
        suffix += 1
    return f"{candidate}-{suffix}"


def unique_name(candidate: str, entries: list[dict[str, Any]]) -> str:
    taken = {entry.get("name") for entry in entries if isinstance(entry, dict)}
    if candidate not in taken:
        return candidate
    suffix = 2
    while f"{candidate} ({suffix})" in taken:
        suffix += 1
    return f"{candidate} ({suffix})"


def find_entry_index(entries: list[dict[str, Any]], entry_id: str) -> int | None:
    for index, entry in enumerate(entries):
        if isinstance(entry, dict) and entry.get("id") == entry_id:
            return index
    return None


def load_preset_library(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "format": BUILT_IN_PRESET_FORMAT,
            "chartPresets": [],
            "dryMassPresets": [],
        }
    library = load_json_object(path)
    chart_presets = library.get("chartPresets")
    dry_mass_presets = library.get("dryMassPresets")
    if not isinstance(chart_presets, list):
        raise ValueError(f"Expected chartPresets array in {path}")
    if not isinstance(dry_mass_presets, list):
        raise ValueError(f"Expected dryMassPresets array in {path}")
    library["format"] = str(library.get("format") or BUILT_IN_PRESET_FORMAT)
    return library


def is_chart_settings(payload: dict[str, Any]) -> bool:
    if payload.get("format") == "ti-engine-chart-preset/v1":
        return True
    chart_keys = {
        "metric",
        "thrusters",
        "fuelEfficiencyUnit",
        "dryMassTons",
        "targetDvKps",
        "dryMassCalculator",
        "dryMassCalc",
        "selectedDesignPresetId",
        "categories",
        "families",
    }
    return any(key in payload for key in chart_keys)


def extract_chart_settings(payload: dict[str, Any]) -> dict[str, Any] | None:
    settings = payload.get("settings")
    if isinstance(settings, dict):
        return clone_json(settings)
    if is_chart_settings(payload):
        return clone_json(payload)
    return None


def chart_name(payload: dict[str, Any], input_path: Path, override: str | None) -> str:
    if override:
        return sanitize_name(override, input_path.stem)
    return sanitize_name(payload.get("name"), input_path.stem.replace("_", " ").replace("-", " "))


def split_simulation_defaults(design: dict[str, Any], source: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any] | None]:
    dry_mass_design = clone_json(design)
    simulation_defaults = source.get("simulationDefaults")
    if not isinstance(simulation_defaults, dict):
        simulation_defaults = dry_mass_design.get("simulationDefaults")
    if "simulationDefaults" in dry_mass_design:
        del dry_mass_design["simulationDefaults"]
    return dry_mass_design, clone_json(simulation_defaults) if isinstance(simulation_defaults, dict) else None


def design_source(entry: dict[str, Any]) -> dict[str, Any]:
    nested = entry.get("preset")
    return nested if isinstance(nested, dict) else entry


def extract_design_object(source: dict[str, Any]) -> dict[str, Any] | None:
    for key in ("dryMassDesign", "design", "calculator", "settings", "dryMassCalculator", "dryMassCalc"):
        value = source.get(key)
        if isinstance(value, dict):
            return value
    if source.get("classId") or source.get("slotModules") or source.get("weaponModules"):
        return source
    return None


def normalize_design_entry(raw_entry: dict[str, Any], fallback_name: str) -> tuple[str, dict[str, Any]] | None:
    source = design_source(raw_entry)
    design = extract_design_object(source)
    if design is None:
        return None

    name = sanitize_name(source.get("name"), fallback_name)
    raw_id = source.get("id")
    entry_id = source_id(raw_id, "design", name)
    dry_mass_design, simulation_defaults = split_simulation_defaults(design, source)
    output: dict[str, Any] = {
        "format": DESIGN_PRESET_FORMAT,
        "id": entry_id,
        "name": name,
        "dryMassDesign": dry_mass_design,
    }
    if simulation_defaults is not None:
        output["simulationDefaults"] = simulation_defaults
    for key in ("displayName",):
        if isinstance(source.get(key), dict):
            output[key] = clone_json(source[key])
    for key in ("createdAt", "updatedAt"):
        if isinstance(source.get(key), str):
            output[key] = source[key]
    original_id = raw_id if isinstance(raw_id, str) and raw_id.strip() else entry_id
    return original_id, output


def design_dedupe_key(raw_entry: dict[str, Any], normalized: tuple[str, dict[str, Any]]) -> str:
    original_id, entry = normalized
    if original_id:
        return f"id:{original_id}"
    return "payload:" + json.dumps(entry.get("dryMassDesign"), sort_keys=True, separators=(",", ":"))


def extract_design_entries(payload: dict[str, Any], chart_settings: dict[str, Any] | None) -> list[tuple[str, dict[str, Any]]]:
    candidates: list[dict[str, Any]] = []
    if payload.get("format") == "ti-engine-chart-design-preset-library/v1" and isinstance(payload.get("presets"), list):
        candidates.extend(item for item in payload["presets"] if isinstance(item, dict))
    elif payload.get("format") in {"ti-engine-chart-design-preset/v1", "ti-engine-chart-dry-mass-preset/v1"}:
        candidates.append(payload)

    if chart_settings is not None:
        for key in SNAPSHOT_KEYS:
            snapshot = chart_settings.get(key)
            if isinstance(snapshot, list):
                candidates.extend(item for item in snapshot if isinstance(item, dict))

    normalized_entries: list[tuple[str, dict[str, Any]]] = []
    seen: set[str] = set()
    for index, candidate in enumerate(candidates):
        normalized = normalize_design_entry(candidate, f"Design preset {index + 1}")
        if normalized is None:
            continue
        key = design_dedupe_key(candidate, normalized)
        if key in seen:
            continue
        seen.add(key)
        normalized_entries.append(normalized)
    return normalized_entries


def add_or_update_entry(
    entries: list[dict[str, Any]],
    entry: dict[str, Any],
    on_conflict: str,
) -> tuple[str, str]:
    desired_id = str(entry["id"])
    existing_index = find_entry_index(entries, desired_id)
    if existing_index is not None:
        if on_conflict == "skip":
            return "reused", str(entries[existing_index].get("id"))
        if on_conflict == "replace":
            entry["name"] = sanitize_name(entry.get("name"), desired_id)
            entries[existing_index] = entry
            return "replaced", desired_id
        entry["id"] = unique_id(desired_id, entries)

    entry["name"] = unique_name(sanitize_name(entry.get("name"), str(entry["id"])), entries)
    entries.append(entry)
    return "added", str(entry["id"])


def known_design_source_ids(library: dict[str, Any]) -> set[str]:
    return {
        str(entry.get("id"))
        for entry in library.get("dryMassPresets", [])
        if isinstance(entry, dict) and isinstance(entry.get("id"), str) and entry.get("id")
    }


def rewrite_selected_design_id(settings: dict[str, Any], id_map: dict[str, str], library: dict[str, Any]) -> str | None:
    selected = settings.get("selectedDesignPresetId")
    if not isinstance(selected, str) or not selected.strip():
        return None

    selected = selected.strip()
    if selected in id_map:
        settings["selectedDesignPresetId"] = runtime_design_id(id_map[selected])
        return settings["selectedDesignPresetId"]

    source_selected = strip_builtin_prefix(selected, BUILT_IN_DESIGN_PREFIX)
    available_ids = known_design_source_ids(library)
    if source_selected in available_ids:
        settings["selectedDesignPresetId"] = runtime_design_id(source_selected)
        return settings["selectedDesignPresetId"]

    del settings["selectedDesignPresetId"]
    return None


def make_chart_entry(
    payload: dict[str, Any],
    settings: dict[str, Any],
    input_path: Path,
    name_override: str | None,
    id_map: dict[str, str],
    library: dict[str, Any],
) -> dict[str, Any]:
    name = chart_name(payload, input_path, name_override)
    for key in SNAPSHOT_KEYS:
        settings.pop(key, None)
    rewrite_selected_design_id(settings, id_map, library)

    output: dict[str, Any] = {
        "id": source_id(payload.get("id"), "chart", name),
        "name": name,
        "settings": settings,
    }
    for key in ("createdAt", "updatedAt"):
        if isinstance(payload.get(key), str):
            output[key] = payload[key]
    return output


def convert_payload(
    payload: dict[str, Any],
    input_path: Path,
    library: dict[str, Any],
    *,
    add_chart: bool,
    add_designs: bool,
    chart_name_override: str | None,
    on_conflict: str,
) -> dict[str, Any]:
    chart_settings = extract_chart_settings(payload)
    outcomes: dict[str, Any] = {
        "chart": None,
        "designs": [],
        "warnings": [],
    }

    id_map: dict[str, str] = {}
    if add_designs:
        design_entries = extract_design_entries(payload, chart_settings)
        if not design_entries:
            outcomes["warnings"].append("No design presets found to extract.")
        for original_id, design_entry in design_entries:
            status, final_id = add_or_update_entry(library["dryMassPresets"], design_entry, on_conflict)
            id_map[original_id] = final_id
            outcomes["designs"].append({
                "status": status,
                "id": final_id,
                "name": design_entry.get("name"),
            })

    if add_chart:
        if chart_settings is None:
            raise ValueError("Input does not contain chart preset settings.")
        chart_entry = make_chart_entry(
            payload,
            chart_settings,
            input_path,
            chart_name_override,
            id_map,
            library,
        )
        status, final_id = add_or_update_entry(library["chartPresets"], chart_entry, on_conflict)
        outcomes["chart"] = {
            "status": status,
            "id": final_id,
            "name": chart_entry.get("name"),
        }

    return outcomes


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("exported_preset", help="Path to exported preset JSON.")
    parser.add_argument(
        "--name",
        help="Name to use for the generated chart preset. Defaults to the export name or file stem.",
    )
    parser.add_argument(
        "--chart",
        action="store_true",
        help="Add a chart preset. If used without --dry-mass-library, only the chart preset is added.",
    )
    parser.add_argument(
        "--dry-mass-library",
        action="store_true",
        help="Extract design presets. If used without --chart, only design presets are added.",
    )
    parser.add_argument(
        "--preset-library",
        default=str(DEFAULT_PRESET_LIBRARY_PATH),
        help=f"Built-in preset library to update. Default: {DEFAULT_PRESET_LIBRARY_PATH}",
    )
    parser.add_argument(
        "--on-conflict",
        choices=("suffix", "skip", "replace"),
        default="suffix",
        help="How to handle duplicate source IDs. Default: suffix.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the conversion result without writing the preset library.",
    )
    return parser.parse_args(argv)


def selected_modes(args: argparse.Namespace) -> tuple[bool, bool]:
    if args.chart or args.dry_mass_library:
        return bool(args.chart), bool(args.dry_mass_library)
    return True, True


def print_outcomes(outcomes: dict[str, Any], preset_library_path: Path, dry_run: bool) -> None:
    chart = outcomes.get("chart")
    if chart:
        print(f"{chart['status'].title()} chart preset: {chart['name']} ({chart['id']})")
    for design in outcomes.get("designs", []):
        print(f"{design['status'].title()} design preset: {design['name']} ({design['id']})")
    for warning in outcomes.get("warnings", []):
        print(f"Warning: {warning}", file=sys.stderr)
    action = "Would write" if dry_run else "Wrote"
    print(f"{action} preset library: {preset_library_path}")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    input_path = Path(args.exported_preset).expanduser().resolve()
    preset_library_path = Path(args.preset_library).expanduser().resolve()
    add_chart, add_designs = selected_modes(args)

    payload = load_json_object(input_path)
    library = load_preset_library(preset_library_path)
    outcomes = convert_payload(
        payload,
        input_path,
        library,
        add_chart=add_chart,
        add_designs=add_designs,
        chart_name_override=args.name,
        on_conflict=args.on_conflict,
    )

    if not args.dry_run:
        write_json_object(preset_library_path, library)
    print_outcomes(outcomes, preset_library_path, args.dry_run)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(2)
