#!/usr/bin/env python3
"""Build a normalized Terra Invicta ship hull and module catalog."""

from __future__ import annotations

import argparse
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import ti_chart_core as ti
from catalog_utils import (
    compact_number,
    parse_languages,
    read_localization_file,
    source_fingerprint,
    write_json_output,
    write_text_output,
)


SCHEMA_VERSION = 3
DEFAULT_JSON_OUTPUT = Path("data/ship_catalog.json")
DEFAULT_MARKDOWN_OUTPUT = Path("docs/ship_catalog.md")
HUMAN_SHIPYARD_BUILD_TIME_MODIFIERS = {
    "t1": 1.0,
    "t2": 0.8,
    "t3": 0.6,
}
SHIP_TEMPLATE_FILES = {
    "hull": "TIShipHullTemplate.json",
    "utilityModule": "TIUtilityModuleTemplate.json",
    "armor": "TIShipArmorTemplate.json",
}
WEAPON_TEMPLATE_FILES = {
    "gun": "TIGunTemplate.json",
    "laser": "TILaserWeaponTemplate.json",
    "magnetic": "TIMagneticGunTemplate.json",
    "missile": "TIMissileTemplate.json",
    "particle": "TIParticleWeaponTemplate.json",
    "plasma": "TIPlasmaWeaponTemplate.json",
}
LOCALIZATION_FILES = {
    "hull": "TIShipHullTemplate",
    "utilityModule": "TIUtilityModuleTemplate",
    "armor": "TIShipArmorTemplate",
    "gun": "TIGunTemplate",
    "laser": "TILaserWeaponTemplate",
    "magnetic": "TIMagneticGunTemplate",
    "missile": "TIMissileTemplate",
    "particle": "TIParticleWeaponTemplate",
    "plasma": "TIPlasmaWeaponTemplate",
}
LOCALIZATION_FIELDS = ("displayName", "description")
MODULE_EFFECT_RULES = {
    "ThrustMultiplier": {
        "type": "thrustMultiplier",
        "operation": "multiply",
        "valueKey": "multiplier",
        "category": "drivePerformance",
    },
    "EVMultiplier": {
        "type": "exhaustVelocityMultiplier",
        "operation": "multiply",
        "valueKey": "multiplier",
        "category": "drivePerformance",
    },
}
MODULE_REQUIREMENT_RULES = {
    "RequiresFissionDrive": "fissionDrive",
    "RequiresFusionDrive": "fusionDrive",
    "RequiresNuclearDrive": "nuclearDrive",
    "RequiresHydrogenPropellant": "hydrogenPropellant",
    "RequiresNonISRUDrive": "nonIsruDrive",
}
UNMODELED_MODULE_RULE_CATEGORIES = {
    "ArmorStruts": "armor",
    "Assault": "groundCombat",
    "ComponentArmor": "damageMitigation",
    "Crashdown": "landing",
    "ECM": "defense",
    "FoundAutomatedFissionOutpost": "habDeployment",
    "FoundAutomatedFissionPlatform": "habDeployment",
    "FoundAutomatedSolarOutpost": "habDeployment",
    "FoundAutomatedSolarPlatform": "habDeployment",
    "FoundFissionOutpost": "habDeployment",
    "FoundFissionPlatform": "habDeployment",
    "FoundFusionOutpost": "habDeployment",
    "FoundFusionPlatform": "habDeployment",
    "FoundSolarOutpost": "habDeployment",
    "FoundSolarPlatform": "habDeployment",
    "FoundSurveillanceOrbital": "habDeployment",
    "FoundSurveillancePlatform": "habDeployment",
    "FoundSurveillanceRing": "habDeployment",
    "FullRepairCost": "repair",
    "GenerateSpaceScienceBonus": "science",
    "ImmunetoAerobrakingDamage": "damageMitigation",
    "ImmuneToDamage": "damageMitigation",
    "LandArmy": "groundCombat",
    "LandHydra": "groundCombat",
    "LaserPowerBonus": "powerDemand",
    "Magazine": "ammunition",
    "MarineOpsDefenseOnly": "groundCombat",
    "ParticleBeamPowerBonus": "powerDemand",
    "Prospector": "resourceProspecting",
    "RadHardened": "damageMitigation",
    "ReduceFleetMCConsumption": "missionControl",
    "RefuelFromAtmospheres": "propellant",
    "RefuelFromUnimprovedSites": "propellant",
    "Repair": "repair",
    "RotationalThrust": "maneuvering",
    "SalvageBonus": "salvage",
    "Surveillance": "surveillance",
    "TargetingComputer": "weapons",
}


def clean_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): clean_value(item) for key, item in value.items() if item is not None}
    if isinstance(value, list):
        return [clean_value(item) for item in value if item is not None]
    return compact_number(value)


def normalize_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if item]
    if isinstance(value, str) and value:
        return [value]
    return []


def normalized_module_rule_value(value: Any) -> Any:
    if isinstance(value, bool):
        return value
    try:
        number = ti.as_float(value, 0.0)
    except (TypeError, ValueError):
        number = 0.0
    if number:
        return compact_number(number)
    if value is None:
        return None
    if isinstance(value, (str, int, float)):
        return clean_value(value)
    return clean_value(value)


def normalize_module_effect_contract(rules: list[str], special_value: Any) -> dict[str, Any]:
    effects: list[dict[str, Any]] = []
    requirements: list[dict[str, Any]] = []
    unmodeled_rules: list[dict[str, Any]] = []
    normalized_value = normalized_module_rule_value(special_value)
    for rule in rules:
        if rule in MODULE_EFFECT_RULES:
            definition = MODULE_EFFECT_RULES[rule]
            effect: dict[str, Any] = {
                "type": definition["type"],
                "category": definition["category"],
                "operation": definition["operation"],
                "sourceRule": rule,
            }
            if normalized_value is not None:
                effect[str(definition["valueKey"])] = normalized_value
            effects.append(effect)
            continue
        if rule in MODULE_REQUIREMENT_RULES:
            requirements.append({
                "type": MODULE_REQUIREMENT_RULES[rule],
                "sourceRule": rule,
            })
            continue
        unmodeled: dict[str, Any] = {
            "rule": rule,
            "category": UNMODELED_MODULE_RULE_CATEGORIES.get(rule, "unsupported"),
        }
        unmodeled_rules.append(unmodeled)
    return {
        "effects": effects,
        "effectRequirements": requirements,
        "unmodeledRules": unmodeled_rules,
    }


def localized_fields(
    localizations: dict[str, dict[str, dict[str, dict[str, str]]]],
    kind: str,
    data_name: str,
    field: str,
) -> dict[str, str]:
    values: dict[str, str] = {}
    for language, entries in localizations.get(kind, {}).items():
        value = entries.get(data_name, {}).get(field)
        if value:
            values[language] = value
    return values


def load_ship_localizations(
    templates_dir: Path,
    languages: list[str],
) -> dict[str, dict[str, dict[str, dict[str, str]]]]:
    root = templates_dir.parent / "Localization"
    localizations: dict[str, dict[str, dict[str, dict[str, str]]]] = {
        kind: {} for kind in LOCALIZATION_FILES
    }
    for kind, prefix in LOCALIZATION_FILES.items():
        for language in languages:
            loc_file = root / language / f"{prefix}.{language}"
            loc_values = read_localization_file(loc_file)
            entries: dict[str, dict[str, str]] = {}
            for key, value in loc_values.items():
                parts = key.split(".")
                if len(parts) != 3 or parts[0] != prefix or parts[1] not in LOCALIZATION_FIELDS:
                    continue
                _, field, data_name = parts
                entries.setdefault(data_name, {})[field] = value
            localizations[kind][language] = entries
    return localizations


def is_alien_module(template: dict[str, Any]) -> bool:
    data_name = str(template.get("dataName") or "")
    required_project = str(template.get("requiredProjectName") or "")
    return (
        bool(template.get("alien"))
        or data_name.startswith("Alien")
        or required_project.startswith("Project_Alien")
    )


def slot_counts(slots: Any) -> dict[str, int]:
    counts: dict[str, int] = {}
    if not isinstance(slots, list):
        return counts
    for slot in slots:
        if not isinstance(slot, dict):
            continue
        slot_type = str(slot.get("moduleSlotType") or "None")
        counts[slot_type] = counts.get(slot_type, 0) + 1
    return dict(sorted(counts.items()))


def normalized_project(template: dict[str, Any]) -> str | None:
    value = template.get("requiredProjectName")
    return str(value) if value else None


def mount_slot_class(mount: str) -> str | None:
    if "Nose" in mount:
        return "nose"
    if "Hull" in mount:
        return "hull"
    return None


def mount_slot_size(mount: str) -> float:
    prefix_sizes = {
        "Half": 1.0,
        "One": 1.0,
        "Two": 2.0,
        "Three": 3.0,
        "Four": 4.0,
    }
    for prefix, size in prefix_sizes.items():
        if mount.startswith(prefix):
            return size
    return 1.0


def shipyard_build_times_days(base_days: float) -> dict[str, float]:
    return {
        tier: compact_number(base_days * modifier)
        for tier, modifier in HUMAN_SHIPYARD_BUILD_TIME_MODIFIERS.items()
    }


def normalize_hull(
    template: dict[str, Any],
    localizations: dict[str, dict[str, dict[str, dict[str, str]]]],
) -> dict[str, Any]:
    data_name = str(template.get("dataName"))
    slots = slot_counts(template.get("shipModuleSlots"))
    base_construction_time_days = ti.as_float(template.get("baseConstructionTime_days"), 0.0)
    node = {
        "dataName": data_name,
        "kind": "hull",
        "friendlyName": template.get("friendlyName"),
        "displayName": localized_fields(localizations, "hull", data_name, "displayName"),
        "description": localized_fields(localizations, "hull", data_name, "description"),
        "requiredProject": normalized_project(template),
        "massTons": ti.as_float(template.get("mass_tons"), 0.0),
        "constructionTier": int(ti.as_float(template.get("consTier"), 0.0)),
        "baseConstructionTimeDays": base_construction_time_days,
        "shipyardBuildTimesDays": shipyard_build_times_days(base_construction_time_days),
        "shipyardBuildTimeModifiers": HUMAN_SHIPYARD_BUILD_TIME_MODIFIERS,
        "structuralIntegrity": ti.as_float(template.get("structuralIntegrity"), 0.0),
        "crew": ti.as_float(template.get("crew"), 0.0),
        "maxOfficers": int(ti.as_float(template.get("maxOfficers"), 0.0)),
        "missionControl": ti.as_float(template.get("missionControl"), 0.0),
        "noseHardpoints": int(ti.as_float(template.get("noseHardpoints"), 0.0)),
        "hullHardpoints": int(ti.as_float(template.get("hullHardpoints"), 0.0)),
        "internalModules": int(ti.as_float(template.get("internalModules"), 0.0)),
        "slotCounts": slots,
        "lengthM": ti.as_float(template.get("length_m"), 0.0),
        "widthM": ti.as_float(template.get("width_m"), 0.0),
        "volume": ti.as_float(template.get("volume"), 0.0),
        "thrusterMultiplier": ti.as_float(template.get("thrusterMultiplier"), 0.0),
        "alien": bool(template.get("alien")),
        "noShipyardBuild": bool(template.get("noShipyardBuild")),
        "simpleHull": bool(template.get("simpleHull")),
        "weightedBuildMaterials": template.get("weightedBuildMaterials") or {},
    }
    node["hardpoints"] = node["noseHardpoints"] + node["hullHardpoints"]
    node["utilitySlots"] = slots.get("Utility", node["internalModules"])
    return clean_value(node)


def normalize_weapon_module(
    template: dict[str, Any],
    weapon_type: str,
    localizations: dict[str, dict[str, dict[str, dict[str, str]]]],
) -> dict[str, Any]:
    data_name = str(template.get("dataName"))
    mount = str(template.get("mount") or "")
    node = {
        "dataName": data_name,
        "kind": "weaponModule",
        "weaponType": weapon_type,
        "friendlyName": template.get("friendlyName") or template.get("displayName"),
        "displayName": localized_fields(localizations, weapon_type, data_name, "displayName"),
        "description": localized_fields(localizations, weapon_type, data_name, "description"),
        "requiredProject": normalized_project(template),
        "massTons": ti.as_float(template.get("baseWeaponMass_tons"), 0.0),
        "crew": ti.as_float(template.get("crew"), 0.0),
        "mount": mount,
        "slotClass": mount_slot_class(mount),
        "slotSize": mount_slot_size(mount),
        "alien": is_alien_module(template),
        "weightedBuildMaterials": template.get("weightedBuildMaterials") or {},
    }
    return clean_value(node)


def normalize_utility_module(
    template: dict[str, Any],
    localizations: dict[str, dict[str, dict[str, dict[str, str]]]],
) -> dict[str, Any]:
    data_name = str(template.get("dataName"))
    special_rules = normalize_string_list(template.get("specialModuleRules"))
    special_value = template.get("specialModuleValue")
    effect_contract = normalize_module_effect_contract(special_rules, special_value)
    node = {
        "dataName": data_name,
        "kind": "utilityModule",
        "friendlyName": template.get("friendlyName"),
        "displayName": localized_fields(localizations, "utilityModule", data_name, "displayName"),
        "description": localized_fields(localizations, "utilityModule", data_name, "description"),
        "requiredProject": normalized_project(template),
        "massTons": ti.as_float(template.get("mass_tons"), 0.0),
        "crew": ti.as_float(template.get("crew"), 0.0),
        "powerRequirementMW": ti.as_float(template.get("powerRequirement_MW"), 0.0),
        "grouping": int(ti.as_float(template.get("grouping"), -1.0)),
        "minConstructionTier": int(ti.as_float(template.get("minConsTier"), 0.0)),
        "specialRules": special_rules,
        "specialValue": special_value,
        "effects": effect_contract["effects"],
        "effectRequirements": effect_contract["effectRequirements"],
        "unmodeledRules": effect_contract["unmodeledRules"],
        "noCombatRepair": bool(template.get("noCombatRepair")),
        "alien": is_alien_module(template),
        "weightedBuildMaterials": template.get("weightedBuildMaterials") or {},
    }
    return clean_value(node)


def normalize_armor(
    template: dict[str, Any],
    localizations: dict[str, dict[str, dict[str, dict[str, str]]]],
) -> dict[str, Any]:
    data_name = str(template.get("dataName"))
    node = {
        "dataName": data_name,
        "kind": "armor",
        "friendlyName": template.get("friendlyName"),
        "displayName": localized_fields(localizations, "armor", data_name, "displayName"),
        "description": localized_fields(localizations, "armor", data_name, "description"),
        "requiredProject": normalized_project(template),
        "densityKgM3": ti.as_float(template.get("density_kgm3"), 0.0),
        "xRayHalfValueCm": ti.as_float(template.get("xRayHalfValue_cm"), 0.0),
        "baryonicHalfValueCm": ti.as_float(template.get("baryonicHalfValue_cm"), 0.0),
        "heatOfVaporizationMJkg": ti.as_float(template.get("heatofVaporization_MJkg"), 0.0),
        "specialties": template.get("specialties") or [],
        "alien": is_alien_module(template),
        "weightedBuildMaterials": template.get("weightedBuildMaterials") or {},
    }
    return clean_value(node)


def display_name(node: dict[str, Any], language: str) -> str:
    display = node.get("displayName")
    if isinstance(display, dict) and display.get(language):
        return str(display[language])
    return str(node.get("friendlyName") or node.get("dataName") or "")


def hull_sort_key(node: dict[str, Any]) -> tuple[Any, ...]:
    return (
        bool(node.get("alien")),
        bool(node.get("noShipyardBuild")),
        bool(node.get("simpleHull")),
        node.get("constructionTier", 0),
        node.get("massTons", 0),
        node.get("friendlyName") or node.get("dataName"),
    )


def utility_module_sort_key(node: dict[str, Any]) -> tuple[Any, ...]:
    grouping = node.get("grouping")
    return (
        0 if node.get("dataName") == "Empty" else 1,
        bool(node.get("alien")),
        grouping if isinstance(grouping, int) and grouping >= 0 else 999,
        node.get("minConstructionTier", 0),
        node.get("massTons", 0),
        node.get("friendlyName") or node.get("dataName"),
    )


def weapon_module_sort_key(node: dict[str, Any]) -> tuple[Any, ...]:
    slot_order = {"nose": 0, "hull": 1}
    return (
        0 if node.get("dataName") == "EmptyWeapon" else 1,
        bool(node.get("alien")),
        slot_order.get(str(node.get("slotClass")), 9),
        node.get("slotSize", 1),
        node.get("weaponType") or "",
        node.get("massTons", 0),
        node.get("friendlyName") or node.get("dataName"),
    )


def build_catalog(templates_dir: Path, languages: list[str]) -> dict[str, Any]:
    localizations = load_ship_localizations(templates_dir, languages)
    hulls = [
        normalize_hull(template, localizations)
        for template in ti.load_named_templates(templates_dir, SHIP_TEMPLATE_FILES["hull"]).values()
        if not template.get("disable")
    ]
    utility_modules = [
        normalize_utility_module(template, localizations)
        for template in ti.load_named_templates(templates_dir, SHIP_TEMPLATE_FILES["utilityModule"]).values()
        if not template.get("disable")
    ]
    weapon_modules = [
        normalize_weapon_module(template, weapon_type, localizations)
        for weapon_type, filename in WEAPON_TEMPLATE_FILES.items()
        for template in ti.load_named_templates(templates_dir, filename).values()
        if not template.get("disable") and template.get("mount")
    ]
    armors = [
        normalize_armor(template, localizations)
        for template in ti.load_named_templates(templates_dir, SHIP_TEMPLATE_FILES["armor"]).values()
        if not template.get("disable")
    ]
    hulls.sort(key=hull_sort_key)
    utility_modules.sort(key=utility_module_sort_key)
    weapon_modules.sort(key=weapon_module_sort_key)
    armors.sort(key=lambda node: (bool(node.get("alien")), node.get("densityKgM3", 0), display_name(node, "en")))
    return {
        "schemaVersion": SCHEMA_VERSION,
        "source": {
            "templateRoot": "TerraInvicta_Data/StreamingAssets/Templates",
            "hullTemplate": source_fingerprint(templates_dir / SHIP_TEMPLATE_FILES["hull"]),
            "utilityModuleTemplate": source_fingerprint(templates_dir / SHIP_TEMPLATE_FILES["utilityModule"]),
            "armorTemplate": source_fingerprint(templates_dir / SHIP_TEMPLATE_FILES["armor"]),
            "localizationLanguages": languages,
        },
        "notes": [
            "Hulls and utility modules are static template data from the local Terra Invicta install.",
            "The dry-mass calculator uses hull mass_tons plus selected weapon baseWeaponMass_tons and utility module mass_tons.",
            "Utility module effects preserve raw specialRules/specialValue and add normalized effects, effectRequirements, and unmodeledRules fields.",
            "Weapon mount sizes are normalized from mount names: Half=1, One=1, Two=2, Three=3, Four=4. Nose and hull mounts consume separate hull hardpoint capacities.",
            "Human shipyard build times use Space Dock, Shipyard, and Spaceworks constructionTimeModifier values: T1=1.0, T2=0.8, T3=0.6.",
            "Armor templates are cataloged for the dry-mass calculator; armor mass depends on hull dimensions, armor material, and nose/lateral/tail point layout.",
        ],
        "counts": {
            "hulls": len(hulls),
            "humanBuildableHulls": sum(
                1 for hull in hulls if not hull.get("alien") and not hull.get("noShipyardBuild") and not hull.get("simpleHull")
            ),
            "utilityModules": len(utility_modules),
            "humanUtilityModules": sum(1 for module in utility_modules if not module.get("alien")),
            "weaponModules": len(weapon_modules),
            "humanWeaponModules": sum(1 for module in weapon_modules if not module.get("alien")),
            "armors": len(armors),
        },
        "hulls": hulls,
        "utilityModules": utility_modules,
        "weaponModules": weapon_modules,
        "armors": armors,
        "byDataName": {
            "hulls": {str(node["dataName"]): index for index, node in enumerate(hulls)},
            "utilityModules": {str(node["dataName"]): index for index, node in enumerate(utility_modules)},
            "weaponModules": {str(node["dataName"]): index for index, node in enumerate(weapon_modules)},
            "armors": {str(node["dataName"]): index for index, node in enumerate(armors)},
        },
    }


def markdown_safe(value: Any) -> str:
    return str(value if value is not None else "").replace("|", "/").replace("\n", " ")


def markdown_table(title: str, rows: Iterable[dict[str, Any]], columns: list[tuple[str, str]], language: str) -> list[str]:
    lines = [
        f"## {title}",
        "",
        "| " + " | ".join(label for label, _ in columns) + " |",
        "| " + " | ".join("---" for _ in columns) + " |",
    ]
    for row in rows:
        values: list[str] = []
        for _, key in columns:
            if key == "name":
                values.append(markdown_safe(display_name(row, language)))
            else:
                values.append(markdown_safe(row.get(key)))
        lines.append("| " + " | ".join(values) + " |")
    lines.append("")
    return lines


def build_markdown(catalog: dict[str, Any], language: str) -> str:
    counts = catalog["counts"]
    lines = [
        "# Terra Invicta Ship Catalog",
        "",
        f"Generated from `{catalog['source']['templateRoot']}`.",
        "",
        "This file is generated. Rebuild it with:",
        "",
        "```powershell",
        "python .\\tools\\build_ship_catalog.py",
        "```",
        "",
        "Important interpretation notes:",
        "",
        "- Hull dry mass comes from `TIShipHullTemplate.mass_tons`.",
        "- Weapon dry mass comes from weapon template `baseWeaponMass_tons`.",
        "- Weapon hardpoint use is derived from mount names: `Half*` = 1, `One*` = 1, `Two*` = 2, `Three*` = 3, `Four*` = 4.",
        "- Utility module dry mass comes from `TIUtilityModuleTemplate.mass_tons`.",
        "- Utility module effects preserve raw `specialRules`/`specialValue` and expose normalized `effects`, `effectRequirements`, and `unmodeledRules` for later engine-effect evaluation.",
        "- Human shipyard build times use `constructionTimeModifier`: T1 Space Dock = 1.0, T2 Shipyard = 0.8, T3 Spaceworks = 0.6.",
        "- Armor templates are included for dry-mass calculation; armor mass depends on hull dimensions, armor material, and nose/lateral/tail point layout.",
        "",
        f"Hull count: `{counts['hulls']}` total, `{counts['humanBuildableHulls']}` human buildable.",
        f"Utility module count: `{counts['utilityModules']}` total, `{counts['humanUtilityModules']}` human.",
        f"Weapon module count: `{counts['weaponModules']}` total, `{counts['humanWeaponModules']}` human.",
        f"Armor count: `{counts['armors']}`.",
        "",
    ]
    lines.extend(
        markdown_table(
            "Hulls",
            catalog["hulls"],
            [
                ("Name", "name"),
                ("dataName", "dataName"),
                ("Mass t", "massTons"),
                ("Tier", "constructionTier"),
                ("Nose HP", "noseHardpoints"),
                ("Hull HP", "hullHardpoints"),
                ("Utility", "utilitySlots"),
                ("Required project", "requiredProject"),
            ],
            language,
        )
    )
    lines.extend(
        markdown_table(
            "Utility Modules",
            catalog["utilityModules"],
            [
                ("Name", "name"),
                ("dataName", "dataName"),
                ("Mass t", "massTons"),
                ("Crew", "crew"),
                ("Power MW", "powerRequirementMW"),
                ("Min tier", "minConstructionTier"),
                ("Required project", "requiredProject"),
            ],
            language,
        )
    )
    lines.extend(
        markdown_table(
            "Weapon Modules",
            catalog["weaponModules"],
            [
                ("Name", "name"),
                ("dataName", "dataName"),
                ("Type", "weaponType"),
                ("Mount", "mount"),
                ("Slot", "slotClass"),
                ("Size", "slotSize"),
                ("Mass t", "massTons"),
                ("Crew", "crew"),
                ("Required project", "requiredProject"),
            ],
            language,
        )
    )
    lines.extend(
        markdown_table(
            "Armor",
            catalog["armors"],
            [
                ("Name", "name"),
                ("dataName", "dataName"),
                ("Density kg/m3", "densityKgM3"),
                ("X-ray HV cm", "xRayHalfValueCm"),
                ("Baryonic HV cm", "baryonicHalfValueCm"),
                ("Required project", "requiredProject"),
            ],
            language,
        )
    )
    return "\n".join(lines).rstrip() + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--templates-dir", help="Path to TerraInvicta_Data\\StreamingAssets\\Templates.")
    parser.add_argument("--languages", default="kor,en", help="Comma-separated localization languages to include.")
    parser.add_argument("--json-output", default=str(DEFAULT_JSON_OUTPUT), help="Generated JSON output path.")
    parser.add_argument("--markdown-output", default=str(DEFAULT_MARKDOWN_OUTPUT), help="Generated Markdown output path.")
    parser.add_argument("--markdown-language", default="kor", help="Localization language used for Markdown names.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    templates_dir = ti.resolve_templates_dir(args.templates_dir)
    if templates_dir is None:
        raise SystemExit("Templates directory not found. Pass --templates-dir.")
    languages = parse_languages(args.languages)
    catalog = build_catalog(templates_dir, languages)

    json_output = Path(args.json_output)
    write_json_output(json_output, catalog)

    markdown_output = Path(args.markdown_output)
    write_text_output(markdown_output, build_markdown(catalog, args.markdown_language))

    ti.print_json(
        {
            "hulls": catalog["counts"]["hulls"],
            "humanBuildableHulls": catalog["counts"]["humanBuildableHulls"],
            "utilityModules": catalog["counts"]["utilityModules"],
            "weaponModules": catalog["counts"]["weaponModules"],
            "armors": catalog["counts"]["armors"],
            "json": str(json_output),
            "markdown": str(markdown_output),
            "templatesDir": str(templates_dir),
        },
        compact=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
