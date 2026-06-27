#!/usr/bin/env python3
"""Build a normalized Terra Invicta drive comparison catalog."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

import ti_chart_core as ti  # noqa: E402
from catalog_utils import (  # noqa: E402
    compact_number,
    parse_languages,
    read_localization_file,
    source_fingerprint,
    write_json_output,
)
from ship_math import (  # noqa: E402
    ship_plan_drive_power_requirement_gw,
    ship_plan_drive_thrust_power_gw,
)


SCHEMA_VERSION = 1
DEFAULT_JSON_OUTPUT = Path("data/generated/drive_catalog.json")
TEMPLATE_FILES = {
    "drive": "TIDriveTemplate.json",
    "powerPlant": "TIPowerPlantTemplate.json",
    "radiator": "TIRadiatorTemplate.json",
}
DRIVE_LOCALIZATION_PREFIX = "TIDriveTemplate"
DRIVE_LOCALIZATION_FIELDS = ("displayName", "description")
DRIVE_ALIAS_FIELDS = ("friendlyName", "displayName")
DRIVE_RAW_FIELDS = (
    "dataName",
    "friendlyName",
    "displayName",
    "disable",
    "alien",
    "driveClassification",
    "requiredProjectName",
    "requiredPowerPlant",
    "thrust_N",
    "EV_kps",
    "efficiency",
    "flatMass_tons",
    "specificPower_kgMW",
    "cooling",
    "propellant",
    "perTankPropellantMaterials",
)
POWER_PLANT_RAW_FIELDS = (
    "dataName",
    "friendlyName",
    "displayName",
    "disable",
    "alien",
    "requiredProjectName",
    "powerPlantClass",
    "maxOutput_GW",
    "specificPower_tGW",
    "efficiency",
    "crew",
)
RADIATOR_RAW_FIELDS = (
    "dataName",
    "friendlyName",
    "displayName",
    "disable",
    "alien",
    "requiredProjectName",
    "radiatorType",
    "specificPower_2s_KWkg",
)


def clean_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): clean_value(item)
            for key, item in value.items()
            if item is not None
        }
    if isinstance(value, list):
        return [clean_value(item) for item in value if item is not None]
    return compact_number(value)


def selected_fields(template: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any]:
    return clean_value({field: template.get(field) for field in fields if field in template})


def raw_display_name(template: dict[str, Any]) -> str:
    data_name = str(template.get("dataName") or "")
    for field in DRIVE_ALIAS_FIELDS:
        value = template.get(field)
        if isinstance(value, str) and value:
            return value
    return data_name


def aliases(template: dict[str, Any], localized_display: dict[str, str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    def add(value: Any) -> None:
        if not isinstance(value, str) or not value:
            return
        if value in seen:
            return
        seen.add(value)
        result.append(value)

    add(template.get("dataName"))
    for field in DRIVE_ALIAS_FIELDS:
        add(template.get(field))
    for value in localized_display.values():
        add(value)
    return result


def load_drive_localizations(
    templates_dir: Path,
    languages: list[str],
) -> dict[str, dict[str, dict[str, str]]]:
    root = templates_dir.parent / "Localization"
    localizations: dict[str, dict[str, dict[str, str]]] = {}
    for language in languages:
        loc_file = root / language / f"{DRIVE_LOCALIZATION_PREFIX}.{language}"
        loc_values = read_localization_file(loc_file)
        entries: dict[str, dict[str, str]] = {}
        for key, value in loc_values.items():
            parts = key.split(".")
            if (
                len(parts) != 3
                or parts[0] != DRIVE_LOCALIZATION_PREFIX
                or parts[1] not in DRIVE_LOCALIZATION_FIELDS
            ):
                continue
            _, field, data_name = parts
            entries.setdefault(data_name, {})[field] = value
        localizations[language] = entries
    return localizations


def localized_fields(
    localizations: dict[str, dict[str, dict[str, str]]],
    data_name: str,
    field: str,
) -> dict[str, str]:
    values: dict[str, str] = {}
    for language, entries in localizations.items():
        value = entries.get(data_name, {}).get(field)
        if value:
            values[language] = value
    return values


def is_alien_component(template: dict[str, Any]) -> bool:
    data_name = str(template.get("dataName") or "")
    return bool(template.get("alien")) or data_name.startswith("Alien")


def normalize_drive(
    template: dict[str, Any],
    drive_templates: dict[str, dict[str, Any]],
    localizations: dict[str, dict[str, dict[str, str]]],
) -> dict[str, Any]:
    data_name = str(template.get("dataName") or "")
    display_name = localized_fields(localizations, data_name, "displayName")
    description = localized_fields(localizations, data_name, "description")
    thrust_power_gw = ship_plan_drive_thrust_power_gw(template)
    node = {
        "dataName": data_name,
        "kind": "drive",
        "rawDisplayName": raw_display_name(template),
        "displayName": display_name,
        "description": description,
        "aliases": aliases(template, display_name),
        "disabled": bool(template.get("disable")),
        "alien": is_alien_component(template),
        "requiredProject": template.get("requiredProjectName"),
        "classification": template.get("driveClassification"),
        "requiredPowerPlantClass": template.get("requiredPowerPlant"),
        "thrustN": ti.as_float(template.get("thrust_N"), 0.0),
        "exhaustVelocityKps": ti.as_float(template.get("EV_kps"), 0.0),
        "efficiency": ti.as_float(template.get("efficiency"), 0.0),
        "thrustPowerGW": thrust_power_gw,
        "powerRequirementGW": ship_plan_drive_power_requirement_gw(template),
        "flatMassTons": ti.as_float(template.get("flatMass_tons"), 0.0),
        "specificPowerKgMW": ti.as_float(template.get("specificPower_kgMW"), 0.0),
        "driveMassTons": ti.as_float(template.get("flatMass_tons"), 0.0)
        + thrust_power_gw * ti.as_float(template.get("specificPower_kgMW"), 0.0),
        "cooling": template.get("cooling"),
        "openCycleCooling": ti.as_float(template.get("EV_kps"), 0.0) > 0.0
        and _open_cycle_from_catalog(template, drive_templates),
        "propellant": template.get("propellant"),
        "perTankPropellantMaterials": template.get("perTankPropellantMaterials") or {},
        "template": selected_fields(template, DRIVE_RAW_FIELDS),
    }
    return clean_value(node)


def _open_cycle_from_catalog(
    drive: dict[str, Any],
    drive_templates: dict[str, dict[str, Any]],
) -> bool:
    from ship_math import ship_plan_drive_open_cycle

    return ship_plan_drive_open_cycle(drive, drive_templates)


def normalize_power_plant(template: dict[str, Any]) -> dict[str, Any]:
    node = {
        "dataName": str(template.get("dataName") or ""),
        "kind": "powerPlant",
        "rawDisplayName": raw_display_name(template),
        "aliases": aliases(template, {}),
        "disabled": bool(template.get("disable")),
        "alien": is_alien_component(template),
        "requiredProject": template.get("requiredProjectName"),
        "powerPlantClass": template.get("powerPlantClass"),
        "maxOutputGW": ti.as_float(template.get("maxOutput_GW"), 0.0),
        "specificMassTonsPerGW": ti.as_float(template.get("specificPower_tGW"), 0.0),
        "efficiency": ti.as_float(template.get("efficiency"), 0.0),
        "crew": ti.as_float(template.get("crew"), 0.0),
        "template": selected_fields(template, POWER_PLANT_RAW_FIELDS),
    }
    return clean_value(node)


def normalize_radiator(template: dict[str, Any]) -> dict[str, Any]:
    node = {
        "dataName": str(template.get("dataName") or ""),
        "kind": "radiator",
        "rawDisplayName": raw_display_name(template),
        "aliases": aliases(template, {}),
        "disabled": bool(template.get("disable")),
        "alien": is_alien_component(template),
        "requiredProject": template.get("requiredProjectName"),
        "radiatorType": template.get("radiatorType"),
        "specificPowerKWPerKg": ti.as_float(template.get("specificPower_2s_KWkg"), 0.0),
        "template": selected_fields(template, RADIATOR_RAW_FIELDS),
    }
    return clean_value(node)


def source_metadata(
    templates_dir: Path,
    languages: list[str],
    game_version: dict[str, str | None],
) -> dict[str, Any]:
    template_sources = {
        kind: source_fingerprint(templates_dir / filename)
        for kind, filename in TEMPLATE_FILES.items()
    }
    localization_sources: dict[str, Any] = {}
    for language in languages:
        path = templates_dir.parent / "Localization" / language / f"{DRIVE_LOCALIZATION_PREFIX}.{language}"
        localization_sources[language] = source_fingerprint(path)
    return clean_value(
        {
            "sourceRoot": "local Terra Invicta install",
            "templateRoot": "TerraInvicta_Data/StreamingAssets/Templates",
            "templates": template_sources,
            "localization": {
                "languages": languages,
                "files": localization_sources,
            },
            "gameVersion": game_version.get("version") or "unknown",
            "gameVersionSource": game_version.get("source"),
            "steamBuildId": game_version.get("steamBuildId"),
        }
    )


def build_catalog(
    templates_dir: Path,
    languages: list[str],
    game_version: dict[str, str | None] | None = None,
) -> dict[str, Any]:
    drive_templates = ti.load_named_templates(templates_dir, TEMPLATE_FILES["drive"])
    power_plant_templates = ti.load_named_templates(templates_dir, TEMPLATE_FILES["powerPlant"])
    radiator_templates = ti.load_named_templates(templates_dir, TEMPLATE_FILES["radiator"])
    localizations = load_drive_localizations(templates_dir, languages)
    version = game_version or ti.detect_game_version(templates_dir)

    drives = [
        normalize_drive(template, drive_templates, localizations)
        for template in drive_templates.values()
    ]
    power_plants = [
        normalize_power_plant(template)
        for template in power_plant_templates.values()
    ]
    radiators = [
        normalize_radiator(template)
        for template in radiator_templates.values()
    ]

    return {
        "schemaVersion": SCHEMA_VERSION,
        "source": source_metadata(templates_dir, languages, version),
        "counts": {
            "drives": len(drives),
            "enabledDrives": sum(1 for item in drives if not item.get("disabled")),
            "powerPlants": len(power_plants),
            "enabledPowerPlants": sum(1 for item in power_plants if not item.get("disabled")),
            "radiators": len(radiators),
            "enabledRadiators": sum(1 for item in radiators if not item.get("disabled")),
        },
        "drives": sorted(drives, key=lambda item: (item.get("rawDisplayName") or "", item["dataName"])),
        "powerPlants": sorted(power_plants, key=lambda item: (item.get("rawDisplayName") or "", item["dataName"])),
        "radiators": sorted(radiators, key=lambda item: (item.get("rawDisplayName") or "", item["dataName"])),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--templates-dir", help="Path to TerraInvicta_Data\\StreamingAssets\\Templates.")
    parser.add_argument("--json-output", default=str(DEFAULT_JSON_OUTPUT), help="Generated drive catalog JSON path.")
    parser.add_argument("--languages", default="kor,en", help="Comma-separated drive localization languages to include.")
    parser.add_argument("--game-version", help="Terra Invicta version label to embed in catalog metadata.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    templates_dir = ti.resolve_templates_dir(args.templates_dir)
    if templates_dir is None:
        raise SystemExit("Templates directory not found. Pass --templates-dir.")
    languages = parse_languages(args.languages)
    game_version = ti.detect_game_version(templates_dir, args.game_version)
    catalog = build_catalog(templates_dir, languages, game_version)

    json_output = Path(args.json_output)
    write_json_output(json_output, catalog)

    ti.print_json(
        {
            "drives": catalog["counts"]["drives"],
            "enabledDrives": catalog["counts"]["enabledDrives"],
            "powerPlants": catalog["counts"]["powerPlants"],
            "radiators": catalog["counts"]["radiators"],
            "json": str(json_output),
            "templatesDir": str(templates_dir),
        },
        compact=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
