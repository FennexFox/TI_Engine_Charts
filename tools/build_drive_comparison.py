"""Build a standalone all-drive comparison dashboard from local TI data."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

from ti_chart_core import as_float, detect_game_version, load_named_templates, resolve_templates_dir  # noqa: E402
from drive_comparison_i18n import (  # noqa: E402
    client_translation_pairs,
    note_html_translations,
    portable_data,
)
from ship_math import (  # noqa: E402
    ship_plan_drive_open_cycle,
    ship_plan_drive_power_requirement_gw,
    ship_plan_drive_thrust_power_gw,
    ship_plan_power_plant_class_compatible,
)


STANDARD_GRAVITY_MPS2 = 9.80665
TARGET_DV_KPS = 500.0
DEFAULT_DRY_MASS_TONS = 10000.0

CATEGORY_ORDER = ("Chemical", "Electric", "Fission", "Fusion", "Antimatter", "Alien")
DEFAULT_CATEGORY_KEY = "Fusion"
SELF_POWERED_POWER_KEY = "Self_Contained"

CATEGORY_META: dict[str, dict[str, Any]] = {
    "Chemical": {"label": {"ko": "화학", "en": "Chemical"}, "color": "#d38b28", "colorOklch": "oklch(70% 0.145 65)"},
    "Electric": {"label": {"ko": "전기", "en": "Electric"}, "color": "#0891b2", "colorOklch": "oklch(66% 0.135 220)"},
    "Fission": {"label": {"ko": "핵분열", "en": "Fission"}, "color": "#65a30d", "colorOklch": "oklch(66% 0.150 135)"},
    "Fusion": {"label": {"ko": "핵융합", "en": "Fusion"}, "color": "#7c3aed", "colorOklch": "oklch(66% 0.165 300)"},
    "Antimatter": {"label": {"ko": "반물질", "en": "Antimatter"}, "color": "#db2777", "colorOklch": "oklch(66% 0.180 350)"},
    "Alien": {"label": {"ko": "외계", "en": "Alien"}, "color": "#71717a", "colorOklch": "oklch(62% 0.035 285)"},
}

CATEGORY_HELP: dict[str, dict[str, str]] = {
    "Chemical": {
        "ko": "고추력·저효율 계통입니다. 연구 부담은 낮지만 장거리 dV에서는 추진체가 급증하므로 초반 단거리 요격, 저궤도 방어, 낮은 dV 프리셋을 점검할 때 유용합니다.",
        "en": "High-thrust, low-efficiency drives. They are cheap to unlock, but propellant mass grows quickly at high dV, so use them for early short-range interceptors, orbital defense, and low-dV presets.",
    },
    "Electric": {
        "ko": "고효율·저추력 계통입니다. 느린 장거리 이동과 저가 운용에는 좋지만 전투 가속은 낮은 편이어서 TWR 필터와 전원/라디에이터 조합을 함께 확인하는 것이 좋습니다.",
        "en": "High-efficiency, low-thrust drives. They suit slow long-range transfers and cheap operation, but combat acceleration is usually low, so inspect TWR together with power and radiator choices.",
    },
    "Fission": {
        "ko": "초중반의 실전형 전환 계통입니다. 화학보다 효율이 좋고 핵융합보다 빨리 열리므로 내행성권 전투함, 순찰함, 중간 dV 임무를 비교할 때 적합합니다.",
        "en": "Practical early-to-midgame transition drives. They beat chemical efficiency and unlock before most fusion paths, making them useful for inner-system warships, patrol craft, and medium-dV missions.",
    },
    "Fusion": {
        "ko": "중후반 핵심 투자 후보입니다. 계열별 성격 차이가 크지만 대체로 높은 dV와 실전 TWR을 함께 노릴 수 있어 어떤 핵융합 라인에 연구력을 넣을지 비교하기 좋습니다.",
        "en": "Core mid-to-lategame investment candidates. Families differ sharply, but many can combine high dV with usable combat TWR, making this category the main place to compare fusion research paths.",
    },
    "Antimatter": {
        "ko": "최후반 고성능·고비용 계통입니다. 연구와 자원 부담이 크지만 빠른 전략 기동과 고성능 전투함을 노릴 때 총질량/TWR의 상한선을 확인하기 좋습니다.",
        "en": "Very-lategame, high-performance, high-cost drives. They are expensive in research and resources, but useful for checking the ceiling of fast strategic movement and elite combat ship designs.",
    },
    "Alien": {
        "ko": "외계 부품 참고용 계통입니다. 일반적인 인류 연구 투자 대상은 아니며, 성능 기준선이나 데이터 확인을 위해 필요할 때만 켜는 편이 좋습니다.",
        "en": "Reference category for alien components. These are not normal human research investments; enable them mainly for benchmarks or data inspection.",
    },
}

SUBFAMILY_META: dict[tuple[str, str], dict[str, Any]] = {
    ("Chemical", "Chemical"): {
        "label": {"ko": "Chemical", "en": "Chemical"},
        "color": "#d28d2d",
        "colorOklch": "oklch(70% 0.145 65)",
        "bandColor": "#e0a24a",
        "bandColorOklch": "oklch(75% 0.140 70)",
    },
    ("Electric", "Electromagnetic"): {
        "label": {"ko": "Electromagnetic", "en": "Electromagnetic"},
        "color": "#2563eb",
        "colorOklch": "oklch(62% 0.175 260)",
        "bandColor": "#4e8ffb",
        "bandColorOklch": "oklch(68% 0.165 260)",
    },
    ("Electric", "Electrostatic"): {
        "label": {"ko": "Electrostatic", "en": "Electrostatic"},
        "color": "#0891b2",
        "colorOklch": "oklch(65% 0.135 220)",
        "bandColor": "#00abbd",
        "bandColorOklch": "oklch(70% 0.130 215)",
    },
    ("Electric", "Electrothermal"): {
        "label": {"ko": "Electrothermal", "en": "Electrothermal"},
        "color": "#0d9488",
        "colorOklch": "oklch(65% 0.135 185)",
        "bandColor": "#14b8a6",
        "bandColorOklch": "oklch(71% 0.130 185)",
    },
    ("Fission", "Solid_Core_Fission"): {
        "label": {"ko": "Solid Core", "en": "Solid Core"},
        "color": "#4d7c0f",
        "colorOklch": "oklch(58% 0.135 135)",
        "bandColor": "#65a30d",
        "bandColorOklch": "oklch(66% 0.145 135)",
    },
    ("Fission", "Liquid_Core_Fission"): {
        "label": {"ko": "Liquid Core", "en": "Liquid Core"},
        "color": "#15803d",
        "colorOklch": "oklch(58% 0.130 150)",
        "bandColor": "#22a35a",
        "bandColorOklch": "oklch(66% 0.135 150)",
    },
    ("Fission", "Gas_Core_Fission"): {
        "label": {"ko": "Gas Core", "en": "Gas Core"},
        "color": "#0f766e",
        "colorOklch": "oklch(58% 0.120 175)",
        "bandColor": "#14a092",
        "bandColorOklch": "oklch(66% 0.125 175)",
    },
    ("Fission", "Fission_Pulse"): {
        "label": {"ko": "Fission Pulse", "en": "Fission Pulse"},
        "color": "#a16207",
        "colorOklch": "oklch(58% 0.130 80)",
        "bandColor": "#ca8a04",
        "bandColorOklch": "oklch(68% 0.135 80)",
    },
    ("Fission", "NuclearSaltWater"): {
        "label": {"ko": "Nuclear Salt Water", "en": "Nuclear Salt Water"},
        "color": "#047857",
        "colorOklch": "oklch(58% 0.125 165)",
        "bandColor": "#10a27a",
        "bandColorOklch": "oklch(66% 0.130 165)",
    },
    ("Fusion", "Electrostatic_Confinement_Fusion"): {
        "label": {"ko": "Fusor / Electrostatic", "en": "Fusor / Electrostatic"},
        "color": "#2563eb",
        "colorOklch": "oklch(62% 0.175 260)",
        "bandColor": "#4e8ffb",
        "bandColorOklch": "oklch(66% 0.175 260)",
    },
    ("Fusion", "Mirrored_Magnetic_Confinement_Fusion"): {
        "label": {"ko": "Reflex / Mirror Cell", "en": "Reflex / Mirror Cell"},
        "color": "#0891b2",
        "colorOklch": "oklch(62% 0.145 205)",
        "bandColor": "#00abbd",
        "bandColorOklch": "oklch(66% 0.150 205)",
    },
    ("Fusion", "Toroid_Magnetic_Confinement_Fusion"): {
        "label": {"ko": "Torus / Tokamak", "en": "Torus / Tokamak"},
        "color": "#7c3aed",
        "colorOklch": "oklch(62% 0.170 310)",
        "bandColor": "#b270df",
        "bandColorOklch": "oklch(66% 0.170 310)",
    },
    ("Fusion", "Hybrid_Confinement_Fusion"): {
        "label": {"ko": "Polywell-Plasmajet / Hybrid", "en": "Polywell-Plasmajet / Hybrid"},
        "color": "#059669",
        "colorOklch": "oklch(62% 0.155 150)",
        "bandColor": "#38ac5c",
        "bandColorOklch": "oklch(66% 0.155 150)",
    },
    ("Fusion", "Z_Pinch_Fusion"): {
        "label": {"ko": "Zeta / Z-Pinch", "en": "Zeta / Z-Pinch"},
        "color": "#dc2626",
        "colorOklch": "oklch(62% 0.170 25)",
        "bandColor": "#e8605b",
        "bandColorOklch": "oklch(66% 0.170 25)",
    },
    ("Fusion", "Inertial_Confinement_Fusion"): {
        "label": {"ko": "Nova / Inertial", "en": "Nova / Inertial"},
        "color": "#ca8a04",
        "colorOklch": "oklch(64% 0.150 75)",
        "bandColor": "#d58e00",
        "bandColorOklch": "oklch(70% 0.155 75)",
    },
    ("Fusion", "Fusion_Pulse"): {
        "label": {"ko": "Fusion Pulse", "en": "Fusion Pulse"},
        "color": "#9333ea",
        "colorOklch": "oklch(62% 0.165 300)",
        "bandColor": "#b36cf2",
        "bandColorOklch": "oklch(68% 0.160 300)",
    },
    ("Antimatter", "Antimatter_Plasma_Core"): {
        "label": {"ko": "Antimatter Plasma Core", "en": "Antimatter Plasma Core"},
        "color": "#db2777",
        "colorOklch": "oklch(62% 0.175 350)",
        "bandColor": "#ef5b9c",
        "bandColorOklch": "oklch(68% 0.170 350)",
    },
    ("Antimatter", "Antimatter_Beam_Core"): {
        "label": {"ko": "Antimatter Beam Core", "en": "Antimatter Beam Core"},
        "color": "#be185d",
        "colorOklch": "oklch(58% 0.170 5)",
        "bandColor": "#e05282",
        "bandColorOklch": "oklch(66% 0.165 5)",
    },
    ("Alien", "Alien"): {
        "label": {"ko": "Alien", "en": "Alien"},
        "color": "#71717a",
        "colorOklch": "oklch(62% 0.035 285)",
        "bandColor": "#83839e",
        "bandColorOklch": "oklch(62% 0.040 285)",
    },
}


class ResearchCostIndex:
    def __init__(self, catalog_path: Path) -> None:
        with catalog_path.open("r", encoding="utf-8-sig") as handle:
            catalog = json.load(handle)
        self.catalog = catalog
        self.nodes: dict[str, dict[str, Any]] = {
            str(node.get("dataName")): node
            for node in catalog.get("nodes", [])
            if isinstance(node, dict) and node.get("dataName")
        }
        self._closure_cache: dict[str, frozenset[str]] = {}

    def node(self, name: str | None) -> dict[str, Any] | None:
        if not name:
            return None
        return self.nodes.get(str(name))

    def display(self, name: str | None) -> dict[str, str | None]:
        node = self.node(name)
        if not node:
            return {"ko": None, "en": str(name) if name else None}
        display = node.get("displayName") if isinstance(node.get("displayName"), dict) else {}
        return {
            "ko": display.get("kor") or node.get("friendlyName") or name,
            "en": display.get("en") or node.get("friendlyName") or name,
        }

    def own_cost(self, name: str | None) -> float:
        node = self.node(name)
        return max(0.0, as_float(node.get("researchCost"), 0.0)) if node else 0.0

    def closure(self, name: str | None) -> frozenset[str]:
        if not name or name not in self.nodes:
            return frozenset()
        return self._closure(name, frozenset())

    def cumulative_cost(self, name: str | None) -> float:
        return sum(self.own_cost(node_name) for node_name in self.closure(name))

    def closure_cost(self, closure: Iterable[str]) -> float:
        return sum(self.own_cost(node_name) for node_name in set(closure))

    def combined_cumulative_cost(self, *names: str | None) -> float:
        closure: set[str] = set()
        for name in names:
            closure.update(self.closure(name))
        return self.closure_cost(closure)

    def _closure(self, name: str, stack: frozenset[str]) -> frozenset[str]:
        if name in self._closure_cache:
            return self._closure_cache[name]
        if name in stack:
            return frozenset({name})
        node = self.nodes.get(name)
        if not node:
            return frozenset()
        result = {name}
        result.update(self._requirements_closure(node.get("requirements"), stack | {name}))
        frozen = frozenset(result)
        self._closure_cache[name] = frozen
        return frozen

    def _requirements_closure(self, requirement: Any, stack: frozenset[str]) -> set[str]:
        if isinstance(requirement, list):
            result: set[str] = set()
            for item in requirement:
                result.update(self._requirements_closure(item, stack))
            return result
        if not isinstance(requirement, dict):
            return set()
        if requirement.get("node"):
            return set(self._closure(str(requirement["node"]), stack))
        if isinstance(requirement.get("all"), list):
            result: set[str] = set()
            for item in requirement["all"]:
                result.update(self._requirements_closure(item, stack))
            return result
        if isinstance(requirement.get("any"), list):
            choices = [
                self._requirements_closure(item, stack)
                for item in requirement["any"]
            ]
            if not choices:
                return set()
            return min(choices, key=lambda choice: sum(self.own_cost(node_name) for node_name in choice))
        return set()


def remove_thruster_suffix(data_name: str, display: str) -> tuple[str, str, int | None]:
    match = re.match(r"^(.*)x([1-6])$", data_name)
    if not match:
        return data_name, display, None
    base_key = match.group(1)
    count = int(match.group(2))
    base_display = re.sub(r"\s+x[1-6]$", "", display).strip()
    return base_key, base_display or base_key, count


def is_alien_component(template: dict[str, Any]) -> bool:
    values = " ".join(
        str(template.get(key) or "")
        for key in ("dataName", "friendlyName", "requiredProjectName", "powerPlantClass")
    )
    return "alien" in values.casefold()


def label_text(value: dict[str, str] | str, lang: str = "ko") -> str:
    if isinstance(value, dict):
        return value.get(lang) or value.get("en") or value.get("ko") or ""
    return str(value)


def drive_category_key(classification: str, alien: bool) -> str:
    if alien:
        return "Alien"
    if classification == "Chemical":
        return "Chemical"
    if classification in {"Electromagnetic", "Electrostatic", "Electrothermal"}:
        return "Electric"
    if classification in {"Fission_Thermal", "Fission_Pulse", "NuclearSaltWater"}:
        return "Fission"
    if classification in {"Fusion_Thermal", "Fusion_Pulse"}:
        return "Fusion"
    if classification == "Antimatter":
        return "Antimatter"
    return "Electric"


def drive_subfamily_key(classification: str, required_power_plant: str, category_key: str, alien: bool) -> str:
    if alien:
        return "Alien"
    if category_key in {"Chemical", "Electric"}:
        return classification or category_key
    if classification == "Fission_Thermal":
        return required_power_plant or "Fission_Thermal"
    if classification in {"Fission_Pulse", "NuclearSaltWater", "Fusion_Pulse"}:
        return classification
    if category_key in {"Fusion", "Antimatter"}:
        return required_power_plant or classification or category_key
    return required_power_plant or classification or category_key


def subfamily_meta(category_key: str, subfamily_key: str) -> dict[str, Any]:
    meta = SUBFAMILY_META.get((category_key, subfamily_key))
    if meta:
        return meta
    category = CATEGORY_META.get(category_key, CATEGORY_META["Electric"])
    fallback_label = subfamily_key.replace("_", " ") if subfamily_key else category_key
    return {
        "label": {"ko": fallback_label, "en": fallback_label},
        "color": category["color"],
        "colorOklch": category["colorOklch"],
        "bandColor": category["color"],
        "bandColorOklch": category["colorOklch"],
    }


def category_sort_key(category_key: str) -> int:
    try:
        return CATEGORY_ORDER.index(category_key)
    except ValueError:
        return len(CATEGORY_ORDER)


def self_contained_power_option(drive_cumulative: float) -> dict[str, Any]:
    return {
        "id": SELF_POWERED_POWER_KEY,
        "displayName": "Self-contained drive",
        "powerPlantClass": SELF_POWERED_POWER_KEY,
        "maxOutputGW": 0.0,
        "specificMassTonsPerGW": 0.0,
        "efficiency": 1.0,
        "crew": 0.0,
        "requiredProject": None,
        "requiredProjectDisplay": {"ko": "자체동력 추진기", "en": "Self-contained drive"},
        "ownResearchCost": 0.0,
        "cumulativeResearch": drive_cumulative,
        "alien": False,
        "sequenceIndex": 0,
        "sequenceLabel": "self-contained drive",
        "selfContained": True,
    }


def power_option_hardware_key(drive: dict[str, Any], option: dict[str, Any]) -> tuple[float, float]:
    power_requirement = as_float(drive.get("powerRequirementGW"), 0.0)
    reactor_mass = 0.0 if option.get("selfContained") else max(
        1.0,
        as_float(option.get("specificMassTonsPerGW"), 0.0) * power_requirement,
    )
    waste_heat = 0.0 if drive.get("openCycleCooling") or option.get("selfContained") else power_requirement * (
        1.0 - as_float(option.get("efficiency"), 0.0)
    )
    return reactor_mass, max(0.0, waste_heat)


def prune_efficiency_frontier(drive: dict[str, Any], sequence: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if str(drive.get("requiredPowerPlantClass") or "") != "Any_General":
        return sequence
    if as_float(drive.get("powerRequirementGW"), 0.0) <= 0.0:
        return sequence
    frontier: list[dict[str, Any]] = []
    for option in sequence:
        option_mass, option_heat = power_option_hardware_key(drive, option)
        dominated = False
        for kept in frontier:
            kept_mass, kept_heat = power_option_hardware_key(drive, kept)
            if kept_mass <= option_mass and kept_heat <= option_heat and (kept_mass < option_mass or kept_heat < option_heat):
                dominated = True
                break
        if not dominated:
            frontier.append(option)
    return frontier


def reactor_row(template: dict[str, Any], research: ResearchCostIndex) -> dict[str, Any]:
    project = template.get("requiredProjectName")
    cumulative = research.cumulative_cost(str(project) if project else None)
    return {
        "id": template.get("dataName"),
        "displayName": template.get("friendlyName") or template.get("dataName"),
        "powerPlantClass": template.get("powerPlantClass"),
        "maxOutputGW": as_float(template.get("maxOutput_GW"), 0.0),
        "specificMassTonsPerGW": as_float(template.get("specificPower_tGW"), 0.0),
        "efficiency": as_float(template.get("efficiency"), 0.0),
        "crew": as_float(template.get("crew"), 0.0),
        "requiredProject": project,
        "requiredProjectDisplay": research.display(str(project) if project else None),
        "ownResearchCost": research.own_cost(str(project) if project else None),
        "cumulativeResearch": cumulative,
        "alien": is_alien_component(template),
    }


def radiator_row(template: dict[str, Any], research: ResearchCostIndex) -> dict[str, Any]:
    project = template.get("requiredProjectName")
    required_project_display = research.display(str(project) if project else None)
    english_name = template.get("friendlyName") or template.get("dataName")
    korean_name = required_project_display.get("ko") or english_name
    return {
        "id": template.get("dataName"),
        "displayName": {"ko": korean_name, "en": english_name},
        "radiatorType": template.get("radiatorType"),
        "specificPowerKWPerKg": as_float(template.get("specificPower_2s_KWkg"), 0.0),
        "requiredProject": project,
        "requiredProjectDisplay": required_project_display,
        "ownResearchCost": research.own_cost(str(project) if project else None),
        "cumulativeResearch": research.cumulative_cost(str(project) if project else None),
        "alien": is_alien_component(template),
    }


def compatible_power_sequence(
    drive: dict[str, Any],
    power_plants: list[dict[str, Any]],
    unlock_closure: frozenset[str],
    drive_cumulative: float,
) -> list[dict[str, Any]]:
    if as_float(drive.get("powerRequirementGW"), 0.0) <= 0.0:
        return [self_contained_power_option(drive_cumulative)]
    drive_alien = bool(drive["alien"])
    compatible = [
        plant
        for plant in power_plants
        if bool(plant["alien"]) == drive_alien
        and ship_plan_power_plant_class_compatible(
            str(drive["requiredPowerPlantClass"] or ""),
            str(plant["powerPlantClass"] or ""),
        )
        and as_float(plant["maxOutputGW"], 0.0) >= as_float(drive["powerRequirementGW"], 0.0)
    ]
    if not compatible and drive_alien:
        compatible = [
            plant
            for plant in power_plants
            if ship_plan_power_plant_class_compatible(
                str(drive["requiredPowerPlantClass"] or ""),
                str(plant["powerPlantClass"] or ""),
            )
            and as_float(plant["maxOutputGW"], 0.0) >= as_float(drive["powerRequirementGW"], 0.0)
        ]
    compatible = sorted(
        compatible,
        key=lambda plant: (
            as_float(plant["cumulativeResearch"], math.inf),
            as_float(plant["specificMassTonsPerGW"], math.inf),
            str(plant["displayName"]),
        ),
    )
    if not compatible:
        return []

    closure_matches = [
        plant
        for plant in compatible
        if plant.get("requiredProject") in unlock_closure
    ]
    if closure_matches:
        lower = max(closure_matches, key=lambda plant: as_float(plant["cumulativeResearch"], 0.0))
    else:
        already_available = [
            plant
            for plant in compatible
            if as_float(plant["cumulativeResearch"], math.inf) <= drive_cumulative
        ]
        lower = max(already_available, key=lambda plant: as_float(plant["cumulativeResearch"], 0.0)) if already_available else compatible[0]

    lower_cost = as_float(lower["cumulativeResearch"], 0.0)
    sequence = [
        {**plant}
        for plant in compatible
        if as_float(plant["cumulativeResearch"], 0.0) >= lower_cost
    ]
    sequence = prune_efficiency_frontier(drive, sequence)
    for index, plant in enumerate(sequence):
        plant["sequenceIndex"] = index
        plant["sequenceLabel"] = "unlock power plant" if index == 0 else f"+{index} power step"
    return sequence


def load_json_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8-sig") as handle:
        raw = json.load(handle)
    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return raw


def build_data(
    templates_dir: Path,
    research_catalog_path: Path,
    ship_catalog_path: Path,
    game_version: dict[str, str | None] | None = None,
) -> dict[str, Any]:
    research = ResearchCostIndex(research_catalog_path)
    ship_catalog = load_json_file(ship_catalog_path)
    drive_templates = load_named_templates(templates_dir, "TIDriveTemplate.json")
    power_plant_templates = load_named_templates(templates_dir, "TIPowerPlantTemplate.json")
    radiator_templates = load_named_templates(templates_dir, "TIRadiatorTemplate.json")

    power_plants = [
        reactor_row(template, research)
        for template in power_plant_templates.values()
        if not template.get("disable")
    ]
    radiators = sorted(
        [
            radiator_row(template, research)
            for template in radiator_templates.values()
            if (
                not template.get("disable")
                and not is_alien_component(template)
                and as_float(template.get("specificPower_2s_KWkg"), 0.0) > 0.0
            )
        ],
        key=lambda row: (-as_float(row["specificPowerKWPerKg"], 0.0), str((row.get("displayName") or {}).get("en") if isinstance(row.get("displayName"), dict) else row.get("displayName"))),
    )
    default_radiator = next(
        (row for row in radiators if row.get("id") == "DustyPlasma"),
        max(radiators, key=lambda row: as_float(row["specificPowerKWPerKg"], 0.0), default=None),
    )

    drive_rows: list[dict[str, Any]] = []
    for template in drive_templates.values():
        if template.get("disable"):
            continue
        data_name = str(template.get("dataName") or "")
        display = str(template.get("friendlyName") or data_name)
        base_key, base_display, thruster_count = remove_thruster_suffix(data_name, display)
        if thruster_count is None:
            continue

        classification = str(template.get("driveClassification") or "")
        project = str(template.get("requiredProjectName") or "")
        cumulative = research.cumulative_cost(project)
        closure = research.closure(project)
        thrust_power_gw = ship_plan_drive_thrust_power_gw(template)
        power_requirement_gw = ship_plan_drive_power_requirement_gw(template)
        required_power_class = str(template.get("requiredPowerPlant") or "")
        alien = is_alien_component(template)
        category_key = drive_category_key(classification, alien)
        subfamily_key = drive_subfamily_key(classification, required_power_class, category_key, alien)
        family_key = f"{category_key}:{subfamily_key}"
        meta = subfamily_meta(category_key, subfamily_key)
        category_meta = CATEGORY_META.get(category_key, CATEGORY_META["Electric"])
        power_band_key = SELF_POWERED_POWER_KEY if power_requirement_gw <= 0.0 else required_power_class
        drive_mass_tons = as_float(template.get("flatMass_tons"), 0.0) + thrust_power_gw * as_float(
            template.get("specificPower_kgMW"), 0.0
        )
        row = {
            "id": data_name,
            "baseKey": base_key,
            "displayName": display,
            "baseDisplayName": base_display,
            "thrusterCount": thruster_count,
            "classification": classification,
            "requiredPowerPlantClass": required_power_class,
            "powerBandKey": power_band_key,
            "categoryKey": category_key,
            "categoryLabel": label_text(category_meta["label"], "ko"),
            "categoryLabelEn": label_text(category_meta["label"], "en"),
            "categoryColor": category_meta["color"],
            "categoryColorOklch": category_meta["colorOklch"],
            "subfamilyKey": family_key,
            "familyKey": family_key,
            "familyLabel": label_text(meta["label"], "ko"),
            "familyLabelEn": label_text(meta["label"], "en"),
            "familyColor": meta.get("color", "#334155"),
            "familyColorOklch": meta.get("colorOklch", meta.get("color", "#334155")),
            "familyBandColor": meta.get("bandColor", meta.get("color", "#64748b")),
            "familyBandColorOklch": meta.get("bandColorOklch", meta.get("bandColor", meta.get("color", "#64748b"))),
            "alien": alien,
            "requiredProject": project,
            "requiredProjectDisplay": research.display(project),
            "ownResearchCost": research.own_cost(project),
            "cumulativeResearch": cumulative,
            "thrustN": as_float(template.get("thrust_N"), 0.0),
            "exhaustVelocityKps": as_float(template.get("EV_kps"), 0.0),
            "specificImpulseSeconds": as_float(template.get("EV_kps"), 0.0) * 1000.0 / STANDARD_GRAVITY_MPS2,
            "efficiency": as_float(template.get("efficiency"), 0.0),
            "thrustPowerGW": thrust_power_gw,
            "powerRequirementGW": power_requirement_gw,
            "flatMassTons": as_float(template.get("flatMass_tons"), 0.0),
            "specificPowerKgMW": as_float(template.get("specificPower_kgMW"), 0.0),
            "driveMassTons": drive_mass_tons,
            "openCycleCooling": ship_plan_drive_open_cycle(template, drive_templates),
            "propellant": template.get("propellant"),
            "perTankPropellantMaterials": template.get("perTankPropellantMaterials") or {},
            "powerOptions": [],
        }
        row["powerOptions"] = compatible_power_sequence(row, power_plants, closure, cumulative)
        for option in row["powerOptions"]:
            option["combinedCumulativeResearch"] = research.combined_cumulative_cost(
                project,
                str(option.get("requiredProject") or "") or None,
            )
        first_power_option = row["powerOptions"][0] if row["powerOptions"] else None
        first_power_combined = (
          cumulative
          if not first_power_option
          else as_float(first_power_option.get("combinedCumulativeResearch"), cumulative)
        )
        first_power_additional = max(0.0, first_power_combined - cumulative)
        row["powerResearchCumulative"] = first_power_combined
        row["powerResearchCost"] = first_power_additional
        row["unlockCumulativeResearch"] = first_power_combined
        drive_rows.append(row)

    present_categories = {row["categoryKey"] for row in drive_rows}
    categories = []
    for category_key in CATEGORY_ORDER:
        if category_key not in CATEGORY_META:
            continue
        if category_key not in present_categories and category_key != "Alien":
            continue
        category_meta = CATEGORY_META[category_key]
        category_help = CATEGORY_HELP.get(category_key, {})
        categories.append(
            {
                "key": category_key,
                "label": label_text(category_meta["label"], "ko"),
                "labelEn": label_text(category_meta["label"], "en"),
                "help": label_text(category_help, "ko"),
                "helpEn": label_text(category_help, "en"),
                "color": category_meta["color"],
                "colorOklch": category_meta["colorOklch"],
                "alien": category_key == "Alien",
                "defaultVisible": category_key == DEFAULT_CATEGORY_KEY,
            }
        )

    subfamilies = []
    family_seen: set[str] = set()
    for row in sorted(
        drive_rows,
        key=lambda item: (
            category_sort_key(item["categoryKey"]),
            item["familyLabel"],
            item["familyKey"],
        ),
    ):
        if row["familyKey"] in family_seen:
            continue
        family_seen.add(row["familyKey"])
        subfamilies.append(
            {
                "key": row["familyKey"],
                "categoryKey": row["categoryKey"],
                "label": row["familyLabel"],
                "labelEn": row["familyLabelEn"],
                "color": row["familyColor"],
                "colorOklch": row["familyColorOklch"],
                "bandColor": row["familyBandColor"],
                "bandColorOklch": row["familyBandColorOklch"],
                "alien": row["alien"],
            }
        )

    source_files = {
        "templatesDir": str(templates_dir),
        "driveTemplate": str(templates_dir / "TIDriveTemplate.json"),
        "powerPlantTemplate": str(templates_dir / "TIPowerPlantTemplate.json"),
        "radiatorTemplate": str(templates_dir / "TIRadiatorTemplate.json"),
        "researchCatalog": str(research_catalog_path),
        "shipCatalog": str(ship_catalog_path),
        "gameVersion": (game_version or {}).get("version") or "unknown",
        "gameVersionSource": (game_version or {}).get("source"),
        "steamBuildId": (game_version or {}).get("steamBuildId"),
    }
    return {
        "schemaVersion": 4,
        "source": source_files,
        "defaults": {
            "targetDvKps": TARGET_DV_KPS,
            "dryMassTons": DEFAULT_DRY_MASS_TONS,
            "thrusterCount": 1,
            "radiatorId": default_radiator.get("id") if default_radiator else None,
            "defaultCategoryKey": DEFAULT_CATEGORY_KEY,
        },
        "method": {
            "cumulativeResearch": "Minimal research closure from data/research_catalog.json. all branches are unioned, any branches choose the lowest total research closure, and shared prerequisites are counted once.",
            "drivePowerRequirementGW": "thrust_N * EV_kps * 0.5 / 1,000,000 / efficiency, matching tools/ti_save_parser.py.",
            "driveMassTons": "flatMass_tons + thrustPowerGW * specificPower_kgMW, matching the local ship-plan simulation.",
            "powerPlantMassTons": "zero for self-contained drives, otherwise max(1, powerPlant specificPower_tGW * drivePowerRequirementGW), matching the local ship-plan simulation's power-plant mass term.",
            "radiatorMassTons": "zero for self-contained or open-cycle cooling drives, otherwise wasteHeatGW * 1,000,000 / radiator specificPower_2s_KWkg / 1000, with wasteHeatGW = drivePowerRequirementGW * (1 - powerPlantEfficiency).",
            "totalMass": "baseDryMass + drive mass + power plant mass + radiator mass + propellant mass, where propellantMass = dryMassWithHardware * (exp(targetDvKps / exhaustVelocityKps) - 1). The dashboard slider is the base dry mass before adding the selected drive, power plant, and radiator.",
        },
        "categories": categories,
        "subfamilies": subfamilies,
        "families": subfamilies,
        "radiators": radiators,
        "shipCatalog": ship_catalog,
        "drives": sorted(
            drive_rows,
            key=lambda item: (
                item["cumulativeResearch"],
                category_sort_key(item["categoryKey"]),
                item["familyLabel"],
                item["baseDisplayName"],
                item["thrusterCount"],
            ),
        ),
    }


HTML_TEMPLATE = r"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Terra Invicta Drive Comparison</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #11100f;
      --panel: #191b1a;
      --panel-2: #242725;
      --input: #101211;
      --ink: #eef4ef;
      --muted: #a4afa8;
      --line: #343a36;
      --strong-line: #59635d;
      --accent: #14b8a6;
      --danger: #f87171;
      --shadow: 0 14px 34px rgba(0, 0, 0, 0.36);
      --dry: #8b9a91;
      --hardware: #f59e0b;
      --propellant: #22c55e;
      font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
    }
    header {
      padding: 22px 28px 14px;
      border-bottom: 1px solid var(--line);
      background: #151614;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 24px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .header-summary {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
    }
    .subtle {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      flex: 1 1 auto;
      max-width: none;
      min-width: 0;
    }
    .header-links {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex: 0 0 auto;
      gap: 8px;
    }
    .header-language {
      min-width: 112px;
      height: 30px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--line);
      background: #202421;
      color: var(--ink);
      font: inherit;
      font-size: 12px;
      line-height: 1;
    }
    .header-language:focus {
      outline: 2px solid rgba(20, 184, 166, 0.35);
      outline-offset: 1px;
    }
    .header-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 30px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 5px 10px;
      color: var(--ink);
      background: #202421;
      font-size: 12px;
      font-weight: 650;
      line-height: 1;
      text-decoration: none;
      white-space: nowrap;
    }
    .header-link:hover {
      border-color: var(--strong-line);
    }
    .kofi-link {
      border-color: rgba(255, 92, 84, 0.55);
      background: #ff5f5a;
      color: #fff;
    }
    .kofi-link:hover {
      border-color: #ffbeb9;
      background: #ff6e69;
    }
    main {
      padding: 18px 28px 28px;
      display: grid;
      grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
      gap: 18px;
    }
    .controls, .chart-shell, .table-shell, .notes {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
    }
    .controls {
      padding: 12px;
      align-self: start;
      position: sticky;
      top: 14px;
      max-height: calc(100vh - 28px);
      overflow: auto;
      scrollbar-color: var(--strong-line) transparent;
      scrollbar-width: thin;
    }

    .controls-toolbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px;
    }
    .control-card-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: start;
    }
    .control-card-heading {
      min-width: 0;
      display: grid;
      gap: 4px;
    }
    .control-card-toggle {
      min-height: 24px;
      width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      display: flex;
      align-items: center;
      gap: 7px;
      text-align: left;
      cursor: pointer;
    }
    .control-card-toggle:hover {
      border-color: transparent;
      color: var(--ink);
    }
    .control-card-toggle:focus-visible {
      outline: 2px solid rgba(20, 184, 166, 0.22);
      outline-offset: 2px;
      border-radius: 6px;
    }
    .control-card-caret {
      color: var(--muted);
      flex: 0 0 auto;
      font-size: 12px;
      transform: rotate(0deg);
      transition: transform 120ms ease;
    }
    .control-card[data-collapsed="true"] .control-card-caret {
      transform: rotate(-90deg);
    }
    .control-card-title {
      margin-bottom: 0;
      min-width: 0;
    }
    .control-card-title::after {
      display: none;
    }
    .control-card-summary {
      display: none;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .control-card[data-collapsed="true"] .control-card-summary {
      display: block;
    }
    .control-card-actions {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      opacity: 0.78;
    }
    .control-card:hover .control-card-actions,
    .control-card:focus-within .control-card-actions {
      opacity: 1;
    }
    .control-card-move {
      width: 25px;
      min-height: 24px;
      padding: 0;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1;
      color: var(--muted);
    }
    .control-card-move:disabled {
      opacity: 0.32;
      cursor: default;
    }
    .control-card-body {
      margin-top: 10px;
    }
    .control-card[data-collapsed="true"] .control-card-body {
      display: none;
    }

    .chart-shell {
      min-width: 0;
      padding: 14px 16px 12px;
    }
    .chart-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
      gap: 14px;
      align-items: stretch;
      position: relative;
    }
    .table-shell {
      grid-column: 2;
      overflow: hidden;
    }
    .notes {
      grid-column: 2;
      min-width: 0;
      padding: 14px 16px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .notes p {
      margin: 0;
      max-width: 100%;
    }
    .notes .source-note {
      display: block;
      margin-top: 4px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .control-card {
      position: relative;
      padding: 12px;
      margin: 0 0 10px;
      border: 1px solid rgba(89, 99, 93, 0.55);
      border-radius: 10px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.018), rgba(0,0,0,0.04)),
        #151917;
    }
    .control-card:last-child {
      margin-bottom: 0;
    }
    .control-card:focus-within {
      border-color: rgba(20, 184, 166, 0.62);
      box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.16);
    }
    .control-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f1f5f9;
      font-weight: 750;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 0;
      min-width: 0;
    }
    .control-card-title::after {
      display: none;
    }
    .control-block {
      position: relative;
      padding: 0;
      margin: 0;
    }
    .control-block + .control-block {
      padding-top: 12px;
      border-top: 1px solid rgba(148, 163, 184, 0.24);
    }
    .control-block:last-child {
      margin-bottom: 0;
    }
    .control-stack {
      display: grid;
      gap: 12px;
    }
    .control-inline-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .control-inline-grid .control-block {
      margin-bottom: 0;
    }
    .control-divider {
      height: 1px;
      background: rgba(148, 163, 184, 0.26);
      margin: 4px 0;
    }
    .label {
      display: block;
      color: #d8e1db;
      font-weight: 700;
      font-size: 12px;
      line-height: 1.25;
      letter-spacing: 0.01em;
      margin-bottom: 8px;
    }
    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .label-row .label {
      margin-bottom: 0;
      flex: 1 1 auto;
    }
    .icon-button {
      min-height: 26px;
      width: 28px;
      padding: 0;
      font-size: 16px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    select, input[type="number"], textarea {
      width: 100%;
      min-height: 36px;
      border: 1px solid var(--strong-line);
      border-radius: 7px;
      padding: 7px 9px;
      background: var(--input);
      color: var(--ink);
      font: inherit;
    }
    select:focus-visible, input[type="number"]:focus-visible, textarea:focus-visible {
      border-color: var(--accent);
      outline: 2px solid rgba(20, 184, 166, 0.18);
      outline-offset: 1px;
    }
    textarea {
      resize: vertical;
      line-height: 1.35;
    }
    input[type="range"] {
      width: 100%;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(82px, 104px);
      gap: 8px;
      align-items: center;
    }
    .segmented {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    .segmented label {
      min-height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--strong-line);
      border-radius: 6px;
      background: var(--input);
      color: var(--muted);
      cursor: pointer;
      font-size: 13px;
      font-weight: 650;
    }
    .segmented input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .segmented label:has(input:checked) {
      border-color: var(--accent);
      background: rgba(20, 184, 166, 0.16);
      color: var(--ink);
    }
    .segmented.compact {
      width: 132px;
      flex: 0 0 auto;
    }
    .segmented.compact label {
      min-height: 28px;
      font-size: 12px;
    }
    .chart-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
      cursor: pointer;
    }
    .chart-toggle input {
      width: 16px;
      height: 16px;
      accent-color: var(--accent);
      flex: 0 0 auto;
    }
    .control-hint {
      margin-top: 6px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
    }
    [data-help] {
      cursor: help;
    }
    .family-name {
      min-width: 0;
      flex: 1 1 auto;
    }
    .family-count {
      margin-left: auto;
      color: var(--muted);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .family-warnings {
      display: grid;
      gap: 5px;
      margin-top: 8px;
    }
    .family-warning {
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 6px;
      padding: 6px 8px;
      background: rgba(245, 158, 11, 0.08);
      color: #f1c17e;
      font-size: 11px;
      line-height: 1.35;
    }
    .check-row, .category-row, .family-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 30px;
      color: #d5ddd8;
      font-size: 13px;
      border-radius: 7px;
      padding: 3px 5px;
      margin: 1px 0;
      transition: background-color 120ms ease, border-color 120ms ease;
    }
    .check-row:hover, .category-row:hover, .family-row:hover {
      background: rgba(255,255,255,0.035);
    }
    .check-row:has(input:checked), .category-row:has(input:checked), .family-row:has(input:checked) {
      background: rgba(20, 184, 166, 0.075);
      color: var(--ink);
    }
    .check-row input, .category-row input, .family-row input {
      width: 16px;
      height: 16px;
      accent-color: var(--accent);
      flex: 0 0 auto;
    }
    .family-swatch {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex: 0 0 auto;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
    }
    .button-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 8px;
    }
    .button-row button {
      width: 100%;
    }
    button {
      border: 1px solid var(--strong-line);
      background: #202421;
      color: var(--ink);
      border-radius: 7px;
      min-height: 30px;
      padding: 5px 9px;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }
    button:hover { border-color: #8a968d; }
    button:focus-visible {
      border-color: var(--accent);
      outline: 2px solid rgba(20, 184, 166, 0.22);
      outline-offset: 1px;
    }
    .compact-command {
      min-height: 28px;
      padding: 4px 8px;
      white-space: nowrap;
      flex: 0 0 auto;
    }
    .compact-command:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .compact-command:disabled:hover {
      border-color: var(--strong-line);
    }
    .toggle-button {
      display: inline-flex;
      align-items: center;
      width: auto;
      justify-content: center;
      margin-top: 0;
      white-space: nowrap;
    }
    .toggle-button[aria-pressed="true"] {
      border-color: #0f766e;
      background: rgba(20, 184, 166, 0.16);
      color: #b9fff4;
    }
    #chart {
      width: 100%;
      height: min(70vh, 680px);
      min-height: 520px;
      display: block;
      min-width: 0;
      cursor: grab;
      touch-action: none;
      user-select: none;
    }
    #chart.is-panning {
      cursor: grabbing;
    }
    .axis text {
      fill: #a9b5ad;
      font-size: 12px;
    }
    .axis path, .axis line {
      stroke: var(--strong-line);
      shape-rendering: crispEdges;
    }
    .axis line.minor-tick {
      stroke: #46524a;
    }
    .axis line.major-tick {
      stroke: var(--strong-line);
    }
    .grid line {
      stroke: #2a302c;
      shape-rendering: crispEdges;
    }
    .grid line.minor-grid {
      stroke: #283029;
    }
    .grid line.major-grid {
      stroke: #354038;
    }
    .axis .axis-title {
      fill: #d8e1db;
      font-size: 16px;
      font-weight: 650;
    }
    .legend {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin: 8px 2px 0;
      color: var(--muted);
      font-size: 12px;
    }
    .legend-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding-right: 4px;
    }
    .legend-heading {
      color: #d8e1db;
      font-weight: 700;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .legend-swatch {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .summary-strip {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 12px;
    }
    .summary-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      min-width: 0;
    }
    .preset-io {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      width: 100%;
    }
    .preset-manager {
      display: grid;
      gap: 7px;
      width: 100%;
      max-width: 900px;
      font-size: 12px;
    }
    .preset-library-row {
      display: grid;
      grid-template-columns: minmax(190px, 1fr) auto;
      gap: 8px;
      align-items: center;
      width: 100%;
    }
    .preset-library-label {
      color: var(--muted);
      font-weight: 650;
      white-space: nowrap;
    }
    .preset-button-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
    }
    .preset-button-row .compact-command {
      white-space: nowrap;
    }
    .preset-divider {
      align-self: stretch;
      width: 1px;
      min-height: 22px;
      background: var(--line);
    }
    .preset-status {
      color: var(--muted);
      font-size: 11px;
      white-space: nowrap;
    }
    .preset-status.error {
      color: var(--danger);
    }
    .summary-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      min-width: 0;
    }
    .summary-strip strong {
      color: var(--ink);
      font-weight: 700;
    }
    .modal {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(5, 8, 7, 0.72);
      z-index: 40;
      padding: 18px;
    }
    .modal.is-open {
      display: flex;
    }
    .modal-dialog {
      width: min(980px, 96vw);
      max-height: 88vh;
      overflow: auto;
      border: 1px solid var(--strong-line);
      border-radius: 10px;
      background: #141816;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
      padding: 14px;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }
    .modal-title {
      margin: 0;
      font-size: 15px;
      color: var(--ink);
    }
    .calculator-grid {
      display: grid;
      grid-template-columns: minmax(240px, 0.9fr) minmax(360px, 1.2fr);
      gap: 14px;
    }
    .calculator-panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #101412;
      display: grid;
      align-content: start;
      gap: 10px;
    }
    .calculator-panel-wide {
      grid-column: 1 / -1;
    }
    .calc-info-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 8px;
      font-size: 12px;
    }
    .calc-info-grid strong {
      justify-self: end;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .calc-slot-row {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr) 72px;
      gap: 8px;
      align-items: center;
      font-size: 12px;
      margin-bottom: 8px;
    }
    #dryMassCalcArmor {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .calc-armor-row {
      position: relative;
      display: grid;
      grid-template-columns: 1fr;
      gap: 7px;
      align-content: start;
      min-width: 0;
      padding: 0;
      font-size: 12px;
    }
    .calc-armor-row + .calc-armor-row {
      border-left: 0;
      padding-left: 0;
    }
    .calc-armor-row + .calc-armor-row::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: -4px;
      border-left: 1px solid var(--line);
      pointer-events: none;
    }
    .calc-armor-title {
      color: var(--ink);
      font-weight: 650;
    }
    .calc-armor-point-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 68px;
      gap: 6px;
      align-items: center;
    }
    .calc-armor-row select,
    .calc-armor-row input {
      min-width: 0;
    }
    .calc-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: var(--ink);
      font-size: 12px;
      font-weight: 650;
      margin: 2px 0 8px;
    }
    .calc-capacity {
      color: var(--muted);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }
    #dryMassCalcWeapons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .calc-weapon-group + .calc-weapon-group {
      border-left: 1px solid var(--line);
      padding-left: 10px;
    }
    .calc-slot-mass {
      color: var(--muted);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .native-select-hidden {
      display: none !important;
    }
    .searchable-select {
      position: relative;
      min-width: 0;
      width: 100%;
    }
    .searchable-select-trigger {
      width: 100%;
      min-width: 0;
      min-height: 36px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--strong-line);
      border-radius: 7px;
      background: var(--input);
      color: var(--ink);
      padding: 6px 8px;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .searchable-select-trigger:hover,
    .searchable-select-trigger:focus-visible {
      border-color: var(--accent);
      outline: none;
    }
    .searchable-select-value {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .searchable-select-caret {
      color: var(--muted);
      font-size: 11px;
    }
    .searchable-select-menu {
      position: absolute;
      z-index: 90;
      top: calc(100% + 4px);
      left: 0;
      right: auto;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      max-height: 280px;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 6px;
      border: 1px solid var(--strong-line);
      border-radius: 9px;
      background: #101412;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
      padding: 8px;
    }
    .searchable-select-menu[hidden] {
      display: none;
    }
    .searchable-select-search {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #0b0d0c;
      color: var(--ink);
      padding: 7px 8px;
      font: inherit;
    }
    .searchable-select-options {
      max-height: 220px;
      overflow: auto;
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .searchable-select-group {
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.025em;
      padding: 8px 6px 3px;
      text-transform: none;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
    }
    .searchable-select-group:first-child {
      border-top: 0;
      padding-top: 2px;
    }
    .searchable-select-option {
      width: 100%;
      min-width: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--ink);
      padding: 6px 7px;
      font: inherit;
      text-align: left;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .searchable-select-option:hover,
    .searchable-select-option:focus-visible,
    .searchable-select-option.is-active {
      background: rgba(74, 144, 226, 0.16);
      outline: none;
    }
    .searchable-select-option.is-selected {
      color: #cde9df;
      background: rgba(74, 144, 226, 0.22);
    }
    .searchable-select-empty {
      color: var(--muted);
      font-size: 12px;
      padding: 8px 6px;
    }
    .calc-empty {
      border: 1px dashed var(--line);
      border-radius: 8px;
      color: var(--muted);
      font-size: 12px;
      padding: 12px;
      text-align: center;
    }
    .calc-breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
    }
    .calc-breakdown span {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px 8px;
      background: #151917;
    }
    .calc-notes {
      min-height: 70px;
    }
    .dry-mass-preset-panel {
      gap: 8px;
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 10px;
    }
    .modal-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }
    .calc-total {
      color: #cde9df;
      font-size: 15px;
      font-weight: 650;
    }
    .diagnostic-banner {
      margin: 0 0 10px;
      padding: 7px 9px;
      border: 1px solid rgba(245, 158, 11, 0.32);
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.07);
      color: #f1c17e;
      font-size: 12px;
      line-height: 1.35;
    }
    .diagnostic-banner[hidden] {
      display: none;
    }
    .tooltip {
      position: relative;
      pointer-events: auto;
      max-width: none;
      width: 100%;
      height: min(70vh, 680px);
      min-height: 520px;
      background: #101211;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 34px 12px 12px;
      font-size: 12px;
      line-height: 1.45;
      opacity: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      z-index: 5;
    }
    .tooltip.tooltip-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      padding: 12px;
    }
    .tooltip.tooltip-empty.has-diagnostic,
    .tooltip.tooltip-empty.has-panel {
      align-items: stretch;
      justify-content: flex-start;
      color: var(--ink);
      padding: 12px;
    }
    .tooltip-placeholder {
      color: var(--muted);
    }
    .scenario-panel,
    .usage-panel {
      display: grid;
      gap: 9px;
      width: 100%;
      color: #d8e1db;
    }
    .scenario-panel h2,
    .usage-panel h2 {
      margin: 0;
      color: var(--ink);
      font-size: 14px;
      line-height: 1.3;
    }
    .scenario-panel p,
    .usage-panel p {
      margin: 0;
      color: #a9b5ad;
      line-height: 1.45;
    }
    .scenario-panel ul,
    .usage-panel ul {
      margin: 0;
      padding-left: 18px;
      color: #cdd7d0;
    }
    .scenario-panel li,
    .usage-panel li {
      margin: 3px 0;
    }
    .tooltip-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      min-height: 0;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border-color: var(--line);
      background: #1a1d1b;
      color: var(--muted);
      font-size: 18px;
      line-height: 1;
    }
    .tooltip-close:hover {
      color: var(--ink);
      border-color: var(--strong-line);
    }
    .tooltip-count {
      color: var(--muted);
      font-size: 11px;
      margin: -16px 34px 8px 0;
      min-height: 16px;
    }
    .tooltip-pin {
      display: inline-flex;
      align-items: center;
      min-height: 18px;
      padding: 1px 6px;
      margin-right: 7px;
      border: 1px solid #936f33;
      border-radius: 999px;
      background: rgba(224, 149, 61, 0.13);
      color: #f1c17e;
      font-size: 11px;
      font-weight: 700;
    }
    .tooltip-items {
      min-height: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 9px;
      padding-right: 2px;
    }
    .tooltip-item {
      position: relative;
      padding: 9px 36px 9px 40px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #151816;
    }
    .tooltip-item.is-pinned {
      border-color: rgba(224, 149, 61, 0.75);
      box-shadow: inset 0 0 0 1px rgba(224, 149, 61, 0.12);
    }
    .tooltip-item-order {
      position: absolute;
      top: 7px;
      left: 7px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 3px;
    }
    .tooltip-item-move {
      width: 26px;
      height: 18px;
      min-height: 0;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border-color: var(--line);
      background: #202421;
      color: var(--muted);
      font-size: 11px;
      line-height: 1;
      user-select: none;
    }
    .tooltip-item-move:hover:not(:disabled) {
      color: var(--ink);
      border-color: var(--strong-line);
    }
    .tooltip-item-move:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .tooltip-item-actions {
      position: absolute;
      top: 7px;
      right: 7px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 5px;
      align-items: start;
    }
    .tooltip-item-pin,
    .tooltip-item-close {
      width: 22px;
      height: 22px;
      min-height: 0;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border-color: var(--line);
      background: #202421;
      color: var(--muted);
      font-size: 15px;
      line-height: 1;
    }
    .tooltip-item-pin {
      width: 22px;
      min-width: 0;
      padding: 0;
      font-size: 13px;
      font-weight: 700;
    }
    .tooltip-item-pin[aria-pressed="true"] {
      border-color: #936f33;
      background: rgba(224, 149, 61, 0.16);
      color: #f1c17e;
    }
    .tooltip-item-pin:hover,
    .tooltip-item-close:hover {
      color: var(--ink);
      border-color: var(--strong-line);
    }
    .tooltip h2 {
      margin: 0 0 5px;
      font-size: 13px;
      line-height: 1.3;
      color: var(--ink);
      letter-spacing: 0;
    }
    .tooltip-title-power {
      display: block;
      margin-top: 2px;
      color: #f1c17e;
      font-size: 12px;
      font-weight: 600;
    }
    .tooltip .muted { color: #a9b5ad; }
    .tooltip-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--line);
    }
    .tooltip-section summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
      list-style: none;
      font-weight: 700;
      color: var(--ink);
      outline: none;
    }
    .tooltip-section summary::-webkit-details-marker {
      display: none;
    }
    .tooltip-section summary::after {
      content: "▾";
      color: var(--muted);
      font-size: 11px;
      line-height: 1;
      transition: transform 140ms ease;
    }
    .tooltip-section[open] summary::after {
      transform: rotate(180deg);
    }
    .tooltip-section-body {
      margin-top: 8px;
    }
    .tooltip-metrics {
      display: grid;
      gap: 2px;
    }
    .tooltip-ratio {
      display: flex;
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: #0e100f;
      border: 1px solid #2d342f;
      margin: 7px 0 6px;
    }
    .tooltip-ratio span {
      box-shadow: inset -1px 0 rgb(0 0 0 / 0.28), inset 1px 0 rgb(255 255 255 / 0.05);
    }
    .research-drive {
      background: #2563eb;
      background: oklch(62% 0.175 260);
    }
    .research-project {
      background: #0891b2;
      background: oklch(65% 0.135 220);
    }
    .research-power {
      background: #7c3aed;
      background: oklch(62% 0.170 300);
    }
    .tooltip-metric-group + .tooltip-metric-group {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--line);
    }
    .tooltip-metric-group-title {
      margin-bottom: 5px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .tooltip-metric {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: baseline;
      padding: 4px 0;
      border-bottom: 1px solid rgba(40, 47, 42, 0.75);
    }
    .tooltip-metric:last-child { border-bottom: 0; }
    .tooltip-metric.is-emphasis {
      padding-top: 0;
      padding-bottom: 6px;
      font-weight: 700;
    }
    .tooltip-metric-label {
      color: #a9b5ad;
      font-size: 11px;
      line-height: 1.25;
    }
    .tooltip-metric-value {
      margin-top: 0;
      color: var(--ink);
      font-variant-numeric: tabular-nums;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.25;
    }
    .tooltip-breakdown {
      margin-top: 0;
    }
    .tooltip-breakdown-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2px 12px;
      margin-bottom: 6px;
    }
    .tooltip-breakdown-grid span {
      color: #a9b5ad;
    }
    .tooltip-breakdown-grid strong {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .tooltip-stack {
      display: flex;
      height: 7px;
      overflow: hidden;
      border-radius: 999px;
      background: #0e100f;
      border: 1px solid #2d342f;
      margin-bottom: 5px;
    }
    .tooltip-stack span {
      box-shadow: inset -1px 0 rgb(0 0 0 / 0.28), inset 1px 0 rgb(255 255 255 / 0.05);
    }
    .stack-hull {
      background: #793e00;
      background: oklch(43% 0.105 58);
    }
    .stack-drive {
      background: #9b5a14;
      background: oklch(53% 0.115 61);
    }
    .stack-reactor {
      background: #bd7729;
      background: oklch(63% 0.125 64);
    }
    .stack-radiator {
      background: #e0953d;
      background: oklch(73% 0.135 67);
    }
    .stack-propellant { background: var(--propellant); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    thead {
      background: var(--panel-2);
      color: #d8e1db;
    }
    th, td {
      text-align: left;
      padding: 9px 10px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    th.numeric, td.numeric { text-align: right; font-variant-numeric: tabular-nums; }
    .sort-button {
      all: unset;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      width: 100%;
      color: inherit;
      font: inherit;
      font-weight: 700;
    }
    th.numeric .sort-button {
      justify-content: flex-end;
    }
    .sort-button:hover {
      color: var(--ink);
    }
    .sort-button[data-active="true"]::after {
      content: attr(data-arrow);
      color: var(--accent);
      font-size: 10px;
      line-height: 1;
    }
    tbody tr:hover { background: #202421; }
    .drive-name { font-weight: 650; color: #f3f7f4; }
    .project-name { color: var(--muted); font-size: 11px; margin-top: 2px; }
    .cell-viz {
      min-width: 150px;
    }
    .numeric .cell-viz {
      margin-left: auto;
    }
    .cell-value {
      display: block;
      margin-bottom: 5px;
      white-space: nowrap;
    }
    .sparkbar,
    .sparkrange {
      position: relative;
      height: 6px;
      border-radius: 999px;
      background: #0e100f;
      border: 1px solid #2d342f;
      overflow: hidden;
    }
    .spark-fill {
      position: absolute;
      inset: 0 auto 0 0;
      min-width: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(20, 184, 166, 0.45), rgba(20, 184, 166, 0.95));
    }
    .sparkrange-fill {
      position: absolute;
      top: 0;
      bottom: 0;
      min-width: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(34, 197, 94, 0.45), rgba(245, 158, 11, 0.9));
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 7px;
      white-space: nowrap;
      background: #202421;
    }
    .warning {
      color: var(--danger);
      font-weight: 650;
    }
    @media (max-width: 980px) {
      main { grid-template-columns: 1fr; padding: 14px; }
      header { padding: 18px 14px 12px; }
      .controls { position: static; max-height: none; }
      .split { grid-template-columns: minmax(0, 1fr) minmax(78px, 100px); }
      .control-inline-grid { grid-template-columns: 1fr; }
      .chart-body { grid-template-columns: 1fr; }
      .summary-strip { flex-direction: column; }
      .summary-controls { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
      .preset-library-row { grid-template-columns: 1fr; }
      .calculator-grid { grid-template-columns: 1fr; }
      #dryMassCalcArmor,
      #dryMassCalcWeapons { grid-template-columns: 1fr; }
      .calc-weapon-group + .calc-weapon-group {
        border-left: 0;
        border-top: 1px solid var(--line);
        padding-left: 0;
        padding-top: 10px;
      }
      .calc-armor-row + .calc-armor-row {
        border-left: 0;
        border-top: 1px solid var(--line);
        padding-left: 0;
        padding-top: 10px;
      }
      .calc-armor-row + .calc-armor-row::before {
        display: none;
      }
      .table-shell { grid-column: 1; }
      .notes { grid-column: 1; }
      #chart { height: 560px; }
      .tooltip { height: min(52vh, 520px); min-height: 220px; }
    }
    @media (max-width: 520px) {
      .header-summary {
        flex-direction: column;
        gap: 10px;
      }
      .header-links {
        width: 100%;
        justify-content: flex-start;
        flex-wrap: wrap;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Terra Invicta 드라이브 비교</h1>
    <div class="header-summary">
      <div class="subtle">
        X축은 최초 호환 전원을 포함한 누적 연구력입니다. 같은 연구력 대비 총질량, TWR, 추력, 효율을 비교해 어느 추진기 계통에 투자할지 판단하는 데 초점을 둡니다.
      </div>
      <nav class="header-links" aria-label="프로젝트 링크">
        <a class="header-link" href="https://github.com/FennexFox/TI_Engine_Charts" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a class="header-link kofi-link" href="https://ko-fi.com/fennexfox" target="_blank" rel="noopener noreferrer">Ko-fi 후원</a>
        <select id="uiLanguageSelect" class="header-language" aria-label="Language">
          <option value="ko">한국어</option>
          <option value="en" selected>English</option>
        </select>
      </nav>
    </div>
  </header>
  <main>
    <aside class="controls" id="leftPanelControls">
      <div class="controls-toolbar">
        <button id="resetLeftPanelLayout" class="compact-command" type="button">패널 배열 초기화</button>
      </div>
      <section class="control-card" data-control-card="display">
        <div class="control-card-header">
          <div class="control-card-heading">
            <button class="control-card-toggle" data-card-toggle="true" type="button" aria-expanded="true">
              <span class="control-card-caret" aria-hidden="true">▾</span>
              <span class="control-card-title">표시</span>
            </button>
            <div class="control-card-summary" data-card-summary></div>
          </div>
          <div class="control-card-actions" aria-label="순서 변경">
            <button class="control-card-move" data-panel-move="up" type="button" aria-label="위로 이동" title="위로 이동">↑</button>
            <button class="control-card-move" data-panel-move="down" type="button" aria-label="아래로 이동" title="아래로 이동">↓</button>
          </div>
        </div>
        <div class="control-card-body">
        <div class="control-stack">
          <section class="control-block">
            <label class="label" for="metric">세로축</label>
            <select id="metric" data-searchable-select="true">
              <optgroup label="시뮬레이션(총 질량, 연료질량, TWR)">
                <option value="totalMassTons">목표 dV 총질량 (t)</option>
                <option value="fuelMassTons">목표 dV 연료질량 (t)</option>
                <option value="twr">TWR</option>
              </optgroup>
              <optgroup label="기본 정보(추력, 효율, 출력)">
                <option value="thrustMN">추력 (MN)</option>
                <option value="fuelEfficiency">연료효율 (km/s or s)</option>
                <option value="powerRequirementGW">출력 요구량 (GW)</option>
              </optgroup>
            </select>
          </section>
        </div>
        </div>
      </section>
      <section class="control-card" data-control-card="simulation">
        <div class="control-card-header">
          <div class="control-card-heading">
            <button class="control-card-toggle" data-card-toggle="true" type="button" aria-expanded="true">
              <span class="control-card-caret" aria-hidden="true">▾</span>
              <span class="control-card-title">시뮬레이션 조건</span>
            </button>
            <div class="control-card-summary" data-card-summary></div>
          </div>
          <div class="control-card-actions" aria-label="순서 변경">
            <button class="control-card-move" data-panel-move="up" type="button" aria-label="위로 이동" title="위로 이동">↑</button>
            <button class="control-card-move" data-panel-move="down" type="button" aria-label="아래로 이동" title="아래로 이동">↓</button>
          </div>
        </div>
        <div class="control-card-body">
        <div class="control-stack">
          <section class="control-block">
            <div class="label-row">
              <label class="label" for="dryMass">기준 선체 건조 질량 (t)</label>
              <button id="dryMassCalcButton" class="icon-button" type="button" aria-label="건조질량 계산기" title="건조질량 계산기">🧮</button>
            </div>
            <div class="split">
              <input id="dryMass" type="range" min="100" max="100000" value="10000" step="100">
              <input id="dryMassNumber" type="number" min="0" max="1000000" value="10000" step="10">
            </div>
          </section>
          <section class="control-block">
            <label class="label" for="targetDv">목표 dV (km/s)</label>
            <div class="split">
              <input id="targetDv" type="range" min="0" max="2000" value="500" step="5">
              <input id="targetDvNumber" type="number" min="0" max="100000" value="500" step="1">
            </div>
          </section>
          <section class="control-block">
            <label class="label" for="radiator">라디에이터</label>
            <select id="radiator" data-searchable-select="true"></select>
          </section>
        </div>
        </div>
      </section>
      <section class="control-card" data-control-card="filter">
        <div class="control-card-header">
          <div class="control-card-heading">
            <button class="control-card-toggle" data-card-toggle="true" type="button" aria-expanded="true">
              <span class="control-card-caret" aria-hidden="true">▾</span>
              <span class="control-card-title">필터 및 표시</span>
            </button>
            <div class="control-card-summary" data-card-summary></div>
          </div>
          <div class="control-card-actions" aria-label="순서 변경">
            <button class="control-card-move" data-panel-move="up" type="button" aria-label="위로 이동" title="위로 이동">↑</button>
            <button class="control-card-move" data-panel-move="down" type="button" aria-label="아래로 이동" title="아래로 이동">↓</button>
          </div>
        </div>
        <div class="control-card-body">
        <section id="bandAnalysisControls" class="control-block">
          <span class="label">총질량/연료질량/TWR 보조 표시</span>
          <label id="showTwrInfoRow" class="check-row"><input id="showTwrInfo" type="checkbox" checked> TWR 정보 표시</label>
          <label id="showMassInfoRow" class="check-row" style="display: none;"><input id="showMassInfo" type="checkbox" checked> 총질량 정보 표시</label>
          <label class="check-row"><input id="paretoHighlight" type="checkbox" checked> 파레토 후보 강조</label>
          <label class="check-row"><input id="showImpracticalCandidates" type="checkbox"> 비현실적 후보 표시</label>
          <div id="minTwrControl" style="margin-top: 10px;">
            <label class="label" for="minTwrExp">최소 TWR</label>
            <div class="split">
              <input id="minTwrExp" type="range" min="-4" max="1" value="-4" step="0.1">
              <input id="minTwrNumber" type="number" min="0.0001" max="10" value="0.0001" step="0.0001">
            </div>
            <div id="minTwrReadout" class="control-hint">표시: TWR >= 0.0001 g</div>
          </div>
          <div id="minDvControl" style="margin-top: 10px; display: none;">
            <label class="label" for="minDv">최소 dV (km/s)</label>
            <div class="split">
              <input id="minDv" type="range" min="0" max="2000" value="0" step="5">
              <input id="minDvNumber" type="number" min="0" max="100000" value="0" step="1">
            </div>
            <div id="minDvReadout" class="control-hint">표시: dV >= 0 km/s</div>
          </div>
        </section>
        <div class="control-divider"></div>
        <section class="control-block">
          <span class="label">축 스케일</span>
          <div class="control-inline-grid">
            <label class="check-row"><input id="logX" type="checkbox"> X축 로그</label>
            <label class="check-row"><input id="logY" type="checkbox" checked> Y축 로그</label>
          </div>
        </section>
        </div>
      </section>
      <section class="control-card" data-control-card="driveFilter">
        <div class="control-card-header">
          <div class="control-card-heading">
            <button class="control-card-toggle" data-card-toggle="true" type="button" aria-expanded="true">
              <span class="control-card-caret" aria-hidden="true">▾</span>
              <span class="control-card-title">드라이브 필터</span>
            </button>
            <div class="control-card-summary" data-card-summary></div>
          </div>
          <div class="control-card-actions" aria-label="순서 변경">
            <button class="control-card-move" data-panel-move="up" type="button" aria-label="위로 이동" title="위로 이동">↑</button>
            <button class="control-card-move" data-panel-move="down" type="button" aria-label="아래로 이동" title="아래로 이동">↓</button>
          </div>
        </div>
        <div class="control-card-body">
        <div class="control-stack">
          <section class="control-block">
            <label class="label" for="nameSearch">엔진/프로젝트 검색</label>
            <input id="nameSearch" type="search" placeholder="드라이브 또는 프로젝트 검색">
          </section>
          <section class="control-block">
            <label class="label" for="thrusters">엔진 수</label>
            <div class="split">
              <input id="thrusters" type="range" min="1" max="6" value="1" step="1">
              <input id="thrustersNumber" type="number" min="1" max="6" value="1" step="1">
            </div>
          </section>
          <section class="control-block">
            <span class="label">대분류</span>
            <div id="categories"></div>
          </section>
          <section class="control-block">
            <span class="label">세부 계열</span>
            <div class="button-row">
              <button id="allFamilies" type="button">전체 선택</button>
              <button id="clearFamilies" type="button">전체 해제</button>
            </div>
            <div id="families"></div>
            <div id="familyWarnings" class="family-warnings"></div>
          </section>
        </div>
        </div>
      </section>
    </aside>
    <section class="chart-shell">
      <div class="summary-strip">
        <div class="summary-left">
          <div id="presetClipboard" class="preset-io" aria-label="설정 가져오기/내보내기">
            <button id="presetExport" class="compact-command" type="button">설정 Export</button>
            <button id="presetImport" class="compact-command" type="button">설정 Import</button>
            <span id="presetStatus" class="preset-status" aria-live="polite"></span>
          </div>
          <div id="presetLibrary" class="preset-manager" aria-label="차트 프리셋 라이브러리">
            <div class="preset-button-row">
              <span id="chartPresetLibraryLabel" class="preset-library-label">차트 프리셋</span>
              <button id="chartPresetSave" class="compact-command" type="button">현재 저장</button>
              <button id="chartPresetReset" class="compact-command" type="button">기본값</button>
            </div>
            <div class="preset-library-row">
              <select id="chartPresetSelect" aria-label="차트 프리셋"></select>
              <div class="preset-button-row">
                <button id="chartPresetLoad" class="compact-command" type="button">불러오기</button>
                <button id="chartPresetRename" class="compact-command" type="button">이름 변경</button>
                <button id="chartPresetDuplicate" class="compact-command" type="button">복제</button>
                <button id="chartPresetDelete" class="compact-command" type="button">삭제</button>
                <span class="preset-divider" aria-hidden="true"></span>
                <button id="chartPresetSetStartup" class="compact-command" type="button">시작 프리셋</button>
                <button id="chartPresetClearStartup" class="compact-command" type="button">시작 해제</button>
                <span class="preset-divider" aria-hidden="true"></span>
                <button id="chartPresetExportSelected" class="compact-command" type="button">선택 Export</button>
                <button id="chartPresetExportAll" class="compact-command" type="button">전체 Export</button>
              </div>
            </div>
          </div>
          <div><strong id="visibleCount">0</strong>개 드라이브 표시</div>
        </div>
        <div class="summary-controls">
          <div id="chartFuelUnit" class="segmented compact" style="display: none;">
            <label><input type="radio" name="fuelUnit" value="kps" checked>km/s</label>
            <label><input type="radio" name="fuelUnit" value="seconds">s</label>
          </div>
          <button id="powerResearchToggle" class="compact-command toggle-button" type="button" aria-pressed="false" style="display: none;">추가 전원 연구력 반영</button>
          <button id="resetZoom" class="compact-command" type="button" disabled>보기 초기화</button>
          <div id="metricHint"></div>
        </div>
      </div>
      <div id="chartDiagnostic" class="diagnostic-banner" hidden></div>
      <div class="chart-body">
        <svg id="chart" role="img" aria-label="Drive comparison chart"></svg>
        <div id="tooltip" class="tooltip tooltip-empty"><div class="tooltip-placeholder">선택 없음</div></div>
      </div>
      <div id="legend" class="legend"></div>
    </section>
    <section class="table-shell">
      <table>
        <thead>
          <tr>
            <th><button class="sort-button" type="button" data-sort="drive">추진기</button></th>
            <th><button class="sort-button" type="button" data-sort="family">대분류 / 세부 계열</button></th>
            <th class="numeric"><button class="sort-button" type="button" data-sort="research">누적 연구력</button></th>
            <th class="numeric"><button class="sort-button" id="metricColumn" type="button" data-sort="metric">값</button></th>
            <th><button class="sort-button" type="button" data-sort="reactor">전원 단계</button></th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </section>
    <section class="notes">
      <p id="calculationNote"><strong>계산 메모.</strong> 총질량은 기준 선체 건조 질량, 드라이브 질량, 전원 질량, 선택 라디에이터 질량, 목표 dV에 필요한 추진체 질량을 합산합니다. 드라이브 출력 요구량, 드라이브 질량, 전원 질량, 라디에이터 질량은 이 저장소의 기존 ship-plan 계산식과 같은 항을 사용하며, 무장/유틸리티 전력은 제외해 드라이브-전원-라디에이터 비교만 분리했습니다.</p>
      <span id="sourceNote" class="source-note"></span>
    </section>
  </main>
  <div id="dryMassCalcModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="dryMassCalcTitle">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 id="dryMassCalcTitle" class="modal-title">건조질량 계산기</h2>
        <button id="dryMassCalcClose" class="compact-command" type="button">닫기</button>
      </div>
      <div class="calculator-grid">
        <section class="calculator-panel">
          <label id="dryMassCalcClassLabel" class="label" for="dryMassCalcClass">함급</label>
          <select id="dryMassCalcClass" data-searchable-select="true"></select>
          <div id="dryMassCalcInfo" class="calc-info-grid"></div>
        </section>
        <section class="calculator-panel">
          <div class="label" id="dryMassCalcArmorLabel">장갑</div>
          <div id="dryMassCalcArmor"></div>
        </section>
        <section class="calculator-panel calculator-panel-wide">
          <div class="label" id="dryMassCalcWeaponsLabel">무장 하드포인트</div>
          <div id="dryMassCalcWeapons"></div>
        </section>
        <section class="calculator-panel calculator-panel-wide">
          <div class="label" id="dryMassCalcSlotsLabel">내부 유틸리티 모듈</div>
          <div id="dryMassCalcSlots"></div>
        </section>
        <section class="calculator-panel calculator-panel-wide">
          <label id="dryMassCalcNotesLabel" class="label" for="dryMassCalcNotes">메모</label>
          <textarea id="dryMassCalcNotes" class="calc-notes" rows="3" placeholder="선박 설계 가정 메모"></textarea>
        </section>
        <section id="dryMassPresetLibrary" class="calculator-panel calculator-panel-wide dry-mass-preset-panel" aria-label="건조질량 프리셋 라이브러리">
          <div class="preset-button-row">
            <span id="dryMassPresetLibraryLabel" class="preset-library-label">건조질량 프리셋</span>
            <button id="dryMassPresetSave" class="compact-command" type="button">현재 저장</button>
          </div>
          <div class="preset-library-row">
            <select id="dryMassPresetSelect" aria-label="건조질량 프리셋"></select>
            <div class="preset-button-row">
              <button id="dryMassPresetLoad" class="compact-command" type="button">불러오기</button>
              <button id="dryMassPresetRename" class="compact-command" type="button">이름 변경</button>
              <button id="dryMassPresetDuplicate" class="compact-command" type="button">복제</button>
              <button id="dryMassPresetDelete" class="compact-command" type="button">삭제</button>
              <span class="preset-divider" aria-hidden="true"></span>
              <button id="dryMassPresetExportSelected" class="compact-command" type="button">선택 Export</button>
              <button id="dryMassPresetExportAll" class="compact-command" type="button">전체 Export</button>
              <button id="dryMassPresetImport" class="compact-command" type="button">Import</button>
            </div>
          </div>
          <span id="dryMassPresetStatus" class="preset-status" aria-live="polite"></span>
        </section>
      </div>
      <div class="modal-footer">
        <div>
          <div id="dryMassCalcTotal" class="calc-total"></div>
          <div id="dryMassCalcBreakdown" class="calc-breakdown"></div>
        </div>
        <div class="modal-actions">
          <button id="dryMassCalcReset" class="compact-command" type="button">초기화</button>
          <button id="dryMassCalcApply" class="compact-command" type="button">건조질량에 적용</button>
        </div>
      </div>
    </div>
  </div>
  <script id="ti-data" type="application/json">__DATA_JSON__</script>
  <script>
    const DATA = JSON.parse(document.getElementById("ti-data").textContent);
    const STATIC_TRANSLATIONS = __STATIC_TRANSLATIONS__;
    const NOTE_HTML = __NOTE_HTML__;
    const STANDARD_GRAVITY_MPS2 = 9.80665;
    let UI_LANG = document.documentElement.lang === "en" ? "en" : "ko";
    const savedLanguage = localStorage.getItem("tiEngineChartLanguage");
    if (savedLanguage === "en" || savedLanguage === "ko") UI_LANG = savedLanguage;
    const state = {
      metric: "totalMassTons",
      thrusters: DATA.defaults.thrusterCount,
      fuelEfficiencyUnit: "kps",
      dryMassTons: DATA.defaults.dryMassTons,
      targetDvKps: DATA.defaults.targetDvKps,
      radiatorId: DATA.defaults.radiatorId,
      logX: false,
      logY: true,
      showTwrInfo: true,
      showMassInfo: true,
      paretoHighlight: true,
      showImpracticalCandidates: false,
      usePowerResearch: false,
      minTwr: 0.0001,
      minDvKps: 0,
      searchTerm: "",
      sortKey: "research",
      sortDirection: "asc",
      lastTooltipItems: [],
      hoverPoints: [],
      tooltipPinned: false,
      pinnedTooltipItems: [],
      dismissedTooltipKeys: new Set(),
      hoverHitSignature: "",
      zoom: null,
      zoomContext: "",
      preserveViewportOnce: false,
      pan: null,
      categories: Object.fromEntries(DATA.categories.map(category => [category.key, !!category.defaultVisible])),
      families: Object.fromEntries(DATA.subfamilies.map(family => [family.key, true])),
    };

    function chartDefaultState() {
      return {
        metric: "totalMassTons",
        thrusters: DATA.defaults.thrusterCount,
        fuelEfficiencyUnit: "kps",
        dryMassTons: DATA.defaults.dryMassTons,
        targetDvKps: DATA.defaults.targetDvKps,
        radiatorId: DATA.defaults.radiatorId,
        logX: false,
        logY: true,
        showTwrInfo: true,
        showMassInfo: true,
        paretoHighlight: true,
        showImpracticalCandidates: false,
        usePowerResearch: false,
        minTwr: 0.0001,
        minDvKps: 0,
        searchTerm: "",
        sortKey: "research",
        sortDirection: "asc",
        categories: Object.fromEntries(DATA.categories.map(category => [category.key, !!category.defaultVisible])),
        families: Object.fromEntries(DATA.subfamilies.map(family => [family.key, true])),
      };
    }

    function resetChartStateToDefaults() {
      Object.assign(state, chartDefaultState(), {
        lastTooltipItems: [],
        hoverPoints: [],
        tooltipPinned: false,
        pinnedTooltipItems: [],
        dismissedTooltipKeys: new Set(),
        hoverHitSignature: "",
        zoom: null,
        zoomContext: "",
        preserveViewportOnce: false,
        pan: null,
      });
      resetDryMassCalcState();
    }

    function translateText(value, lang = UI_LANG) {
      let result = String(value ?? "");
      const pairs = lang === "en"
        ? STATIC_TRANSLATIONS
        : STATIC_TRANSLATIONS.map(([ko, en]) => [en, ko]);
      [...pairs]
        .sort((a, b) => String(b[0] ?? "").length - String(a[0] ?? "").length)
        .forEach(([from, to]) => {
          if (from) result = result.split(from).join(to);
        });
      return result;
    }

    function localText(ko, en) {
      return UI_LANG === "en" ? en : ko;
    }

    const LEFT_PANEL_LAYOUT_STORAGE_KEY = "tiEngineChartLeftPanelLayout";
    const LEFT_PANEL_DEFAULT_ORDER = ["display", "simulation", "filter", "driveFilter"];
    const CHART_PRESET_STORAGE_KEY = "tiEngineChartNamedPresets";
    const CHART_PRESET_STARTUP_STORAGE_KEY = "tiEngineChartStartupPresetId";
    const DRY_MASS_PRESET_STORAGE_KEY = "tiEngineChartDryMassPresets";
    let leftPanelLayout = loadLeftPanelLayout();

    function normalizeLeftPanelOrder(order) {
      const seen = new Set();
      const normalized = [];
      if (Array.isArray(order)) {
        order.forEach(key => {
          if (LEFT_PANEL_DEFAULT_ORDER.includes(key) && !seen.has(key)) {
            normalized.push(key);
            seen.add(key);
          }
        });
      }
      LEFT_PANEL_DEFAULT_ORDER.forEach(key => {
        if (!seen.has(key)) normalized.push(key);
      });
      return normalized;
    }

    function loadLeftPanelLayout() {
      try {
        const raw = localStorage.getItem(LEFT_PANEL_LAYOUT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return {
          order: normalizeLeftPanelOrder(parsed.order),
          collapsed: parsed.collapsed && typeof parsed.collapsed === "object" ? parsed.collapsed : {},
        };
      } catch {
        return { order: LEFT_PANEL_DEFAULT_ORDER.slice(), collapsed: {} };
      }
    }

    function saveLeftPanelLayout() {
      try {
        localStorage.setItem(LEFT_PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(leftPanelLayout));
      } catch {
        // localStorage may be unavailable in some embedded/file contexts.
      }
    }

    function metricSelectLabel() {
      const metric = document.getElementById("metric");
      return metric?.selectedOptions?.[0]?.textContent?.trim() || metricLabel(state.metric);
    }

    function leftPanelCardSummary(key) {
      if (key === "display") {
        return metricSelectLabel();
      }
      if (key === "simulation") {
        const radiator = DATA.radiators.find(item => item.id === state.radiatorId);
        return `${formatNumber(state.dryMassTons, " t")} · ${formatNumber(state.targetDvKps, " km/s")} · ${radiator ? radiatorDisplayName(radiator) : state.radiatorId}`;
      }
      if (key === "filter") {
        const parts = [];
        if (state.metric === "totalMassTons" || state.metric === "fuelMassTons" || state.metric === "twr") {
          parts.push(`TWR ≥ ${formatTwrDynamicUnit(state.minTwr)}`);
        }
        if (state.metric !== "totalMassTons" && state.metric !== "fuelMassTons" && state.metric !== "twr") {
          parts.push(`dV ≥ ${formatNumber(state.minDvKps, " km/s")}`);
        }
        if (state.paretoHighlight) parts.push(localText("파레토 ON", "Pareto ON"));
        if (state.showImpracticalCandidates) parts.push(localText("비현실 후보 ON", "Impractical ON"));
        if (state.logX || state.logY) parts.push(`${state.logX ? "log X" : ""}${state.logX && state.logY ? " · " : ""}${state.logY ? "log Y" : ""}`);
        return parts.filter(Boolean).join(" · ") || localText("기본 필터", "Default filters");
      }
      if (key === "driveFilter") {
        const selectedFamilies = DATA.subfamilies.filter(family => !!state.categories[family.categoryKey] && !!state.families[family.key]).length;
        const activeCategories = DATA.categories.filter(category => !!state.categories[category.key]).length;
        const search = state.searchTerm ? localText("검색 있음", "Search active") : localText("검색 없음", "No search");
        return `${localText("엔진", "Engine")} ×${state.thrusters} · ${activeCategories}/${DATA.categories.length} ${localText("대분류", "categories")} · ${selectedFamilies}/${DATA.subfamilies.length} ${localText("계열", "families")} · ${search}`;
      }
      return "";
    }

    function updateLeftPanelCardSummaries() {
      document.querySelectorAll(".control-card[data-control-card]").forEach(card => {
        const key = card.dataset.controlCard;
        const summary = card.querySelector("[data-card-summary]");
        if (summary) summary.textContent = leftPanelCardSummary(key);
        const toggle = card.querySelector("[data-card-toggle]");
        if (toggle) {
          const expanded = card.dataset.collapsed !== "true";
          toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
          toggle.setAttribute("aria-label", expanded
            ? localText("카드 접기", "Collapse card")
            : localText("카드 펼치기", "Expand card"));
        }
      });
    }

    function applyLeftPanelOrder() {
      const root = document.querySelector(".controls");
      if (!root) return;
      const cards = Object.fromEntries(Array.from(root.querySelectorAll(".control-card[data-control-card]")).map(card => [card.dataset.controlCard, card]));
      const anchor = root.querySelector(".controls-toolbar");
      leftPanelLayout.order = normalizeLeftPanelOrder(leftPanelLayout.order);
      leftPanelLayout.order.forEach(key => {
        const card = cards[key];
        if (card) root.appendChild(card);
      });
      if (anchor && root.firstElementChild !== anchor) root.insertBefore(anchor, root.firstElementChild);
      updateLeftPanelMoveButtons();
      updateLeftPanelCardSummaries();
    }

    function updateLeftPanelMoveButtons() {
      const order = normalizeLeftPanelOrder(leftPanelLayout.order);
      document.querySelectorAll(".control-card[data-control-card]").forEach(card => {
        const index = order.indexOf(card.dataset.controlCard);
        const up = card.querySelector('[data-panel-move="up"]');
        const down = card.querySelector('[data-panel-move="down"]');
        if (up) up.disabled = index <= 0;
        if (down) down.disabled = index < 0 || index >= order.length - 1;
      });
    }

    function moveLeftPanelCard(key, delta) {
      const order = normalizeLeftPanelOrder(leftPanelLayout.order);
      const index = order.indexOf(key);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= order.length) return;
      [order[index], order[next]] = [order[next], order[index]];
      leftPanelLayout.order = order;
      saveLeftPanelLayout();
      applyLeftPanelOrder();
    }

    function setupLeftPanelCards() {
      const root = document.querySelector(".controls");
      if (!root) return;
      root.querySelectorAll(".control-card[data-control-card]").forEach(card => {
        const key = card.dataset.controlCard;
        const collapsed = !!leftPanelLayout.collapsed[key];
        card.dataset.collapsed = collapsed ? "true" : "false";
        const toggle = card.querySelector("[data-card-toggle]");
        if (toggle) {
          toggle.addEventListener("click", () => {
            const nextCollapsed = card.dataset.collapsed !== "true";
            card.dataset.collapsed = nextCollapsed ? "true" : "false";
            leftPanelLayout.collapsed[key] = nextCollapsed;
            saveLeftPanelLayout();
            updateLeftPanelCardSummaries();
          });
        }
        card.querySelectorAll("[data-panel-move]").forEach(button => {
          button.addEventListener("click", event => {
            event.preventDefault();
            moveLeftPanelCard(key, button.dataset.panelMove === "up" ? -1 : 1);
          });
          button.setAttribute("aria-label", button.dataset.panelMove === "up"
            ? localText("위로 이동", "Move up")
            : localText("아래로 이동", "Move down"));
          button.title = button.getAttribute("aria-label");
        });
      });
      const reset = document.getElementById("resetLeftPanelLayout");
      if (reset) {
        reset.addEventListener("click", () => {
          leftPanelLayout = { order: LEFT_PANEL_DEFAULT_ORDER.slice(), collapsed: {} };
          saveLeftPanelLayout();
          document.querySelectorAll(".control-card[data-control-card]").forEach(card => {
            card.dataset.collapsed = "false";
          });
          applyLeftPanelOrder();
        });
      }
      applyLeftPanelOrder();
    }


    const RADIATOR_KO_SHORT_NAMES = {
      ExoticSpike: "엑조틱 스파이크",
      DustyPlasma: "먼지 플라즈마",
      LithiumSpray: "리튬 스프레이",
      GalliumMist: "갈륨 안개",
      TinDroplet: "주석 방울",
      NanotubeFilament: "나노튜브 필라멘트",
      TitaniumArray: "티타늄 어레이",
      CobaltDust: "코발트 분진",
      MolybdenumPipe: "몰리브덴 파이프",
      IonicDust: "이온 분진",
      AluminumFin: "알루미늄 핀",
    };

    function cleanRadiatorDisplayName(name) {
      const text = String(name || "").trim();
      return UI_LANG === "ko" ? text.replace(/\s*라디에이터\s*$/u, "") : text;
    }

    function radiatorDisplayName(item) {
      if (!item) return "";
      const display = item.displayName;
      const projectDisplay = item.requiredProjectDisplay;
      let name = "";
      if (UI_LANG === "ko") {
        name = RADIATOR_KO_SHORT_NAMES[item.id] || "";
        if (!name && display && typeof display === "object") {
          name = display.ko || display.kor || "";
        }
        if (!name && projectDisplay && typeof projectDisplay === "object") {
          name = projectDisplay.ko || projectDisplay.kor || "";
        }
        if (!name && typeof display === "string") {
          name = translateText(display, "ko");
        }
      } else if (display && typeof display === "object") {
        name = display.en || display.ko || display.kor || item.id || "";
      } else if (typeof display === "string") {
        name = display;
      } else if (projectDisplay && typeof projectDisplay === "object" && !display) {
        name = projectDisplay.en || projectDisplay.ko || projectDisplay.kor || item.id || "";
      }
      return cleanRadiatorDisplayName(name || display || item.id || "");
    }

    function radiatorOptionLabel(item) {
      return `${radiatorDisplayName(item)} (${formatNumber(item.specificPowerKWPerKg, " kW/kg")})`;
    }

    function renderRadiatorOptions(select) {
      if (!select) return;
      const selectedId = state.radiatorId || select.value || (DATA.radiators[0] && DATA.radiators[0].id) || "";
      select.innerHTML = "";
      DATA.radiators.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = radiatorOptionLabel(item);
        option.selected = item.id === selectedId;
        select.appendChild(option);
      });
      if (DATA.radiators.some(item => item.id === selectedId)) {
        select.value = selectedId;
      }
    }

    function syncMetricGroupLabels() {
      const metric = document.getElementById("metric");
      if (!metric) return;
      const selectedValue = metric.value;
      const groups = metric.querySelectorAll("optgroup");
      if (groups[0]) groups[0].label = localText("시뮬레이션(총 질량, 연료질량, TWR)", "Simulation (total mass, fuel mass, TWR)");
      if (groups[1]) groups[1].label = localText("기본 정보(추력, 효율, 출력)", "Basic information (thrust, efficiency, power)");
      metric.innerHTML = metric.innerHTML;
      metric.value = selectedValue;
    }

    function applyStaticLanguage() {
      document.documentElement.lang = UI_LANG;
      const languageSelect = document.getElementById("uiLanguageSelect");
      if (languageSelect) languageSelect.value = UI_LANG;
      syncMetricGroupLabels();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(node => {
        node.nodeValue = translateText(node.nodeValue);
      });
      document.querySelectorAll("[placeholder],[aria-label],[title]").forEach(element => {
        ["placeholder", "aria-label", "title"].forEach(attribute => {
          if (element.hasAttribute(attribute)) {
            element.setAttribute(attribute, translateText(element.getAttribute(attribute)));
          }
        });
      });
      const note = document.getElementById("calculationNote");
      if (note) note.innerHTML = NOTE_HTML[UI_LANG] || NOTE_HTML.ko;
    }

    function setLanguage(lang, { rerender = true } = {}) {
      UI_LANG = lang === "en" ? "en" : "ko";
      localStorage.setItem("tiEngineChartLanguage", UI_LANG);
      applyStaticLanguage();
      refreshLocalizedControls();
      refreshSourceNote();
      updateLeftPanelCardSummaries();
      if (rerender) render();
    }

    function refreshLocalizedControls() {
      document.querySelectorAll(".category-row").forEach(row => {
        const category = DATA.categories.find(item => item.key === row.dataset.categoryKey);
        const text = row.querySelector(".category-name");
        if (category && text) text.textContent = localLabel(category);
        if (category) applyHelp(row, localCategoryHelp(category));
      });
      document.querySelectorAll(".family-row").forEach(row => {
        const family = DATA.subfamilies.find(item => item.key === row.dataset.familyKey);
        const text = row.querySelector(".family-name");
        if (family && text) text.textContent = localLabel(family);
      });
      syncMetricGroupLabels();
      enhanceSearchableSelect(document.getElementById("metric"));
      const showTwrInfo = document.getElementById("showTwrInfo");
      const showMassInfo = document.getElementById("showMassInfo");
      const paretoHighlight = document.getElementById("paretoHighlight");
      const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
      const nameSearch = document.getElementById("nameSearch");
      if (showTwrInfo) applyHelp(showTwrInfo.closest(".check-row"), helpText("showTwrInfo"));
      if (showMassInfo) applyHelp(showMassInfo.closest(".check-row"), helpText("showMassInfo"));
      if (paretoHighlight) applyHelp(paretoHighlight.closest(".check-row"), helpText("paretoHighlight"));
      if (showImpracticalCandidates) applyHelp(showImpracticalCandidates.closest(".check-row"), helpText("showImpracticalCandidates"));
      applyHelp(document.querySelector("#minTwrControl .label"), helpText("minTwr"));
      applyHelp(document.querySelector("#minDvControl .label"), helpText("minDv"));
      renderRadiatorOptions(document.getElementById("radiator"));
      enhanceSearchableSelect(document.getElementById("radiator"));
      setPresetUiText();
      renderDryMassCalcModal();
    }

    const metricDefs = {
      thrustMN: {
        label: "추력 (MN)",
        hint: "템플릿 thrust_N을 MN으로 환산",
        value: row => row.thrustN / 1e6,
        format: value => formatNumber(value, " MN"),
      },
      fuelEfficiency: {
        get label() {
          return state.fuelEfficiencyUnit === "seconds" ? "연료효율 (s)" : "연료효율 (km/s)";
        },
        get hint() {
          return state.fuelEfficiencyUnit === "seconds"
            ? "EV_kps * 1000 / 9.80665"
            : "템플릿 EV_kps";
        },
        value: row => state.fuelEfficiencyUnit === "seconds" ? row.specificImpulseSeconds : row.exhaustVelocityKps,
        format: value => formatNumber(value, state.fuelEfficiencyUnit === "seconds" ? " s" : " km/s"),
      },
      powerRequirementGW: {
        label: "출력 요구량 (GW)",
        hint: "thrust_N * EV_kps * 0.5 / 1,000,000 / efficiency",
        value: row => row.powerRequirementGW,
        format: value => formatNumber(value, " GW"),
      },
      totalMassTons: {
        label: "목표 dV 총질량 (t)",
        hint: "총질량 = 기준 건조질량 + 드라이브 + 전원 + 라디에이터 + 추진체",
        value: row => {
          const values = chartMassOptions(row);
          return values.length ? values[0].totalMassTons : NaN;
        },
        format: value => formatNumber(value, " t"),
      },
      fuelMassTons: {
        label: "목표 dV 연료질량 (t)",
        hint: "연료질량 = (기준 건조질량 + 드라이브 + 전원 + 라디에이터) * (질량비 - 1)",
        value: row => {
          const values = chartMassOptions(row);
          return values.length ? values[0].propellantTons : NaN;
        },
        format: value => formatNumber(value, " t"),
      },
      twr: {
        label: "TWR",
        hint: "추력 / (목표 dV 총질량 * g)",
        value: row => {
          const values = chartMassOptions(row);
          return values.length ? values[0].twr : NaN;
        },
        format: value => formatTwr(value, ""),
      },
    };

    function metricLabel(key) {
      return translateText(metricDefs[key].label);
    }

    function metricHint(key) {
      return translateText(metricDefs[key].hint);
    }

    const chart = document.getElementById("chart");
    const tooltip = document.getElementById("tooltip");
    const categoryRoot = document.getElementById("categories");
    const familyRoot = document.getElementById("families");
    const CHART_HIT_RADIUS_PX = 16;
    const CHART_CLICK_TOLERANCE_PX = 5;
    const EXTREME_MASS_RATIO = 1_000_000;
    const MASS_RATIO_OVERFLOW_EXPONENT = 709;
    const HIDDEN_REASON_PRIORITY = [
      "minTwr",
      "minDv",
      "targetDvOrMassRatio",
      "researchFilter",
      "invalidPowerPlant",
      "invalidComputation",
      "axisRange",
      "other",
      "familyFilter",
    ];
    const HELP_TEXT = {
      showTwrInfo: {
        ko: "목표 dV 총질량/연료질량 그래프에서 각 점의 밝기를 TWR로 인코딩합니다. 같은 질량대라도 실제로 가속이 가능한 후보인지 빠르게 구분할 때 유용합니다.",
        en: "On the target-dV total-mass/fuel-mass charts, point brightness encodes TWR. This helps separate candidates that can actually accelerate from sluggish designs at similar mass.",
      },
      showMassInfo: {
        ko: "TWR 그래프에서 각 점의 밝기를 총질량의 역수로 인코딩합니다. 높은 TWR 후보 중에서도 같은 목표 dV를 더 가벼운 총질량으로 달성하는 조합을 찾는 데 도움을 줍니다.",
        en: "On the TWR chart, point brightness encodes the inverse of total mass. This helps find high-TWR candidates that also reach the target dV with a lighter ship.",
      },
      paretoHighlight: {
        ko: "누적 연구력은 더 낮고, 총질량은 더 가볍고, TWR은 더 높은 후보가 존재하면 해당 후보를 흐리게 표시합니다. 명백히 밀리는 조합을 줄여 투자 후보를 좁히는 기능입니다.",
        en: "Dims candidates that are dominated by another option with no more research, no more total mass, and at least as much TWR. It narrows attention to stronger investment candidates.",
      },
      showImpracticalCandidates: {
        ko: "최소 TWR 또는 극단적 질량비 때문에 보통 숨겨지는 후보도 차트에 남깁니다. 왜 특정 계열이 사라지는지 조사하거나 낮은 dV 프리셋을 찾을 때 사용하세요.",
        en: "Keeps candidates that would normally be hidden by minimum TWR or extreme mass ratio. Use it to inspect why a family disappears or to design lower-dV presets.",
      },
      minTwr: {
        ko: "총질량 그래프에서 습질량 기준 TWR이 이 값보다 낮은 후보를 숨깁니다. 값을 낮추면 장거리 dV에는 가능하지만 가속이 매우 느린 조합까지 확인할 수 있습니다.",
        en: "On total-mass charts, hides candidates whose wet-mass TWR is below this threshold. Lower it to inspect designs that can reach the dV but accelerate very slowly.",
      },
      minDv: {
        ko: "TWR 그래프에서 실용 질량비 한계(극단적 질량비 기준)로 계산한 최대 dV가 이 값보다 낮은 후보를 숨깁니다.",
        en: "On the TWR chart, hides candidates whose maximum practical dV (using the extreme mass-ratio bound) is below this threshold.",
      },
    };
    let chartViewport = null;
    let chartHitTargets = [];
    let currentChartRows = [];
    let currentDiagnostics = null;
    const allDriveRowsById = new Map(DATA.drives.map(row => [row.id, row]));
    const SHIP_CATALOG = DATA.shipCatalog || {};
    const ALL_SHIP_HULLS = Array.isArray(SHIP_CATALOG.hulls) ? SHIP_CATALOG.hulls : [];
    const HUMAN_BUILDABLE_HULLS = ALL_SHIP_HULLS.filter(item => !item.alien && !item.noShipyardBuild && !item.simpleHull);
    const SHIP_CLASS_OPTIONS = HUMAN_BUILDABLE_HULLS.length ? HUMAN_BUILDABLE_HULLS : ALL_SHIP_HULLS;
    const ALL_UTILITY_MODULES = Array.isArray(SHIP_CATALOG.utilityModules) ? SHIP_CATALOG.utilityModules : [];
    const EMPTY_UTILITY_MODULE = ALL_UTILITY_MODULES.find(item => item.dataName === "Empty") || {
      dataName: "Empty",
      friendlyName: "Empty",
      displayName: { kor: "비움", en: "Empty" },
      massTons: 0,
      crew: 0,
      powerRequirementMW: 0,
      minConstructionTier: 0,
      alien: false,
    };
    const ALL_WEAPON_MODULES = Array.isArray(SHIP_CATALOG.weaponModules) ? SHIP_CATALOG.weaponModules : [];
    const EMPTY_WEAPON_MODULE = {
      dataName: "EmptyWeapon",
      friendlyName: "Empty",
      displayName: { kor: "비움", en: "Empty" },
      massTons: 0,
      crew: 0,
      mount: "",
      slotClass: "any",
      slotSize: 0,
      alien: false,
    };
    const ALL_ARMORS = Array.isArray(SHIP_CATALOG.armors) ? SHIP_CATALOG.armors : [];
    const HUMAN_ARMORS = ALL_ARMORS.filter(item => item && !item.alien);
    const ARMOR_OPTIONS = HUMAN_ARMORS.length ? HUMAN_ARMORS : ALL_ARMORS;
    const DEFAULT_ARMOR_ID = (ARMOR_OPTIONS.find(item => item.dataName === "SteelArmor") || ARMOR_OPTIONS[0] || {}).dataName || "";
    const dryMassCalcState = {
      classId: SHIP_CLASS_OPTIONS[0] ? SHIP_CLASS_OPTIONS[0].dataName : "",
      slotModules: [],
      weaponModules: {
        nose: [],
        hull: [],
      },
      armor: {
        tail: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        hull: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        nose: { armorId: DEFAULT_ARMOR_ID, points: 0 },
      },
      notes: "",
    };
    let chartPresetLibrary = loadChartPresetLibrary();
    let dryMassPresetLibrary = loadDryMassPresetLibrary();
    let startupChartPresetId = loadStartupChartPresetId();

    function setupControls() {
      const metric = document.getElementById("metric");
      const thrusters = document.getElementById("thrusters");
      const thrustersNumber = document.getElementById("thrustersNumber");
      const fuelUnitBlock = document.getElementById("chartFuelUnit");
      const dryMass = document.getElementById("dryMass");
      const dryMassNumber = document.getElementById("dryMassNumber");
      const targetDv = document.getElementById("targetDv");
      const targetDvNumber = document.getElementById("targetDvNumber");
      const radiator = document.getElementById("radiator");
      const logX = document.getElementById("logX");
      const logY = document.getElementById("logY");
      const showTwrInfo = document.getElementById("showTwrInfo");
      const showMassInfo = document.getElementById("showMassInfo");
      const paretoHighlight = document.getElementById("paretoHighlight");
      const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
      const powerResearchToggle = document.getElementById("powerResearchToggle");
      const minTwrExp = document.getElementById("minTwrExp");
      const minTwrNumber = document.getElementById("minTwrNumber");
      const minDv = document.getElementById("minDv");
      const minDvNumber = document.getElementById("minDvNumber");
      const presetExport = document.getElementById("presetExport");
      const presetImport = document.getElementById("presetImport");
      const nameSearch = document.getElementById("nameSearch");

      applyStartupChartPreset();
      const languageSelect = document.getElementById("uiLanguageSelect");
      if (languageSelect) {
        languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));
      }
      applyStaticLanguage();
      setupLeftPanelCards();
      applyHelp(showTwrInfo.closest(".check-row"), helpText("showTwrInfo"));
      applyHelp(showMassInfo.closest(".check-row"), helpText("showMassInfo"));
      applyHelp(paretoHighlight.closest(".check-row"), helpText("paretoHighlight"));
      applyHelp(showImpracticalCandidates.closest(".check-row"), helpText("showImpracticalCandidates"));
      applyHelp(document.querySelector("#minTwrControl .label"), helpText("minTwr"));
      applyHelp(document.querySelector("#minDvControl .label"), helpText("minDv"));

      metric.value = state.metric;
      enhanceSearchableSelect(metric);
      dryMass.value = String(clamp(state.dryMassTons, Number(dryMass.min), Number(dryMass.max)));
      dryMassNumber.value = String(Math.round(state.dryMassTons));
      targetDv.value = String(clamp(state.targetDvKps, Number(targetDv.min), Number(targetDv.max)));
      targetDvNumber.value = String(Math.round(state.targetDvKps));

      tooltip.addEventListener("click", event => {
        const moveButton = event.target.closest(".tooltip-item-move");
        if (moveButton) {
          moveTooltipItemByOffset(
            moveButton.getAttribute("data-tooltip-key"),
            moveButton.getAttribute("data-direction") === "up" ? -1 : 1,
          );
          return;
        }
        const itemClose = event.target.closest(".tooltip-item-close");
        if (itemClose) {
          removeTooltipItem(itemClose.getAttribute("data-tooltip-key"));
          return;
        }
        const itemPin = event.target.closest(".tooltip-item-pin");
        if (itemPin) {
          toggleTooltipItemPin(itemPin.getAttribute("data-tooltip-key"));
          return;
        }
        if (event.target.closest(".tooltip-close")) {
          clearTooltip({ keepPinned: true });
        }
      });

      renderRadiatorOptions(radiator);
      if (!state.radiatorId && DATA.radiators[0]) {
        state.radiatorId = DATA.radiators[0].id;
        radiator.value = state.radiatorId;
      }
      enhanceSearchableSelect(radiator);
      setupPresetLibraryControls();

      DATA.categories.forEach(category => {
        const label = document.createElement("label");
        label.className = "category-row";
        label.dataset.categoryKey = category.key;
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!state.categories[category.key];
        input.addEventListener("change", () => {
          state.categories[category.key] = input.checked;
          syncFilterInputs();
          render();
        });
        applyHelp(label, localCategoryHelp(category));
        label.tabIndex = 0;
        const swatch = document.createElement("span");
        swatch.className = "family-swatch";
        swatch.setAttribute("style", backgroundStyle(category.color, category.colorOklch || category.color));
        const text = document.createElement("span");
        text.className = "category-name";
        text.textContent = localLabel(category);
        label.append(input, swatch, text);
        categoryRoot.appendChild(label);
      });

      DATA.subfamilies.forEach(family => {
        const label = document.createElement("label");
        label.className = "family-row";
        label.dataset.familyKey = family.key;
        label.dataset.categoryKey = family.categoryKey;
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!state.families[family.key];
        input.addEventListener("change", () => {
          state.families[family.key] = input.checked;
          render();
        });
        const swatch = document.createElement("span");
        swatch.className = "family-swatch";
        swatch.setAttribute("style", backgroundStyle(family.color, family.colorOklch || family.color));
        const text = document.createElement("span");
        text.className = "family-name";
        text.textContent = localLabel(family);
        const count = document.createElement("span");
        count.className = "family-count";
        count.dataset.familyCount = family.key;
        count.textContent = "0 / 0";
        label.append(input, swatch, text, count);
        familyRoot.appendChild(label);
      });

      metric.addEventListener("change", () => {
        state.metric = metric.value;
        fuelUnitBlock.style.display = state.metric === "fuelEfficiency" ? "" : "none";
        render();
      });
      thrusters.addEventListener("change", () => {
        state.thrusters = Number(thrusters.value);
        thrustersNumber.value = String(state.thrusters);
        render();
      });
      thrusters.addEventListener("input", () => {
        state.thrusters = Number(thrusters.value);
        thrustersNumber.value = String(state.thrusters);
        render();
      });
      thrustersNumber.addEventListener("input", () => {
        const value = Math.round(clamp(Number(thrustersNumber.value) || 1, 1, 6));
        state.thrusters = value;
        thrusters.value = String(value);
        render();
      });
      document.querySelectorAll('input[name="fuelUnit"]').forEach(input => {
        input.addEventListener("change", () => {
          state.fuelEfficiencyUnit = input.value;
          render();
        });
      });
      document.querySelectorAll("[data-sort]").forEach(button => {
        button.addEventListener("click", () => {
          const key = button.dataset.sort;
          if (state.sortKey === key) {
            state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
          } else {
            state.sortKey = key;
            state.sortDirection = ["drive", "family", "reactor"].includes(key) ? "asc" : "desc";
          }
          renderTable(filteredRows());
          updateSortHeaders();
        });
      });
      dryMass.addEventListener("input", () => {
        state.dryMassTons = Number(dryMass.value);
        dryMassNumber.value = String(Math.round(state.dryMassTons));
        render();
      });
      dryMassNumber.addEventListener("input", () => {
        const raw = Number(dryMassNumber.value);
        const value = clamp(Number.isFinite(raw) ? raw : 0, 0, 1000000);
        state.dryMassTons = value;
        dryMass.value = String(clamp(value, Number(dryMass.min), Number(dryMass.max)));
        render();
      });
      targetDv.addEventListener("input", () => {
        state.targetDvKps = Number(targetDv.value);
        targetDvNumber.value = String(Math.round(state.targetDvKps));
        render();
      });
      targetDvNumber.addEventListener("input", () => {
        const raw = Number(targetDvNumber.value);
        const value = clamp(Number.isFinite(raw) ? raw : 0, 0, 100000);
        state.targetDvKps = value;
        targetDv.value = String(clamp(value, Number(targetDv.min), Number(targetDv.max)));
        render();
      });
      radiator.addEventListener("change", () => {
        state.radiatorId = radiator.value;
        render();
      });
      logX.addEventListener("change", () => {
        state.logX = logX.checked;
        render();
      });
      logY.addEventListener("change", () => {
        state.logY = logY.checked;
        render();
      });
      showTwrInfo.addEventListener("change", () => {
        state.showTwrInfo = showTwrInfo.checked;
        render();
      });
      showMassInfo.addEventListener("change", () => {
        state.showMassInfo = showMassInfo.checked;
        render();
      });
      paretoHighlight.addEventListener("change", () => {
        state.paretoHighlight = paretoHighlight.checked;
        render();
      });
      showImpracticalCandidates.addEventListener("change", () => {
        state.showImpracticalCandidates = showImpracticalCandidates.checked;
        render();
      });
      powerResearchToggle.addEventListener("click", () => {
        if (chartViewport && chartViewport.xDomain && chartViewport.yDomain) {
          state.zoom = {
            xDomain: chartViewport.xDomain.slice(),
            yDomain: chartViewport.yDomain.slice(),
          };
          state.preserveViewportOnce = true;
        }
        state.usePowerResearch = !state.usePowerResearch;
        render();
      });
      minTwrExp.addEventListener("input", () => {
        const exponent = Number(minTwrExp.value);
        state.minTwr = Math.pow(10, exponent);
        syncMinTwrInputs();
        render();
      });
      minTwrNumber.addEventListener("input", () => {
        state.minTwr = clamp(Number(minTwrNumber.value) || 0.0001, 0.0001, 10);
        syncMinTwrInputs();
        render();
      });
      minDv.addEventListener("input", () => {
        state.minDvKps = clamp(Number(minDv.value) || 0, 0, 100000);
        syncMinDvInputs();
        render();
      });
      minDvNumber.addEventListener("input", () => {
        state.minDvKps = clamp(Number(minDvNumber.value) || 0, 0, 100000);
        syncMinDvInputs();
        render();
      });
      presetExport.addEventListener("click", async () => {
        try {
          const payload = await serializePresetPayload();
          const copied = await copyToClipboard(payload);
          showPresetStatus(copied
            ? localText("압축 설정 문자열을 클립보드에 복사했습니다.", "Compressed preset copied to clipboard.")
            : localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."), !copied);
        } catch {
          showPresetStatus(localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."), true);
        }
      });
      presetImport.addEventListener("click", async () => {
        const clip = (await readFromClipboard()).trim();
        const promptText = localText(
          "설정 문자열을 붙여넣으세요 (압축 문자열 지원)",
          "Paste preset string (compressed payload supported)",
        );
        const payload = window.prompt(promptText, clip || "");
        if (payload === null) {
          showPresetStatus(localText("가져오기를 취소했습니다.", "Preset import canceled."));
          return;
        }
        if (!payload.trim()) {
          showPresetStatus(localText("가져올 설정 문자열이 없습니다.", "No preset string to import."), true);
          return;
        }
        try {
          const parsed = await parsePresetPayload(payload);
          const result = await handleImportedPresetObject(parsed, { preferredKind: "chart" });
          showPresetStatus(result.message, !result.ok);
        } catch {
          showPresetStatus(localText("설정 문자열을 해석할 수 없습니다.", "Failed to parse preset payload."), true);
        }
      });
      nameSearch.addEventListener("input", () => {
        state.searchTerm = nameSearch.value.trim().toLocaleLowerCase();
        render();
      });
      document.getElementById("allFamilies").addEventListener("click", () => {
        DATA.subfamilies.forEach(f => {
          if (state.categories[f.categoryKey]) state.families[f.key] = true;
        });
        syncFilterInputs();
        render();
      });
      document.getElementById("clearFamilies").addEventListener("click", () => {
        DATA.subfamilies.forEach(f => {
          if (state.categories[f.categoryKey]) state.families[f.key] = false;
        });
        syncFilterInputs();
        render();
      });
      setupDryMassCalculator();
      refreshSourceNote();
      refreshLocalizedControls();
      syncFilterInputs();
      setupChartInteraction();
      updateChartControls();
      updateSortHeaders();
    }

    function refreshSourceNote() {
      const gameVersionParts = [
        `${localText("게임 버전", "Game version")}: ${DATA.source.gameVersion || "unknown"}`,
      ];
      if (DATA.source.steamBuildId) gameVersionParts.push(`Steam build ${DATA.source.steamBuildId}`);
      document.getElementById("sourceNote").textContent = `${localText("소스", "Source")}: ${DATA.source.driveTemplate}; ${DATA.source.radiatorTemplate}; ${DATA.source.shipCatalog}; ${gameVersionParts.join("; ")}`;
    }

    function setupChartInteraction() {
      const resetZoom = document.getElementById("resetZoom");
      resetZoom.addEventListener("click", () => {
        state.zoom = null;
        redrawChartOnly();
      });
      chart.addEventListener("wheel", handleChartWheel, { passive: false });
      chart.addEventListener("pointerdown", handleChartPointerDown);
      chart.addEventListener("pointermove", handleChartPointerMove);
      chart.addEventListener("pointerup", endChartPan);
      chart.addEventListener("pointercancel", endChartPan);
      chart.addEventListener("pointerleave", handleChartPointerLeave);
      chart.addEventListener("dblclick", event => {
        event.preventDefault();
        state.zoom = null;
        redrawChartOnly();
      });
      document.addEventListener("keydown", handleChartKeyDown);
    }

    function updateChartControls() {
      const fuelUnitBlock = document.getElementById("chartFuelUnit");
      const bandAnalysisControls = document.getElementById("bandAnalysisControls");
      const showTwrInfoRow = document.getElementById("showTwrInfoRow");
      const showMassInfoRow = document.getElementById("showMassInfoRow");
      const minTwrControl = document.getElementById("minTwrControl");
      const minDvControl = document.getElementById("minDvControl");
      const powerResearchToggle = document.getElementById("powerResearchToggle");
      fuelUnitBlock.style.display = state.metric === "fuelEfficiency" ? "" : "none";
      bandAnalysisControls.style.display = isBandMetric() ? "" : "none";
      showTwrInfoRow.style.display = (state.metric === "totalMassTons" || state.metric === "fuelMassTons") ? "" : "none";
      showMassInfoRow.style.display = state.metric === "twr" ? "" : "none";
      minTwrControl.style.display = (state.metric === "totalMassTons" || state.metric === "fuelMassTons") ? "" : "none";
      minDvControl.style.display = state.metric === "twr" ? "" : "none";
      powerResearchToggle.style.display = isBandMetric() ? "" : "none";
      powerResearchToggle.setAttribute("aria-pressed", state.usePowerResearch ? "true" : "false");
      const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");
      if (showImpracticalCandidates) showImpracticalCandidates.checked = !!state.showImpracticalCandidates;
      syncMinTwrInputs();
      syncMinDvInputs();
    }

    function syncMinTwrInputs() {
      const slider = document.getElementById("minTwrExp");
      const number = document.getElementById("minTwrNumber");
      const readout = document.getElementById("minTwrReadout");
      if (!slider || !number || !readout) return;
      state.minTwr = clamp(state.minTwr || 0.0001, 0.0001, 10);
      const exponent = clamp(Math.log10(state.minTwr), Number(slider.min), Number(slider.max));
      slider.value = String(exponent);
      number.value = String(Number(state.minTwr.toPrecision(4)));
      readout.textContent = `${UI_LANG === "en" ? "Showing" : "표시"}: TWR >= ${formatTwrDynamicUnit(state.minTwr)}`;
    }

    function syncMinDvInputs() {
      const slider = document.getElementById("minDv");
      const number = document.getElementById("minDvNumber");
      const readout = document.getElementById("minDvReadout");
      if (!slider || !number || !readout) return;
      state.minDvKps = clamp(state.minDvKps || 0, 0, 100000);
      slider.value = String(clamp(state.minDvKps, Number(slider.min), Number(slider.max)));
      number.value = String(Math.round(state.minDvKps));
      readout.textContent = `${UI_LANG === "en" ? "Showing" : "표시"}: dV >= ${formatNumber(state.minDvKps, " km/s")}`;
    }

    function catalogDisplayName(item) {
      const display = item && item.displayName;
      if (display && typeof display === "object") {
        return UI_LANG === "en"
          ? display.en || display.kor || item.friendlyName || item.dataName
          : display.kor || display.en || item.friendlyName || item.dataName;
      }
      return item ? (item.friendlyName || item.dataName || "") : "";
    }

    function compareCatalogTitles(left, right) {
      const locale = UI_LANG === "en" ? "en" : "ko-KR";
      const titleCompare = catalogDisplayName(left).localeCompare(catalogDisplayName(right), locale, {
        numeric: true,
        sensitivity: "base",
      });
      if (titleCompare) return titleCompare;
      return String(left && left.dataName || "").localeCompare(String(right && right.dataName || ""), "en", {
        numeric: true,
        sensitivity: "base",
      });
    }

    function sortedByCatalogTitle(items) {
      return [...items].sort(compareCatalogTitles);
    }

    function selectedShipClass() {
      return SHIP_CLASS_OPTIONS.find(item => item.dataName === dryMassCalcState.classId) || SHIP_CLASS_OPTIONS[0] || null;
    }

    function utilityModulesForShipClass(shipClass) {
      const hullTier = Number(shipClass && shipClass.constructionTier) || 0;
      const modules = ALL_UTILITY_MODULES.filter(item => {
        if (!item || item.dataName === "Empty") return false;
        if (item.alien) return false;
        return (Number(item.minConstructionTier) || 0) <= hullTier;
      });
      return [EMPTY_UTILITY_MODULE, ...sortedByCatalogTitle(modules)];
    }

    function selectedModuleById(id) {
      return ALL_UTILITY_MODULES.find(item => item.dataName === id) || EMPTY_UTILITY_MODULE;
    }

    function selectedWeaponById(id) {
      return ALL_WEAPON_MODULES.find(item => item.dataName === id) || EMPTY_WEAPON_MODULE;
    }

    function selectedArmorById(id) {
      return ARMOR_OPTIONS.find(item => item.dataName === id) || ARMOR_OPTIONS[0] || null;
    }

    function armorSelection(section) {
      if (!dryMassCalcState.armor || typeof dryMassCalcState.armor !== "object") dryMassCalcState.armor = {};
      if (!dryMassCalcState.armor[section] || typeof dryMassCalcState.armor[section] !== "object") {
        dryMassCalcState.armor[section] = { armorId: DEFAULT_ARMOR_ID, points: 0 };
      }
      if (!dryMassCalcState.armor[section].armorId) dryMassCalcState.armor[section].armorId = DEFAULT_ARMOR_ID;
      dryMassCalcState.armor[section].points = Math.max(0, Math.round(Number(dryMassCalcState.armor[section].points) || 0));
      return dryMassCalcState.armor[section];
    }

    function armorPlateThicknessM(armor) {
      const density = Number(armor && armor.densityKgM3) || 0;
      const heat = Number(armor && armor.heatOfVaporizationMJkg) || 0;
      if (density <= 0 || heat <= 0) return 0;
      const massDamagePointKg = 20 / heat;
      const volumeDamagePointM3 = massDamagePointKg / density;
      return volumeDamagePointM3 / 0.005;
    }

    function armorSectionThicknessM(armor, points) {
      return armorPlateThicknessM(armor) * Math.max(0, Number(points) || 0);
    }

    function selectedArmorMaxBonus() {
      return dryMassCalcState.slotModules
        .map(selectedModuleById)
        .reduce((sum, module) => {
          const rules = Array.isArray(module.specialRules) ? module.specialRules : [];
          return sum + (rules.includes("ArmorStruts") ? (Number(module.specialValue) || 0) : 0);
        }, 0);
    }

    function armorMaxDepthM(shipClass, section) {
      if (!shipClass) return 0;
      const length = Number(shipClass.lengthM) || 0;
      const width = Number(shipClass.widthM) || 0;
      const simple = !!shipClass.simpleHull;
      const base = section === "hull"
        ? width * (simple ? 0.06 : 0.12)
        : length * (simple ? (section === "tail" ? 0 : 0.018) : 0.036);
      return base * (1 + selectedArmorMaxBonus());
    }

    function armorMaxPoints(shipClass, section, armor) {
      const plate = armorPlateThicknessM(armor);
      if (plate <= 0) return 0;
      return Math.max(0, Math.trunc(armorMaxDepthM(shipClass, section) / plate));
    }

    function normalizeDryMassCalcArmor() {
      const shipClass = selectedShipClass();
      for (const section of ["tail", "hull", "nose"]) {
        const selection = armorSelection(section);
        const armor = selectedArmorById(selection.armorId);
        if (!armor) {
          selection.armorId = DEFAULT_ARMOR_ID;
          selection.points = 0;
          continue;
        }
        selection.armorId = armor.dataName;
        selection.points = clamp(Math.round(selection.points), 0, armorMaxPoints(shipClass, section, armor));
      }
    }

    function armorSectionVolumeM3(armor, points, shipClass, lateralArmorDepthM, lateral) {
      const length = Number(shipClass && shipClass.lengthM) || 0;
      const width = Number(shipClass && shipClass.widthM) || 0;
      if (!armor || points <= 0 || length <= 0 || width <= 0) return 0;
      const radiusWithArmor = (width + lateralArmorDepthM + lateralArmorDepthM) / 2;
      const enlargedCapArea = Math.PI * radiusWithArmor * radiusWithArmor;
      if (lateral) {
        const baseVolume = Math.PI * (width / 2) * (width / 2) * length;
        return Math.max(0, (enlargedCapArea * length - baseVolume) / 2);
      }
      return armorSectionThicknessM(armor, points) * enlargedCapArea * 3;
    }

    function armorMassTons(section, shipClass) {
      const hullSelection = armorSelection("hull");
      const hullArmor = selectedArmorById(hullSelection.armorId);
      const lateralArmorDepthM = armorSectionThicknessM(hullArmor, hullSelection.points);
      const selection = armorSelection(section);
      const armor = selectedArmorById(selection.armorId);
      const points = Math.max(0, Number(selection.points) || 0);
      const volumeM3 = armorSectionVolumeM3(armor, points, shipClass, lateralArmorDepthM, section === "hull");
      return Math.max(0, volumeM3 * (Number(armor && armor.densityKgM3) || 0) / 1000);
    }

    function dryMassCalcArmorTotals(shipClass = selectedShipClass()) {
      const tailMassTons = armorMassTons("tail", shipClass);
      const hullMassTons = armorMassTons("hull", shipClass);
      const noseMassTons = armorMassTons("nose", shipClass);
      return {
        tailMassTons,
        hullMassTons,
        noseMassTons,
        massTons: tailMassTons + hullMassTons + noseMassTons,
      };
    }

    function hardpointCapacity(shipClass, section) {
      if (!shipClass) return 0;
      return Math.max(0, Number(section === "nose" ? shipClass.noseHardpoints : shipClass.hullHardpoints) || 0);
    }

    function weaponSlotSize(module) {
      if (!module || module.dataName === EMPTY_WEAPON_MODULE.dataName) return 0;
      return Math.max(0, Number(module.slotSize) || 1);
    }

    function weaponSlotClass(module) {
      return String(module && module.slotClass || "");
    }

    function weaponFitsSection(module, section) {
      const slotClass = weaponSlotClass(module);
      return slotClass === section || slotClass === "any";
    }

    function weaponModulesForSection(section) {
      const modules = ALL_WEAPON_MODULES.filter(item => {
        if (!item || item.alien) return false;
        return weaponFitsSection(item, section) && weaponSlotSize(item) > 0;
      });
      return [EMPTY_WEAPON_MODULE, ...sortedByCatalogTitle(modules)];
    }

    function weaponSelections(section) {
      if (!dryMassCalcState.weaponModules || typeof dryMassCalcState.weaponModules !== "object") {
        dryMassCalcState.weaponModules = { nose: [], hull: [] };
      }
      if (!Array.isArray(dryMassCalcState.weaponModules[section])) {
        dryMassCalcState.weaponModules[section] = [];
      }
      return dryMassCalcState.weaponModules[section];
    }

    function usedWeaponHardpoints(section) {
      return weaponSelections(section)
        .map(selectedWeaponById)
        .reduce((sum, module) => sum + weaponSlotSize(module), 0);
    }

    function formatHardpointSize(value) {
      return Number.isFinite(value) ? trim(value) : "-";
    }

    function formatDays(value) {
      const days = Number(value);
      if (!Number.isFinite(days) || days <= 0) return "-";
      return formatCompact(days, 1_000);
    }

    function shipyardBuildTimeRow(shipClass) {
      const times = shipClass && shipClass.shipyardBuildTimesDays || {};
      const value = [
        formatDays(times.t1 ?? shipClass.baseConstructionTimeDays),
        formatDays(times.t2 ?? shipClass.baseConstructionTimeDays),
        formatDays(times.t3 ?? shipClass.baseConstructionTimeDays),
      ].join(" / ");
      return [localText("조선소 건조일수 (T1/T2/T3)", "Shipyard build days (T1/T2/T3)"), value];
    }

    function groupedShipClassOptionsHtml() {
      const groups = new Map();
      SHIP_CLASS_OPTIONS.forEach(item => {
        const missionControl = Number(item.missionControl) || 0;
        if (!groups.has(missionControl)) groups.set(missionControl, []);
        groups.get(missionControl).push(item);
      });
      return Array.from(groups.entries())
        .sort(([left], [right]) => left - right)
        .map(([missionControl, items]) => {
          const groupLabel = `${localText("MC 소모", "MC cost")} ${formatHardpointSize(missionControl)}`;
          const options = sortedByCatalogTitle(items)
            .map(item => `<option value="${escapeHtml(item.dataName)}">${escapeHtml(catalogDisplayName(item))}</option>`)
            .join("");
          return `<optgroup label="${escapeHtml(groupLabel)}">${options}</optgroup>`;
        })
        .join("");
    }

    function weaponOptionLabel(item) {
      if (item.dataName === EMPTY_WEAPON_MODULE.dataName) return catalogDisplayName(item);
      return `${catalogDisplayName(item)} (${formatHardpointSize(weaponSlotSize(item))} HP, ${formatNumber(Number(item.massTons) || 0, " t")})`;
    }

    function normalizeDryMassCalcWeapons() {
      const shipClass = selectedShipClass();
      for (const section of ["nose", "hull"]) {
        const capacity = hardpointCapacity(shipClass, section);
        const allowedIds = new Set(weaponModulesForSection(section).map(item => item.dataName));
        const normalized = [];
        let used = 0;
        for (const id of weaponSelections(section)) {
          if (!allowedIds.has(id)) continue;
          const module = selectedWeaponById(id);
          const size = weaponSlotSize(module);
          if (size <= 0) continue;
          if (used + size <= capacity + 1e-9) {
            normalized.push(id);
            used += size;
          }
        }
        dryMassCalcState.weaponModules[section] = normalized;
      }
    }

    function normalizeDryMassCalcSlots() {
      const shipClass = selectedShipClass();
      if (!shipClass) {
        dryMassCalcState.slotModules = [];
        dryMassCalcState.weaponModules = { nose: [], hull: [] };
        normalizeDryMassCalcArmor();
        return;
      }
      normalizeDryMassCalcWeapons();
      const desired = Math.max(0, Number(shipClass.utilitySlots ?? shipClass.internalModules) || 0);
      const allowedIds = new Set(utilityModulesForShipClass(shipClass).map(item => item.dataName));
      if (dryMassCalcState.slotModules.length > desired) {
        dryMassCalcState.slotModules = dryMassCalcState.slotModules.slice(0, desired);
      }
      dryMassCalcState.slotModules = dryMassCalcState.slotModules.map(id => allowedIds.has(id) ? id : EMPTY_UTILITY_MODULE.dataName);
      while (dryMassCalcState.slotModules.length < desired) {
        dryMassCalcState.slotModules.push(EMPTY_UTILITY_MODULE.dataName);
      }
      normalizeDryMassCalcArmor();
    }

    function resetDryMassCalcState() {
      dryMassCalcState.classId = SHIP_CLASS_OPTIONS[0] ? SHIP_CLASS_OPTIONS[0].dataName : "";
      dryMassCalcState.slotModules = [];
      dryMassCalcState.weaponModules = { nose: [], hull: [] };
      dryMassCalcState.armor = {
        tail: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        hull: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        nose: { armorId: DEFAULT_ARMOR_ID, points: 0 },
      };
      dryMassCalcState.notes = "";
      normalizeDryMassCalcSlots();
    }

    function exportedDryMassCalculatorPreset() {
      normalizeDryMassCalcSlots();
      return {
        classId: dryMassCalcState.classId,
        slotModules: dryMassCalcState.slotModules.slice(),
        weaponModules: {
          nose: weaponSelections("nose").slice(),
          hull: weaponSelections("hull").slice(),
        },
        armor: Object.fromEntries(["tail", "hull", "nose"].map(section => {
          const selection = armorSelection(section);
          return [section, {
            armorId: selection.armorId,
            points: selection.points,
          }];
        })),
        notes: String(dryMassCalcState.notes || ""),
      };
    }

    function applyDryMassCalculatorPreset(rawCalculator) {
      if (!rawCalculator || typeof rawCalculator !== "object") return false;

      if (typeof rawCalculator.classId === "string" && SHIP_CLASS_OPTIONS.some(item => item.dataName === rawCalculator.classId)) {
        dryMassCalcState.classId = rawCalculator.classId;
      }

      if (Array.isArray(rawCalculator.slotModules)) {
        dryMassCalcState.slotModules = rawCalculator.slotModules.filter(item => typeof item === "string");
      }

      if (rawCalculator.weaponModules && typeof rawCalculator.weaponModules === "object") {
        ["nose", "hull"].forEach(section => {
          const values = rawCalculator.weaponModules[section];
          if (Array.isArray(values)) {
            dryMassCalcState.weaponModules[section] = values.filter(item => typeof item === "string");
          }
        });
      }

      if (rawCalculator.armor && typeof rawCalculator.armor === "object") {
        ["tail", "hull", "nose"].forEach(section => {
          const rawSelection = rawCalculator.armor[section];
          if (!rawSelection || typeof rawSelection !== "object") return;
          const selection = armorSelection(section);
          if (typeof rawSelection.armorId === "string" && ARMOR_OPTIONS.some(item => item.dataName === rawSelection.armorId)) {
            selection.armorId = rawSelection.armorId;
          }
          if (Number.isFinite(Number(rawSelection.points))) {
            selection.points = Math.round(Number(rawSelection.points));
          }
        });
      }

      if (typeof rawCalculator.notes === "string") {
        dryMassCalcState.notes = rawCalculator.notes.slice(0, 2000);
      }

      normalizeDryMassCalcSlots();
      return true;
    }

    function dryMassCalcModuleTotals() {
      const utilityTotals = dryMassCalcState.slotModules
        .map(selectedModuleById)
        .reduce((totals, module) => {
          totals.massTons += Number(module.massTons) || 0;
          totals.crew += Number(module.crew) || 0;
          totals.powerMW += Number(module.powerRequirementMW) || 0;
          return totals;
        }, { massTons: 0, crew: 0, powerMW: 0 });
      const weaponTotals = ["nose", "hull"]
        .flatMap(section => weaponSelections(section).map(selectedWeaponById))
        .reduce((totals, module) => {
          totals.massTons += Number(module.massTons) || 0;
          totals.crew += Number(module.crew) || 0;
          return totals;
        }, { massTons: 0, crew: 0 });
      return {
        utilityMassTons: utilityTotals.massTons,
        weaponMassTons: weaponTotals.massTons,
        massTons: utilityTotals.massTons + weaponTotals.massTons,
        utilityCrew: utilityTotals.crew,
        weaponCrew: weaponTotals.crew,
        crew: utilityTotals.crew + weaponTotals.crew,
        powerMW: utilityTotals.powerMW,
      };
    }

    function dryMassCalcTotalTons() {
      const shipClass = selectedShipClass();
      if (!shipClass) return 0;
      return (Number(shipClass.massTons) || 0) + dryMassCalcModuleTotals().massTons + dryMassCalcArmorTotals(shipClass).massTons;
    }

    function renderWeaponSection(section, shipClass) {
      const capacity = hardpointCapacity(shipClass, section);
      const used = usedWeaponHardpoints(section);
      const remaining = Math.max(0, capacity - used);
      const label = section === "nose" ? localText("함수", "Nose") : localText("함체", "Hull");
      if (capacity <= 0) {
        return `
          <div class="calc-weapon-group">
            <div class="calc-group-header">
              <strong>${escapeHtml(label)}</strong>
              <span class="calc-capacity">0 HP</span>
            </div>
            <div class="calc-empty">${escapeHtml(localText("하드포인트 없음", "No hardpoints"))}</div>
          </div>
        `;
      }

      const selections = weaponSelections(section);
      const rows = selections.map((selectedId, index) => {
        const selectedWeapon = selectedWeaponById(selectedId);
        const usedWithoutCurrent = used - weaponSlotSize(selectedWeapon);
        const fitLimit = Math.max(0, capacity - usedWithoutCurrent);
        const options = weaponModulesForSection(section)
          .filter(item => item.dataName === EMPTY_WEAPON_MODULE.dataName || weaponSlotSize(item) <= fitLimit + 1e-9)
          .map(item => `<option value="${escapeHtml(item.dataName)}"${item.dataName === selectedId ? " selected" : ""}>${escapeHtml(weaponOptionLabel(item))}</option>`)
          .join("");
        return `
          <div class="calc-slot-row">
            <span>${escapeHtml(label)} ${index + 1}</span>
            <select id="dryMassCalcWeapon${section}${index}" data-weapon-section="${section}" data-weapon-index="${index}" data-searchable-select="true">${options}</select>
            <span class="calc-slot-mass">${escapeHtml(formatNumber(Number(selectedWeapon.massTons) || 0, " t"))}</span>
          </div>
        `;
      });

      if (remaining > 1e-9) {
        const options = weaponModulesForSection(section)
          .filter(item => item.dataName === EMPTY_WEAPON_MODULE.dataName || weaponSlotSize(item) <= remaining + 1e-9)
          .map(item => `<option value="${escapeHtml(item.dataName)}">${escapeHtml(item.dataName === EMPTY_WEAPON_MODULE.dataName ? localText("무장 추가", "Add weapon") : weaponOptionLabel(item))}</option>`)
          .join("");
        rows.push(`
          <div class="calc-slot-row">
            <span>${escapeHtml(localText("추가", "Add"))}</span>
            <select id="dryMassCalcWeapon${section}New" data-weapon-section="${section}" data-weapon-index="new" data-searchable-select="true">${options}</select>
            <span class="calc-slot-mass">${escapeHtml(formatHardpointSize(remaining))} HP</span>
          </div>
        `);
      }

      return `
        <div class="calc-weapon-group">
          <div class="calc-group-header">
            <strong>${escapeHtml(label)}</strong>
            <span class="calc-capacity">${escapeHtml(formatHardpointSize(used))} / ${escapeHtml(formatHardpointSize(capacity))} HP</span>
          </div>
          ${rows.join("") || `<div class="calc-empty">${escapeHtml(localText("남은 하드포인트 없음", "No remaining hardpoints"))}</div>`}
        </div>
      `;
    }

    function renderArmorRows(shipClass) {
      if (!ARMOR_OPTIONS.length) {
        return `<div class="calc-empty">${escapeHtml(localText("장갑 카탈로그 없음", "No armor catalog"))}</div>`;
      }
      const sectionLabels = {
        tail: localText("함미", "Tail"),
        hull: localText("함체", "Hull"),
        nose: localText("함수", "Nose"),
      };
      return ["tail", "hull", "nose"].map(section => {
        const selection = armorSelection(section);
        const selectedArmor = selectedArmorById(selection.armorId);
        const maxPoints = armorMaxPoints(shipClass, section, selectedArmor);
        const massTons = armorMassTons(section, shipClass);
        const options = sortedByCatalogTitle(ARMOR_OPTIONS)
          .map(item => `<option value="${escapeHtml(item.dataName)}"${item.dataName === selection.armorId ? " selected" : ""}>${escapeHtml(catalogDisplayName(item))}</option>`)
          .join("");
        return `
          <div class="calc-armor-row">
            <div class="calc-armor-title">${escapeHtml(sectionLabels[section])}</div>
            <select id="dryMassCalcArmor${section}" data-armor-section="${section}" data-armor-field="type" data-searchable-select="true">${options}</select>
            <div class="calc-armor-point-row">
              <input id="dryMassCalcArmor${section}Points" type="number" min="0" max="${escapeHtml(maxPoints)}" step="1" value="${escapeHtml(selection.points)}" data-armor-section="${section}" data-armor-field="points">
              <span class="calc-slot-mass">${escapeHtml(formatNumber(massTons, " t"))}</span>
            </div>
          </div>
        `;
      }).join("");
    }

    function searchableSelectLabel(select) {
      const selected = select && select.selectedOptions && select.selectedOptions[0];
      return selected ? selected.textContent.trim() : "";
    }

    function searchableSelectOptions(select) {
      const rows = [];
      Array.from(select.children || []).forEach(child => {
        if (child.tagName === "OPTGROUP") {
          const group = child.label || "";
          rows.push({ type: "group", label: group });
          Array.from(child.children || []).forEach(option => {
            rows.push({
              type: "option",
              value: option.value,
              label: option.textContent.trim(),
              group,
              disabled: option.disabled,
              selected: option.selected,
            });
          });
        } else if (child.tagName === "OPTION") {
          rows.push({
            type: "option",
            value: child.value,
            label: child.textContent.trim(),
            group: "",
            disabled: child.disabled,
            selected: child.selected,
          });
        }
      });
      return rows;
    }

    function closeSearchableSelect(wrapper) {
      const menu = wrapper && wrapper.querySelector(".searchable-select-menu");
      const trigger = wrapper && wrapper.querySelector(".searchable-select-trigger");
      if (menu) menu.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }

    function closeOtherSearchableSelects(activeWrapper = null) {
      document.querySelectorAll(".searchable-select").forEach(wrapper => {
        if (wrapper !== activeWrapper) closeSearchableSelect(wrapper);
      });
    }

    function renderSearchableSelectOptions(select, wrapper, query = "") {
      const list = wrapper.querySelector(".searchable-select-options");
      if (!list) return;
      const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
      const rows = searchableSelectOptions(select);
      list.innerHTML = "";
      let visibleOptions = 0;
      let currentGroupElement = null;
      let currentGroupVisible = false;
      rows.forEach(row => {
        if (row.type === "group") {
          currentGroupElement = document.createElement("div");
          currentGroupElement.className = "searchable-select-group";
          currentGroupElement.textContent = row.label;
          currentGroupElement.hidden = true;
          list.appendChild(currentGroupElement);
          currentGroupVisible = false;
          return;
        }
        const haystack = `${row.label} ${row.value} ${row.group}`.toLocaleLowerCase();
        if (normalizedQuery && !haystack.includes(normalizedQuery)) return;
        if (currentGroupElement && !currentGroupVisible) {
          currentGroupElement.hidden = false;
          currentGroupVisible = true;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = `searchable-select-option${row.selected ? " is-selected" : ""}`;
        button.dataset.value = row.value;
        button.disabled = !!row.disabled;
        button.textContent = row.label;
        button.addEventListener("click", () => {
          select.value = row.value;
          const value = wrapper.querySelector(".searchable-select-value");
          if (value) value.textContent = searchableSelectLabel(select);
          closeSearchableSelect(wrapper);
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        list.appendChild(button);
        visibleOptions += 1;
      });
      if (!visibleOptions) {
        const empty = document.createElement("div");
        empty.className = "searchable-select-empty";
        empty.textContent = localText("검색 결과 없음", "No matching results");
        list.appendChild(empty);
      }
    }

    function enhanceSearchableSelect(select) {
      if (!select || select.dataset.searchableEnhanced === "true") {
        const existingWrapper = select && select.nextElementSibling && select.nextElementSibling.classList.contains("searchable-select")
          ? select.nextElementSibling
          : null;
        if (existingWrapper) {
          const value = existingWrapper.querySelector(".searchable-select-value");
          const search = existingWrapper.querySelector(".searchable-select-search");
          if (value) value.textContent = searchableSelectLabel(select);
          if (search) search.placeholder = localText("검색...", "Search...");
          renderSearchableSelectOptions(select, existingWrapper, "");
        }
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "searchable-select";
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "searchable-select-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = `<span class="searchable-select-value"></span><span class="searchable-select-caret">▾</span>`;
      const menu = document.createElement("div");
      menu.className = "searchable-select-menu";
      menu.hidden = true;
      const search = document.createElement("input");
      search.type = "search";
      search.className = "searchable-select-search";
      search.placeholder = localText("검색...", "Search...");
      search.autocomplete = "off";
      const options = document.createElement("div");
      options.className = "searchable-select-options";
      options.setAttribute("role", "listbox");
      menu.append(search, options);
      wrapper.append(trigger, menu);
      select.classList.add("native-select-hidden");
      select.dataset.searchableEnhanced = "true";
      select.insertAdjacentElement("afterend", wrapper);

      const value = wrapper.querySelector(".searchable-select-value");
      if (value) value.textContent = searchableSelectLabel(select);
      renderSearchableSelectOptions(select, wrapper, "");

      trigger.addEventListener("click", () => {
        const open = menu.hidden;
        closeOtherSearchableSelects(wrapper);
        menu.hidden = !open;
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
          search.value = "";
          renderSearchableSelectOptions(select, wrapper, "");
          search.focus();
        }
      });
      search.addEventListener("input", () => renderSearchableSelectOptions(select, wrapper, search.value));
      search.addEventListener("keydown", event => {
        const buttons = Array.from(wrapper.querySelectorAll(".searchable-select-option:not([disabled])"));
        const currentIndex = buttons.indexOf(document.activeElement);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          (buttons[currentIndex + 1] || buttons[0] || search).focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          (buttons[currentIndex - 1] || buttons[buttons.length - 1] || search).focus();
        } else if (event.key === "Escape") {
          closeSearchableSelect(wrapper);
          trigger.focus();
        }
      });
      options.addEventListener("keydown", event => {
        const buttons = Array.from(wrapper.querySelectorAll(".searchable-select-option:not([disabled])"));
        const currentIndex = buttons.indexOf(document.activeElement);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          (buttons[currentIndex + 1] || buttons[0] || search).focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          (buttons[currentIndex - 1] || search).focus();
        } else if (event.key === "Escape") {
          closeSearchableSelect(wrapper);
          trigger.focus();
        }
      });
    }

    function enhanceSearchableSelects(root = document) {
      root.querySelectorAll("select[data-searchable-select]").forEach(select => enhanceSearchableSelect(select));
      if (!document.body.dataset.searchableSelectGlobalHandlers) {
        document.body.dataset.searchableSelectGlobalHandlers = "true";
        document.addEventListener("click", event => {
          if (!event.target.closest(".searchable-select")) closeOtherSearchableSelects();
        });
      }
    }

    function renderDryMassCalcModal() {
      const classSelect = document.getElementById("dryMassCalcClass");
      const info = document.getElementById("dryMassCalcInfo");
      const slots = document.getElementById("dryMassCalcSlots");
      const weapons = document.getElementById("dryMassCalcWeapons");
      const armor = document.getElementById("dryMassCalcArmor");
      const total = document.getElementById("dryMassCalcTotal");
      const breakdown = document.getElementById("dryMassCalcBreakdown");
      const title = document.getElementById("dryMassCalcTitle");
      const close = document.getElementById("dryMassCalcClose");
      const apply = document.getElementById("dryMassCalcApply");
      const reset = document.getElementById("dryMassCalcReset");
      const classLabel = document.getElementById("dryMassCalcClassLabel");
      const slotsLabel = document.getElementById("dryMassCalcSlotsLabel");
      const weaponsLabel = document.getElementById("dryMassCalcWeaponsLabel");
      const armorLabel = document.getElementById("dryMassCalcArmorLabel");
      const notesLabel = document.getElementById("dryMassCalcNotesLabel");
      const notes = document.getElementById("dryMassCalcNotes");
      const button = document.getElementById("dryMassCalcButton");

      if (button) {
        button.setAttribute("aria-label", localText("건조질량 계산기", "Dry-mass calculator"));
        button.title = localText("건조질량 계산기", "Dry-mass calculator");
      }
      if (title) title.textContent = localText("건조질량 계산기", "Dry-mass calculator");
      if (close) close.textContent = localText("닫기", "Close");
      if (apply) apply.textContent = localText("건조질량에 적용", "Apply to dry mass");
      if (reset) reset.textContent = localText("초기화", "Reset");
      if (classLabel) classLabel.textContent = localText("함급", "Hull Class");
      if (slotsLabel) slotsLabel.textContent = localText("내부 유틸리티 모듈", "Internal utility modules");
      if (weaponsLabel) weaponsLabel.textContent = localText("무장 하드포인트", "Weapon hardpoints");
      if (armorLabel) armorLabel.textContent = localText("장갑", "Armor");
      if (notesLabel) notesLabel.textContent = localText("메모", "Notes");
      if (notes) {
        notes.placeholder = localText("선박 설계 가정 메모", "Ship design assumption notes");
        if (notes.value !== String(dryMassCalcState.notes || "")) notes.value = String(dryMassCalcState.notes || "");
      }
      setPresetUiText();
      renderDryMassPresetControls();

      if (!classSelect || !info || !slots || !weapons || !armor || !total) return;

      classSelect.innerHTML = groupedShipClassOptionsHtml();
      if (!SHIP_CLASS_OPTIONS.length) {
        info.innerHTML = `<span>${escapeHtml(localText("함급 카탈로그 없음", "No hull catalog"))}</span><strong>-</strong>`;
        slots.innerHTML = "";
        weapons.innerHTML = "";
        armor.innerHTML = "";
        total.textContent = `${localText("예상 건조질량", "Estimated dry mass")}: -`;
        if (breakdown) breakdown.innerHTML = "";
        return;
      }
      if (!SHIP_CLASS_OPTIONS.some(item => item.dataName === dryMassCalcState.classId)) {
        dryMassCalcState.classId = SHIP_CLASS_OPTIONS[0].dataName;
      }
      classSelect.value = dryMassCalcState.classId;

      const shipClass = selectedShipClass();
      normalizeDryMassCalcSlots();
      const moduleOptions = utilityModulesForShipClass(shipClass);
      const moduleTotals = dryMassCalcModuleTotals();
      const armorTotals = dryMassCalcArmorTotals(shipClass);
      const hullMass = Number(shipClass.massTons) || 0;
      info.innerHTML = [
        [localText("선체 기본 질량", "Hull mass"), formatNumber(hullMass, " t")],
        shipyardBuildTimeRow(shipClass),
        [localText("Structural Integrity", "Structural Integrity"), formatCompact(Number(shipClass.structuralIntegrity) || 0, 1_000)],
        [localText("함수 하드포인트", "Nose hardpoints"), formatHardpointSize(hardpointCapacity(shipClass, "nose"))],
        [localText("함체 하드포인트", "Hull hardpoints"), formatHardpointSize(hardpointCapacity(shipClass, "hull"))],
        [localText("유틸리티 슬롯", "Utility slots"), String(dryMassCalcState.slotModules.length)],
        [localText("승무원", "Crew"), formatCompact(Number(shipClass.crew) || 0, 1_000)],
        [localText("최대 장교 수", "Max officers"), String(Number(shipClass.maxOfficers) || 0)],
        [localText("요구 프로젝트", "Required project"), shipClass.requiredProject || "-"],
      ].map(([label, value]) => `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`).join("");

      weapons.innerHTML = [
        renderWeaponSection("nose", shipClass),
        renderWeaponSection("hull", shipClass),
      ].join("");

      armor.innerHTML = renderArmorRows(shipClass);

      if (!dryMassCalcState.slotModules.length) {
        slots.innerHTML = `<div class="calc-empty">${escapeHtml(localText("선택 가능한 내부 슬롯 없음", "No internal slots"))}</div>`;
      } else {
        slots.innerHTML = dryMassCalcState.slotModules.map((selectedId, index) => {
          const selectedModule = selectedModuleById(selectedId);
          const options = moduleOptions
            .map(item => {
              const label = `${catalogDisplayName(item)} (${formatNumber(Number(item.massTons) || 0, " t")})`;
              return `<option value="${escapeHtml(item.dataName)}"${item.dataName === selectedId ? " selected" : ""}>${escapeHtml(label)}</option>`;
            })
            .join("");
          return `
            <div class="calc-slot-row">
              <span>${escapeHtml(localText("슬롯", "Slot"))} ${index + 1}</span>
              <select id="dryMassCalcSlot${index}" data-slot-index="${index}" data-searchable-select="true">${options}</select>
              <span class="calc-slot-mass">${escapeHtml(formatNumber(Number(selectedModule.massTons) || 0, " t"))}</span>
            </div>
          `;
        }).join("");
      }
      total.textContent = `${localText("예상 건조질량", "Estimated dry mass")}: ${formatNumber(dryMassCalcTotalTons(), " t")}`;
      if (breakdown) {
        breakdown.innerHTML = [
          `${localText("선체", "Hull")} ${formatNumber(hullMass, " t")}`,
          `${localText("장갑", "Armor")} ${formatNumber(armorTotals.massTons, " t")}`,
          `${localText("무장", "Weapons")} ${formatNumber(moduleTotals.weaponMassTons, " t")}`,
          `${localText("유틸리티", "Utility")} ${formatNumber(moduleTotals.utilityMassTons, " t")}`,
          `${localText("추가 승무원", "Extra crew")} ${formatCompact(moduleTotals.crew, 1_000)}`,
          `${localText("모듈 전력", "Module power")} ${formatNumber(moduleTotals.powerMW, " MW")}`,
        ].map(item => `<span>${escapeHtml(item)}</span>`).join("");
      }
      enhanceSearchableSelects(document.getElementById("dryMassCalcModal"));
    }

    function setupDryMassCalculator() {
      const modal = document.getElementById("dryMassCalcModal");
      const button = document.getElementById("dryMassCalcButton");
      const classSelect = document.getElementById("dryMassCalcClass");
      const slots = document.getElementById("dryMassCalcSlots");
      const weapons = document.getElementById("dryMassCalcWeapons");
      const armor = document.getElementById("dryMassCalcArmor");
      const close = document.getElementById("dryMassCalcClose");
      const apply = document.getElementById("dryMassCalcApply");
      const reset = document.getElementById("dryMassCalcReset");
      const dryMass = document.getElementById("dryMass");
      const dryMassNumber = document.getElementById("dryMassNumber");
      const notes = document.getElementById("dryMassCalcNotes");
      if (!modal || !button || !classSelect || !slots || !weapons || !armor || !close || !apply || !reset || !dryMass || !dryMassNumber || !notes) return;

      const openModal = () => {
        renderDryMassCalcModal();
        modal.classList.add("is-open");
        const firstSearchableTrigger = modal.querySelector(".searchable-select-trigger");
        (firstSearchableTrigger || classSelect).focus();
      };
      const closeModal = () => {
        modal.classList.remove("is-open");
      };

      button.addEventListener("click", openModal);
      close.addEventListener("click", closeModal);
      reset.addEventListener("click", () => {
        resetDryMassCalcState();
        renderDryMassCalcModal();
      });
      notes.addEventListener("input", () => {
        dryMassCalcState.notes = notes.value.slice(0, 2000);
      });
      modal.addEventListener("click", event => {
        if (event.target === modal) closeModal();
      });
      modal.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
      });
      classSelect.addEventListener("change", () => {
        dryMassCalcState.classId = classSelect.value;
        normalizeDryMassCalcSlots();
        renderDryMassCalcModal();
      });
      slots.addEventListener("change", event => {
        const select = event.target.closest("select[data-slot-index]");
        if (!select) return;
        const index = Number(select.dataset.slotIndex);
        if (!Number.isFinite(index) || index < 0) return;
        dryMassCalcState.slotModules[index] = select.value;
        renderDryMassCalcModal();
      });
      weapons.addEventListener("change", event => {
        const select = event.target.closest("select[data-weapon-section]");
        if (!select) return;
        const section = select.dataset.weaponSection;
        if (section !== "nose" && section !== "hull") return;
        const value = select.value;
        const selections = weaponSelections(section);
        if (select.dataset.weaponIndex === "new") {
          if (value !== EMPTY_WEAPON_MODULE.dataName) selections.push(value);
        } else {
          const index = Number(select.dataset.weaponIndex);
          if (!Number.isFinite(index) || index < 0) return;
          if (value === EMPTY_WEAPON_MODULE.dataName) {
            selections.splice(index, 1);
          } else {
            selections[index] = value;
          }
        }
        normalizeDryMassCalcWeapons();
        renderDryMassCalcModal();
      });
      armor.addEventListener("change", event => {
        const control = event.target.closest("[data-armor-section]");
        if (!control) return;
        const section = control.dataset.armorSection;
        if (!["tail", "hull", "nose"].includes(section)) return;
        const selection = armorSelection(section);
        if (control.dataset.armorField === "type") {
          selection.armorId = control.value;
        } else if (control.dataset.armorField === "points") {
          selection.points = Math.round(Number(control.value) || 0);
        }
        normalizeDryMassCalcArmor();
        renderDryMassCalcModal();
      });
      apply.addEventListener("click", () => {
        const value = clamp(dryMassCalcTotalTons(), 0, 1000000);
        state.dryMassTons = value;
        dryMass.value = String(clamp(value, Number(dryMass.min), Number(dryMass.max)));
        dryMassNumber.value = String(Math.round(value));
        closeModal();
        render();
      });

      normalizeDryMassCalcSlots();
      setupDryMassPresetControls();
      renderDryMassCalcModal();
    }

    function localLabel(item) {
      if (UI_LANG === "en") return item.labelEn || item.label || item.key;
      return item.label || item.labelEn || item.key;
    }

    function localCategoryHelp(category) {
      if (UI_LANG === "en") return category.helpEn || category.help || "";
      return category.help || category.helpEn || "";
    }

    function helpText(key) {
      const item = HELP_TEXT[key] || {};
      return UI_LANG === "en" ? (item.en || item.ko || "") : (item.ko || item.en || "");
    }

    function applyHelp(element, text) {
      if (!element || !text) return;
      element.dataset.help = text;
      element.title = text;
    }

    function cloneJson(value) {
      const text = JSON.stringify(value);
      return text ? JSON.parse(text) : null;
    }

    function storageReadJson(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function storageWriteJson(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    function uniquePresetId(prefix) {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return `${prefix}-${window.crypto.randomUUID()}`;
      }
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function sanitizePresetName(value, fallback = "Preset") {
      const name = String(value || "").trim();
      return name || fallback;
    }

    function uniquePresetName(baseName, library, ignoreId = "") {
      const base = sanitizePresetName(baseName, "Preset");
      let candidate = base;
      let suffix = 2;
      while (library.some(item => item.id !== ignoreId && item.name === candidate)) {
        candidate = `${base} (${suffix})`;
        suffix += 1;
      }
      return candidate;
    }

    function presetTimestamp() {
      return new Date().toISOString();
    }

    function normalizeChartPresetEntry(rawEntry, fallbackName = "Chart preset") {
      if (!rawEntry || typeof rawEntry !== "object") return null;
      const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
      const settings = source.settings && typeof source.settings === "object" ? source.settings : source;
      if (!settings || typeof settings !== "object") return null;
      const now = presetTimestamp();
      return {
        id: typeof source.id === "string" && source.id.trim() ? source.id : uniquePresetId("chart"),
        name: sanitizePresetName(source.name, fallbackName),
        settings: cloneJson(settings),
        createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
      };
    }

    function normalizeDryMassPresetEntry(rawEntry, fallbackName = "Dry-mass preset") {
      if (!rawEntry || typeof rawEntry !== "object") return null;
      const source = rawEntry.preset && typeof rawEntry.preset === "object" ? rawEntry.preset : rawEntry;
      const calculator = source.calculator && typeof source.calculator === "object"
        ? source.calculator
        : source.settings && typeof source.settings === "object"
          ? source.settings
          : source.dryMassCalculator && typeof source.dryMassCalculator === "object"
            ? source.dryMassCalculator
            : source.dryMassCalc && typeof source.dryMassCalc === "object"
              ? source.dryMassCalc
              : source;
      if (!calculator || typeof calculator !== "object") return null;
      const now = presetTimestamp();
      return {
        id: typeof source.id === "string" && source.id.trim() ? source.id : uniquePresetId("drymass"),
        name: sanitizePresetName(source.name, fallbackName),
        calculator: cloneJson(calculator),
        createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
      };
    }

    function dedupePresetEntries(entries) {
      const seen = new Set();
      return entries.filter(entry => {
        if (!entry || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      });
    }

    function loadChartPresetLibrary() {
      const raw = storageReadJson(CHART_PRESET_STORAGE_KEY);
      const presets = Array.isArray(raw) ? raw : (Array.isArray(raw?.presets) ? raw.presets : []);
      return dedupePresetEntries(presets.map(item => normalizeChartPresetEntry(item)).filter(Boolean));
    }

    function loadDryMassPresetLibrary() {
      const raw = storageReadJson(DRY_MASS_PRESET_STORAGE_KEY);
      const presets = Array.isArray(raw) ? raw : (Array.isArray(raw?.presets) ? raw.presets : []);
      return dedupePresetEntries(presets.map(item => normalizeDryMassPresetEntry(item)).filter(Boolean));
    }

    function loadStartupChartPresetId() {
      try {
        return localStorage.getItem(CHART_PRESET_STARTUP_STORAGE_KEY) || "";
      } catch {
        return "";
      }
    }

    function saveChartPresetLibrary() {
      return storageWriteJson(CHART_PRESET_STORAGE_KEY, {
        format: "ti-engine-chart-preset-library/v1",
        presets: chartPresetLibrary,
      });
    }

    function saveDryMassPresetLibrary() {
      return storageWriteJson(DRY_MASS_PRESET_STORAGE_KEY, {
        format: "ti-engine-chart-dry-mass-preset-library/v1",
        presets: dryMassPresetLibrary,
      });
    }

    function chartPresetExportObject(entry) {
      return {
        format: "ti-engine-chart-named-preset/v1",
        id: entry.id,
        name: entry.name,
        settings: cloneJson(entry.settings),
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }

    function chartPresetLibraryExportObject() {
      return {
        format: "ti-engine-chart-preset-library/v1",
        presets: chartPresetLibrary.map(chartPresetExportObject),
        startupPresetId: startupChartPresetId || null,
      };
    }

    function dryMassPresetExportObject(entry) {
      return {
        format: "ti-engine-chart-dry-mass-preset/v1",
        id: entry.id,
        name: entry.name,
        calculator: cloneJson(entry.calculator),
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }

    function dryMassPresetLibraryExportObject() {
      return {
        format: "ti-engine-chart-dry-mass-preset-library/v1",
        presets: dryMassPresetLibrary.map(dryMassPresetExportObject),
      };
    }

    function setStartupChartPreset(id) {
      startupChartPresetId = id || "";
      try {
        if (startupChartPresetId) {
          localStorage.setItem(CHART_PRESET_STARTUP_STORAGE_KEY, startupChartPresetId);
        } else {
          localStorage.removeItem(CHART_PRESET_STARTUP_STORAGE_KEY);
        }
        return true;
      } catch {
        return false;
      }
    }

    function selectedChartPresetEntry() {
      const select = document.getElementById("chartPresetSelect");
      return chartPresetLibrary.find(item => item.id === (select && select.value)) || null;
    }

    function selectedDryMassPresetEntry() {
      const select = document.getElementById("dryMassPresetSelect");
      return dryMassPresetLibrary.find(item => item.id === (select && select.value)) || null;
    }

    function applyStartupChartPreset() {
      if (!startupChartPresetId) return false;
      const entry = chartPresetLibrary.find(item => item.id === startupChartPresetId);
      if (!entry) {
        setStartupChartPreset("");
        return false;
      }
      return applyPresetToState(entry.settings);
    }

    function setDisabled(id, disabled) {
      const button = document.getElementById(id);
      if (button) button.disabled = !!disabled;
    }

    function renderChartPresetControls(preferredId = "") {
      const select = document.getElementById("chartPresetSelect");
      if (!select) return;
      const selectedId = preferredId || select.value;
      const hasPresets = chartPresetLibrary.length > 0;
      if (startupChartPresetId && !chartPresetLibrary.some(item => item.id === startupChartPresetId)) {
        setStartupChartPreset("");
      }
      select.innerHTML = "";
      if (!hasPresets) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = localText("저장된 차트 프리셋 없음", "No saved chart presets");
        select.appendChild(option);
      } else {
        chartPresetLibrary.forEach(entry => {
          const option = document.createElement("option");
          option.value = entry.id;
          option.textContent = entry.id === startupChartPresetId
            ? `${entry.name} ${localText("(시작)", "(startup)")}`
            : entry.name;
          select.appendChild(option);
        });
        select.value = chartPresetLibrary.some(item => item.id === selectedId)
          ? selectedId
          : chartPresetLibrary[0].id;
      }
      select.disabled = !hasPresets;
      [
        "chartPresetLoad",
        "chartPresetRename",
        "chartPresetDuplicate",
        "chartPresetDelete",
        "chartPresetSetStartup",
        "chartPresetExportSelected",
      ].forEach(id => setDisabled(id, !hasPresets));
      setDisabled("chartPresetClearStartup", !startupChartPresetId);
      setDisabled("chartPresetExportAll", !hasPresets);
    }

    function renderDryMassPresetControls(preferredId = "") {
      const select = document.getElementById("dryMassPresetSelect");
      if (!select) return;
      const selectedId = preferredId || select.value;
      const hasPresets = dryMassPresetLibrary.length > 0;
      select.innerHTML = "";
      if (!hasPresets) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = localText("저장된 건조질량 프리셋 없음", "No saved dry-mass presets");
        select.appendChild(option);
      } else {
        dryMassPresetLibrary.forEach(entry => {
          const option = document.createElement("option");
          option.value = entry.id;
          option.textContent = entry.name;
          select.appendChild(option);
        });
        select.value = dryMassPresetLibrary.some(item => item.id === selectedId)
          ? selectedId
          : dryMassPresetLibrary[0].id;
      }
      select.disabled = !hasPresets;
      [
        "dryMassPresetLoad",
        "dryMassPresetRename",
        "dryMassPresetDuplicate",
        "dryMassPresetDelete",
        "dryMassPresetExportSelected",
      ].forEach(id => setDisabled(id, !hasPresets));
      setDisabled("dryMassPresetExportAll", !hasPresets);
    }

    function renderPresetLibraryControls() {
      renderChartPresetControls();
      renderDryMassPresetControls();
    }

    function promptPresetName(message, defaultName, statusFn) {
      const name = window.prompt(message, defaultName || "");
      if (name === null) return null;
      const clean = sanitizePresetName(name, "");
      if (!clean) {
        statusFn(localText("프리셋 이름이 필요합니다.", "Preset name is required."), true);
        return null;
      }
      return clean;
    }

    function saveChartPresetFromSettings(name, settings, existingId = "") {
      const now = presetTimestamp();
      const existing = chartPresetLibrary.find(item => item.id === existingId);
      const entry = {
        id: existing ? existing.id : uniquePresetId("chart"),
        name: uniquePresetName(name, chartPresetLibrary, existing ? existing.id : ""),
        settings: cloneJson(settings),
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };
      if (existing) {
        chartPresetLibrary = chartPresetLibrary.map(item => item.id === existing.id ? entry : item);
      } else {
        chartPresetLibrary = [...chartPresetLibrary, entry];
      }
      if (!saveChartPresetLibrary()) return null;
      renderChartPresetControls(entry.id);
      return entry;
    }

    function saveDryMassPresetFromCalculator(name, calculator, existingId = "") {
      const now = presetTimestamp();
      const existing = dryMassPresetLibrary.find(item => item.id === existingId);
      const entry = {
        id: existing ? existing.id : uniquePresetId("drymass"),
        name: uniquePresetName(name, dryMassPresetLibrary, existing ? existing.id : ""),
        calculator: cloneJson(calculator),
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };
      if (existing) {
        dryMassPresetLibrary = dryMassPresetLibrary.map(item => item.id === existing.id ? entry : item);
      } else {
        dryMassPresetLibrary = [...dryMassPresetLibrary, entry];
      }
      if (!saveDryMassPresetLibrary()) return null;
      renderDryMassPresetControls(entry.id);
      return entry;
    }

    function mergeChartPresetEntries(entries) {
      let changed = 0;
      entries.map((entry, index) => normalizeChartPresetEntry(entry, `Imported chart preset ${index + 1}`))
        .filter(Boolean)
        .forEach(entry => {
          const idIndex = chartPresetLibrary.findIndex(item => item.id === entry.id);
          if (idIndex >= 0) {
            chartPresetLibrary[idIndex] = { ...entry, name: uniquePresetName(entry.name, chartPresetLibrary, entry.id) };
          } else {
            chartPresetLibrary.push({ ...entry, name: uniquePresetName(entry.name, chartPresetLibrary) });
          }
          changed += 1;
        });
      if (!changed) return 0;
      saveChartPresetLibrary();
      renderChartPresetControls();
      return changed;
    }

    function mergeDryMassPresetEntries(entries) {
      let changed = 0;
      entries.map((entry, index) => normalizeDryMassPresetEntry(entry, `Imported dry-mass preset ${index + 1}`))
        .filter(Boolean)
        .forEach(entry => {
          const idIndex = dryMassPresetLibrary.findIndex(item => item.id === entry.id);
          if (idIndex >= 0) {
            dryMassPresetLibrary[idIndex] = { ...entry, name: uniquePresetName(entry.name, dryMassPresetLibrary, entry.id) };
          } else {
            dryMassPresetLibrary.push({ ...entry, name: uniquePresetName(entry.name, dryMassPresetLibrary) });
          }
          changed += 1;
        });
      if (!changed) return 0;
      saveDryMassPresetLibrary();
      renderDryMassPresetControls();
      return changed;
    }

    function extractChartSettingsFromImport(raw) {
      if (!raw || typeof raw !== "object") return null;
      if (raw.format === "ti-engine-chart-named-preset/v1" && raw.settings && typeof raw.settings === "object") {
        return raw.settings;
      }
      if (raw.settings && typeof raw.settings === "object") {
        return raw.settings;
      }
      const hasChartField = [
        "metric",
        "thrusters",
        "dryMassTons",
        "targetDvKps",
        "radiatorId",
        "categories",
        "families",
        "dryMassCalculator",
        "dryMassCalc",
      ].some(key => Object.prototype.hasOwnProperty.call(raw, key));
      return hasChartField ? raw : null;
    }

    function extractDryMassCalculatorFromImport(raw) {
      if (!raw || typeof raw !== "object") return null;
      if (raw.format === "ti-engine-chart-dry-mass-preset/v1" && raw.calculator && typeof raw.calculator === "object") {
        return raw.calculator;
      }
      const calculator = raw.calculator || raw.dryMassCalculator || raw.dryMassCalc;
      if (calculator && typeof calculator === "object") return calculator;
      const hasCalculatorField = ["classId", "slotModules", "weaponModules", "armor", "notes"]
        .some(key => Object.prototype.hasOwnProperty.call(raw, key));
      return hasCalculatorField ? raw : null;
    }

    async function handleImportedPresetObject(raw, { preferredKind = "chart", promptToSaveCurrent = true } = {}) {
      if (!raw || typeof raw !== "object") {
        return { ok: false, message: localText("설정 형식을 인식하지 못했습니다.", "Unrecognized preset format.") };
      }

      if (raw.format === "ti-engine-chart-preset-library/v1" && Array.isArray(raw.presets)) {
        const count = mergeChartPresetEntries(raw.presets);
        if (typeof raw.startupPresetId === "string" && chartPresetLibrary.some(item => item.id === raw.startupPresetId)) {
          setStartupChartPreset(raw.startupPresetId);
          renderChartPresetControls(raw.startupPresetId);
        }
        return { ok: count > 0, message: count > 0
          ? localText(`차트 프리셋 ${count}개를 가져왔습니다.`, `Imported ${count} chart presets.`)
          : localText("가져올 차트 프리셋이 없습니다.", "No chart presets to import.") };
      }

      if (raw.format === "ti-engine-chart-dry-mass-preset-library/v1" && Array.isArray(raw.presets)) {
        const count = mergeDryMassPresetEntries(raw.presets);
        return { ok: count > 0, message: count > 0
          ? localText(`건조질량 프리셋 ${count}개를 가져왔습니다.`, `Imported ${count} dry-mass presets.`)
          : localText("가져올 건조질량 프리셋이 없습니다.", "No dry-mass presets to import.") };
      }

      if (raw.format === "ti-engine-chart-named-preset/v1") {
        const entry = normalizeChartPresetEntry(raw, raw.name || "Imported chart preset");
        const count = entry ? mergeChartPresetEntries([entry]) : 0;
        return { ok: count > 0, message: count > 0
          ? localText("차트 프리셋을 라이브러리에 추가했습니다.", "Chart preset added to the library.")
          : localText("차트 프리셋을 가져오지 못했습니다.", "Failed to import chart preset.") };
      }

      if (raw.format === "ti-engine-chart-dry-mass-preset/v1") {
        const entry = normalizeDryMassPresetEntry(raw, raw.name || "Imported dry-mass preset");
        const count = entry ? mergeDryMassPresetEntries([entry]) : 0;
        return { ok: count > 0, message: count > 0
          ? localText("건조질량 프리셋을 라이브러리에 추가했습니다.", "Dry-mass preset added to the library.")
          : localText("건조질량 프리셋을 가져오지 못했습니다.", "Failed to import dry-mass preset.") };
      }

      if (preferredKind === "dryMass") {
        const calculator = extractDryMassCalculatorFromImport(raw);
        if (calculator && applyDryMassCalculatorPreset(calculator)) {
          renderDryMassCalcModal();
          if (promptToSaveCurrent && window.confirm(localText("가져온 계산기 설정을 이름 있는 프리셋으로 저장할까요?", "Save imported calculator settings as a named preset?"))) {
            const name = promptPresetName(
              localText("건조질량 프리셋 이름", "Dry-mass preset name"),
              raw.name || localText("가져온 건조질량 프리셋", "Imported dry-mass preset"),
              showDryMassPresetStatus,
            );
            if (name) saveDryMassPresetFromCalculator(name, exportedDryMassCalculatorPreset());
          }
          return { ok: true, message: localText("건조질량 설정을 불러왔습니다.", "Dry-mass settings imported.") };
        }
      }

      const chartSettings = extractChartSettingsFromImport(raw);
      if (chartSettings && applyPresetToState(chartSettings)) {
        syncUiFromState();
        if (promptToSaveCurrent && window.confirm(localText("가져온 설정을 이름 있는 차트 프리셋으로 저장할까요?", "Save imported settings as a named chart preset?"))) {
          const name = promptPresetName(
            localText("차트 프리셋 이름", "Chart preset name"),
            raw.name || localText("가져온 차트 프리셋", "Imported chart preset"),
            showPresetStatus,
          );
          if (name) saveChartPresetFromSettings(name, exportedPreset());
        }
        return { ok: true, message: localText("설정을 불러왔습니다.", "Preset imported.") };
      }

      const calculator = extractDryMassCalculatorFromImport(raw);
      if (calculator && applyDryMassCalculatorPreset(calculator)) {
        renderDryMassCalcModal();
        return { ok: true, message: localText("건조질량 설정을 불러왔습니다.", "Dry-mass settings imported.") };
      }

      return { ok: false, message: localText("설정 형식을 인식하지 못했습니다.", "Unrecognized preset format.") };
    }

    async function serializePayloadObject(object) {
      const jsonText = JSON.stringify(object);
      const sourceBytes = new TextEncoder().encode(jsonText);
      const gzipped = await gzipBytes(sourceBytes);
      if (gzipped) return `ticp1:${bytesToBase64(gzipped)}`;
      return `tijp1:${bytesToBase64(sourceBytes)}`;
    }

    async function copySerializedObject(object, successText, failureText, statusFn = showPresetStatus) {
      try {
        const payload = await serializePayloadObject(object);
        const copied = await copyToClipboard(payload);
        statusFn(copied ? successText : failureText, !copied);
      } catch {
        statusFn(failureText, true);
      }
    }

    function setupPresetLibraryControls() {
      renderChartPresetControls();
      document.getElementById("chartPresetSave")?.addEventListener("click", () => {
        const name = promptPresetName(
          localText("차트 프리셋 이름", "Chart preset name"),
          "",
          showPresetStatus,
        );
        if (!name) return;
        const saved = saveChartPresetFromSettings(name, exportedPreset());
        showPresetStatus(saved
          ? localText("차트 프리셋을 저장했습니다.", "Chart preset saved.")
          : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("chartPresetLoad")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        if (!entry) return showPresetStatus(localText("불러올 차트 프리셋이 없습니다.", "No chart preset selected."), true);
        if (!applyPresetToState(entry.settings)) return showPresetStatus(localText("프리셋을 적용하지 못했습니다.", "Failed to apply preset."), true);
        syncUiFromState();
        showPresetStatus(localText("차트 프리셋을 불러왔습니다.", "Chart preset loaded."));
      });
      document.getElementById("chartPresetRename")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        if (!entry) return;
        const name = promptPresetName(localText("새 차트 프리셋 이름", "New chart preset name"), entry.name, showPresetStatus);
        if (!name) return;
        entry.name = uniquePresetName(name, chartPresetLibrary, entry.id);
        entry.updatedAt = presetTimestamp();
        const saved = saveChartPresetLibrary();
        renderChartPresetControls(entry.id);
        showPresetStatus(saved ? localText("프리셋 이름을 변경했습니다.", "Preset renamed.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("chartPresetDuplicate")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        if (!entry) return;
        const name = promptPresetName(localText("복제할 차트 프리셋 이름", "Duplicate chart preset name"), `${entry.name} copy`, showPresetStatus);
        if (!name) return;
        const saved = saveChartPresetFromSettings(name, entry.settings);
        showPresetStatus(saved ? localText("차트 프리셋을 복제했습니다.", "Chart preset duplicated.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("chartPresetDelete")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        if (!entry || !window.confirm(localText("선택한 차트 프리셋을 삭제할까요?", "Delete the selected chart preset?"))) return;
        chartPresetLibrary = chartPresetLibrary.filter(item => item.id !== entry.id);
        if (startupChartPresetId === entry.id) setStartupChartPreset("");
        const saved = saveChartPresetLibrary();
        renderChartPresetControls();
        showPresetStatus(saved ? localText("차트 프리셋을 삭제했습니다.", "Chart preset deleted.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("chartPresetSetStartup")?.addEventListener("click", () => {
        const entry = selectedChartPresetEntry();
        if (!entry) return;
        const saved = setStartupChartPreset(entry.id);
        renderChartPresetControls(entry.id);
        showPresetStatus(saved ? localText("시작 프리셋을 설정했습니다.", "Startup preset set.") : localText("시작 프리셋 저장에 실패했습니다.", "Failed to save startup preset."), !saved);
      });
      document.getElementById("chartPresetClearStartup")?.addEventListener("click", () => {
        const saved = setStartupChartPreset("");
        renderChartPresetControls();
        showPresetStatus(saved ? localText("시작 프리셋을 해제했습니다.", "Startup preset cleared.") : localText("시작 프리셋 저장에 실패했습니다.", "Failed to save startup preset."), !saved);
      });
      document.getElementById("chartPresetReset")?.addEventListener("click", () => {
        resetChartStateToDefaults();
        syncUiFromState();
        showPresetStatus(localText("기본 설정으로 되돌렸습니다.", "Default settings restored."));
      });
      document.getElementById("chartPresetExportSelected")?.addEventListener("click", async () => {
        const entry = selectedChartPresetEntry();
        if (!entry) return showPresetStatus(localText("내보낼 차트 프리셋이 없습니다.", "No chart preset selected."), true);
        await copySerializedObject(
          chartPresetExportObject(entry),
          localText("선택한 차트 프리셋을 클립보드에 복사했습니다.", "Selected chart preset copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
        );
      });
      document.getElementById("chartPresetExportAll")?.addEventListener("click", async () => {
        if (!chartPresetLibrary.length) return showPresetStatus(localText("내보낼 차트 프리셋이 없습니다.", "No chart presets to export."), true);
        await copySerializedObject(
          chartPresetLibraryExportObject(),
          localText("차트 프리셋 라이브러리를 클립보드에 복사했습니다.", "Chart preset library copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
        );
      });
    }

    function setupDryMassPresetControls() {
      renderDryMassPresetControls();
      document.getElementById("dryMassPresetSave")?.addEventListener("click", () => {
        const name = promptPresetName(
          localText("건조질량 프리셋 이름", "Dry-mass preset name"),
          "",
          showDryMassPresetStatus,
        );
        if (!name) return;
        const saved = saveDryMassPresetFromCalculator(name, exportedDryMassCalculatorPreset());
        showDryMassPresetStatus(saved
          ? localText("건조질량 프리셋을 저장했습니다.", "Dry-mass preset saved.")
          : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("dryMassPresetLoad")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        if (!entry) return showDryMassPresetStatus(localText("불러올 건조질량 프리셋이 없습니다.", "No dry-mass preset selected."), true);
        if (!applyDryMassCalculatorPreset(entry.calculator)) return showDryMassPresetStatus(localText("프리셋을 적용하지 못했습니다.", "Failed to apply preset."), true);
        renderDryMassCalcModal();
        showDryMassPresetStatus(localText("건조질량 프리셋을 불러왔습니다. 건조질량에 적용 버튼으로 차트에 반영하세요.", "Dry-mass preset loaded. Use Apply to dry mass to update the chart."));
      });
      document.getElementById("dryMassPresetRename")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        if (!entry) return;
        const name = promptPresetName(localText("새 건조질량 프리셋 이름", "New dry-mass preset name"), entry.name, showDryMassPresetStatus);
        if (!name) return;
        entry.name = uniquePresetName(name, dryMassPresetLibrary, entry.id);
        entry.updatedAt = presetTimestamp();
        const saved = saveDryMassPresetLibrary();
        renderDryMassPresetControls(entry.id);
        showDryMassPresetStatus(saved ? localText("프리셋 이름을 변경했습니다.", "Preset renamed.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("dryMassPresetDuplicate")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        if (!entry) return;
        const name = promptPresetName(localText("복제할 건조질량 프리셋 이름", "Duplicate dry-mass preset name"), `${entry.name} copy`, showDryMassPresetStatus);
        if (!name) return;
        const saved = saveDryMassPresetFromCalculator(name, entry.calculator);
        showDryMassPresetStatus(saved ? localText("건조질량 프리셋을 복제했습니다.", "Dry-mass preset duplicated.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("dryMassPresetDelete")?.addEventListener("click", () => {
        const entry = selectedDryMassPresetEntry();
        if (!entry || !window.confirm(localText("선택한 건조질량 프리셋을 삭제할까요?", "Delete the selected dry-mass preset?"))) return;
        dryMassPresetLibrary = dryMassPresetLibrary.filter(item => item.id !== entry.id);
        const saved = saveDryMassPresetLibrary();
        renderDryMassPresetControls();
        showDryMassPresetStatus(saved ? localText("건조질량 프리셋을 삭제했습니다.", "Dry-mass preset deleted.") : localText("프리셋 저장에 실패했습니다.", "Failed to save preset."), !saved);
      });
      document.getElementById("dryMassPresetExportSelected")?.addEventListener("click", async () => {
        const entry = selectedDryMassPresetEntry();
        if (!entry) return showDryMassPresetStatus(localText("내보낼 건조질량 프리셋이 없습니다.", "No dry-mass preset selected."), true);
        await copySerializedObject(
          dryMassPresetExportObject(entry),
          localText("선택한 건조질량 프리셋을 클립보드에 복사했습니다.", "Selected dry-mass preset copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
          showDryMassPresetStatus,
        );
      });
      document.getElementById("dryMassPresetExportAll")?.addEventListener("click", async () => {
        if (!dryMassPresetLibrary.length) return showDryMassPresetStatus(localText("내보낼 건조질량 프리셋이 없습니다.", "No dry-mass presets to export."), true);
        await copySerializedObject(
          dryMassPresetLibraryExportObject(),
          localText("건조질량 프리셋 라이브러리를 클립보드에 복사했습니다.", "Dry-mass preset library copied to clipboard."),
          localText("클립보드 복사에 실패했습니다.", "Failed to copy to clipboard."),
          showDryMassPresetStatus,
        );
      });
      document.getElementById("dryMassPresetImport")?.addEventListener("click", async () => {
        const clip = (await readFromClipboard()).trim();
        const payload = window.prompt(localText("건조질량 프리셋 문자열을 붙여넣으세요", "Paste dry-mass preset string"), clip || "");
        if (payload === null) return showDryMassPresetStatus(localText("가져오기를 취소했습니다.", "Preset import canceled."));
        if (!payload.trim()) return showDryMassPresetStatus(localText("가져올 설정 문자열이 없습니다.", "No preset string to import."), true);
        try {
          const result = await handleImportedPresetObject(await parsePresetPayload(payload), { preferredKind: "dryMass" });
          showDryMassPresetStatus(result.message, !result.ok);
        } catch {
          showDryMassPresetStatus(localText("설정 문자열을 해석할 수 없습니다.", "Failed to parse preset payload."), true);
        }
      });
    }

    function setTextById(id, ko, en) {
      const element = document.getElementById(id);
      if (element) element.textContent = localText(ko, en);
    }

    function setPresetUiText() {
      const exportButton = document.getElementById("presetExport");
      const importButton = document.getElementById("presetImport");
      if (exportButton) exportButton.textContent = localText("설정 Export", "Export Preset");
      if (importButton) importButton.textContent = localText("설정 Import", "Import Preset");
      setTextById("chartPresetLibraryLabel", "차트 프리셋", "Chart presets");
      setTextById("chartPresetSave", "현재 저장", "Save Current");
      setTextById("chartPresetLoad", "불러오기", "Load");
      setTextById("chartPresetRename", "이름 변경", "Rename");
      setTextById("chartPresetDuplicate", "복제", "Duplicate");
      setTextById("chartPresetDelete", "삭제", "Delete");
      setTextById("chartPresetSetStartup", "시작 프리셋", "Set Startup");
      setTextById("chartPresetClearStartup", "시작 해제", "Clear Startup");
      setTextById("chartPresetReset", "기본값", "Defaults");
      setTextById("chartPresetExportSelected", "선택 Export", "Export Selected");
      setTextById("chartPresetExportAll", "전체 Export", "Export Library");
      setTextById("dryMassPresetLibraryLabel", "건조질량 프리셋", "Dry-mass presets");
      setTextById("dryMassPresetSave", "현재 저장", "Save Current");
      setTextById("dryMassPresetLoad", "불러오기", "Load");
      setTextById("dryMassPresetRename", "이름 변경", "Rename");
      setTextById("dryMassPresetDuplicate", "복제", "Duplicate");
      setTextById("dryMassPresetDelete", "삭제", "Delete");
      setTextById("dryMassPresetExportSelected", "선택 Export", "Export Selected");
      setTextById("dryMassPresetExportAll", "전체 Export", "Export Library");
      setTextById("dryMassPresetImport", "Import", "Import");
      renderPresetLibraryControls();
    }

    function showPresetStatus(message, isError = false) {
      const status = document.getElementById("presetStatus");
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("error", !!isError);
    }

    function showDryMassPresetStatus(message, isError = false) {
      const status = document.getElementById("dryMassPresetStatus");
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("error", !!isError);
    }

    function exportedPreset() {
      return {
        format: "ti-engine-chart-preset/v1",
        lang: UI_LANG,
        metric: state.metric,
        thrusters: state.thrusters,
        fuelEfficiencyUnit: state.fuelEfficiencyUnit,
        dryMassTons: state.dryMassTons,
        targetDvKps: state.targetDvKps,
        radiatorId: state.radiatorId,
        logX: !!state.logX,
        logY: !!state.logY,
        showTwrInfo: !!state.showTwrInfo,
        showMassInfo: !!state.showMassInfo,
        paretoHighlight: !!state.paretoHighlight,
        showImpracticalCandidates: !!state.showImpracticalCandidates,
        usePowerResearch: !!state.usePowerResearch,
        minTwr: state.minTwr,
        minDvKps: state.minDvKps,
        searchTerm: state.searchTerm,
        categories: Object.fromEntries(DATA.categories.map(category => [category.key, !!state.categories[category.key]])),
        families: Object.fromEntries(DATA.subfamilies.map(family => [family.key, !!state.families[family.key]])),
        dryMassCalculator: exportedDryMassCalculatorPreset(),
      };
    }

    async function copyToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const hidden = document.createElement("textarea");
      hidden.value = text;
      hidden.setAttribute("readonly", "");
      hidden.style.position = "fixed";
      hidden.style.opacity = "0";
      document.body.appendChild(hidden);
      hidden.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } finally {
        document.body.removeChild(hidden);
      }
      return copied;
    }

    async function readFromClipboard() {
      if (!(navigator.clipboard && window.isSecureContext)) return "";
      try {
        return (await navigator.clipboard.readText()) || "";
      } catch {
        return "";
      }
    }

    function bytesToBase64(bytes) {
      let binary = "";
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    function base64ToBytes(text) {
      const binary = atob(text);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }

    async function gzipBytes(bytes) {
      if (typeof CompressionStream !== "function") return null;
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function gunzipBytes(bytes) {
      if (typeof DecompressionStream !== "function") return null;
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function serializePresetPayload() {
      return serializePayloadObject(exportedPreset());
    }

    async function parsePresetPayload(payloadText) {
      const payload = String(payloadText || "").trim();
      if (!payload) throw new Error("empty");

      if (payload.startsWith("ticp1:")) {
        const compressed = base64ToBytes(payload.slice("ticp1:".length));
        const plain = await gunzipBytes(compressed);
        if (!plain) throw new Error("no-gunzip");
        return JSON.parse(new TextDecoder().decode(plain));
      }

      if (payload.startsWith("tijp1:")) {
        const plain = base64ToBytes(payload.slice("tijp1:".length));
        return JSON.parse(new TextDecoder().decode(plain));
      }

      return JSON.parse(payload);
    }

    function applyPresetToState(rawPreset) {
      const preset = rawPreset && rawPreset.settings ? rawPreset.settings : rawPreset;
      if (!preset || typeof preset !== "object") return false;

      if (preset.lang === "ko" || preset.lang === "en") {
        setLanguage(preset.lang, { rerender: false });
      }

      const metricKeys = Object.keys(metricDefs);
      if (metricKeys.includes(preset.metric)) state.metric = preset.metric;
      if (Number.isFinite(Number(preset.thrusters))) state.thrusters = Math.round(clamp(Number(preset.thrusters), 1, 6));
      if (preset.fuelEfficiencyUnit === "kps" || preset.fuelEfficiencyUnit === "seconds") state.fuelEfficiencyUnit = preset.fuelEfficiencyUnit;
      if (Number.isFinite(Number(preset.dryMassTons))) state.dryMassTons = clamp(Number(preset.dryMassTons), 0, 1000000);
      if (Number.isFinite(Number(preset.targetDvKps))) state.targetDvKps = clamp(Number(preset.targetDvKps), 0, 100000);

      if (typeof preset.radiatorId === "string" && DATA.radiators.some(item => item.id === preset.radiatorId)) {
        state.radiatorId = preset.radiatorId;
      }

      if (typeof preset.logX === "boolean") state.logX = preset.logX;
      if (typeof preset.logY === "boolean") state.logY = preset.logY;
      if (typeof preset.showTwrInfo === "boolean") state.showTwrInfo = preset.showTwrInfo;
      if (typeof preset.showMassInfo === "boolean") state.showMassInfo = preset.showMassInfo;
      if (typeof preset.paretoHighlight === "boolean") state.paretoHighlight = preset.paretoHighlight;
      if (typeof preset.showImpracticalCandidates === "boolean") state.showImpracticalCandidates = preset.showImpracticalCandidates;
      if (typeof preset.usePowerResearch === "boolean") state.usePowerResearch = preset.usePowerResearch;
      if (Number.isFinite(Number(preset.minTwr))) state.minTwr = clamp(Number(preset.minTwr), 0.0001, 10);
      if (Number.isFinite(Number(preset.minDvKps))) state.minDvKps = clamp(Number(preset.minDvKps), 0, 100000);
      if (typeof preset.searchTerm === "string") state.searchTerm = preset.searchTerm.trim().toLocaleLowerCase();

      if (preset.categories && typeof preset.categories === "object") {
        DATA.categories.forEach(category => {
          if (typeof preset.categories[category.key] === "boolean") {
            state.categories[category.key] = preset.categories[category.key];
          }
        });
      }
      if (preset.families && typeof preset.families === "object") {
        DATA.subfamilies.forEach(family => {
          if (typeof preset.families[family.key] === "boolean") {
            state.families[family.key] = preset.families[family.key];
          }
        });
      }

      const calculatorPreset = preset.dryMassCalculator || preset.dryMassCalc;
      if (calculatorPreset && typeof calculatorPreset === "object") {
        applyDryMassCalculatorPreset(calculatorPreset);
      }

      return true;
    }

    function syncUiFromState() {
      const metric = document.getElementById("metric");
      const thrusters = document.getElementById("thrusters");
      const thrustersNumber = document.getElementById("thrustersNumber");
      const dryMass = document.getElementById("dryMass");
      const dryMassNumber = document.getElementById("dryMassNumber");
      const targetDv = document.getElementById("targetDv");
      const targetDvNumber = document.getElementById("targetDvNumber");
      const radiator = document.getElementById("radiator");
      const logX = document.getElementById("logX");
      const logY = document.getElementById("logY");
      const showTwrInfo = document.getElementById("showTwrInfo");
      const showMassInfo = document.getElementById("showMassInfo");
      const paretoHighlight = document.getElementById("paretoHighlight");
      const showImpracticalCandidates = document.getElementById("showImpracticalCandidates");

      if (metric) metric.value = state.metric;
      if (thrusters) thrusters.value = String(state.thrusters);
      if (thrustersNumber) thrustersNumber.value = String(state.thrusters);
      if (dryMass) dryMass.value = String(clamp(state.dryMassTons, Number(dryMass.min), Number(dryMass.max)));
      if (dryMassNumber) dryMassNumber.value = String(Math.round(state.dryMassTons));
      if (targetDv) targetDv.value = String(clamp(state.targetDvKps, Number(targetDv.min), Number(targetDv.max)));
      if (targetDvNumber) targetDvNumber.value = String(Math.round(state.targetDvKps));
      if (radiator) {
        radiator.value = state.radiatorId;
        enhanceSearchableSelect(radiator);
      }
      if (logX) logX.checked = !!state.logX;
      if (logY) logY.checked = !!state.logY;
      if (showTwrInfo) showTwrInfo.checked = !!state.showTwrInfo;
      if (showMassInfo) showMassInfo.checked = !!state.showMassInfo;
      if (paretoHighlight) paretoHighlight.checked = !!state.paretoHighlight;
      if (showImpracticalCandidates) showImpracticalCandidates.checked = !!state.showImpracticalCandidates;
      if (nameSearch) nameSearch.value = state.searchTerm || "";
      document.querySelectorAll('input[name="fuelUnit"]').forEach(input => {
        input.checked = input.value === state.fuelEfficiencyUnit;
      });

      state.zoom = null;
      syncFilterInputs();
      syncMinTwrInputs();
      syncMinDvInputs();
      updateChartControls();
      renderDryMassCalcModal();
      render();
    }

    function rowCategoryLabel(row) {
      return UI_LANG === "en" ? (row.categoryLabelEn || row.categoryLabel) : (row.categoryLabel || row.categoryLabelEn);
    }

    function rowFamilyLabel(row) {
      return UI_LANG === "en" ? (row.familyLabelEn || row.familyLabel) : (row.familyLabel || row.familyLabelEn);
    }

    function rowProjectLabel(row) {
      return UI_LANG === "en"
        ? (row.requiredProjectDisplay.en || row.requiredProjectDisplay.ko || row.requiredProject)
        : (row.requiredProjectDisplay.ko || row.requiredProjectDisplay.en || row.requiredProject);
    }

    function syncFilterInputs() {
      document.querySelectorAll(".category-row").forEach(row => {
        const input = row.querySelector("input");
        input.checked = !!state.categories[row.dataset.categoryKey];
      });
      document.querySelectorAll(".family-row").forEach(row => {
        const activeCategory = !!state.categories[row.dataset.categoryKey];
        const input = row.querySelector("input");
        row.style.display = activeCategory ? "" : "none";
        input.disabled = !activeCategory;
        input.checked = !!state.families[row.dataset.familyKey];
      });
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function filteredRows() {
      return computeDriveDiagnostics().visibleRows;
    }

    function computeDriveDiagnostics() {
      const familyStats = new Map(DATA.subfamilies.map(family => [family.key, {
        ...family,
        total: 0,
        visible: 0,
        hidden: 0,
        selected: !!state.categories[family.categoryKey] && !!state.families[family.key],
        hiddenReasons: {},
      }]));
      const visibleRows = [];
      DATA.drives.forEach(row => {
        const evaluation = evaluateDriveVisibility(row);
        if (evaluation.visible) visibleRows.push(row);
        if (!rowInFamilyDiagnosticScope(row)) return;
        const stats = familyStats.get(row.familyKey);
        if (!stats) return;
        stats.total += 1;
        if (evaluation.visible) {
          stats.visible += 1;
        } else if (stats.selected) {
          stats.hidden += 1;
          const reasons = evaluation.reasons.filter(reason => reason !== "familyFilter");
          (reasons.length ? reasons : ["other"]).forEach(reason => {
            stats.hiddenReasons[reason] = (stats.hiddenReasons[reason] || 0) + 1;
          });
        }
      });
      const families = DATA.subfamilies.map(family => {
        const stats = familyStats.get(family.key);
        return {
          ...stats,
          dominantReason: dominantHiddenReason(stats.hiddenReasons),
        };
      });
      return {
        visibleRows,
        families,
        zeroFamilies: families.filter(family => family.selected && family.total > 0 && family.visible === 0),
      };
    }

    function evaluateDriveVisibility(row) {
      const reasons = [];
      if (row.thrusterCount !== state.thrusters || !rowMatchesSearch(row) || !rowFamilySelected(row)) {
        reasons.push("familyFilter");
      }
      if (!Number.isFinite(rowUnlockResearchValue(row)) || rowUnlockResearchValue(row) <= 0) {
        reasons.push("researchFilter");
      }
      if (isBandMetric()) {
        reasons.push(...bandMetricHiddenReasons(row));
      } else {
        const value = metricDefs[state.metric].value(row);
        if (!Number.isFinite(value) || value <= 0) reasons.push("axisRange");
      }
      return {
        visible: reasons.length === 0,
        reasons: [...new Set(reasons)],
      };
    }

    function rowFamilySelected(row) {
      return !!state.categories[row.categoryKey] && !!state.families[row.familyKey];
    }

    function rowInFamilyDiagnosticScope(row) {
      return row.thrusterCount === state.thrusters && rowMatchesSearch(row);
    }

    function rowMatchesSearch(row) {
      if (!state.searchTerm) return true;
      const haystack = [
        row.displayName,
        row.baseDisplayName,
        row.requiredProject,
        rowProjectLabel(row),
        rowCategoryLabel(row),
        rowFamilyLabel(row),
      ].join(" ").toLocaleLowerCase();
      return haystack.includes(state.searchTerm);
    }

    function bandMetricHiddenReasons(row) {
      const configuredOptions = row.powerOptions || row.reactorOptions || [];
      if (!configuredOptions.length) return ["invalidPowerPlant"];
      const massInfo = massRatioDiagnostics(row);
      const options = massOptions(row);
      if (!options.length) {
        if (massInfo.overflow || massInfo.extreme) return ["targetDvOrMassRatio"];
        return [massInfo.invalid ? "invalidComputation" : "invalidPowerPlant"];
      }
      const finiteMetricOptions = options.filter(option => Number.isFinite(optionMetricValue(option)) && optionMetricValue(option) > 0);
      if (!finiteMetricOptions.length) return ["invalidComputation"];
      const reasons = [];
      if ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.minTwr > 0 && !state.showImpracticalCandidates) {
        const twrPassing = finiteMetricOptions.some(option => Number.isFinite(option.twr) && option.twr >= state.minTwr);
        if (!twrPassing) {
          reasons.push("minTwr");
          if (massInfo.extreme || massInfo.overflow || finiteMetricOptions.some(isExtremeMassRatioOption)) {
            reasons.push("targetDvOrMassRatio");
          }
        }
      }
      if (state.metric === "twr" && state.minDvKps > 0 && !state.showImpracticalCandidates) {
        const dvPassing = finiteMetricOptions.some(
          option => Number.isFinite(option.maxPracticalDvKps) && option.maxPracticalDvKps >= state.minDvKps,
        );
        if (!dvPassing) reasons.push("minDv");
      }
      return reasons;
    }

    function massRatioDiagnostics(row) {
      const targetDv = Number(state.targetDvKps);
      const exhaustVelocity = Number(row.exhaustVelocityKps);
      if (!Number.isFinite(targetDv) || !Number.isFinite(exhaustVelocity) || exhaustVelocity <= 0) {
        return { invalid: true, overflow: false, extreme: false, massRatio: NaN };
      }
      const exponent = targetDv / exhaustVelocity;
      if (!Number.isFinite(exponent)) {
        return { invalid: true, overflow: false, extreme: false, massRatio: NaN };
      }
      if (exponent > MASS_RATIO_OVERFLOW_EXPONENT) {
        return { invalid: false, overflow: true, extreme: true, massRatio: Infinity };
      }
      const massRatio = Math.exp(exponent);
      return {
        invalid: !Number.isFinite(massRatio),
        overflow: !Number.isFinite(massRatio),
        extreme: Number.isFinite(massRatio) && massRatio >= EXTREME_MASS_RATIO,
        massRatio,
      };
    }

    function isExtremeMassRatioOption(option) {
      return Number.isFinite(option.massRatio) && option.massRatio >= EXTREME_MASS_RATIO;
    }

    function isImpracticalOption(option) {
      if (!state.showImpracticalCandidates) return false;
      return ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.minTwr > 0 && Number.isFinite(option.twr) && option.twr < state.minTwr)
        || isExtremeMassRatioOption(option);
    }

    function dominantHiddenReason(hiddenReasons) {
      return HIDDEN_REASON_PRIORITY.find(reason => (hiddenReasons && hiddenReasons[reason] > 0)) || "other";
    }

    function rowUnlockResearchValue(row) {
      const value = Number(row.unlockCumulativeResearch);
      if (Number.isFinite(value) && value > 0) return value;
      return Number(row.cumulativeResearch);
    }

    function selectedRadiator() {
      return DATA.radiators.find(item => item.id === state.radiatorId) || DATA.radiators[0] || null;
    }

    function massOptions(row) {
      const baseDryTons = state.dryMassTons;
      const targetDv = state.targetDvKps;
      const radiator = selectedRadiator();
      const radiatorSpecificPower = radiator ? Number(radiator.specificPowerKWPerKg) : NaN;
      const massRatioMinusOne = Math.exp(targetDv / row.exhaustVelocityKps) - 1;
      if (!Number.isFinite(massRatioMinusOne) || massRatioMinusOne < 0) return [];
      const massRatio = massRatioMinusOne + 1;
      const options = row.powerOptions || row.reactorOptions || [];
      const computed = options.map(option => {
        const selfContained = !!option.selfContained || row.powerRequirementGW <= 0;
        const powerPlantMassTons = selfContained ? 0 : Math.max(1, option.specificMassTonsPerGW * row.powerRequirementGW);
        const wasteHeatGW = selfContained || row.openCycleCooling ? 0 : row.powerRequirementGW * (1 - option.efficiency);
        const radiatorMassTons = !selfContained && radiatorSpecificPower > 0
          ? Math.max(0, wasteHeatGW * 1_000_000 / radiatorSpecificPower / 1000)
          : 0;
        const hardwareMassTons = row.driveMassTons + powerPlantMassTons + radiatorMassTons;
        const dryWithHardwareTons = baseDryTons + hardwareMassTons;
        const propellantTons = dryWithHardwareTons * massRatioMinusOne;
        const totalMassTons = dryWithHardwareTons + propellantTons;
        const twr = row.thrustN / (totalMassTons * 1000 * STANDARD_GRAVITY_MPS2);
        return {
          ...option,
          reactorMassTons: powerPlantMassTons,
          powerPlantMassTons,
          radiatorMassTons,
          wasteHeatGW,
          hardwareMassTons,
          baseDryTons,
          dryWithHardwareTons,
          propellantTons,
          totalMassTons,
          twr,
          maxPracticalDvKps: row.exhaustVelocityKps * Math.log(EXTREME_MASS_RATIO),
          massRatio,
          massRatioMinusOne,
        };
      });
      return actualPowerFrontier(row, computed);
    }

    function chartMassOptions(row, metric = state.metric) {
      const options = massOptions(row);
      if ((metric === "totalMassTons" || metric === "fuelMassTons") && state.minTwr > 0 && !state.showImpracticalCandidates) {
        return options.filter(option => Number.isFinite(option.twr) && option.twr >= state.minTwr);
      }
      if (metric === "twr" && state.minDvKps > 0 && !state.showImpracticalCandidates) {
        return options.filter(option => Number.isFinite(option.maxPracticalDvKps) && option.maxPracticalDvKps >= state.minDvKps);
      }
      return options;
    }

    function actualPowerFrontier(row, options) {
      if (row.requiredPowerPlantClass !== "Any_General" || row.powerRequirementGW <= 0 || options.length <= 1) {
        return options;
      }
      const frontier = [];
      let bestTotalMass = Infinity;
      options.forEach((option, index) => {
        if (index === 0 || option.totalMassTons < bestTotalMass * (1 - 1e-9)) {
          frontier.push(option);
          bestTotalMass = Math.min(bestTotalMass, option.totalMassTons);
        }
      });
      return frontier;
    }

    function normalizeAxisDomain(min, max, logScale) {
      let d0 = Number(min);
      let d1 = Number(max);
      if (!Number.isFinite(d0) || !Number.isFinite(d1)) {
        d0 = logScale ? 1 : 0;
        d1 = logScale ? 10 : 1;
      }
      if (d0 > d1) [d0, d1] = [d1, d0];
      if (logScale) {
        d0 = Math.max(d0, 1e-12);
        d1 = Math.max(d1, 1e-12);
        if (d0 > d1) [d0, d1] = [d1, d0];
        const s0 = Math.log10(d0);
        const s1 = Math.log10(d1);
        if (!Number.isFinite(s0) || !Number.isFinite(s1) || Math.abs(s1 - s0) < 1e-12) {
          const center = Number.isFinite(s0) ? s0 : 0;
          return [Math.pow(10, center - 0.005), Math.pow(10, center + 0.005)];
        }
        return [d0, d1];
      }
      if (Math.abs(d1 - d0) < 1e-12) {
        const pad = Math.max(Math.abs(d0) * 0.01, 1);
        d0 -= pad;
        d1 += pad;
      }
      return [d0, d1];
    }

    function axisSpaceValue(value, logScale) {
      return logScale ? Math.log10(Math.max(value, 1e-12)) : value;
    }

    function valueFromAxisSpace(space, logScale) {
      return logScale ? Math.pow(10, space) : space;
    }

    function makeScale(domain, range, logScale) {
      const [d0, d1] = normalizeAxisDomain(domain[0], domain[1], logScale);
      if (logScale) {
        const l0 = axisSpaceValue(d0, true);
        const l1 = axisSpaceValue(d1, true);
        return value => {
          const v = axisSpaceValue(value, true);
          return range[0] + (v - l0) / (l1 - l0) * (range[1] - range[0]);
        };
      }
      return value => range[0] + (value - d0) / (d1 - d0) * (range[1] - range[0]);
    }

    // Axis tick planning lives in axis-space: linear axes use raw values,
    // and log axes use log10(value). Keeping all axes on the same path avoids
    // the earlier pile of separate log-X/log-Y/deep-zoom helpers.
    const AXIS_TICK_MULTIPLIERS = [1, 2, 2.5, 5, 10];
    const AXIS_EPSILON = 1e-12;

    function niceAxisStep(rawStep, mode = "ceil") {
      if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
      const exponent = Math.floor(Math.log10(rawStep));
      const base = Math.pow(10, exponent);
      const normalized = rawStep / base;
      if (mode === "floor") {
        for (let index = AXIS_TICK_MULTIPLIERS.length - 1; index >= 0; index--) {
          if (normalized >= AXIS_TICK_MULTIPLIERS[index]) return AXIS_TICK_MULTIPLIERS[index] * base;
        }
        return AXIS_TICK_MULTIPLIERS[0] * base / 10;
      }
      const picked = AXIS_TICK_MULTIPLIERS.find(value => normalized <= value) || AXIS_TICK_MULTIPLIERS[AXIS_TICK_MULTIPLIERS.length - 1];
      return picked * base;
    }

    function nextAxisStep(step, direction) {
      if (!Number.isFinite(step) || step <= 0) return 1;
      const exponent = Math.floor(Math.log10(step));
      const base = Math.pow(10, exponent);
      const normalized = step / base;
      let index = AXIS_TICK_MULTIPLIERS.findIndex(value => Math.abs(value - normalized) <= Math.max(AXIS_EPSILON, normalized * 1e-10));
      if (index < 0) index = AXIS_TICK_MULTIPLIERS.findIndex(value => normalized < value);
      if (index < 0) index = AXIS_TICK_MULTIPLIERS.length - 1;
      if (direction > 0) {
        if (index < AXIS_TICK_MULTIPLIERS.length - 1) return AXIS_TICK_MULTIPLIERS[index + 1] * base;
        return AXIS_TICK_MULTIPLIERS[1] * base * 10;
      }
      if (index > 0) return AXIS_TICK_MULTIPLIERS[index - 1] * base;
      return AXIS_TICK_MULTIPLIERS[AXIS_TICK_MULTIPLIERS.length - 2] * base / 10;
    }

    function normalizeAxisSpace(min, max, logScale) {
      const [d0, d1] = normalizeAxisDomain(min, max, logScale);
      const s0 = axisSpaceValue(d0, logScale);
      const s1 = axisSpaceValue(d1, logScale);
      const low = Math.min(s0, s1);
      const high = Math.max(s0, s1);
      const span = Math.max(high - low, 1e-15);
      return { d0, d1, low, high, span };
    }

    function axisTickOptions(pixelSpan, options = {}) {
      const gridPixelGap = Math.max(options.gridPixelGap || 58, 12);
      const labelPixelGap = Math.max(options.labelPixelGap || 92, gridPixelGap);
      const maxTicks = clamp(options.maxTicks || 90, 4, 240);
      const minTicks = clamp(options.minTicks || 4, 2, Math.min(12, maxTicks));
      const targetGridCount = clamp(Math.round(pixelSpan / gridPixelGap) + 1, minTicks, maxTicks);
      const labelBudget = clamp(Math.floor(pixelSpan / labelPixelGap) + 1, 2, Math.max(2, maxTicks));
      return { gridPixelGap, labelPixelGap, maxTicks, minTicks, targetGridCount, labelBudget };
    }

    function axisTickIndexRange(spaceMin, spaceMax, step) {
      const low = Math.min(spaceMin, spaceMax);
      const high = Math.max(spaceMin, spaceMax);
      const span = Math.max(high - low, 0);
      const epsilon = Math.max(Math.abs(step) * 1e-10, span * 1e-12, 1e-14);
      const startIndex = Math.ceil((low - epsilon) / step);
      const endIndex = Math.floor((high + epsilon) / step);
      return { startIndex, endIndex, epsilon, low, high };
    }

    function estimatedAxisTickCount(spaceMin, spaceMax, step) {
      if (!Number.isFinite(spaceMin) || !Number.isFinite(spaceMax) || !Number.isFinite(step) || step <= 0) return 0;
      const { startIndex, endIndex } = axisTickIndexRange(spaceMin, spaceMax, step);
      return Math.max(0, endIndex - startIndex + 1);
    }

    function chooseAxisTickStep(spaceMin, spaceMax, targetCount, minTicks, maxTicks) {
      const span = Math.max(Math.abs(spaceMax - spaceMin), 1e-15);
      const minUsefulStep = span / Math.max(maxTicks - 1, 1);
      let step = niceAxisStep(span / Math.max(targetCount - 1, 1), "ceil");
      for (let attempt = 0; attempt < 40; attempt++) {
        const estimated = estimatedAxisTickCount(spaceMin, spaceMax, step);
        if (estimated > maxTicks) {
          step = nextAxisStep(step, 1);
          continue;
        }
        if (estimated < minTicks && step > minUsefulStep * (1 + 1e-9)) {
          step = nextAxisStep(step, -1);
          continue;
        }
        return step;
      }
      return step;
    }

    function generateAxisSpaceTicks(spaceMin, spaceMax, step, logScale) {
      if (!Number.isFinite(spaceMin) || !Number.isFinite(spaceMax) || !Number.isFinite(step) || step <= 0) return [];
      const { startIndex, endIndex, epsilon, low, high } = axisTickIndexRange(spaceMin, spaceMax, step);
      const count = Math.max(0, endIndex - startIndex + 1);
      if (!count || count > 5000) return [];
      const ticks = [];
      for (let index = startIndex; index <= endIndex; index++) {
        const space = index * step;
        if (space < low - epsilon || space > high + epsilon) continue;
        const value = valueFromAxisSpace(space, logScale);
        if (Number.isFinite(value)) ticks.push(value);
      }
      return ticks;
    }

    function interpolatedAxisTicks(min, max, logScale, count) {
      const { low, high } = normalizeAxisSpace(min, max, logScale);
      const safeCount = clamp(Math.floor(count), 2, 160);
      return Array.from({ length: safeCount }, (_, index) => {
        const ratio = safeCount <= 1 ? 0 : index / (safeCount - 1);
        return valueFromAxisSpace(low + (high - low) * ratio, logScale);
      });
    }

    function uniqueSortedAxisTicks(values, logScale) {
      const sorted = values
        .filter(value => Number.isFinite(value) && (!logScale || value > 0))
        .sort((a, b) => axisSpaceValue(a, logScale) - axisSpaceValue(b, logScale));
      const result = [];
      for (const value of sorted) {
        const space = axisSpaceValue(value, logScale);
        const previous = result.length ? axisSpaceValue(result[result.length - 1], logScale) : NaN;
        if (!result.length || Math.abs(space - previous) > 1e-12) result.push(value);
      }
      return result;
    }

    function downsampleTicksWithCoverage(ticks, maxTicks) {
      if (!Array.isArray(ticks) || ticks.length <= maxTicks) return ticks;
      if (maxTicks <= 2) return [ticks[0], ticks[ticks.length - 1]];
      const result = [ticks[0]];
      const interiorSlots = maxTicks - 2;
      for (let slot = 1; slot <= interiorSlots; slot++) {
        const sourceIndex = Math.round(slot * (ticks.length - 1) / (interiorSlots + 1));
        const value = ticks[sourceIndex];
        if (value !== result[result.length - 1]) result.push(value);
      }
      if (ticks[ticks.length - 1] !== result[result.length - 1]) result.push(ticks[ticks.length - 1]);
      return result;
    }

    function labelAxisTicks(ticks, axisSpace, pixelSpan, labelPixelGap, labelBudget) {
      const labelStride = Math.max(1, Math.ceil(ticks.length / labelBudget));
      let lastLabelPixel = -Infinity;
      return ticks.map((value, index) => {
        const space = axisSpaceValue(value, axisSpace.logScale);
        const pixel = (space - axisSpace.low) / axisSpace.span * pixelSpan;
        const edge = index === 0 || index === ticks.length - 1;
        const gapOk = pixel - lastLabelPixel >= labelPixelGap * 0.86;
        const label = edge || (index % labelStride === 0 && gapOk);
        if (label) lastLabelPixel = pixel;
        return {
          tick: value,
          value,
          label,
          major: label,
          space,
          pixel,
        };
      });
    }

    function buildAxisTickPlan(min, max, pixelSpan, logScale, options = {}) {
      const axisSpace = { ...normalizeAxisSpace(min, max, logScale), logScale };
      const tickOptions = axisTickOptions(pixelSpan, options);
      const step = chooseAxisTickStep(axisSpace.low, axisSpace.high, tickOptions.targetGridCount, tickOptions.minTicks, tickOptions.maxTicks);
      let ticks = generateAxisSpaceTicks(axisSpace.low, axisSpace.high, step, logScale);
      if (ticks.length < 2) {
        ticks = interpolatedAxisTicks(axisSpace.d0, axisSpace.d1, logScale, tickOptions.targetGridCount);
      }
      ticks = uniqueSortedAxisTicks([axisSpace.d0, ...ticks, axisSpace.d1], logScale);
      ticks = downsampleTicksWithCoverage(ticks, tickOptions.maxTicks);
      return labelAxisTicks(ticks, axisSpace, pixelSpan, tickOptions.labelPixelGap, tickOptions.labelBudget);
    }

    function linearTicks(min, max, count = 6) {
      return buildAxisTickPlan(min, max, Math.max(count - 1, 1) * 60, false, {
        gridPixelGap: 60,
        labelPixelGap: 60,
        maxTicks: Math.max(count + 2, 8),
        minTicks: Math.min(count, 4),
      }).map(item => item.value);
    }

    function render() {
      const diagnostics = computeDriveDiagnostics();
      currentDiagnostics = diagnostics;
      const rows = diagnostics.visibleRows;
      const metric = metricDefs[state.metric];
      document.getElementById("visibleCount").textContent = rows.length;
      document.getElementById("metricHint").textContent = metricHint(state.metric);
      document.getElementById("metricColumn").textContent = metricLabel(state.metric);
      updateChartControls();
      renderFamilyDiagnostics(diagnostics);
      renderChartDiagnostic(diagnostics);
      renderLegend(rows);
      renderChart(rows);
      renderTable(rows);
      updateSortHeaders();
      updateLeftPanelCardSummaries();
      refreshTooltip(rows);
    }

    function redrawChartOnly() {
      const diagnostics = computeDriveDiagnostics();
      currentDiagnostics = diagnostics;
      const rows = diagnostics.visibleRows;
      renderChart(rows);
      updateZoomButton();
      refreshTooltip(rows);
    }

    function currentZoomContext() {
      const categoryState = DATA.categories.map(category => `${category.key}:${state.categories[category.key] ? 1 : 0}`).join("|");
      const familyState = DATA.subfamilies.map(family => `${family.key}:${state.families[family.key] ? 1 : 0}`).join("|");
      return [
        state.metric,
        state.fuelEfficiencyUnit,
        state.thrusters,
        state.dryMassTons,
        state.targetDvKps,
        state.radiatorId,
        state.showImpracticalCandidates ? 1 : 0,
        state.usePowerResearch ? 1 : 0,
        state.logX ? 1 : 0,
        state.logY ? 1 : 0,
        state.searchTerm,
        categoryState,
        familyState,
      ].join(";");
    }

    function updateZoomButton() {
      const resetZoom = document.getElementById("resetZoom");
      if (resetZoom) resetZoom.disabled = !state.zoom;
    }

    function updateSortHeaders() {
      document.querySelectorAll("[data-sort]").forEach(button => {
        const active = button.dataset.sort === state.sortKey;
        button.dataset.active = active ? "true" : "false";
        button.dataset.arrow = active ? (state.sortDirection === "asc" ? "▲" : "▼") : "";
        button.setAttribute("aria-sort", active ? (state.sortDirection === "asc" ? "ascending" : "descending") : "none");
      });
    }

    function renderFamilyDiagnostics(diagnostics) {
      const byKey = new Map(diagnostics.families.map(family => [family.key, family]));
      document.querySelectorAll(".family-row").forEach(row => {
        const stats = byKey.get(row.dataset.familyKey);
        const count = row.querySelector(".family-count");
        if (!count || !stats) return;
        count.textContent = UI_LANG === "en"
          ? `${stats.visible} / ${stats.total} shown`
          : `${stats.visible} / ${stats.total} 표시`;
      });
      const warningsRoot = document.getElementById("familyWarnings");
      if (!warningsRoot) return;
      warningsRoot.innerHTML = "";
      diagnostics.zeroFamilies.forEach(family => {
        const item = document.createElement("div");
        item.className = "family-warning";
        item.textContent = familyWarningText(family);
        warningsRoot.appendChild(item);
      });
    }

    function renderChartDiagnostic(diagnostics) {
      const banner = document.getElementById("chartDiagnostic");
      if (!banner) return;
      if (!diagnostics.zeroFamilies.length) {
        banner.hidden = true;
        banner.textContent = "";
        return;
      }
      const count = diagnostics.zeroFamilies.length;
      banner.hidden = false;
      banner.textContent = UI_LANG === "en"
        ? `${count} selected drive ${count === 1 ? "family has" : "families have"} no visible candidates under the current scenario.`
        : `선택된 드라이브 계열 ${count}개는 현재 시나리오에서 표시 후보가 없습니다.`;
    }

    function familyWarningText(family) {
      const label = localLabel(family);
      const phrase = hiddenReasonPhrase(family.dominantReason, family.hiddenReasons);
      return UI_LANG === "en"
        ? `${label}: ${family.hidden} drives hidden by ${phrase}.`
        : `${label}: ${family.hidden}개 드라이브가 ${phrase} 때문에 숨겨졌습니다.`;
    }

    function hiddenReasonPhrase(reason, hiddenReasons = {}) {
      const reasonKey = reason || "other";
      if (reasonKey === "minTwr" && hiddenReasons.targetDvOrMassRatio) {
        return UI_LANG === "en" ? "current dV / minimum TWR settings" : "현재 dV / 최소 TWR 설정";
      }
      const phrases = {
        minTwr: UI_LANG === "en" ? "the current minimum TWR filter" : "현재 최소 TWR 필터",
        minDv: UI_LANG === "en" ? "the current minimum dV filter" : "현재 최소 dV 필터",
        targetDvOrMassRatio: UI_LANG === "en" ? "the current target dV / mass-ratio scenario" : "현재 목표 dV / 질량비 시나리오",
        researchFilter: UI_LANG === "en" ? "research unlock constraints" : "연구 개방 조건",
        invalidPowerPlant: UI_LANG === "en" ? "missing compatible power candidates" : "호환 전원 후보 부족",
        invalidComputation: UI_LANG === "en" ? "non-finite mass or TWR calculations" : "계산 불능 질량 또는 TWR",
        axisRange: UI_LANG === "en" ? "the current axis range or metric" : "현재 축 범위 또는 지표",
        other: UI_LANG === "en" ? "other current filters" : "기타 현재 필터",
        familyFilter: UI_LANG === "en" ? "family/category filters" : "대분류/계열 필터",
      };
      return phrases[reasonKey] || phrases.other;
    }

    function renderLegend(rows) {
      const used = new Set(rows.map(row => row.familyKey));
      const legend = document.getElementById("legend");
      legend.innerHTML = "";
      DATA.categories.forEach(category => {
        const subfamilies = DATA.subfamilies.filter(f => f.categoryKey === category.key && used.has(f.key));
        if (!subfamilies.length) return;
        const group = document.createElement("span");
        group.className = "legend-group";
        const heading = document.createElement("span");
        heading.className = "legend-heading";
        heading.textContent = localLabel(category);
        group.appendChild(heading);
        subfamilies.forEach(f => {
          const item = document.createElement("span");
          item.className = "legend-item";
          const swatch = document.createElement("span");
          swatch.className = "legend-swatch";
          if (isBandMetric()) {
            swatch.setAttribute("style", backgroundStyle(f.bandColor || f.color, f.bandColorOklch || f.bandColor || f.color));
          } else {
            swatch.setAttribute("style", backgroundStyle(f.color, f.colorOklch || f.color));
          }
          item.append(swatch, document.createTextNode(localLabel(f)));
          group.appendChild(item);
        });
        legend.appendChild(group);
      });
      if (isBandMetric()) {
        const item = document.createElement("span");
        item.className = "legend-item";
        item.textContent = state.usePowerResearch
          ? `${metricLabel(state.metric)} ${localText("밴드: 추가 전원 연구력 포함", "band: including additional power research")}`
          : `${metricLabel(state.metric)} ${localText("밴드: 최초 전원 연구력 기준", "band: first power research basis")}`;
        legend.appendChild(item);
        const powerResearch = document.createElement("span");
        powerResearch.className = "legend-item";
        powerResearch.textContent = state.usePowerResearch
          ? localText("X축: 최초+추가 전원 포함 연구력", "X axis: first + additional power research")
          : localText("X축: 최초 전원 포함 연구력", "X axis: first power-inclusive research");
        legend.appendChild(powerResearch);
        if (secondaryEncodingEnabled()) {
          const secondary = document.createElement("span");
          secondary.className = "legend-item";
          secondary.textContent = (state.metric === "totalMassTons" || state.metric === "fuelMassTons")
            ? localText("점 밝기: TWR 높을수록 밝음", "Point brightness: brighter means higher TWR")
            : localText("점 밝기: 총질량 낮을수록 밝음", "Point brightness: brighter means lower total mass");
          legend.appendChild(secondary);
        }
        if (state.paretoHighlight) {
          const pareto = document.createElement("span");
          pareto.className = "legend-item";
          pareto.textContent = localText("흐린 점: Pareto 지배 후보", "Dim points: Pareto-dominated candidates");
          legend.appendChild(pareto);
        }
      }
    }

    function valueDomain(rows) {
      if (isBandMetric()) {
        const values = rows.flatMap(row => chartMassOptions(row).map(option => optionMetricValue(option)));
        return paddedDomain(values, state.logY);
      }
      const values = rows.map(metricDefs[state.metric].value).filter(v => Number.isFinite(v) && v > 0);
      return paddedDomain(values, state.logY);
    }

    function paddedDomain(values, logScale) {
      if (!values.length) return [1, 10];
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (logScale) {
        min = Math.max(min / 1.35, 1e-9);
        max *= 1.35;
      } else {
        const pad = (max - min || max || 1) * 0.08;
        min = Math.max(0, min - pad);
        max += pad;
      }
      return [min, max];
    }

    function renderChart(rows) {
      const width = 1120;
      const height = 660;
      const margin = { top: 34, right: 32, bottom: 72, left: 86 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      currentChartRows = rows;
      chartHitTargets = [];
      state.hoverPoints = state.tooltipPinned ? dedupeTooltipRefs(state.lastTooltipItems) : pinnedTooltipRefs();
      chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
      chart.setAttribute("preserveAspectRatio", "xMidYMid meet");
      chart.innerHTML = "";

      const xValues = chartResearchValues(rows);
      const baseXDomain = paddedDomain(xValues, state.logX);
      const baseYDomain = valueDomain(rows);
      const preserveViewport = !!(state.preserveViewportOnce && state.zoom);
      const xDomain = preserveViewport
        ? state.zoom.xDomain.slice()
        : (state.zoom ? constrainDomain(state.zoom.xDomain, baseXDomain, state.logX) : baseXDomain);
      const yDomain = preserveViewport
        ? state.zoom.yDomain.slice()
        : (state.zoom ? constrainDomain(state.zoom.yDomain, baseYDomain, state.logY) : baseYDomain);
      if (state.zoom) {
        state.zoom = { xDomain, yDomain };
      }
      state.preserveViewportOnce = false;
      const x = makeScale(xDomain, [margin.left, margin.left + innerW], state.logX);
      const y = makeScale(yDomain, [margin.top + innerH, margin.top], state.logY);
      chartViewport = { width, height, margin, innerW, innerH, xDomain, yDomain, baseXDomain, baseYDomain };

      drawGridAndAxes({ width, height, margin, innerW, innerH, x, y, xDomain, yDomain });
      const clipId = "plotClip";
      const defs = svgEl("defs", {});
      const clipPath = svgEl("clipPath", { id: clipId });
      clipPath.appendChild(svgEl("rect", { x: margin.left, y: margin.top, width: innerW, height: innerH }));
      defs.appendChild(clipPath);
      chart.appendChild(defs);
      const plot = svgEl("g", { "clip-path": `url(#${clipId})` });
      chart.appendChild(plot);

      if (isBandMetric()) {
        drawTotalMassBands(rows, x, y, plot);
      } else {
        drawMetricLines(rows, x, y, plot);
      }
      updateZoomButton();
    }

    function handleChartWheel(event) {
      if (!chartViewport) return;
      const point = svgPointFromEvent(event);
      const axisMode = resolveWheelZoomAxisMode(point, event);
      if (!axisMode) return;
      event.preventDefault();
      const focal = clampPointToPlot(point);
      const zoomFactor = Math.exp(Math.sign(event.deltaY) * 0.22);
      const xValue = invertScale(focal.x, chartViewport.xDomain, [chartViewport.margin.left, chartViewport.margin.left + chartViewport.innerW], state.logX);
      const yValue = invertScale(focal.y, chartViewport.yDomain, [chartViewport.margin.top + chartViewport.innerH, chartViewport.margin.top], state.logY);
      const nextXDomain = axisMode.includes("x")
        ? zoomDomainAround(chartViewport.xDomain, xValue, zoomFactor, state.logX)
        : chartViewport.xDomain.slice();
      const nextYDomain = axisMode.includes("y")
        ? zoomDomainAround(chartViewport.yDomain, yValue, zoomFactor, state.logY)
        : chartViewport.yDomain.slice();
      setZoomDomains(
        nextXDomain,
        nextYDomain,
      );
    }

    function handleChartPointerDown(event) {
      if (!chartViewport || event.button !== 0) return;
      const point = svgPointFromEvent(event);
      if (!pointInPlot(point)) return;
      state.pan = {
        pointerId: event.pointerId,
        startPoint: point,
        startClientX: event.clientX,
        startClientY: event.clientY,
        hasMoved: false,
        xDomain: chartViewport.xDomain.slice(),
        yDomain: chartViewport.yDomain.slice(),
      };
      chart.classList.add("is-panning");
      try {
        chart.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointer events used by tests do not always have an active pointer capture target.
      }
      event.preventDefault();
    }

    function handleChartPointerMove(event) {
      if (!state.pan) {
        updateHoverFromPointer(event);
        return;
      }
      if (!chartViewport || event.pointerId !== state.pan.pointerId) return;
      const movementPx = Math.hypot(event.clientX - state.pan.startClientX, event.clientY - state.pan.startClientY);
      if (movementPx > CHART_CLICK_TOLERANCE_PX) {
        state.pan.hasMoved = true;
      }
      if (!state.pan.hasMoved) return;
      const point = svgPointFromEvent(event);
      const dx = point.x - state.pan.startPoint.x;
      const dy = point.y - state.pan.startPoint.y;
      setZoomDomains(
        panDomainByPixels(state.pan.xDomain, dx, [chartViewport.margin.left, chartViewport.margin.left + chartViewport.innerW], state.logX),
        panDomainByPixels(state.pan.yDomain, dy, [chartViewport.margin.top + chartViewport.innerH, chartViewport.margin.top], state.logY),
      );
      event.preventDefault();
    }

    function handleChartPointerLeave() {
      if (state.tooltipPinned) return;
      state.hoverHitSignature = "";
      state.dismissedTooltipKeys.clear();
      const pinned = pinnedTooltipRefs();
      if (!pinned.length) {
        clearTooltip({ keepPinned: true });
        return;
      }
      setHoverPoints(pinned);
      if (!sameTooltipRefs(pinned, state.lastTooltipItems)) {
        state.lastTooltipItems = pinned;
        refreshTooltip(currentChartRows);
      }
    }

    function endChartPan(event) {
      if (!state.pan || event.pointerId !== state.pan.pointerId) return;
      const movementPx = Math.hypot(event.clientX - state.pan.startClientX, event.clientY - state.pan.startClientY);
      const shouldPinClick = !state.pan.hasMoved && movementPx <= CHART_CLICK_TOLERANCE_PX;
      const clickPoint = shouldPinClick ? svgPointFromEvent(event) : null;
      if (chart.hasPointerCapture(event.pointerId)) chart.releasePointerCapture(event.pointerId);
      state.pan = null;
      chart.classList.remove("is-panning");
      if (shouldPinClick) {
        handleChartClick(clickPoint);
        event.preventDefault();
      }
    }

    function setZoomDomains(xDomain, yDomain) {
      if (!chartViewport) return;
      const nextX = constrainDomain(xDomain, chartViewport.baseXDomain, state.logX);
      const nextY = constrainDomain(yDomain, chartViewport.baseYDomain, state.logY);
      state.zoom = sameDomain(nextX, chartViewport.baseXDomain, state.logX) && sameDomain(nextY, chartViewport.baseYDomain, state.logY)
        ? null
        : { xDomain: nextX, yDomain: nextY };
      const rows = filteredRows();
      renderChart(rows);
      refreshTooltip(rows);
    }

    function svgPointFromEvent(event) {
      const transform = svgViewportTransform();
      return {
        x: (event.clientX - transform.rect.left - transform.offsetX) / transform.scale,
        y: (event.clientY - transform.rect.top - transform.offsetY) / transform.scale,
      };
    }

    function svgViewportTransform() {
      const rect = chart.getBoundingClientRect();
      const viewWidth = Math.max(chartViewport.width, 1);
      const viewHeight = Math.max(chartViewport.height, 1);
      const scale = Math.min(Math.max(rect.width, 1) / viewWidth, Math.max(rect.height, 1) / viewHeight);
      const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
      const drawnWidth = viewWidth * safeScale;
      const drawnHeight = viewHeight * safeScale;
      return {
        rect,
        scale: safeScale,
        offsetX: (rect.width - drawnWidth) / 2,
        offsetY: (rect.height - drawnHeight) / 2,
      };
    }

    function pointInPlot(point) {
      const { margin, innerW, innerH } = chartViewport;
      return point.x >= margin.left
        && point.x <= margin.left + innerW
        && point.y >= margin.top
        && point.y <= margin.top + innerH;
    }

    function pointInXAxisZone(point) {
      const { margin, innerW, innerH, height } = chartViewport;
      return point.x >= margin.left
        && point.x <= margin.left + innerW
        && point.y >= margin.top + innerH - 12
        && point.y <= Math.min(height, margin.top + innerH + Math.max(24, margin.bottom));
    }

    function pointInYAxisZone(point) {
      const { margin, innerH } = chartViewport;
      return point.x >= Math.max(0, margin.left - Math.max(24, margin.left))
        && point.x <= margin.left + 12
        && point.y >= margin.top
        && point.y <= margin.top + innerH;
    }

    function resolveWheelZoomAxisMode(point, event) {
      if (pointInPlot(point)) {
        if (event.shiftKey && !event.altKey) return "y";
        if (event.altKey && !event.shiftKey) return "x";
        return "xy";
      }
      if (pointInXAxisZone(point)) return "x";
      if (pointInYAxisZone(point)) return "y";
      return "";
    }

    function clampPointToPlot(point) {
      const { margin, innerW, innerH } = chartViewport;
      return {
        x: clamp(point.x, margin.left, margin.left + innerW),
        y: clamp(point.y, margin.top, margin.top + innerH),
      };
    }

    function updateHoverFromPointer(event) {
      if (state.tooltipPinned) return;
      if (!chartViewport || !chartHitTargets.length) return;
      const point = svgPointFromEvent(event);
      if (!pointInPlot(point)) {
        state.hoverHitSignature = "";
        state.dismissedTooltipKeys.clear();
        const pinned = pinnedTooltipRefs();
        if (!pinned.length) {
          clearTooltip({ keepPinned: true });
          return;
        }
        setHoverPoints(pinned);
        if (!sameTooltipRefs(pinned, state.lastTooltipItems)) {
          state.lastTooltipItems = pinned;
          refreshTooltip(currentChartRows);
        }
        return;
      }
      const hits = hitTargetsAt(point);
      if (!hits.length) {
        state.hoverHitSignature = "";
        state.dismissedTooltipKeys.clear();
        const pinned = pinnedTooltipRefs();
        if (!pinned.length) {
          clearTooltip({ keepPinned: true });
          return;
        }
        setHoverPoints(pinned);
        if (!sameTooltipRefs(pinned, state.lastTooltipItems)) {
          state.lastTooltipItems = pinned;
          refreshTooltip(currentChartRows);
        }
        return;
      }
      const signature = hits.map(hit => hit.key).join("|");
      if (signature !== state.hoverHitSignature) {
        state.hoverHitSignature = signature;
        state.dismissedTooltipKeys.clear();
      }
      const visibleHits = hits.filter(hit => !state.dismissedTooltipKeys.has(hit.key));
      const nextRefs = mergePinnedTooltipRefs(visibleHits);
      setHoverPoints(nextRefs);
      if (nextRefs.length && !sameTooltipRefs(nextRefs, state.lastTooltipItems)) {
        state.lastTooltipItems = nextRefs;
        refreshTooltip(currentChartRows);
      }
    }

    function handleChartClick(point) {
      if (!chartViewport || !pointInPlot(point)) {
        clearTooltip({ keepPinned: true });
        return;
      }
      const hits = hitTargetsAt(point);
      const visibleHits = state.tooltipPinned
        ? hits
        : hits.filter(hit => !state.dismissedTooltipKeys.has(hit.key));
      if (!visibleHits.length) {
        clearTooltip({ keepPinned: true });
        return;
      }
      pinTooltipItems(visibleHits);
    }

    function handleChartKeyDown(event) {
      if (isEditableTarget(event.target)) return;
      if (event.key === "Escape" && (state.tooltipPinned || state.lastTooltipItems.length)) {
        clearTooltip({ keepPinned: true });
        event.preventDefault();
        return;
      }
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if ((key === "p" || event.code === "Space") && state.lastTooltipItems.length) {
        if (state.tooltipPinned) {
          unpinTooltip();
        } else {
          pinTooltipItems(state.hoverPoints.length ? state.hoverPoints : state.lastTooltipItems);
        }
        event.preventDefault();
      }
    }

    function isEditableTarget(target) {
      if (!target) return false;
      const tagName = target.tagName ? target.tagName.toLowerCase() : "";
      return target.isContentEditable || ["input", "select", "textarea", "button"].includes(tagName);
    }

    function hitTargetsAt(point) {
      const transform = svgViewportTransform();
      return chartHitTargets
        .map(target => ({
          ...target,
          distance: Math.hypot(target.x - point.x, target.y - point.y) * transform.scale,
        }))
        .filter(target => target.distance <= CHART_HIT_RADIUS_PX)
        .sort((a, b) => a.distance - b.distance || a.order - b.order);
    }

    function invertScale(pixel, domain, range, logScale) {
      const ratio = (pixel - range[0]) / (range[1] - range[0]);
      const [d0, d1] = normalizeAxisDomain(domain[0], domain[1], logScale);
      if (logScale) {
        const s0 = axisSpaceValue(d0, true);
        const s1 = axisSpaceValue(d1, true);
        return valueFromAxisSpace(s0 + ratio * (s1 - s0), true);
      }
      return d0 + ratio * (d1 - d0);
    }

    function zoomDomainAround(domain, focalValue, factor, logScale) {
      if (!Number.isFinite(focalValue) || factor <= 0) return domain;
      if (logScale) {
        const d0 = Math.log10(Math.max(domain[0], 1e-9));
        const d1 = Math.log10(Math.max(domain[1], 1e-9));
        const focal = Math.log10(Math.max(focalValue, 1e-9));
        return [
          Math.pow(10, focal - (focal - d0) * factor),
          Math.pow(10, focal + (d1 - focal) * factor),
        ];
      }
      return [
        focalValue - (focalValue - domain[0]) * factor,
        focalValue + (domain[1] - focalValue) * factor,
      ];
    }

    function panDomainByPixels(domain, pixelDelta, range, logScale) {
      const first = invertScale(range[0] - pixelDelta, domain, range, logScale);
      const second = invertScale(range[1] - pixelDelta, domain, range, logScale);
      return [Math.min(first, second), Math.max(first, second)];
    }

    function constrainDomain(domain, baseDomain, logScale) {
      if (!domain || !baseDomain) return baseDomain;
      const toSpace = value => logScale ? Math.log10(Math.max(value, 1e-9)) : value;
      const fromSpace = value => logScale ? Math.pow(10, value) : value;
      let start = Math.min(toSpace(domain[0]), toSpace(domain[1]));
      let end = Math.max(toSpace(domain[0]), toSpace(domain[1]));
      const baseStart = Math.min(toSpace(baseDomain[0]), toSpace(baseDomain[1]));
      const baseEnd = Math.max(toSpace(baseDomain[0]), toSpace(baseDomain[1]));
      const baseSpan = Math.max(baseEnd - baseStart, 1e-9);
      let span = Math.max(end - start, baseSpan / 1_000_000, 1e-12);
      if (span >= baseSpan) return baseDomain.slice();
      const midpoint = (start + end) / 2;
      start = midpoint - span / 2;
      end = midpoint + span / 2;
      if (start < baseStart) {
        end += baseStart - start;
        start = baseStart;
      }
      if (end > baseEnd) {
        start -= end - baseEnd;
        end = baseEnd;
      }
      return [fromSpace(start), fromSpace(end)];
    }

    function sameDomain(a, b, logScale) {
      if (!a || !b) return false;
      const toSpace = value => logScale ? Math.log10(Math.max(value, 1e-9)) : value;
      const b0 = toSpace(b[0]);
      const b1 = toSpace(b[1]);
      const tolerance = Math.max(Math.abs(b1 - b0), 1) * 1e-8;
      return Math.abs(toSpace(a[0]) - b0) <= tolerance && Math.abs(toSpace(a[1]) - b1) <= tolerance;
    }

    function drawGridAndAxes(ctx) {
      const { width, height, margin, innerW, innerH, x, y, xDomain, yDomain } = ctx;
      const xTickPlan = buildAxisTickPlan(xDomain[0], xDomain[1], innerW, state.logX, {
        gridPixelGap: state.logX ? 72 : 78,
        labelPixelGap: 112,
        maxTicks: state.logX ? 96 : 48,
        minTicks: 4,
      });
      const yTickPlan = buildAxisTickPlan(yDomain[0], yDomain[1], innerH, state.logY, {
        gridPixelGap: state.logY ? 58 : 54,
        labelPixelGap: 46,
        maxTicks: state.logY ? 96 : 48,
        minTicks: 4,
      });
      const xTicks = xTickPlan.filter(item => item.label).map(item => item.value);
      const yTicks = yTickPlan.filter(item => item.label).map(item => item.value);
      const grid = svgEl("g", { class: "grid" });
      yTickPlan.forEach(({ value, major }) => {
        const gy = y(value);
        if (!Number.isFinite(gy) || gy < margin.top - 1 || gy > margin.top + innerH + 1) return;
        grid.appendChild(svgEl("line", {
          class: major ? "major-grid" : "minor-grid",
          x1: margin.left,
          x2: margin.left + innerW,
          y1: gy,
          y2: gy,
        }));
      });
      xTickPlan.forEach(({ value, major }) => {
        const gx = x(value);
        if (!Number.isFinite(gx) || gx < margin.left - 1 || gx > margin.left + innerW + 1) return;
        grid.appendChild(svgEl("line", {
          class: major ? "major-grid" : "minor-grid",
          x1: gx,
          x2: gx,
          y1: margin.top,
          y2: margin.top + innerH,
        }));
      });
      chart.appendChild(grid);

      const axis = svgEl("g", { class: "axis" });
      axis.appendChild(svgEl("line", { x1: margin.left, x2: margin.left + innerW, y1: margin.top + innerH, y2: margin.top + innerH }));
      axis.appendChild(svgEl("line", { x1: margin.left, x2: margin.left, y1: margin.top, y2: margin.top + innerH }));
      xTickPlan.forEach(({ value, major }) => {
        const gx = x(value);
        if (!Number.isFinite(gx) || gx < margin.left - 1 || gx > margin.left + innerW + 1) return;
        axis.appendChild(svgEl("line", {
          class: major ? "major-tick" : "minor-tick",
          x1: gx,
          x2: gx,
          y1: margin.top + innerH,
          y2: margin.top + innerH + (major ? 5 : 3),
        }));
        if (!major) return;
        const text = svgEl("text", { x: gx, y: margin.top + innerH + 22, "text-anchor": "middle" });
        text.textContent = formatAxisTick(value, xTicks, { compact: true });
        axis.appendChild(text);
      });
      yTickPlan.forEach(({ value, major }) => {
        const gy = y(value);
        if (!Number.isFinite(gy) || gy < margin.top - 1 || gy > margin.top + innerH + 1) return;
        axis.appendChild(svgEl("line", {
          class: major ? "major-tick" : "minor-tick",
          x1: margin.left - (major ? 5 : 3),
          x2: margin.left,
          y1: gy,
          y2: gy,
        }));
        if (!major) return;
        const text = svgEl("text", { x: margin.left - 10, y: gy + 4, "text-anchor": "end" });
        text.textContent = formatAxisTick(value, yTicks, { compact: true });
        axis.appendChild(text);
      });
      const xTitle = svgEl("text", { class: "axis-title", x: margin.left + innerW / 2, y: height - 22, "text-anchor": "middle" });
      xTitle.textContent = `${state.usePowerResearch && isBandMetric()
        ? localText("누적 연구력 (최초+추가 전원 포함)", "Cumulative research (first + additional power included)")
        : localText("누적 연구력 (최초 전원 포함)", "Cumulative research (first power included)")}${state.logX ? " (log)" : ""}`;
      axis.appendChild(xTitle);
      const yTitle = svgEl("text", {
        class: "axis-title",
        x: 18,
        y: margin.top + innerH / 2,
        transform: `rotate(-90 18 ${margin.top + innerH / 2})`,
        "text-anchor": "middle",
      });
      yTitle.textContent = `${metricLabel(state.metric)}${state.logY ? " (log)" : ""}`;
      axis.appendChild(yTitle);
      chart.appendChild(axis);
    }

    function groupedRows(rows) {
      const groups = new Map();
      rows.forEach(row => {
        if (!groups.has(row.familyKey)) groups.set(row.familyKey, []);
        groups.get(row.familyKey).push(row);
      });
      groups.forEach(group => group.sort((a, b) => rowUnlockResearchValue(a) - rowUnlockResearchValue(b) || a.baseDisplayName.localeCompare(b.baseDisplayName)));
      return groups;
    }

    function pointAttrs(row, powerOptionId, fill, stroke = "none", strokeWidth = 0) {
      const hovered = isHoveredPoint(row, powerOptionId);
      return {
        class: "data-point",
        "data-row-id": row.id,
        "data-power-option-id": powerOptionId || "",
        "data-default-stroke": stroke,
        "data-default-stroke-width": strokeWidth,
        fill,
        stroke: hovered ? "#fff" : stroke,
        "stroke-width": hovered ? 2.2 : strokeWidth,
      };
    }

    function pointKey(rowId, powerOptionId = null) {
      return `${rowId}::${powerOptionId || ""}`;
    }

    function tooltipRef(rowOrId, powerOptionId = null) {
      const rowId = typeof rowOrId === "object" ? (rowOrId.rowId || rowOrId.id) : rowOrId;
      const optionId = typeof rowOrId === "object" && rowOrId.powerOptionId !== undefined && powerOptionId === null
        ? rowOrId.powerOptionId
        : powerOptionId;
      const normalizedOptionId = optionId || "";
      return { rowId, powerOptionId: normalizedOptionId, key: pointKey(rowId, normalizedOptionId) };
    }

    function dedupeTooltipRefs(items) {
      const refs = [];
      const seen = new Set();
      (items || []).forEach(item => {
        const ref = tooltipRef(item);
        if (!ref.rowId || seen.has(ref.key)) return;
        seen.add(ref.key);
        refs.push(ref);
      });
      return refs;
    }

    function resolveTooltipRow(ref, rowById, rows) {
      const direct = rowById.get(ref.rowId);
      if (direct) return direct;
      const original = allDriveRowsById.get(ref.rowId);
      if (!original) return null;
      return rows.find(row => row.baseKey === original.baseKey
        && row.thrusterCount === state.thrusters
        && row.familyKey === original.familyKey)
        || rows.find(row => row.baseKey === original.baseKey && row.thrusterCount === state.thrusters)
        || null;
    }

    function isPinnedTooltipKey(key) {
      return state.pinnedTooltipItems.some(item => item.key === key);
    }

    function pinnedTooltipRefs() {
      const lastPinned = dedupeTooltipRefs(state.lastTooltipItems).filter(item => isPinnedTooltipKey(item.key));
      const included = new Set(lastPinned.map(item => item.key));
      const missingPinned = dedupeTooltipRefs(state.pinnedTooltipItems).filter(item => !included.has(item.key));
      return [...lastPinned, ...missingPinned];
    }

    function mergePinnedTooltipRefs(items) {
      const pinned = pinnedTooltipRefs();
      const pinnedKeys = new Set(pinned.map(item => item.key));
      const transient = dedupeTooltipRefs(items).filter(item => !pinnedKeys.has(item.key));
      return [...pinned, ...transient];
    }

    function syncPinnedTooltipOrder() {
      const pinnedKeys = new Set(state.pinnedTooltipItems.map(item => item.key));
      state.pinnedTooltipItems = dedupeTooltipRefs(state.lastTooltipItems).filter(item => pinnedKeys.has(item.key));
    }

    function sameTooltipRefs(left, right) {
      const a = dedupeTooltipRefs(left);
      const b = dedupeTooltipRefs(right);
      return a.length === b.length && a.every((item, index) => item.key === b[index].key);
    }

    function isHoveredPoint(row, powerOptionId = null) {
      const key = pointKey(row.id, powerOptionId);
      return state.hoverPoints.some(item => item.key === key);
    }

    function setHoverPoints(items) {
      state.hoverPoints = dedupeTooltipRefs(items);
      updateHoverStyles();
    }

    function registerHitTarget(row, powerOptionId, xCoord, yCoord, radius = 5) {
      if (!Number.isFinite(xCoord) || !Number.isFinite(yCoord) || !pointVisibleInPlot(xCoord, yCoord)) return;
      chartHitTargets.push({
        ...tooltipRef(row, powerOptionId),
        x: xCoord,
        y: yCoord,
        radius,
        order: chartHitTargets.length,
      });
    }

    function pointVisibleInPlot(xCoord, yCoord) {
      if (!chartViewport) return false;
      const { margin, innerW, innerH } = chartViewport;
      return xCoord >= margin.left
        && xCoord <= margin.left + innerW
        && yCoord >= margin.top
        && yCoord <= margin.top + innerH;
    }

    function updateHoverStyles() {
      const hoveredKeys = new Set(state.hoverPoints.map(item => item.key));
      chart.querySelectorAll(".data-point").forEach(point => {
        const hovered = hoveredKeys.has(pointKey(point.getAttribute("data-row-id"), point.getAttribute("data-power-option-id")));
        point.setAttribute("stroke", hovered ? "#fff" : (point.getAttribute("data-default-stroke") || "none"));
        point.setAttribute("stroke-width", hovered ? "2.2" : (point.getAttribute("data-default-stroke-width") || "0"));
      });
    }

    function drawMetricLines(rows, x, y, plot) {
      const groups = groupedRows(rows);
      groups.forEach(group => {
        const color = group[0].familyColor;
        const path = linePath(group.map(row => [x(rowUnlockResearchValue(row)), y(metricDefs[state.metric].value(row))]));
        plot.appendChild(svgEl("path", { d: path, fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.82 }));
        group.forEach(row => {
          const value = metricDefs[state.metric].value(row);
          if (!Number.isFinite(value) || value <= 0) return;
          const cx = x(rowUnlockResearchValue(row));
          const cy = y(value);
          const option = defaultTooltipOption(row);
          const powerOptionId = option ? option.id : null;
          registerHitTarget(row, powerOptionId, cx, cy, 5.5);
          const circle = svgEl("circle", { ...pointAttrs(row, powerOptionId, color), cx, cy, r: 5.5 });
          plot.appendChild(circle);
        });
      });
    }

    function chartResearchValues(rows) {
      const values = isBandMetric()
        ? rows.flatMap(row => {
          const base = rowUnlockResearchValue(row);
          if (!state.usePowerResearch) return [base];
          return [
            base,
            ...chartMassOptions(row).map(option => optionAdditionalResearchValue(row, option)),
          ];
        })
        : rows.map(row => rowUnlockResearchValue(row));
      return values.filter(value => Number.isFinite(value) && value > 0);
    }

    function optionAdditionalResearchValue(row, option = null) {
      if (!option) return rowUnlockResearchValue(row);
      const combined = Number(option.combinedCumulativeResearch);
      if (Number.isFinite(combined) && combined > 0) return combined;
      const plantResearch = Number(option.cumulativeResearch);
      return Math.max(rowUnlockResearchValue(row), Number.isFinite(plantResearch) ? plantResearch : 0);
    }

    function optionPowerResearchDelta(row, option = null) {
      if (!option || option.selfContained) return 0;
      const base = Number(row.cumulativeResearch) || 0;
      const combined = Number(option.combinedCumulativeResearch);
      if (Number.isFinite(combined)) return Math.max(0, combined - base);
      const plantResearch = Number(option.cumulativeResearch);
      return Math.max(0, (Number.isFinite(plantResearch) ? plantResearch : base) - base);
    }

    function optionResearchValue(row, option = null) {
      if (isBandMetric() && state.usePowerResearch && option) {
        return optionAdditionalResearchValue(row, option);
      }
      return rowUnlockResearchValue(row);
    }

    function optionX(row, option, x) {
      return x(optionResearchValue(row, option));
    }

    function drawTotalMassBands(rows, x, y, plot) {
      const pointData = bandPointData(rows);
      const secondaryDomain = secondaryEncodingDomain(pointData);
      const paretoKeys = state.paretoHighlight ? paretoPointKeys(pointData) : new Set();
      const groups = groupedRows(rows);
      groups.forEach(group => {
        const color = group[0].familyBandColor || group[0].familyColor;
        const colorOklch = group[0].familyBandColorOklch || color;
        const fillStyle = paintStyle("fill", color, colorOklch);
        const strokeStyle = paintStyle("stroke", color, colorOklch);
        const maxOptions = Math.max(...group.map(row => chartMassOptions(row).length), 0);
        if (state.usePowerResearch) {
          drawPowerResearchBandSurfaces(group, x, y, plot, color, fillStyle, strokeStyle);
        } else {
          for (let index = maxOptions - 2; index >= 0; index--) {
            const pairs = group
              .map(row => ({ row, options: chartMassOptions(row) }))
              .filter(item => item.options[index] && item.options[index + 1]);
            if (pairs.length < 2) continue;
            const upper = pairs.map(item => [optionX(item.row, item.options[index], x), y(optionMetricValue(item.options[index]))]);
            const lower = pairs.slice().reverse().map(item => [optionX(item.row, item.options[index + 1], x), y(optionMetricValue(item.options[index + 1]))]);
            const polygon = [...upper, ...lower];
            plot.appendChild(svgEl("path", {
              d: linePath(polygon) + "Z",
              fill: color,
              style: fillStyle,
              opacity: Math.max(0.06, 0.22 - index * 0.025),
              stroke: "none",
            }));
          }
          for (let index = 0; index < maxOptions; index++) {
            const points = group
              .map(row => ({ row, option: chartMassOptions(row)[index] }))
              .filter(item => item.option);
            if (points.length >= 2) {
              plot.appendChild(svgEl("path", {
                d: linePath(points.map(item => [optionX(item.row, item.option, x), y(optionMetricValue(item.option))])),
                fill: "none",
                stroke: color,
                style: strokeStyle,
                "stroke-width": index === 0 ? 2.1 : 1.2,
                "stroke-dasharray": index === 0 ? "" : "5 5",
                opacity: index === 0 ? 0.9 : 0.45,
              }));
            }
          }
        }
        group.forEach(row => {
          const options = chartMassOptions(row);
          if (!options.length) return;
          const optionPoints = options.map(option => ({
            option,
            xCoord: optionX(row, option, x),
            yCoord: y(optionMetricValue(option)),
          })).sort((a, b) => a.xCoord - b.xCoord || a.yCoord - b.yCoord);
          if (optionPoints.length > 1) {
            if (state.usePowerResearch) {
              plot.appendChild(svgEl("path", {
                d: linePath(optionPoints.map(point => [point.xCoord, point.yCoord])),
                fill: "none",
                stroke: color,
                style: strokeStyle,
                "stroke-width": 1.1,
                opacity: 0.28,
              }));
            } else {
              const gx = optionPoints[0].xCoord;
              const ys = optionPoints.map(point => point.yCoord);
              plot.appendChild(svgEl("line", { x1: gx, x2: gx, y1: Math.min(...ys), y2: Math.max(...ys), stroke: color, style: strokeStyle, "stroke-width": 1.2, opacity: 0.32 }));
            }
          }
          options.forEach((option, index) => {
            const gx = optionX(row, option, x);
            const cy = y(optionMetricValue(option));
            const key = pointKey(row.id, option.id);
            const visual = bandPointVisual(option, secondaryDomain, paretoKeys.has(key));
            const impractical = isImpracticalOption(option);
            registerHitTarget(row, option.id, gx, cy, index === 0 ? 5 : 3.4);
            const circle = svgEl("circle", {
              ...pointAttrs(row, option.id, index === 0 ? color : "var(--panel)", impractical ? "var(--danger)" : color, impractical ? 2 : 1.5),
              cx: gx,
              cy,
              r: index === 0 ? 5 : 3.4,
              style: `${index === 0 ? fillStyle : ""}${visual.style}`,
              opacity: impractical ? Math.max(visual.opacity * 0.78, 0.38) : visual.opacity,
              "data-impractical": impractical ? "true" : "false",
            });
            plot.appendChild(circle);
          });
        });
      });
    }

    function drawPowerResearchBandSurfaces(group, x, y, plot, color, fillStyle, strokeStyle) {
      const stepGroups = new Map();
      const pairGroups = new Map();
      const familyKey = group[0] ? group[0].familyKey : "";
      group.forEach(row => {
        const options = chartMassOptions(row);
        options.forEach((option, index) => {
          const step = powerStepIndex(option, index);
          if (!stepGroups.has(step)) stepGroups.set(step, []);
          stepGroups.get(step).push({ row, option, index: step });
          const next = options[index + 1];
          if (next) {
            const nextStep = powerStepIndex(next, index + 1);
            const pairKey = `${step}::${nextStep}`;
            if (!pairGroups.has(pairKey)) pairGroups.set(pairKey, []);
            pairGroups.get(pairKey).push({ row, upper: option, lower: next, index: step, lowerIndex: nextStep });
          }
        });
      });

      pairGroups.forEach((pairs, pairKey) => {
        if (pairs.length < 2) return;
        const ordered = pairs.slice().sort((a, b) => pairSortValue(a) - pairSortValue(b)
          || rowUnlockResearchValue(a.row) - rowUnlockResearchValue(b.row)
          || a.row.baseDisplayName.localeCompare(b.row.baseDisplayName));
        const upper = ordered.map(item => [optionX(item.row, item.upper, x), y(optionMetricValue(item.upper))]);
        const lower = ordered.slice().reverse().map(item => [optionX(item.row, item.lower, x), y(optionMetricValue(item.lower))]);
        const avgIndex = ordered.reduce((sum, item) => sum + item.index, 0) / ordered.length;
        plot.appendChild(svgEl("path", {
          d: linePath([...upper, ...lower]) + "Z",
          fill: color,
          style: fillStyle,
          opacity: Math.max(0.05, 0.18 - avgIndex * 0.02),
          stroke: "none",
          "data-band-family": familyKey,
          "data-band-pair-step": pairKey,
        }));
      });

      stepGroups.forEach((points, step) => {
        if (points.length < 2) return;
        const ordered = points.slice().sort((a, b) => optionResearchValue(a.row, a.option) - optionResearchValue(b.row, b.option)
          || rowUnlockResearchValue(a.row) - rowUnlockResearchValue(b.row)
          || a.row.baseDisplayName.localeCompare(b.row.baseDisplayName));
        const avgIndex = ordered.reduce((sum, item) => sum + item.index, 0) / ordered.length;
        plot.appendChild(svgEl("path", {
          d: linePath(ordered.map(item => [optionX(item.row, item.option, x), y(optionMetricValue(item.option))])),
          fill: "none",
          stroke: color,
          style: strokeStyle,
          "stroke-width": avgIndex < 0.5 ? 2.1 : 1.2,
          "stroke-dasharray": avgIndex < 0.5 ? "" : "5 5",
          opacity: avgIndex < 0.5 ? 0.9 : 0.45,
          "data-band-family": familyKey,
          "data-band-step": step,
        }));
      });
    }

    function powerStepIndex(option, fallbackIndex = 0) {
      const value = Number(option && option.sequenceIndex);
      return Number.isFinite(value) ? value : fallbackIndex;
    }

    function pairSortValue(item) {
      return (optionResearchValue(item.row, item.upper) + optionResearchValue(item.row, item.lower)) / 2;
    }

    function bandPointData(rows) {
      return rows.flatMap(row => chartMassOptions(row).map(option => ({
        row,
        option,
        key: pointKey(row.id, option.id),
        research: optionResearchValue(row, option),
        totalMassTons: option.totalMassTons,
        twr: option.twr,
      }))).filter(item => Number.isFinite(item.research)
        && Number.isFinite(item.totalMassTons)
        && Number.isFinite(item.twr)
        && item.totalMassTons > 0
        && item.twr > 0);
    }

    function secondaryEncodingEnabled() {
      return ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.showTwrInfo)
        || (state.metric === "twr" && state.showMassInfo);
    }

    function secondaryEncodingDomain(points) {
      if (!secondaryEncodingEnabled()) return null;
      const scores = points.map(item => secondaryScore(item.option)).filter(Number.isFinite);
      if (!scores.length) return null;
      return { min: Math.min(...scores), max: Math.max(...scores) };
    }

    function secondaryScore(option) {
      if (state.metric === "totalMassTons" || state.metric === "fuelMassTons") {
        return Math.log10(Math.max(option.twr, 1e-12));
      }
      if (state.metric === "twr") {
        return -Math.log10(Math.max(option.totalMassTons, 1e-9));
      }
      return NaN;
    }

    function bandPointVisual(option, secondaryDomain, pareto) {
      let normalized = 0.72;
      if (secondaryDomain) {
        const span = Math.max(secondaryDomain.max - secondaryDomain.min, 1e-9);
        normalized = clamp((secondaryScore(option) - secondaryDomain.min) / span, 0, 1);
      }
      const encodedOpacity = secondaryDomain ? 0.42 + normalized * 0.58 : 0.88;
      const paretoOpacity = state.paretoHighlight && !pareto ? 0.28 : 1;
      const brightness = secondaryDomain ? 0.68 + normalized * 0.72 : 1;
      return {
        opacity: clamp(encodedOpacity * paretoOpacity, 0.12, 1),
        style: `filter:brightness(${brightness.toFixed(2)});`,
      };
    }

    function paretoPointKeys(points) {
      const result = new Set();
      points.forEach(candidate => {
        const dominated = points.some(other => other.key !== candidate.key
          && other.research <= candidate.research
          && other.totalMassTons <= candidate.totalMassTons
          && other.twr >= candidate.twr
          && (other.research < candidate.research
            || other.totalMassTons < candidate.totalMassTons
            || other.twr > candidate.twr));
        if (!dominated) result.add(candidate.key);
      });
      return result;
    }

    function isBandMetric(metric = state.metric) {
      return metric === "totalMassTons" || metric === "fuelMassTons" || metric === "twr";
    }

    function optionMetricValue(option, metric = state.metric) {
      if (metric === "twr") return option.twr;
      if (metric === "fuelMassTons") return option.propellantTons;
      return option.totalMassTons;
    }

    function defaultTooltipOption(row) {
      const options = chartMassOptions(row, state.metric);
      return options[0] || massOptions(row)[0] || null;
    }

    function linePath(points) {
      return points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ");
    }

    function svgEl(name, attrs) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attrs || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) el.setAttribute(key, String(value));
      });
      return el;
    }

    function paintStyle(property, fallback, preferred) {
      const base = fallback || "#64748b";
      const paint = preferred || base;
      return `${property}:${base};${property}:${paint};`;
    }

    function backgroundStyle(fallback, preferred) {
      return paintStyle("background", fallback, preferred);
    }

    function tooltipPanelHtml(items) {
      const pinnedText = UI_LANG === "en" ? "Pinned" : "고정됨";
      const pinnedCardText = UI_LANG === "en" ? "pinned cards" : "고정 카드";
      const countText = UI_LANG === "en" ? `${items.length} selected` : `선택 항목 ${items.length}개`;
      const statusParts = [];
      if (state.tooltipPinned) statusParts.push(`<span class="tooltip-pin">${pinnedText}</span>`);
      const pinnedCount = items.filter(item => isPinnedTooltipKey(item.key)).length;
      if (pinnedCount) statusParts.push(`<span class="tooltip-pin">${pinnedCount} ${pinnedCardText}</span>`);
      if (items.length > 1) statusParts.push(countText);
      const count = statusParts.length ? `<div class="tooltip-count">${statusParts.join("")}</div>` : "";
      return `
        <button class="tooltip-close" type="button" aria-label="선택 해제">&times;</button>
        ${count}
        <div class="tooltip-items">
          ${items.map((item, index) => tooltipHtml(item.row, item.option, item.key, index, items.length)).join("")}
        </div>
      `;
    }

    function pinTooltipItems(items) {
      const refs = dedupeTooltipRefs(items);
      if (!refs.length) {
        clearTooltip();
        return;
      }
      state.tooltipPinned = true;
      state.dismissedTooltipKeys.clear();
      const nextRefs = dedupeTooltipRefs([...state.lastTooltipItems, ...refs]);
      state.hoverHitSignature = nextRefs.map(item => item.key).join("|");
      state.lastTooltipItems = nextRefs;
      setHoverPoints(nextRefs);
      refreshTooltip(currentChartRows);
    }

    function unpinTooltip() {
      state.tooltipPinned = false;
      state.hoverHitSignature = "";
      state.dismissedTooltipKeys.clear();
      refreshTooltip(currentChartRows);
    }

    function tooltipHtml(row, option = null, key = "", index = 0, itemCount = 1) {
      const metrics = tooltipMetricsHtml(row, option);
      const selected = option ? tooltipBreakdownHtml(row, option) : "";
      const powerName = option ? option.displayName : (UI_LANG === "en" ? "No power plant candidate" : "전원 후보 없음");
      const pinned = isPinnedTooltipKey(key);
      const pinLabel = UI_LANG === "en" ? (pinned ? "Unpin this card" : "Pin this card") : (pinned ? "이 카드 고정 해제" : "이 카드 고정");
      return `
        <section class="tooltip-item${pinned ? " is-pinned" : ""}" data-tooltip-key="${escapeHtml(key)}">
          <div class="tooltip-item-order" aria-label="순서 변경">
            <button class="tooltip-item-move" type="button" data-tooltip-key="${escapeHtml(key)}" data-direction="up" aria-label="위로 이동"${index === 0 ? " disabled" : ""}>▲</button>
            <button class="tooltip-item-move" type="button" data-tooltip-key="${escapeHtml(key)}" data-direction="down" aria-label="아래로 이동"${index >= itemCount - 1 ? " disabled" : ""}>▼</button>
          </div>
          <div class="tooltip-item-actions">
            <button class="tooltip-item-close" type="button" data-tooltip-key="${escapeHtml(key)}" aria-label="항목 삭제">&times;</button>
            <button class="tooltip-item-pin" type="button" data-tooltip-key="${escapeHtml(key)}" aria-label="${escapeHtml(pinLabel)}" aria-pressed="${pinned ? "true" : "false"}">📌</button>
          </div>
          <h2>${escapeHtml(row.displayName)}<span class="tooltip-title-power">${escapeHtml(powerName)}</span></h2>
          <div class="muted">${escapeHtml(rowCategoryLabel(row))} / ${escapeHtml(rowFamilyLabel(row))} · ${escapeHtml(rowProjectLabel(row))}</div>
          ${metrics}
          ${selected}
        </section>
      `;
    }

    function tooltipMetricsHtml(row, option = null) {
      const powerResearch = Math.max(
        0,
        option ? optionPowerResearchDelta(row, option) : (row.powerResearchCost || 0),
      );
      const driveResearch = Math.max(0, row.cumulativeResearch - row.ownResearchCost);
      const projectResearch = Math.max(0, row.ownResearchCost);
      const unlockResearch = Math.max(0, driveResearch + projectResearch + powerResearch);
      const researchTotal = Math.max(driveResearch + projectResearch + powerResearch, 1e-9);
      const twrValue = option ? option.twr : (defaultTooltipOption(row)?.twr ?? NaN);
      const researchRows = [
        [UI_LANG === "en" ? "Unlock research" : "개방 연구력", formatResearch(unlockResearch), true],
        [UI_LANG === "en" ? "Drive research" : "드라이브 연구", formatResearch(driveResearch), false],
        [UI_LANG === "en" ? "Project research" : "프로젝트 연구", formatResearch(projectResearch), false],
        [UI_LANG === "en" ? "Power research" : "전원 연구", formatResearch(powerResearch), false],
      ];
      const performanceRows = [
        [UI_LANG === "en" ? "Thrust" : "추력", formatNumber(row.thrustN / 1e6, " MN")],
        [UI_LANG === "en" ? "TWR" : "TWR", formatTwr(twrValue, " g")],
        [UI_LANG === "en" ? "Exhaust velocity" : "EV", formatNumber(row.exhaustVelocityKps, " km/s")],
        [UI_LANG === "en" ? "Efficiency" : "효율", formatPercent(row.efficiency)],
        [UI_LANG === "en" ? "Power requirement" : "출력 요구량", formatNumber(row.powerRequirementGW, " GW")],
      ];
      return `
        <details class="tooltip-section" open>
          <summary>${UI_LANG === "en" ? "Performance detail" : "성능 상세"}</summary>
          <div class="tooltip-section-body">
            <div class="tooltip-metrics">
              ${performanceRows.map(([label, value]) => `
                <div class="tooltip-metric">
                  <div class="tooltip-metric-label">${escapeHtml(label)}</div>
                  <div class="tooltip-metric-value">${escapeHtml(value)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </details>
        <details class="tooltip-section" open>
          <summary>${UI_LANG === "en" ? "Research detail" : "연구 상세"}</summary>
          <div class="tooltip-section-body">
            <div class="tooltip-metric is-emphasis">
              <div class="tooltip-metric-label">${escapeHtml(UI_LANG === "en" ? "Unlock research total" : "개방 연구력 합계")}</div>
              <div class="tooltip-metric-value">${escapeHtml(formatResearch(unlockResearch))}</div>
            </div>
            <div class="tooltip-ratio" aria-hidden="true">
              <span class="research-drive" style="width:${clamp(driveResearch / researchTotal * 100, 0, 100).toFixed(2)}%" title="${escapeHtml(UI_LANG === "en" ? "Drive research" : "드라이브 연구")}: ${escapeHtml(formatResearch(driveResearch))}"></span>
              <span class="research-project" style="width:${clamp(projectResearch / researchTotal * 100, 0, 100).toFixed(2)}%" title="${escapeHtml(UI_LANG === "en" ? "Project research" : "프로젝트 연구")}: ${escapeHtml(formatResearch(projectResearch))}"></span>
              <span class="research-power" style="width:${clamp(powerResearch / researchTotal * 100, 0, 100).toFixed(2)}%" title="${escapeHtml(UI_LANG === "en" ? "Power research" : "전원 연구")}: ${escapeHtml(formatResearch(powerResearch))}"></span>
            </div>
            <div class="tooltip-metrics">
              ${researchRows.slice(1).map(([label, value]) => `
                <div class="tooltip-metric">
                  <div class="tooltip-metric-label">${escapeHtml(label)}</div>
                  <div class="tooltip-metric-value">${escapeHtml(value)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </details>
      `;
    }

    function tooltipBreakdownHtml(row, option) {
      const totalLabel = UI_LANG === "en" ? "Total mass" : "총질량";
      const components = [
        [UI_LANG === "en" ? "Hull" : "선체", option.baseDryTons, "stack-hull"],
        [UI_LANG === "en" ? "Drive" : "드라이브", row.driveMassTons, "stack-drive"],
        [UI_LANG === "en" ? "Power plant" : "전원", option.powerPlantMassTons, "stack-reactor"],
        [UI_LANG === "en" ? "Radiator" : "라디에이터", option.radiatorMassTons, "stack-radiator"],
        [UI_LANG === "en" ? "Propellant" : "추진체", option.propellantTons, "stack-propellant"],
      ];
      const total = Math.max(option.totalMassTons, 1e-9);
      const impracticalNote = isImpracticalOption(option)
        ? `<div class="warning">${UI_LANG === "en" ? "Shown as an impractical candidate under the current scenario." : "현재 시나리오에서 비현실적 후보로 표시 중입니다."}</div>`
        : "";
      const componentRows = components.map(([label, value]) => `
            <span>${label}</span><strong>${formatNumber(value, " t")}</strong>
      `).join("");
      const componentSegments = components.map(([label, value, className]) => {
        const share = clamp(value / total * 100, 0, 100);
        return `<span class="${className}" style="width:${share.toFixed(2)}%" title="${label}: ${formatNumber(value, " t")}"></span>`;
      }).join("");
      return `
        <details class="tooltip-section tooltip-breakdown" open>
          <summary>${UI_LANG === "en" ? "Mass breakdown" : "총질량 breakdown"}</summary>
          <div class="tooltip-section-body">
            <div><strong>${totalLabel}</strong>: ${formatNumber(option.totalMassTons, " t")}</div>
            ${impracticalNote}
            <div class="tooltip-breakdown-grid">
              ${componentRows}
            </div>
            <div class="tooltip-stack" aria-hidden="true">
              ${componentSegments}
            </div>
            <div class="muted">${UI_LANG === "en" ? "Waste heat" : "폐열"}: ${formatNumber(option.wasteHeatGW, " GW")}</div>
          </div>
        </details>
      `;
    }

    function resolveTooltipItems(rows) {
      const rowById = new Map(rows.map(row => [row.id, row]));
      const resolved = [];
      const seen = new Set();
      state.lastTooltipItems.forEach(item => {
        const ref = tooltipRef(item);
        const row = resolveTooltipRow(ref, rowById, rows);
        if (!row) return;
        const options = chartMassOptions(row, state.metric);
        const option = options.find(candidate => candidate.id === ref.powerOptionId) || defaultTooltipOption(row);
        if (!option) return;
        const powerOptionId = option.id || "";
        const key = pointKey(row.id, powerOptionId);
        if (seen.has(key)) return;
        seen.add(key);
        resolved.push({ row, option, rowId: row.id, powerOptionId, key, sourceKey: ref.key });
      });
      return resolved;
    }

    function refreshTooltip(rows = currentChartRows) {
      if (!state.lastTooltipItems.length) {
        renderEmptyTooltip();
        return;
      }
      const resolved = resolveTooltipItems(rows);
      if (!resolved.length) {
        clearTooltip();
        return;
      }
      const pinnedKeys = new Set(state.pinnedTooltipItems.map(item => item.key));
      const hoverKeys = new Set(state.hoverPoints.map(item => item.key));
      state.lastTooltipItems = resolved.map(item => tooltipRef(item.rowId, item.powerOptionId));
      state.pinnedTooltipItems = resolved
        .filter(item => pinnedKeys.has(item.sourceKey) || pinnedKeys.has(item.key))
        .map(item => tooltipRef(item.rowId, item.powerOptionId));
      const nextPinnedKeys = new Set(state.pinnedTooltipItems.map(item => item.key));
      state.hoverPoints = resolved
        .filter(item => hoverKeys.has(item.sourceKey) || hoverKeys.has(item.key) || nextPinnedKeys.has(item.key))
        .map(item => tooltipRef(item.rowId, item.powerOptionId));
      tooltip.innerHTML = tooltipPanelHtml(resolved);
      tooltip.classList.remove("tooltip-empty");
      tooltip.classList.remove("has-diagnostic");
      tooltip.classList.remove("has-panel");
      updateHoverStyles();
    }

    function moveTooltipItemByOffset(key, offset) {
      if (!key || !offset) return;
      const refs = dedupeTooltipRefs(state.lastTooltipItems);
      const index = refs.findIndex(item => item.key === key);
      if (index < 0) return;
      const nextIndex = clamp(index + offset, 0, refs.length - 1);
      if (nextIndex === index) return;
      const [moving] = refs.splice(index, 1);
      refs.splice(nextIndex, 0, moving);
      state.lastTooltipItems = refs;
      syncPinnedTooltipOrder();
      const hoveredKeys = new Set(state.hoverPoints.map(item => item.key));
      if (hoveredKeys.size) {
        state.hoverPoints = refs.filter(item => hoveredKeys.has(item.key));
      }
      refreshTooltip(currentChartRows);
    }

    function toggleTooltipItemPin(key) {
      if (!key) return;
      const refs = dedupeTooltipRefs(state.lastTooltipItems);
      const ref = refs.find(item => item.key === key);
      if (!ref) return;
      if (isPinnedTooltipKey(key)) {
        state.pinnedTooltipItems = state.pinnedTooltipItems.filter(item => item.key !== key);
      } else {
        state.pinnedTooltipItems = dedupeTooltipRefs([...state.pinnedTooltipItems, ref]);
      }
      state.lastTooltipItems = mergePinnedTooltipRefs(refs);
      setHoverPoints(mergePinnedTooltipRefs(state.hoverPoints));
      refreshTooltip(currentChartRows);
    }

    function removeTooltipItem(key) {
      if (!key) return;
      state.dismissedTooltipKeys.add(key);
      state.lastTooltipItems = state.lastTooltipItems.filter(item => tooltipRef(item).key !== key);
      state.hoverPoints = state.hoverPoints.filter(item => item.key !== key);
      state.pinnedTooltipItems = state.pinnedTooltipItems.filter(item => item.key !== key);
      if (state.lastTooltipItems.length) {
        refreshTooltip(currentChartRows);
      } else {
        clearTooltip();
      }
      updateHoverStyles();
    }

    function renderEmptyTooltip() {
      const family = currentDiagnostics && currentDiagnostics.zeroFamilies.length
        ? currentDiagnostics.zeroFamilies[0]
        : null;
      if (family) {
        tooltip.innerHTML = scenarioPanelHtml(family, currentDiagnostics.zeroFamilies.length);
        tooltip.classList.add("has-diagnostic");
        tooltip.classList.remove("has-panel");
      } else {
        tooltip.innerHTML = usagePanelHtml();
        tooltip.classList.remove("has-diagnostic");
        tooltip.classList.add("has-panel");
      }
      tooltip.classList.add("tooltip-empty");
    }

    function clearTooltip(options = {}) {
      const keepPinned = !!options.keepPinned;
      const pinnedRefs = keepPinned ? pinnedTooltipRefs() : [];
      state.lastTooltipItems = pinnedRefs;
      state.hoverPoints = pinnedRefs;
      state.tooltipPinned = false;
      if (!keepPinned) state.pinnedTooltipItems = [];
      state.dismissedTooltipKeys.clear();
      state.hoverHitSignature = pinnedRefs.map(item => item.key).join("|");
      if (pinnedRefs.length) {
        refreshTooltip(currentChartRows);
      } else {
        renderEmptyTooltip();
      }
      updateHoverStyles();
    }

    function usagePanelHtml() {
      if (UI_LANG === "en") {
        return `
          <div class="usage-panel">
            <h2>How to use detail cards</h2>
            <p>Hover over a chart point to show its total-mass/TWR card here. Click a point to keep the current card set while you inspect other parts of the chart.</p>
            <ul>
              <li>Use Pin on an individual card to keep that drive visible while hovering over distant candidates.</li>
              <li>Use the arrow buttons to reorder cards, and the x button to remove cards that are no longer useful.</li>
              <li>For total-mass and TWR charts, compare the mass breakdown, wet-mass TWR, and power plant line together before choosing a research path.</li>
            </ul>
          </div>
        `;
      }
      return `
        <div class="usage-panel">
          <h2>상세 카드 사용법</h2>
          <p>차트의 데이터포인트에 마우스를 올리면 해당 추진기와 전원 조합의 총질량/TWR 카드가 이 영역에 표시됩니다. 데이터포인트를 클릭하면 현재 카드 묶음을 유지한 채 다른 지점을 살펴볼 수 있습니다.</p>
          <ul>
            <li>개별 카드의 핀 버튼을 누르면 서로 멀리 떨어진 후보를 계속 남겨 두고 비교할 수 있습니다.</li>
            <li>화살표 버튼으로 카드 순서를 바꾸고, x 버튼으로 더 이상 필요 없는 카드를 삭제할 수 있습니다.</li>
            <li>총질량/TWR 그래프에서는 질량 breakdown, 습질량 TWR, 전원 계열을 함께 보면서 어떤 연구 계통에 투자할지 판단하세요.</li>
          </ul>
        </div>
      `;
    }

    function scenarioPanelHtml(family, zeroFamilyCount) {
      const title = UI_LANG === "en" ? "Why are some drives hidden?" : "왜 일부 드라이브가 숨겨졌나요?";
      const body = scenarioExplanationText(family);
      const suggestions = scenarioSuggestions();
      const more = zeroFamilyCount > 1
        ? (UI_LANG === "en"
          ? `<p>${zeroFamilyCount - 1} additional selected ${zeroFamilyCount - 1 === 1 ? "family is" : "families are"} also hidden under this scenario.</p>`
          : `<p>이 외에도 선택된 계열 ${zeroFamilyCount - 1}개가 현재 시나리오에서 숨겨져 있습니다.</p>`)
        : "";
      return `
        <div class="scenario-panel">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(body)}</p>
          ${more}
          <div>
            <div class="muted">${escapeHtml(UI_LANG === "en" ? "Suggestions" : "제안")}</div>
            <ul>
              ${suggestions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }

    function scenarioExplanationText(family) {
      const familyName = localLabel(family);
      const dryMass = formatNumber(state.dryMassTons, " t");
      const targetDv = formatNumber(state.targetDvKps, UI_LANG === "en" ? " km/s" : " km/s");
      const reason = family.dominantReason;
      if (reason === "minTwr") {
        return UI_LANG === "en"
          ? `At ${dryMass} dry mass and ${targetDv} target dV, ${familyName} drives exist, but none meet the current minimum TWR filter. In this scenario their propellant mass can become very large, lowering wet-mass TWR.`
          : `건조질량 ${dryMass}, 목표 dV ${targetDv} 조건에서 ${familyName} 드라이브는 존재하지만 현재 최소 TWR 필터를 만족하지 못합니다. 이 시나리오에서는 추진체 질량이 매우 커져 습질량 TWR이 낮아질 수 있습니다.`;
      }
      if (reason === "targetDvOrMassRatio") {
        return UI_LANG === "en"
          ? `At ${dryMass} dry mass and ${targetDv} target dV, ${familyName} drives exist, but the required mass ratio is extreme for the current scenario.`
          : `건조질량 ${dryMass}, 목표 dV ${targetDv} 조건에서 ${familyName} 드라이브는 존재하지만 현재 시나리오의 요구 질량비가 극단적으로 큽니다.`;
      }
      if (reason === "invalidPowerPlant") {
        return UI_LANG === "en"
          ? `${familyName} drives exist, but no compatible power candidate can be evaluated under the current scenario.`
          : `${familyName} 드라이브는 존재하지만 현재 시나리오에서 평가 가능한 호환 전원 후보가 없습니다.`;
      }
      if (reason === "researchFilter") {
        return UI_LANG === "en"
          ? `${familyName} drives exist, but their research unlock values are not usable under the current data filters.`
          : `${familyName} 드라이브는 존재하지만 현재 데이터 필터에서 연구 개방값을 사용할 수 없습니다.`;
      }
      if (reason === "invalidComputation") {
        return UI_LANG === "en"
          ? `${familyName} drives exist, but the current scenario does not produce finite mass or TWR values for them.`
          : `${familyName} 드라이브는 존재하지만 현재 시나리오에서 유한한 질량 또는 TWR 값을 계산할 수 없습니다.`;
      }
      return UI_LANG === "en"
        ? `${familyName} drives exist, but none are visible under the current axis, scenario, and filter settings.`
        : `${familyName} 드라이브는 존재하지만 현재 축, 시나리오, 필터 설정에서는 표시되는 후보가 없습니다.`;
    }

    function scenarioSuggestions() {
      const suggestions = UI_LANG === "en"
        ? ["Lower target dV", "Lower or disable the minimum TWR filter", "Use a lower-dV scenario for this drive family"]
        : ["목표 dV 낮추기", "최소 TWR 필터 낮추기 또는 해제하기", "이 드라이브 계열에 맞는 낮은 dV 시나리오 사용하기"];
      suggestions.push(UI_LANG === "en" ? "Enable Show impractical candidates" : "비현실적 후보 표시 켜기");
      return suggestions;
    }

    function renderTable(rows) {
      const tbody = document.getElementById("tableBody");
      tbody.innerHTML = "";
      const maxResearch = Math.max(...rows.map(rowUnlockResearchValue).filter(Number.isFinite), 1);
      const metricDomain = tableMetricDomain(rows);
      const sorted = sortRows(rows);
      sorted.forEach(row => {
        const tr = document.createElement("tr");
        const powerOptions = isBandMetric() ? chartMassOptions(row) : massOptions(row);
        const powerCell = powerOptions.length
          ? reactorBandLabel(powerOptions)
          : `<span class="warning">없음</span>`;
        tr.innerHTML = `
          <td><div class="drive-name">${escapeHtml(row.displayName)}</div><div class="project-name">${escapeHtml(rowProjectLabel(row))}</div></td>
          <td><span class="pill"><span class="family-swatch" style="${backgroundStyle(row.familyColor, row.familyColorOklch || row.familyColor)}"></span>${escapeHtml(rowCategoryLabel(row))} / ${escapeHtml(rowFamilyLabel(row))}</span></td>
          <td class="numeric">${researchCell(row, maxResearch)}</td>
          <td class="numeric">${metricCell(row, metricDomain)}</td>
          <td>${powerCell}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function sortRows(rows) {
      const direction = state.sortDirection === "asc" ? 1 : -1;
      return rows.slice().sort((a, b) => {
        const aValue = sortValue(a, state.sortKey);
        const bValue = sortValue(b, state.sortKey);
        let result;
        if (typeof aValue === "number" && typeof bValue === "number") {
          result = aValue - bValue;
        } else {
          result = String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, { numeric: true, sensitivity: "base" });
        }
        if (result === 0) {
          result = rowUnlockResearchValue(a) - rowUnlockResearchValue(b) || a.displayName.localeCompare(b.displayName);
        }
        return result * direction;
      });
    }

    function sortValue(row, key) {
      if (key === "drive") return row.displayName;
      if (key === "family") return `${rowCategoryLabel(row)} / ${rowFamilyLabel(row)}`;
      if (key === "research") return rowUnlockResearchValue(row);
      if (key === "metric") return metricDefs[state.metric].value(row);
      if (key === "reactor") {
        const options = massOptions(row);
        return options.length ? reactorBandText(options) : "";
      }
      return rowUnlockResearchValue(row);
    }

    function researchCell(row, maxResearch) {
      const research = rowUnlockResearchValue(row);
      const width = clamp(research / maxResearch * 100, 0, 100);
      return `
        <div class="cell-viz" title="${formatNumber(research, " research")}">
          <span class="cell-value">${formatResearch(research)}</span>
          <div class="sparkbar" aria-hidden="true"><span class="spark-fill" style="width:${width.toFixed(2)}%"></span></div>
        </div>
      `;
    }

    function tableMetricDomain(rows) {
      const values = rows.flatMap(row => {
        if (isBandMetric()) {
          return optionRange(row).values;
        }
        const value = metricDefs[state.metric].value(row);
        return Number.isFinite(value) && value > 0 ? [value] : [];
      });
      if (!values.length) return { min: 0, max: 1, log: false };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const log = shouldUseSparkLog(values);
      return { min, max, log };
    }

    function shouldUseSparkLog(values) {
      const positive = values.filter(value => Number.isFinite(value) && value > 0);
      if (!positive.length) return false;
      const min = Math.min(...positive);
      const max = Math.max(...positive);
      if (state.metric === "totalMassTons" || state.metric === "fuelMassTons") return true;
      return min > 0 && max / min >= 50;
    }

    function metricCell(row, domain) {
      if (isBandMetric()) {
        return rangeMetricCell(row, domain);
      }
      const value = metricDefs[state.metric].value(row);
      if (!Number.isFinite(value)) return "-";
      const position = sparkPosition(value, domain);
      return `
        <div class="cell-viz" title="${metricDefs[state.metric].format(value)}${domain.log ? " · log sparkline" : ""}">
          <span class="cell-value">${metricDefs[state.metric].format(value)}</span>
          <div class="sparkbar" aria-hidden="true"><span class="spark-fill" style="width:${position.toFixed(2)}%"></span></div>
        </div>
      `;
    }

    function optionRange(row) {
      const options = isBandMetric() ? chartMassOptions(row) : massOptions(row);
      const values = options.map(option => optionMetricValue(option)).filter(Number.isFinite);
      if (!values.length) return { values: [], min: NaN, max: NaN };
      return { values, min: Math.min(...values), max: Math.max(...values) };
    }

    function rangeMetricCell(row, domain) {
      const range = optionRange(row);
      if (!range.values.length) return "-";
      const left = sparkPosition(range.min, domain);
      const right = sparkPosition(range.max, domain);
      const width = Math.max(right - left, 0.5);
      const formatter = metricDefs[state.metric].format;
      return `
        <div class="cell-viz" title="${formatter(range.min)} - ${formatter(range.max)}${domain.log ? " · log sparkline" : ""}">
          <span class="cell-value">${formatter(range.min)} - ${formatter(range.max)}</span>
          <div class="sparkrange" aria-hidden="true"><span class="sparkrange-fill" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></span></div>
        </div>
      `;
    }

    function sparkPosition(value, domain) {
      if (!Number.isFinite(value)) return 0;
      if (domain.log) {
        const min = Math.max(domain.min, 1e-9);
        const max = Math.max(domain.max, min * 1.01);
        const span = Math.max(Math.log10(max) - Math.log10(min), 1e-9);
        return clamp((Math.log10(Math.max(value, 1e-9)) - Math.log10(min)) / span * 100, 0, 100);
      }
      const span = Math.max(domain.max - domain.min, 1e-9);
      return clamp((value - domain.min) / span * 100, 0, 100);
    }

    function reactorBandLabel(options) {
      return escapeHtml(reactorBandText(options));
    }

    function reactorBandText(options) {
      if (!options.length) return "";
      const first = String(options[0].displayName || "");
      if (options.length === 1) return first;
      const last = String(options[options.length - 1].displayName || "");
      const firstRoman = splitRomanSuffix(first);
      const lastRoman = splitRomanSuffix(last);
      if (firstRoman && lastRoman && firstRoman.base === lastRoman.base) {
        return `${first} → ${lastRoman.roman}`;
      }
      return `${first} → ${last}`;
    }

    function splitRomanSuffix(value) {
      const match = String(value).match(/^(.*\S)\s+([IVXLCDM]+)$/);
      if (!match) return null;
      return { base: match[1], roman: match[2] };
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char]));
    }

    function formatResearch(value) {
      if (!Number.isFinite(value)) return "-";
      return formatCompact(value, 1_000);
    }

    function tickMinGap(ticks) {
      if (!Array.isArray(ticks) || ticks.length < 2) return NaN;
      let gap = Infinity;
      for (let index = 1; index < ticks.length; index++) {
        const delta = Math.abs(ticks[index] - ticks[index - 1]);
        if (Number.isFinite(delta) && delta > 0) gap = Math.min(gap, delta);
      }
      return gap === Infinity ? NaN : gap;
    }

    function fractionDigitsForStep(step) {
      if (!Number.isFinite(step) || step <= 0) return 1;
      if (step >= 10) return 0;
      if (step >= 1) return 1;
      return clamp(Math.ceil(-Math.log10(step)) + 1, 0, 8);
    }

    function formatAxisTick(value, ticks, options = {}) {
      if (!Number.isFinite(value)) return "-";
      const compact = options.compact !== false;
      const abs = Math.abs(value);
      const gap = tickMinGap(ticks);
      let scaled = value;
      let scaledGap = gap;
      let suffix = "";
      if (compact && abs >= 1_000_000) {
        scaled = value / 1_000_000;
        scaledGap = gap / 1_000_000;
        suffix = "M";
      } else if (compact && abs >= 1_000) {
        scaled = value / 1_000;
        scaledGap = gap / 1_000;
        suffix = "k";
      }
      const maximumFractionDigits = fractionDigitsForStep(Math.abs(scaledGap));
      const text = Number(scaled).toLocaleString("en-US", {
        maximumFractionDigits,
        minimumFractionDigits: 0,
        useGrouping: Math.abs(scaled) >= 1000,
      });
      return `${text}${suffix}`;
    }

    function formatTick(value) {
      if (!Number.isFinite(value)) return "-";
      if (Math.abs(value) < 1 && value !== 0) return value.toPrecision(2);
      return formatCompact(value, 1_000);
    }

    function formatNumber(value, suffix = "") {
      if (!Number.isFinite(value)) return "-";
      return `${formatCompact(value, 1_000_000)}${suffix}`;
    }

    function formatTwr(value, suffix = "") {
      if (!Number.isFinite(value)) return "-";
      const abs = Math.abs(value);
      const text = abs > 0 && abs < 0.001
        ? Number(value.toPrecision(2)).toString()
        : formatCompact(value, 1_000_000);
      return `${text}${suffix}`;
    }

    function formatTwrDynamicUnit(value) {
      if (!Number.isFinite(value)) return "-";
      const abs = Math.abs(value);
      if (abs === 0) return "0g";
      const units = [
        ["g", 1],
        ["mg", 1e3],
        ["µg", 1e6],
        ["ng", 1e9],
      ];
      let selected = units[units.length - 1];
      for (const unit of units) {
        if (abs * unit[1] >= 0.1) {
          selected = unit;
          break;
        }
      }
      const scaled = value * selected[1];
      const text = Math.abs(scaled) > 0 && Math.abs(scaled) < 0.001
        ? Number(scaled.toPrecision(2)).toString()
        : formatCompact(scaled, 1_000_000);
      return `${text}${selected[0]}`;
    }

    function formatCompact(value, threshold = 1_000) {
      if (!Number.isFinite(value)) return "-";
      const abs = Math.abs(value);
      if (abs < threshold) return trim(value);
      const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
      let tier = Math.floor(Math.log10(abs) / 3);
      if (tier >= suffixes.length) return Number(value).toExponential(0).replace("e+", "e");
      let scaled = value / Math.pow(1000, tier);
      if (Math.abs(scaled) >= 999.5 && tier < suffixes.length - 1) {
        tier += 1;
        scaled = value / Math.pow(1000, tier);
      }
      return `${trim(scaled)}${suffixes[tier]}`;
    }

    function trim(value) {
      if (!Number.isFinite(value)) return "-";
      const abs = Math.abs(value);
      const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
      return Number(value).toLocaleString("en-US", { maximumFractionDigits: digits });
    }

    function formatPercent(value) {
      return Number.isFinite(value) ? `${trim(value * 100)}%` : "-";
    }

    setupControls();
    render();
    window.addEventListener("resize", render);
  </script>
</body>
</html>
"""


# Static translation and portable-output helpers live in drive_comparison_i18n.py.
# Keeping them outside this large HTML-template builder reduces the amount of
# unrelated data mixed into the chart generation logic.

def load_embedded_page_data(html_path: Path) -> dict[str, Any]:
    """Load DATA JSON from a previously generated standalone chart page.

    This supports UI-only rebuilds when the Terra Invicta template directory is
    not available.  The generated page stores the chart data in a dedicated
    ``<script id="ti-data" type="application/json">`` block, so we can reuse it
    without scraping arbitrary JavaScript.
    """
    source = html_path.expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Embedded-data HTML not found: {source}")
    text = source.read_text(encoding="utf-8")
    match = re.search(
        r'<script\s+id=["\']ti-data["\']\s+type=["\']application/json["\']>(.*?)</script>',
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if not match:
        raise SystemExit(f"Could not find <script id=\"ti-data\"> in {source}")
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Could not parse embedded chart data from {source}: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("drives"), list):
        raise SystemExit(f"Embedded chart data in {source} does not look like drive-comparison data")
    return data


def build_html(data: dict[str, Any], portable: bool = False) -> str:
    if portable:
        data = portable_data(data)
    html = HTML_TEMPLATE
    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    html = html.replace("__DATA_JSON__", data_json.replace("</script", "<\\/script"))
    translation_json = json.dumps(client_translation_pairs(), ensure_ascii=False, separators=(",", ":"))
    note_json = json.dumps(note_html_translations(), ensure_ascii=False, separators=(",", ":"))
    html = html.replace("__STATIC_TRANSLATIONS__", translation_json.replace("</script", "<\\/script"))
    html = html.replace("__NOTE_HTML__", note_json.replace("</script", "<\\/script"))
    return html


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--templates-dir", help="Path to TerraInvicta_Data/StreamingAssets/Templates.")
    parser.add_argument(
        "--research-catalog",
        default=str(ROOT / "data" / "research_catalog.json"),
        help="Path to generated research_catalog.json.",
    )
    parser.add_argument(
        "--ship-catalog",
        default=str(ROOT / "data" / "ship_catalog.json"),
        help="Path to generated ship_catalog.json.",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Standalone HTML output path.",
    )
    parser.add_argument(
        "--input-html-data",
        help=(
            "Reuse embedded DATA JSON from an existing standalone HTML page. "
            "This skips template loading and is intended for UI-only rebuilds."
        ),
    )
    parser.add_argument(
        "--portable",
        action="store_true",
        help="Scrub local absolute source paths so the generated single HTML file is suitable for sharing.",
    )
    parser.add_argument(
        "--game-version",
        help="Terra Invicta version label to embed in the chart footer. Auto-detected when omitted.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.output:
        default_output = Path(args.output)
    else:
        default_output = ROOT / "docs" / "index.html"
    output = default_output.expanduser().resolve()

    if args.input_html_data:
        data = load_embedded_page_data(Path(args.input_html_data))
        if args.game_version:
            data.setdefault("source", {})["gameVersion"] = args.game_version
    else:
        templates_dir = resolve_templates_dir(args.templates_dir)
        if templates_dir is None:
            raise SystemExit("Templates directory not found. Pass --templates-dir, or use --input-html-data for UI-only rebuilds.")
        research_catalog = Path(args.research_catalog).expanduser().resolve()
        if not research_catalog.is_file():
            raise SystemExit(f"Research catalog not found: {research_catalog}")
        ship_catalog = Path(args.ship_catalog).expanduser().resolve()
        if not ship_catalog.is_file():
            raise SystemExit(f"Ship catalog not found: {ship_catalog}")
        game_version = detect_game_version(templates_dir, args.game_version)
        data = build_data(templates_dir, research_catalog, ship_catalog, game_version)

    html = build_html(data, args.portable)
    output.write_text(html, encoding="utf-8")
    print(f"Wrote {output}")
    print(f"Drive variants: {len(data['drives'])}")
    print(f"Categories: {len(data['categories'])}")
    print(f"Subfamilies: {len(data['subfamilies'])}")
    print(f"Game version: {data['source']['gameVersion']}")


if __name__ == "__main__":
    main()
