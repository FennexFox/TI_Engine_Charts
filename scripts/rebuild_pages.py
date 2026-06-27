#!/usr/bin/env python3
"""Rebuild Terra Invicta engine chart pages and optionally push updates."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESEARCH_CATALOG_JSON = "data/generated/research_catalog.json"
RESEARCH_CATALOG_MARKDOWN = "docs/research_catalog.md"
SHIP_CATALOG_JSON = "data/generated/ship_catalog.json"
SHIP_CATALOG_MARKDOWN = "docs/ship_catalog.md"
DRIVE_CATALOG_JSON = "data/generated/drive_catalog.json"
DRIVE_COMPARISON_HTML = "docs/index.html"
DRIVE_COMPARISON_CLIENT_ASSETS = "docs/assets/js"
GENERATED_PATHS = (
    RESEARCH_CATALOG_JSON,
    RESEARCH_CATALOG_MARKDOWN,
    SHIP_CATALOG_JSON,
    SHIP_CATALOG_MARKDOWN,
    DRIVE_CATALOG_JSON,
    DRIVE_COMPARISON_HTML,
    DRIVE_COMPARISON_CLIENT_ASSETS,
)


def run(command: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    printable = " ".join(command)
    print(f"+ {printable}")
    return subprocess.run(
        command,
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def optional_arg(command: list[str], flag: str, value: str | None) -> None:
    if value:
        command.extend([flag, value])


def catalog_source_args(input_html_data: str | None = None) -> list[str]:
    if input_html_data:
        return ["--input-html-data", input_html_data]
    return [
        "--drive-catalog",
        DRIVE_CATALOG_JSON,
        "--research-catalog",
        RESEARCH_CATALOG_JSON,
        "--ship-catalog",
        SHIP_CATALOG_JSON,
    ]


def verify_catalog_source_path() -> None:
    args = catalog_source_args()
    expected = [
        "--drive-catalog",
        DRIVE_CATALOG_JSON,
        "--research-catalog",
        RESEARCH_CATALOG_JSON,
        "--ship-catalog",
        SHIP_CATALOG_JSON,
    ]
    if args != expected:
        raise SystemExit(f"Normal chart rebuild source args changed unexpectedly: {args!r}")
    if "--input-html-data" in args:
        raise SystemExit("Normal chart rebuild path must not reuse embedded docs/index.html data")
    print(f"Catalog source verification passed: {DRIVE_CATALOG_JSON}")


def looks_like_local_absolute_path(value: str) -> bool:
    normalized = value.replace("\\", "/")
    if normalized.startswith(("/", "~/", "//")):
        return True
    return len(value) >= 3 and value[1] == ":" and value[2] in ("/", "\\")


def source_metadata_strings(value: object) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        strings: list[str] = []
        for item in value.values():
            strings.extend(source_metadata_strings(item))
        return strings
    if isinstance(value, list):
        strings = []
        for item in value:
            strings.extend(source_metadata_strings(item))
        return strings
    return []


def verify_drive_catalog_source_metadata() -> None:
    path = ROOT / DRIVE_CATALOG_JSON
    data = json.loads(path.read_text(encoding="utf-8"))
    source = data.get("source")
    if not isinstance(source, dict):
        raise SystemExit(f"Drive catalog is missing source metadata: {DRIVE_CATALOG_JSON}")
    if "templatesDir" in source:
        raise SystemExit("Drive catalog source metadata must not store local templatesDir paths")
    absolute_paths = [
        value
        for value in source_metadata_strings(source)
        if looks_like_local_absolute_path(value)
    ]
    if absolute_paths:
        raise SystemExit(
            "Drive catalog source metadata contains local absolute paths: "
            + ", ".join(sorted(set(absolute_paths)))
        )
    print(f"Drive catalog source metadata path check passed: {DRIVE_CATALOG_JSON}")


def generated_paths_changed() -> bool:
    result = run(["git", "status", "--porcelain", "--", *GENERATED_PATHS], capture=True)
    return bool(result.stdout.strip())


def current_branch() -> str:
    result = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture=True)
    branch = result.stdout.strip()
    if not branch or branch == "HEAD":
        raise SystemExit("Cannot push from a detached HEAD. Pass --branch or checkout a branch.")
    return branch


def remote_exists(remote: str) -> bool:
    result = subprocess.run(
        ["git", "remote", "get-url", remote],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def build_pages(args: argparse.Namespace) -> None:
    python = sys.executable
    npm = "npm.cmd" if os.name == "nt" else "npm"

    common_chart_args = ["--redact-source-paths"]
    if args.game_version:
        common_chart_args.extend(["--game-version", args.game_version])
    optional_arg(common_chart_args, "--preset-library", args.preset_library)

    if not args.ui_only:
        research_command = [
            python,
            "tools/build_research_catalog.py",
            "--json-output",
            RESEARCH_CATALOG_JSON,
            "--markdown-output",
            RESEARCH_CATALOG_MARKDOWN,
            "--markdown-language",
            "en",
        ]
        optional_arg(research_command, "--templates-dir", args.templates_dir)
        run(research_command)

        ship_catalog_command = [
            python,
            "tools/build_ship_catalog.py",
            "--json-output",
            SHIP_CATALOG_JSON,
            "--markdown-output",
            SHIP_CATALOG_MARKDOWN,
            "--markdown-language",
            "en",
        ]
        optional_arg(ship_catalog_command, "--templates-dir", args.templates_dir)
        run(ship_catalog_command)

        drive_catalog_command = [
            python,
            "tools/build_drive_catalog.py",
            "--json-output",
            DRIVE_CATALOG_JSON,
        ]
        optional_arg(drive_catalog_command, "--templates-dir", args.templates_dir)
        optional_arg(drive_catalog_command, "--game-version", args.game_version)
        run(drive_catalog_command)

    common_chart_args.extend(catalog_source_args(args.input_html_data))

    run([python, "tools/build_drive_comparison.py", *common_chart_args, "--output", DRIVE_COMPARISON_HTML])

    if not args.skip_verify:
        run([npm, "run", "verify:browser"])


def commit_and_push(args: argparse.Namespace) -> None:
    if args.no_commit and not (ROOT / ".git").exists():
        print("Skipping generated-file git status because this directory is not a git checkout and --no-commit was passed.")
        return

    if not generated_paths_changed():
        print("No generated page changes.")
        return

    if args.no_commit:
        print("Generated page changes exist; leaving them uncommitted because --no-commit was passed.")
        return

    if not args.no_push and not remote_exists(args.remote):
        raise SystemExit(
            f"Remote '{args.remote}' is not configured. Add it with git remote add {args.remote} <url>, "
            "or rerun with --no-push."
        )

    run(["git", "add", "--", *GENERATED_PATHS])
    message = args.commit_message
    if not message:
        suffix = f" for Terra Invicta {args.game_version}" if args.game_version else ""
        message = f"chore: rebuild engine charts{suffix}"
    run(["git", "commit", "-m", message])

    if args.no_push:
        print("Committed generated page changes; skipping push because --no-push was passed.")
        return

    branch = args.branch or current_branch()
    run(["git", "push", args.remote, branch])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--verify-catalog-source-path",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--verify-drive-catalog-source-metadata",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    parser.add_argument("--templates-dir", help="Path to TerraInvicta_Data/StreamingAssets/Templates.")
    parser.add_argument("--game-version", help="Version label to embed in the generated chart footer.")
    parser.add_argument(
        "--preset-library",
        help="Optional JSON file containing built-in chartPresets and dryMassPresets to embed.",
    )
    parser.add_argument(
        "--ui-only",
        action="store_true",
        help="Rebuild docs/index.html from repo-local generated catalogs without reading a local Terra Invicta install.",
    )
    parser.add_argument(
        "--input-html-data",
        help="Existing generated HTML page whose embedded DATA JSON should be reused with --ui-only.",
    )
    parser.add_argument("--skip-verify", action="store_true", help="Skip Playwright browser verification.")
    parser.add_argument("--no-commit", action="store_true", help="Build and verify without committing generated changes.")
    parser.add_argument("--no-push", action="store_true", help="Do not push after committing generated changes.")
    parser.add_argument("--remote", default="origin", help="Git remote to push when changes are committed.")
    parser.add_argument("--branch", help="Branch to push. Defaults to the current branch.")
    parser.add_argument("--commit-message", help="Commit message for generated chart updates.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.verify_catalog_source_path:
        verify_catalog_source_path()
        return 0
    if args.verify_drive_catalog_source_metadata:
        verify_drive_catalog_source_metadata()
        return 0
    build_pages(args)
    commit_and_push(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
