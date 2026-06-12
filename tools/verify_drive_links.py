"""Verify generated drive-to-drive research dependency links."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from build_drive_comparison import (  # noqa: E402
    DRIVE_LINK_KIND,
    ResearchCostIndex,
    drive_link_candidate_edges,
    load_embedded_page_data,
    transitive_reduced_drive_link_edges,
)


def link_sort_key(link: dict[str, Any], row_by_id: dict[str, dict[str, Any]]) -> tuple[Any, ...]:
    source = row_by_id[str(link["from"])]
    target = row_by_id[str(link["to"])]
    return (
        source.get("familyKey") or "",
        source.get("thrusterCount") or 0,
        source.get("cumulativeResearch") or 0,
        str(link["from"]),
        target.get("cumulativeResearch") or 0,
        str(link["to"]),
    )


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def verify_drive_links(html_path: Path, research_catalog_path: Path) -> None:
    data = load_embedded_page_data(html_path)
    drives = data.get("drives")
    links = data.get("driveLinks")
    require(isinstance(drives, list) and drives, "DATA.drives must be a non-empty array")
    require(isinstance(links, list), "DATA.driveLinks must be an array")

    research = ResearchCostIndex(research_catalog_path)
    row_by_id = {str(row.get("id")): row for row in drives if isinstance(row, dict) and row.get("id")}
    candidate_edges = drive_link_candidate_edges(drives, research)
    reduced_edges = transitive_reduced_drive_link_edges(candidate_edges)

    emitted_edges: set[tuple[str, str]] = set()
    previous_key: tuple[Any, ...] | None = None
    fusion_link_count = 0
    for index, link in enumerate(links):
        require(isinstance(link, dict), f"driveLinks[{index}] must be an object")
        source_id = str(link.get("from") or "")
        target_id = str(link.get("to") or "")
        edge = (source_id, target_id)
        require(source_id in row_by_id, f"driveLinks[{index}] source endpoint does not exist: {source_id}")
        require(target_id in row_by_id, f"driveLinks[{index}] target endpoint does not exist: {target_id}")
        require(edge not in emitted_edges, f"duplicate drive link emitted: {source_id} -> {target_id}")
        emitted_edges.add(edge)

        source = row_by_id[source_id]
        target = row_by_id[target_id]
        require(link.get("kind") == DRIVE_LINK_KIND, f"{source_id} -> {target_id} has invalid kind")
        require(source.get("thrusterCount") == target.get("thrusterCount"), f"{source_id} -> {target_id} crosses thruster counts")
        require(source.get("familyKey") == target.get("familyKey"), f"{source_id} -> {target_id} crosses families")
        require(source.get("requiredProject"), f"{source_id} -> {target_id} source has no required project")
        require(target.get("requiredProject"), f"{source_id} -> {target_id} target has no required project")
        require(
            source.get("requiredProject") != target.get("requiredProject"),
            f"{source_id} -> {target_id} links variants sharing a required project",
        )
        require(
            str(source["requiredProject"]) in research.closure(str(target["requiredProject"])),
            f"{source_id} -> {target_id} is not backed by target research closure",
        )
        require(edge in candidate_edges, f"{source_id} -> {target_id} is not in the projected candidate graph")
        require(edge in reduced_edges, f"{source_id} -> {target_id} is a transitive shortcut")
        require(link.get("familyKey") == source.get("familyKey"), f"{source_id} -> {target_id} has mismatched familyKey")
        require(link.get("categoryKey") == source.get("categoryKey"), f"{source_id} -> {target_id} has mismatched categoryKey")
        require(link.get("thrusterCount") == source.get("thrusterCount"), f"{source_id} -> {target_id} has mismatched thrusterCount")
        if source.get("categoryKey") == "Fusion":
            fusion_link_count += 1

        current_key = link_sort_key(link, row_by_id)
        require(previous_key is None or previous_key <= current_key, "driveLinks are not sorted deterministically")
        previous_key = current_key

    missing_edges = reduced_edges - emitted_edges
    extra_edges = emitted_edges - reduced_edges
    require(not missing_edges, f"driveLinks missing {len(missing_edges)} reduced projected links")
    require(not extra_edges, f"driveLinks emitted {len(extra_edges)} links outside reduced projected graph")

    # Validate transitive reduction against the candidate graph, not merely the final emitted list.
    for source_id, target_id in emitted_edges:
        adjacency: dict[str, set[str]] = {}
        for edge_source, edge_target in candidate_edges:
            if (edge_source, edge_target) == (source_id, target_id):
                continue
            adjacency.setdefault(edge_source, set()).add(edge_target)
        stack = list(adjacency.get(source_id, set()))
        seen = {source_id}
        shortcut = False
        while stack:
            current = stack.pop()
            if current == target_id:
                shortcut = True
                break
            if current in seen:
                continue
            seen.add(current)
            stack.extend(adjacency.get(current, set()) - seen)
        require(not shortcut, f"{source_id} -> {target_id} still has an alternate candidate-visible path")

    require(fusion_link_count > 0, "No Fusion driveLinks emitted; expected fusion progression links in generated data")
    print(
        f"Drive link verification passed: {len(links)} links, "
        f"{len(candidate_edges)} projected candidates, {fusion_link_count} Fusion links",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html", nargs="?", default=str(ROOT / "docs" / "index.html"), help="Generated chart HTML to verify")
    parser.add_argument(
        "--research-catalog",
        default=str(ROOT / "data" / "research_catalog.json"),
        help="Research catalog used for dependency closures",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    verify_drive_links(Path(args.html).resolve(), Path(args.research_catalog).resolve())


if __name__ == "__main__":
    main()
