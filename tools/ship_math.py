"""Drive and power-plant math shared by the chart builder."""

from __future__ import annotations

from typing import Any

from ti_chart_core import as_float


SELF_POWERED_DRIVE_CLASSES = {
    "Chemical",
    "Fission_Pulse",
    "NuclearSaltWater",
    "Fusion_Pulse",
}


def ship_plan_drive_thrust_power_gw(template: dict[str, Any]) -> float:
    return as_float(template.get("thrust_N"), 0.0) * as_float(template.get("EV_kps"), 0.0) * 0.5 / 1_000_000.0


def ship_plan_drive_power_requirement_gw(template: dict[str, Any]) -> float:
    if str(template.get("driveClassification") or "") in SELF_POWERED_DRIVE_CLASSES:
        return 0.0
    efficiency = as_float(template.get("efficiency"), 0.0)
    return ship_plan_drive_thrust_power_gw(template) / efficiency if efficiency > 0.0 else 0.0


def ship_plan_power_plant_class_compatible(required_class: str, plant_class: str) -> bool:
    if required_class in {"", "Any_General"} or required_class == plant_class:
        return True
    if required_class == "Any_Magnetic_Confinement_Fusion":
        return plant_class in {
            "Any_Magnetic_Confinement_Fusion",
            "Toroid_Magnetic_Confinement_Fusion",
            "Mirrored_Magnetic_Confinement_Fusion",
            "Hybrid_Confinement_Fusion",
        }
    return plant_class == "Molten_Salt_Core_Fission" and required_class in {
        "Solid_Core_Fission",
        "Liquid_Core_Fission",
    }


def ship_plan_drive_open_cycle(
    drive: dict[str, Any],
    drive_templates: dict[str, dict[str, Any]],
) -> bool:
    cooling = str(drive.get("cooling") or "")
    if cooling == "Open":
        return True
    if cooling != "Calc":
        return False
    classification = str(drive.get("driveClassification") or "")
    if classification in {"Fission_Pulse", "Fusion_Pulse"}:
        return True
    name = str(drive.get("dataName") or "")
    single_name = f"{name[:-1]}1" if name and name[-1:].isdigit() else name
    single = drive_templates.get(single_name, drive)
    exhaust_velocity = as_float(single.get("EV_kps"), 0.0) * 1000.0
    return exhaust_velocity > 0.0 and as_float(single.get("thrust_N"), 0.0) / exhaust_velocity >= 3.0
