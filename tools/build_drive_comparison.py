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
    apply_static_english_html,
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


DRIVE_COMPARISON_TEMPLATE_PATH = Path(__file__).resolve().parent / "drive_comparison_template.html"
DRIVE_COMPARISON_STYLES_PATH = Path(__file__).resolve().parent / "drive_comparison_styles.css"
DRIVE_COMPARISON_CLIENT_DIR = Path(__file__).resolve().parent / "drive_comparison_client"
CLIENT_SOURCE_FILES = (
    "00_bootstrap_state_i18n.js",
    "10_left_panel_controls.js",
    "20_dry_mass_calculator.js",
    "30_searchable_select.js",
    "40_preset_library.js",
    "50_filtering_diagnostics.js",
    "60_axis_scale_ticks.js",
    "70_chart_interaction.js",
    "80_chart_rendering.js",
    "90_tooltip_table_formatting.js",
    "99_startup.js",
)


def load_template_source(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise SystemExit(f"Could not read template source {path}: {exc}") from exc


def replace_placeholder(text: str, placeholder: str, value: str) -> str:
    if placeholder not in text:
        raise SystemExit(f"Template placeholder not found: {placeholder}")
    return text.replace(placeholder, value)


def load_client_script() -> str:
    return "\n\n".join(
        load_template_source(DRIVE_COMPARISON_CLIENT_DIR / filename).rstrip("\n")
        for filename in CLIENT_SOURCE_FILES
    )


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
    html = apply_static_english_html(load_template_source(DRIVE_COMPARISON_TEMPLATE_PATH))
    html = replace_placeholder(html, "__STYLES__", load_template_source(DRIVE_COMPARISON_STYLES_PATH).rstrip("\n"))
    html = replace_placeholder(html, "__CLIENT_SCRIPT__", load_client_script())

    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    html = replace_placeholder(html, "__DATA_JSON__", data_json.replace("</script", "<\\/script"))
    translation_json = json.dumps(client_translation_pairs(), ensure_ascii=False, separators=(",", ":"))
    note_json = json.dumps(note_html_translations(), ensure_ascii=False, separators=(",", ":"))
    html = replace_placeholder(html, "__STATIC_TRANSLATIONS__", translation_json.replace("</script", "<\\/script"))
    html = replace_placeholder(html, "__NOTE_HTML__", note_json.replace("</script", "<\\/script"))
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
