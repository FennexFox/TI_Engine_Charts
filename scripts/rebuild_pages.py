#!/usr/bin/env python3
"""Rebuild Terra Invicta engine chart pages and optionally push updates."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GENERATED_PATHS = (
    "data/research_catalog.json",
    "docs/research_catalog.md",
    "docs/index.html",
    "docs/en.html",
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

    research_command = [
        python,
        "tools/build_research_catalog.py",
        "--json-output",
        GENERATED_PATHS[0],
        "--markdown-output",
        GENERATED_PATHS[1],
        "--markdown-language",
        "en",
    ]
    optional_arg(research_command, "--templates-dir", args.templates_dir)
    run(research_command)

    common_chart_args = [
        "--research-catalog",
        GENERATED_PATHS[0],
        "--portable",
    ]
    if args.templates_dir:
        common_chart_args.extend(["--templates-dir", args.templates_dir])
    if args.game_version:
        common_chart_args.extend(["--game-version", args.game_version])

    run([python, "tools/build_drive_comparison.py", *common_chart_args, "--lang", "ko", "--output", GENERATED_PATHS[2]])
    run([python, "tools/build_drive_comparison.py", *common_chart_args, "--lang", "en", "--output", GENERATED_PATHS[3]])

    if not args.skip_verify:
        run([npm, "run", "verify:browser"])


def commit_and_push(args: argparse.Namespace) -> None:
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
    parser.add_argument("--templates-dir", help="Path to TerraInvicta_Data/StreamingAssets/Templates.")
    parser.add_argument("--game-version", help="Version label to embed in the generated chart footer.")
    parser.add_argument("--skip-verify", action="store_true", help="Skip Playwright browser verification.")
    parser.add_argument("--no-commit", action="store_true", help="Build and verify without committing generated changes.")
    parser.add_argument("--no-push", action="store_true", help="Do not push after committing generated changes.")
    parser.add_argument("--remote", default="origin", help="Git remote to push when changes are committed.")
    parser.add_argument("--branch", help="Branch to push. Defaults to the current branch.")
    parser.add_argument("--commit-message", help="Commit message for generated chart updates.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    build_pages(args)
    commit_and_push(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
