#!/usr/bin/env python3
"""Stack Chart Guide how-to labels above their descriptions.

Run from the repository root. Only modifies tools/ source CSS; rebuild docs
with npm run build afterwards.
"""
from pathlib import Path

ROOT = Path.cwd()
STYLES = ROOT / "tools" / "drive_comparison_styles.css"
MARKER_START = "/* chart guide reading stack override: start */"
MARKER_END = "/* chart guide reading stack override: end */"

CSS = f"""
{MARKER_START}
.chart-guide-reading .chart-reading-cue,
.chart-guide-content .chart-reading-cue {{
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
}}
.chart-guide-reading .chart-reading-cue-label,
.chart-guide-content .chart-reading-cue-label {{
  width: max-content;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #e5eee8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1.2;
  white-space: normal;
}}
.chart-guide-reading .chart-reading-cue-text,
.chart-guide-content .chart-reading-cue-text {{
  color: #c7d3cc;
  line-height: 1.38;
}}
{MARKER_END}
""".strip()


def replace_marker_block(text: str, replacement: str) -> tuple[str, bool]:
    start = text.find(MARKER_START)
    if start == -1:
        return text, False
    end = text.find(MARKER_END, start)
    if end == -1:
        raise SystemExit(f"Found {MARKER_START!r} without {MARKER_END!r}")
    end += len(MARKER_END)
    return text[:start].rstrip() + "\n" + replacement + "\n" + text[end:].lstrip(), True


def main() -> None:
    if not STYLES.exists():
        raise SystemExit(f"Missing expected file: {STYLES}")
    text = STYLES.read_text(encoding="utf-8")
    updated, replaced = replace_marker_block(text, CSS)
    if not replaced:
        updated = text.rstrip() + "\n\n" + CSS + "\n"
    if updated == text:
        print("No changes needed; Chart Guide reading cue layout is already updated.")
        return
    STYLES.write_text(updated, encoding="utf-8")
    print("Updated Chart Guide how-to layout:")
    print("- How-to labels now sit above their descriptions inside Chart Guide")
    print("- Removed pill styling for those how-to labels inside the guide")
    print("- tools/drive_comparison_styles.css updated")


if __name__ == "__main__":
    main()
