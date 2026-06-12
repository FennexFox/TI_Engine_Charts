#!/usr/bin/env python3
"""Apply issue #15: respect engine-count limits when filtering and pinning.

Run from the repository root:

    python apply_issue15_engine_count_limits.py
    npm run build
    npm run verify

The script edits both source client modules and generated docs/assets copies when
present, then makes small source-template/i18n updates so future rebuilds keep the
behavior and UI help text.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

KO_ENGINE_COUNT_HELP = "엔진 수 제한이 있는 드라이브는 선택값에 가장 가까운 유효 엔진 수로 표시됩니다."
EN_ENGINE_COUNT_HELP = "Drives with engine-count restrictions are shown using the closest valid engine count."

FILTERING_HELPER = r'''
const driveRowsByBaseKey = new Map();

DATA.drives.forEach(row => {
  const baseKey = row.baseKey || row.id;
  if (!driveRowsByBaseKey.has(baseKey)) driveRowsByBaseKey.set(baseKey, []);
  driveRowsByBaseKey.get(baseKey).push(row);
});

driveRowsByBaseKey.forEach(rows => {
  rows.sort((a, b) => (Number(a.thrusterCount) || 0) - (Number(b.thrusterCount) || 0));
});

export function driveRowsForBaseKey(row, candidates = null) {
  if (!row) return [];
  const baseKey = row.baseKey || row.id;
  const sourceRows = Array.isArray(candidates)
    ? candidates.filter(candidate => (candidate.baseKey || candidate.id) === baseKey)
    : (driveRowsByBaseKey.get(baseKey) || []);
  return [...sourceRows].sort((a, b) => (Number(a.thrusterCount) || 0) - (Number(b.thrusterCount) || 0));
}

export function closestDriveRowForThrusterCount(row, selectedCount = state.thrusters, candidates = null) {
  const rows = driveRowsForBaseKey(row, candidates);
  if (!rows.length) return null;
  const targetCount = Math.round(clamp(Number(selectedCount) || 1, 1, 6));
  const exact = rows.find(candidate => Number(candidate.thrusterCount) === targetCount);
  if (exact) return exact;
  let best = rows[0];
  let bestDistance = Math.abs((Number(best.thrusterCount) || 0) - targetCount);
  rows.slice(1).forEach(candidate => {
    const candidateCount = Number(candidate.thrusterCount) || 0;
    const distance = Math.abs(candidateCount - targetCount);
    if (distance < bestDistance || (distance === bestDistance && candidateCount < (Number(best.thrusterCount) || 0))) {
      best = candidate;
      bestDistance = distance;
    }
  });
  return best;
}

export function rowMatchesSelectedThrusterCount(row, selectedCount = state.thrusters, candidates = null) {
  const closest = closestDriveRowForThrusterCount(row, selectedCount, candidates);
  return closest ? closest.id === row.id : Number(row.thrusterCount) === Number(selectedCount);
}
'''.strip("\n")

INLINE_HELP_CSS = r'''
    .inline-help {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      margin-left: 4px;
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--muted);
      font-size: 10px;
      line-height: 1;
      vertical-align: text-top;
    }
    .inline-help:hover,
    .inline-help:focus {
      color: var(--text);
      border-color: var(--muted);
    }
'''.rstrip()


def repo_root() -> Path:
    start = Path.cwd().resolve()
    for candidate in (start, *start.parents):
        if (candidate / "tools" / "drive_comparison_client").is_dir() and (candidate / "package.json").exists():
            return candidate
    raise SystemExit("Could not find the TI_Engine_Charts repository root. Run this script from inside the repo.")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, text: str) -> bool:
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if old == text:
        return False
    path.write_text(text, encoding="utf-8", newline="")
    return True


def add_filtering_helpers(text: str) -> str:
    if "closestDriveRowForThrusterCount" not in text:
        marker = "\n\nexport function filteredRows() {"
        if marker not in text:
            raise RuntimeError("Could not find insertion point before filteredRows() in filtering.js")
        text = text.replace(marker, f"\n\n{FILTERING_HELPER}\n{marker}", 1)

    text = text.replace(
        "row.thrusterCount !== state.thrusters || !rowMatchesSearch(row) || !rowFamilySelected(row)",
        "!rowMatchesSelectedThrusterCount(row) || !rowMatchesSearch(row) || !rowFamilySelected(row)",
    )
    text = text.replace(
        "return row.thrusterCount === state.thrusters && rowMatchesSearch(row);",
        "return rowMatchesSelectedThrusterCount(row) && rowMatchesSearch(row);",
    )
    return text


def add_rendering_helper_import(text: str) -> str:
    pattern = re.compile(r'import \{([^}]+)\} from "\.\./calc/filtering\.js";')
    match = pattern.search(text)
    if not match:
        raise RuntimeError("Could not find calc/filtering.js import in chart/rendering.js")
    names = [part.strip() for part in match.group(1).split(",")]
    if "closestDriveRowForThrusterCount" not in names:
        # Keep the import roughly alphabetized near chart* helpers while avoiding a large diff.
        insert_at = 0
        while insert_at < len(names) and names[insert_at].startswith("chart"):
            insert_at += 1
        names.insert(insert_at, "closestDriveRowForThrusterCount")
        replacement = "import { " + ", ".join(names) + " } from \"../calc/filtering.js\";"
        text = text[:match.start()] + replacement + text[match.end():]
    return text


def replace_resolve_tooltip_row(text: str) -> str:
    new_function = '''export function resolveTooltipRow(ref, rowById, rows) {
      const direct = rowById.get(ref.rowId);
      if (direct) return direct;
      const original = allDriveRowsById.get(ref.rowId);
      if (!original) return null;
      return closestDriveRowForThrusterCount(original, state.thrusters, rows);
    }

'''
    pattern = re.compile(
        r'export function resolveTooltipRow\(ref, rowById, rows\) \{.*?\n    \}\n\n(?=export function isPinnedTooltipKey)',
        re.S,
    )
    text, count = pattern.subn(new_function, text, count=1)
    if count != 1:
        if "return closestDriveRowForThrusterCount(original, state.thrusters, rows);" not in text:
            raise RuntimeError("Could not replace resolveTooltipRow() in chart/rendering.js")
    return text


def update_filtering_file(path: Path, changed: list[str]) -> None:
    if not path.exists():
        return
    text = read_text(path)
    updated = add_filtering_helpers(text)
    if write_text(path, updated):
        changed.append(str(path))


def update_rendering_file(path: Path, changed: list[str]) -> None:
    if not path.exists():
        return
    text = read_text(path)
    updated = add_rendering_helper_import(text)
    updated = replace_resolve_tooltip_row(updated)
    if write_text(path, updated):
        changed.append(str(path))


def update_template(path: Path, changed: list[str]) -> None:
    if not path.exists():
        return
    text = read_text(path)
    if KO_ENGINE_COUNT_HELP in text or EN_ENGINE_COUNT_HELP in text:
        return
    korean_label = '<label class="label" for="thrusters">엔진 수</label>'
    english_label = '<label class="label" for="thrusters">Engine count</label>'
    replacement_ko = (
        '<label class="label" for="thrusters">엔진 수 '
        f'<span class="inline-help" data-help title="{KO_ENGINE_COUNT_HELP}" aria-label="{KO_ENGINE_COUNT_HELP}">?</span></label>'
    )
    replacement_en = (
        '<label class="label" for="thrusters">Engine count '
        f'<span class="inline-help" data-help title="{EN_ENGINE_COUNT_HELP}" aria-label="{EN_ENGINE_COUNT_HELP}">?</span></label>'
    )
    if korean_label in text:
        text = text.replace(korean_label, replacement_ko, 1)
    elif english_label in text:
        text = text.replace(english_label, replacement_en, 1)
    else:
        raise RuntimeError(f"Could not find the engine-count label in {path}")
    if write_text(path, text):
        changed.append(str(path))


def update_css(path: Path, changed: list[str]) -> None:
    if not path.exists():
        return
    text = read_text(path)
    if ".inline-help" in text:
        return
    marker = "    [data-help] {\n      cursor: help;\n    }"
    if marker not in text:
        raise RuntimeError(f"Could not find [data-help] block in {path}")
    text = text.replace(marker, f"{marker}\n{INLINE_HELP_CSS}", 1)
    if write_text(path, text):
        changed.append(str(path))


def update_i18n(path: Path, changed: list[str]) -> None:
    if not path.exists():
        return
    text = read_text(path)
    if KO_ENGINE_COUNT_HELP in text:
        return
    marker = '("엔진 수", "Engine count"),'
    addition = f'{marker}\n    ("{KO_ENGINE_COUNT_HELP}", "{EN_ENGINE_COUNT_HELP}"),'
    if marker not in text:
        raise RuntimeError(f"Could not find Engine count i18n pair in {path}")
    text = text.replace(marker, addition, 1)
    if write_text(path, text):
        changed.append(str(path))


def update_docs_index(path: Path, changed: list[str]) -> None:
    if not path.exists():
        return
    text = read_text(path)

    original = text

    # Generated HTML is usually English, but support a Korean-generated copy too.
    if EN_ENGINE_COUNT_HELP not in text and KO_ENGINE_COUNT_HELP not in text:
        text = text.replace(
            '<label class="label" for="thrusters">Engine count</label>',
            '<label class="label" for="thrusters">Engine count '
            f'<span class="inline-help" data-help title="{EN_ENGINE_COUNT_HELP}" aria-label="{EN_ENGINE_COUNT_HELP}">?</span></label>',
            1,
        )
        text = text.replace(
            '<label class="label" for="thrusters">엔진 수</label>',
            '<label class="label" for="thrusters">엔진 수 '
            f'<span class="inline-help" data-help title="{KO_ENGINE_COUNT_HELP}" aria-label="{KO_ENGINE_COUNT_HELP}">?</span></label>',
            1,
        )

    if ".inline-help" not in text:
        marker = "    [data-help] {\n      cursor: help;\n    }"
        if marker in text:
            text = text.replace(marker, f"{marker}\n{INLINE_HELP_CSS}", 1)

    # Keep runtime language switching working without requiring a rebuild.
    script_pattern = re.compile(r'(<script id="ti-static-translations" type="application/json">)(.*?)(</script>)', re.S)
    match = script_pattern.search(text)
    if match:
        try:
            pairs = json.loads(match.group(2))
        except json.JSONDecodeError:
            pairs = None
        if isinstance(pairs, list) and not any(pair and pair[0] == KO_ENGINE_COUNT_HELP for pair in pairs):
            insert_after = next((idx for idx, pair in enumerate(pairs) if pair == ["엔진 수", "Engine count"]), None)
            if insert_after is None:
                pairs.append([KO_ENGINE_COUNT_HELP, EN_ENGINE_COUNT_HELP])
            else:
                pairs.insert(insert_after + 1, [KO_ENGINE_COUNT_HELP, EN_ENGINE_COUNT_HELP])
            replacement = match.group(1) + json.dumps(pairs, ensure_ascii=False, separators=(",", ":")) + match.group(3)
            text = text[:match.start()] + replacement + text[match.end():]

    if text != original and write_text(path, text):
        changed.append(str(path))


def main() -> int:
    root = repo_root()
    changed: list[str] = []

    for rel in [
        "tools/drive_comparison_client/calc/filtering.js",
        "docs/assets/js/calc/filtering.js",
    ]:
        update_filtering_file(root / rel, changed)

    for rel in [
        "tools/drive_comparison_client/chart/rendering.js",
        "docs/assets/js/chart/rendering.js",
    ]:
        update_rendering_file(root / rel, changed)

    update_template(root / "tools/drive_comparison_template.html", changed)
    update_css(root / "tools/drive_comparison_styles.css", changed)
    update_i18n(root / "tools/drive_comparison_i18n.py", changed)
    update_docs_index(root / "docs/index.html", changed)

    print("Issue #15 engine-count limit update complete.")
    if changed:
        print("Changed files:")
        for path in changed:
            try:
                rel = Path(path).resolve().relative_to(root)
            except ValueError:
                rel = Path(path)
            print(f"- {rel}")
    else:
        print("No files changed; the update appears to be already applied.")
    print("\nRecommended next steps:")
    print("  npm run build")
    print("  npm run verify")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
