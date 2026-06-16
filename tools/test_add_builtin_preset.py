#!/usr/bin/env python3
"""Focused checks for tools/add_builtin_preset.py."""

from __future__ import annotations

import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from pathlib import Path

import add_builtin_preset


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def design_export(entry_id: str, name: str, notes: str = "notes") -> dict:
    return {
        "format": "ti-engine-chart-design-preset/v1",
        "id": entry_id,
        "name": name,
        "dryMassDesign": {
            "classId": "Battleship",
            "slotModules": ["Magazine"],
            "weaponModules": {"nose": [], "hull": []},
            "armor": {
                "tail": {"armorId": "AdamantaneArmor", "points": 1},
                "hull": {"armorId": "AdamantaneArmor", "points": 1},
                "nose": {"armorId": "AdamantaneArmor", "points": 8},
            },
            "notes": notes,
        },
        "simulationDefaults": {
            "targetDvKps": 15,
            "minTwr": 0.02,
            "radiatorId": "TinDroplet",
        },
        "createdAt": "2026-06-10T00:00:00.000Z",
        "updatedAt": "2026-06-10T00:00:00.000Z",
    }


def chart_export() -> dict:
    return {
        "format": "ti-engine-chart-named-preset/v1",
        "id": "chart-export-alpha",
        "name": "Missile Battleship - Advanced Defense",
        "settings": {
            "format": "ti-engine-chart-preset/v1",
            "lang": "en",
            "metric": "totalMassTons",
            "dryMassTons": 6903.14,
            "targetDvKps": 15,
            "dryMassCalculator": {
                "classId": "Battleship",
                "notes": "calculator stays in chart settings",
                "simulationDefaults": {"targetDvKps": 15, "minTwr": 0.02, "radiatorId": "TinDroplet"},
            },
            "selectedDesignPresetId": "design-local-alpha",
            "designPresetLibrary": [
                design_export("design-local-alpha", "Missile Battleship - Advanced Defense"),
            ],
            "dryMassPresetLibrary": [
                design_export("design-local-alpha", "Duplicate ignored"),
                design_export("design-local-beta", "Missile Monitor - Early Defense"),
            ],
        },
    }


class AddBuiltInPresetTests(unittest.TestCase):
    def run_converter(self, payload: dict, library: dict | None = None, *args: str) -> dict:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            input_path = root / "exported.json"
            library_path = root / "preset_library.json"
            write_json(input_path, payload)
            write_json(library_path, library or {
                "format": "ti-engine-chart-built-in-presets/v1",
                "chartPresets": [],
                "dryMassPresets": [],
            })
            with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
                result = add_builtin_preset.main([
                    str(input_path),
                    "--preset-library",
                    str(library_path),
                    *args,
                ])
            self.assertEqual(result, 0)
            return load_json(library_path)

    def test_full_chart_export_extracts_designs_and_sanitizes_chart_settings(self) -> None:
        library = self.run_converter(chart_export())

        self.assertEqual(len(library["chartPresets"]), 1)
        self.assertEqual(len(library["dryMassPresets"]), 2)
        chart = library["chartPresets"][0]
        self.assertEqual(chart["id"], "chart-export-alpha")
        self.assertNotIn("designPresetLibrary", chart["settings"])
        self.assertNotIn("dryMassPresetLibrary", chart["settings"])
        self.assertEqual(
            chart["settings"]["selectedDesignPresetId"],
            "built-in-design:design-local-alpha",
        )
        self.assertEqual(library["dryMassPresets"][0]["id"], "design-local-alpha")
        self.assertEqual(library["dryMassPresets"][0]["simulationDefaults"]["targetDvKps"], 15)

    def test_duplicate_ids_and_names_get_stable_suffixes_by_default(self) -> None:
        existing = {
            "format": "ti-engine-chart-built-in-presets/v1",
            "chartPresets": [
                {"id": "chart-export-alpha", "name": "Missile Battleship - Advanced Defense", "settings": {}},
            ],
            "dryMassPresets": [
                {
                    "format": "ti-engine-chart-design-preset/v1",
                    "id": "design-local-alpha",
                    "name": "Missile Battleship - Advanced Defense",
                    "dryMassDesign": {"classId": "Monitor"},
                },
            ],
        }

        library = self.run_converter(chart_export(), existing)

        self.assertEqual(library["chartPresets"][1]["id"], "chart-export-alpha-2")
        self.assertEqual(library["chartPresets"][1]["name"], "Missile Battleship - Advanced Defense (2)")
        self.assertEqual(library["dryMassPresets"][1]["id"], "design-local-alpha-2")
        self.assertEqual(library["dryMassPresets"][1]["name"], "Missile Battleship - Advanced Defense (2)")
        self.assertEqual(
            library["chartPresets"][1]["settings"]["selectedDesignPresetId"],
            "built-in-design:design-local-alpha-2",
        )

    def test_existing_top_level_design_id_is_rewritten_without_snapshot(self) -> None:
        payload = chart_export()
        payload["settings"].pop("designPresetLibrary")
        payload["settings"].pop("dryMassPresetLibrary")
        payload["settings"]["selectedDesignPresetId"] = "design-existing"
        existing = {
            "format": "ti-engine-chart-built-in-presets/v1",
            "chartPresets": [],
            "dryMassPresets": [
                {
                    "format": "ti-engine-chart-design-preset/v1",
                    "id": "design-existing",
                    "name": "Existing",
                    "dryMassDesign": {"classId": "Monitor"},
                },
            ],
        }

        library = self.run_converter(payload, existing, "--chart")

        self.assertEqual(len(library["dryMassPresets"]), 1)
        self.assertEqual(
            library["chartPresets"][0]["settings"]["selectedDesignPresetId"],
            "built-in-design:design-existing",
        )

    def test_dry_mass_library_mode_adds_designs_without_chart(self) -> None:
        payload = {
            "format": "ti-engine-chart-design-preset-library/v1",
            "presets": [
                design_export("design-a", "Alpha"),
                design_export("design-b", "Beta"),
            ],
        }

        library = self.run_converter(payload, None, "--dry-mass-library")

        self.assertEqual(library["chartPresets"], [])
        self.assertEqual([entry["id"] for entry in library["dryMassPresets"]], ["design-a", "design-b"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
