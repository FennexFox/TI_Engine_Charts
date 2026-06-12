#!/usr/bin/env python3
"""Repair chart-click pinning after the hover-card live-ordering change.

Run from the repository root:

    py repair_hover_card_pinning_behavior.py

This is source-only. It does not modify generated files under docs/assets/js or
docs/index.html.

What this repairs:
- Chart-click pinning again behaves as a temporary tooltip pin state:
  click a point to pin the current card set; click the same pinned point again
  to unpin the tooltip state.
- Explicit card pins still stay at the top in their pinned/manual order.
- Hover cards below pinned cards can still reorder live when hover-hit order
  changes.
- The browser verifier's synthetic hover-card ordering test restores tooltip
  state before the existing chart-click pin/unpin test runs.
"""

from __future__ import annotations

from pathlib import Path


RENDERING = Path("tools/drive_comparison_client/chart/rendering.js")
INTERACTION = Path("tools/drive_comparison_client/chart/interaction.js")
TOOLTIP = Path("tools/drive_comparison_client/ui/tooltip_table.js")
VERIFY = Path("tools/verify_drive_comparison_browser.mjs")


PINNED_TOOLTIP_REFS = '''export function pinnedTooltipRefs() {
      const lastPinned = dedupeTooltipRefs(state.lastTooltipItems).filter(item => isPinnedTooltipKey(item.key));
      const included = new Set(lastPinned.map(item => item.key));
      const missingPinned = dedupeTooltipRefs(state.pinnedTooltipItems).filter(item => !included.has(item.key));
      return [...lastPinned, ...missingPinned];
    }'''

PINNED_FOCUS_TOOLTIP_REFS = '''export function pinnedFocusTooltipRefs() {
      const explicitPinned = pinnedTooltipRefs();
      const explicitKeys = new Set(explicitPinned.map(item => item.key));
      const focusPinned = state.tooltipPinned
        ? dedupeTooltipRefs(state.tooltipPinnedItems || state.lastTooltipItems).filter(item => !explicitKeys.has(item.key))
        : [];
      return [...explicitPinned, ...focusPinned];
    }'''

SYNC_PINNED_TOOLTIP_ORDER = '''export function syncPinnedTooltipOrder() {
      const pinnedKeys = new Set(state.pinnedTooltipItems.map(item => item.key));
      state.pinnedTooltipItems = dedupeTooltipRefs(state.lastTooltipItems).filter(item => pinnedKeys.has(item.key));
    }'''

PIN_TOOLTIP_ITEMS = '''export function pinTooltipItems(items) {
      const refs = dedupeTooltipRefs(items);
      if (!refs.length) {
        clearTooltip();
        return;
      }
      state.tooltipPinned = true;
      state.tooltipPinnedItems = refs;
      state.dismissedTooltipKeys.clear();
      const nextRefs = mergePinnedFocusTooltipRefs(refs);
      state.hoverHitSignature = nextRefs.map(item => item.key).join("|");
      state.lastTooltipItems = nextRefs;
      setHoverPoints(nextRefs);
      refreshTooltip(currentChartRows);
    }'''

UNPIN_TOOLTIP = '''export function unpinTooltip() {
      state.tooltipPinned = false;
      state.tooltipPinnedItems = [];
      state.hoverHitSignature = "";
      state.dismissedTooltipKeys.clear();
      refreshTooltip(currentChartRows);
    }'''

UNPIN_TOOLTIP_ITEM_BY_KEY = '''export function unpinTooltipItemByKey(key) {
      if (!key || !isPinnedTooltipKey(key)) return false;
      state.pinnedTooltipItems = state.pinnedTooltipItems.filter(item => item.key !== key);
      state.lastTooltipItems = mergePinnedTooltipRefs(state.lastTooltipItems);
      setHoverPoints(mergePinnedTooltipRefs(state.hoverPoints));
      refreshTooltip(currentChartRows);
      return true;
    }'''

UPDATE_PINNED_TOOLTIP_HOVER_FOCUS = '''export function updatePinnedTooltipHoverFocus(event) {
      const pinned = pinnedFocusTooltipRefs();
      const point = svgPointFromEvent(event);
      const applyRefs = refs => {
        setHoverPoints(refs);
        if (!sameTooltipRefs(refs, state.lastTooltipItems)) {
          state.lastTooltipItems = refs;
          refreshTooltip(currentChartRows);
        }
      };
      if (!pointInPlot(point)) {
        state.hoverHitSignature = "";
        state.dismissedTooltipKeys.clear();
        applyRefs(pinned);
        return;
      }

      const hits = hitTargetsAt(point);
      if (!hits.length) {
        const ladderHits = ladderHitTargetsAt(point);
        if (ladderHits.length) {
          const signature = ladderHits.map(hit => `ladder:${hit.key}`).join("|");
          if (signature !== state.hoverHitSignature) {
            state.hoverHitSignature = signature;
            state.dismissedTooltipKeys.clear();
          }
          applyRefs(mergePinnedFocusTooltipRefs(resolveLadderHoverRefs(ladderHits)));
          return;
        }
        state.hoverHitSignature = "";
        state.dismissedTooltipKeys.clear();
        applyRefs(pinned);
        return;
      }

      const signature = hits.map(hit => hit.key).join("|");
      if (signature !== state.hoverHitSignature) {
        state.hoverHitSignature = signature;
        state.dismissedTooltipKeys.clear();
      }
      applyRefs(mergePinnedFocusTooltipRefs(hits.filter(hit => !state.dismissedTooltipKeys.has(hit.key))));
    }'''


HOVER_VERIFY_RESTORE = '''
  await page.evaluate(() => {
    state.tooltipPinned = false;
    state.tooltipPinnedItems = [];
    state.pinnedTooltipItems = [];
    state.lastTooltipItems = [];
    state.hoverPoints = [];
    state.dismissedTooltipKeys.clear();
    state.hoverHitSignature = "";
    refreshTooltip(currentChartRows);
  });

'''.rstrip()


def read_text(path: Path) -> tuple[str, str]:
    if not path.exists():
        raise SystemExit(f"Missing expected file: {path}")
    raw = path.read_text(encoding="utf-8")
    newline = "\r\n" if "\r\n" in raw else "\n"
    return raw.replace("\r\n", "\n"), newline


def write_text(path: Path, text: str, newline: str) -> None:
    path.write_text(text.replace("\n", newline), encoding="utf-8", newline="")


def replace_exported_function(text: str, function_name: str, replacement: str) -> tuple[str, bool]:
    marker = f"export function {function_name}("
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f"Could not find function {function_name}()")
    brace_start = text.find("{", start)
    if brace_start < 0:
        raise SystemExit(f"Could not find function body for {function_name}()")
    depth = 0
    end = None
    for index in range(brace_start, len(text)):
        char = text[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        raise SystemExit(f"Could not find end of function {function_name}()")
    current = text[start:end]
    if current == replacement:
        return text, False
    return text[:start] + replacement + text[end:], True


def update_rendering() -> bool:
    text, newline = read_text(RENDERING)
    changed = False
    for name, replacement in [
        ("pinnedTooltipRefs", PINNED_TOOLTIP_REFS),
        ("pinnedFocusTooltipRefs", PINNED_FOCUS_TOOLTIP_REFS),
        ("syncPinnedTooltipOrder", SYNC_PINNED_TOOLTIP_ORDER),
    ]:
        text, did = replace_exported_function(text, name, replacement)
        changed = changed or did
    if changed:
        write_text(RENDERING, text, newline)
    return changed


def update_tooltip() -> bool:
    text, newline = read_text(TOOLTIP)
    changed = False
    for name, replacement in [
        ("pinTooltipItems", PIN_TOOLTIP_ITEMS),
        ("unpinTooltip", UNPIN_TOOLTIP),
        ("unpinTooltipItemByKey", UNPIN_TOOLTIP_ITEM_BY_KEY),
    ]:
        text, did = replace_exported_function(text, name, replacement)
        changed = changed or did
    if changed:
        write_text(TOOLTIP, text, newline)
    return changed


def update_interaction() -> bool:
    text, newline = read_text(INTERACTION)
    text, changed = replace_exported_function(text, "updatePinnedTooltipHoverFocus", UPDATE_PINNED_TOOLTIP_HOVER_FOCUS)
    if changed:
        write_text(INTERACTION, text, newline)
    return changed


def update_verify() -> bool:
    if not VERIFY.exists():
        return False
    text, newline = read_text(VERIFY)
    if "hoverCardOrderingChecks" not in text:
        return False
    hover_start = text.find("hoverCardOrderingChecks")
    const_first_pin = text.find("const firstPin", hover_start)
    search_end = const_first_pin if const_first_pin >= 0 else len(text)
    if "state.tooltipPinnedItems = [];" in text[hover_start:search_end] and "refreshTooltip(currentChartRows);" in text[hover_start:search_end]:
        return False

    marker = '  expect(hoverCardOrderingChecks.hoverOrderB === hoverCardOrderingChecks.expectedB, `${htmlFile}: hover card order did not update when hover-hit order changed`);\n'
    if marker not in text:
        raise SystemExit("Could not find hover-card ordering verifier expectation block to append state restore")
    text = text.replace(marker, marker + HOVER_VERIFY_RESTORE + "\n\n", 1)
    write_text(VERIFY, text, newline)
    return True


def main() -> int:
    changed = []
    for path, updater in [
        (RENDERING, update_rendering),
        (TOOLTIP, update_tooltip),
        (INTERACTION, update_interaction),
        (VERIFY, update_verify),
    ]:
        if updater():
            changed.append(str(path))

    if changed:
        print("Updated source files:")
        for path in changed:
            print(f"  - {path}")
    else:
        print("No changes needed; hover-card pinning behavior already repaired.")

    print()
    print("Recommended checks:")
    print("  node --check tools/drive_comparison_client/chart/rendering.js")
    print("  node --check tools/drive_comparison_client/chart/interaction.js")
    print("  node --check tools/drive_comparison_client/ui/tooltip_table.js")
    print("  node --check tools/verify_drive_comparison_browser.mjs")
    print("  npm run build")
    print("  npm run verify:browser")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
