#!/usr/bin/env python3
"""Move chart status text below the chart and fold How-to-read cues into Chart Guide.

Run from the repository root after the previous UI polish patch is applied.
Only source files under tools/ are modified.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path.cwd()
TEMPLATE = ROOT / "tools" / "drive_comparison_template.html"
STYLES = ROOT / "tools" / "drive_comparison_styles.css"
INTERACTION = ROOT / "tools" / "drive_comparison_client" / "chart" / "interaction.js"


def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")


def write_if_changed(path: Path, content: str) -> bool:
    old = read(path)
    if old == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def patch_template() -> bool:
    s = read(TEMPLATE)

    caption = '''          <div class="chart-status-caption" aria-live="polite">
            <div class="chart-caption-count"><strong id="visibleCount">0</strong>개 드라이브 표시</div>
            <div id="chartActiveSummary" class="chart-active-summary"></div>
          </div>
'''

    # Remove the old top-of-chart status nodes. This intentionally removes only the
    # visible count/status text, not toolbar controls that may share the same strip
    # in older local states.
    s = re.sub(
        r"\n\s*<div><strong id=\"visibleCount\">0</strong>개 드라이브 표시</div>",
        "",
        s,
        count=1,
    )
    s = re.sub(
        r"\n\s*<div id=\"chartActiveSummary\" class=\"chart-active-summary\" aria-live=\"polite\"></div>",
        "",
        s,
        count=1,
    )

    # If the previous removal leaves an empty summary strip, remove it entirely.
    s = re.sub(
        r"\n\s*<div class=\"summary-strip\">\s*\n\s*<div class=\"summary-left\">\s*\n\s*</div>\s*\n\s*</div>",
        "",
        s,
        count=1,
    )

    # Move diagnostics into the chart-frame context when possible, near the banner.
    diagnostic = '          <div id="chartDiagnostic" class="diagnostic-banner" hidden></div>\n'
    s = re.sub(
        r"\n\s*<div id=\"chartDiagnostic\" class=\"diagnostic-banner\" hidden></div>",
        "",
        s,
    )
    if 'id="chartDiagnostic"' not in s:
        banner_close = '''          <div id="filterActionBanner" class="filter-action-banner" hidden aria-live="polite">
            <div class="filter-action-banner-copy">
              <strong id="filterActionBannerTitle"></strong>
              <div id="filterActionBannerDetail"></div>
            </div>
            <div id="filterActionBannerActions" class="filter-action-banner-actions"></div>
          </div>
'''
        if banner_close in s:
            s = s.replace(banner_close, banner_close + diagnostic, 1)
        else:
            # Fallback for slightly different formatting.
            s = s.replace('          <div id="metricHint"', diagnostic + '          <div id="metricHint"', 1)

    # Remove the always-visible How-to-read section. Its content is now rendered
    # inside the floating Chart Guide.
    s = re.sub(
        r"\n\s*<section id=\"chartReadingGuide\" class=\"chart-reading-guide\" aria-label=\"차트 읽기 요약\"></section>",
        "",
        s,
        count=1,
    )

    if 'id="chartActiveSummary"' not in s:
        # Preferred current structure: chart plot area wrapper followed by the guide section.
        marker = '''          <div class="chart-plot-area">
            <svg id="chart" role="img" aria-label="Drive comparison chart"></svg>
            <div id="chartGuide" class="chart-guide" aria-label="Chart guide">
              <details id="chartGuideDetails" class="chart-guide-details">
                <summary id="chartGuideSummary" class="chart-guide-summary">Chart Guide</summary>
                <div id="chartGuideContent" class="chart-guide-content"></div>
              </details>
            </div>
          </div>
'''
        if marker in s:
            s = s.replace(marker, marker + caption, 1)
        else:
            # Older/local structure without chart-plot-area.
            marker = '''          <div id="chartGuide" class="chart-guide" aria-label="Chart guide">
            <details id="chartGuideDetails" class="chart-guide-details">
              <summary id="chartGuideSummary" class="chart-guide-summary">Chart Guide</summary>
              <div id="chartGuideContent" class="chart-guide-content"></div>
            </details>
          </div>
'''
            if marker in s:
                s = s.replace(marker, marker + caption, 1)
            else:
                raise SystemExit("Could not find chart area anchor for chart status caption.")

    return write_if_changed(TEMPLATE, s)


def patch_styles() -> bool:
    s = read(STYLES)

    if ".chart-status-caption" not in s:
        caption_css = '''    .chart-status-caption {
      display: grid;
      gap: 3px;
      margin: 8px 0 0;
      padding: 7px 2px 0;
      border-top: 1px solid rgba(148, 163, 184, 0.14);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .chart-caption-count strong {
      color: var(--ink);
      font-weight: 700;
    }
    .chart-status-caption .chart-active-summary {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
'''
        anchor = "    .table-shell {"
        if anchor not in s:
            raise SystemExit("Could not find CSS anchor for chart status caption.")
        s = s.replace(anchor, caption_css + anchor, 1)

    if ".chart-guide-divider" not in s:
        guide_css = '''.chart-guide-section {
  display: grid;
  gap: 7px;
  min-width: 0;
}
.chart-guide-legend {
  gap: 6px;
}
.chart-guide-divider {
  height: 1px;
  margin: 2px 0;
  background: rgba(148, 163, 184, 0.22);
}
.chart-guide-subheading {
  color: #d8e1db;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
}
.chart-guide-reading .chart-reading-cues,
.chart-guide-content .chart-reading-cues {
  grid-template-columns: 1fr;
  gap: 6px;
}
.chart-guide-reading .chart-reading-cue,
.chart-guide-content .chart-reading-cue {
  grid-template-columns: minmax(58px, auto) minmax(0, 1fr);
}
'''
        anchor = ".module-effects-details {"
        if anchor not in s:
            raise SystemExit("Could not find CSS anchor for chart guide divider.")
        s = s.replace(anchor, guide_css + anchor, 1)

    return write_if_changed(STYLES, s)


NEW_RENDER_CHART_GUIDE = r'''export function renderChartGuide() {
      const details = document.getElementById("chartGuide");
      const guide = document.getElementById("chartGuideContent") || details;
      if (!guide) return;
      guide.innerHTML = "";
      if (details) details.setAttribute("aria-label", localText("차트 안내", "Chart guide"));
      const summary = document.getElementById("chartGuideSummary");
      if (summary) summary.textContent = localText("차트 안내", "Chart Guide");

      const paretoHelpText = localText(
        "다른 표시 후보가 연구를 더 필요로 하지 않고, 선택한 차트 지표도 같거나 더 좋으며, 두 축 중 적어도 하나에서는 더 좋은 후보입니다.",
        "A candidate is Pareto-dominated when another visible option needs no more research, is at least as good on the selected chart metric, and is better on at least one plotted axis."
      );

      const legend = document.createElement("div");
      legend.className = "chart-guide-section chart-guide-legend";
      guide.appendChild(legend);

      const appendItem = (symbolClass, text, helpText = "") => {
        const item = document.createElement("span");
        item.className = "chart-guide-item";
        const symbol = document.createElement("span");
        symbol.className = `chart-guide-symbol ${symbolClass}`;
        item.append(symbol, document.createTextNode(text));
        if (helpText) {
          const help = document.createElement("span");
          help.className = "chart-guide-help";
          help.textContent = "?";
          help.tabIndex = 0;
          help.setAttribute("role", "note");
          help.setAttribute("aria-label", helpText);
          help.dataset.help = helpText;
          item.appendChild(help);
        }
        legend.appendChild(item);
      };

      appendItem("is-line", localText("선: 드라이브 진행 경로", "Lines: drive progression"));
      if (secondaryEncodingEnabled()) {
        appendItem(
          "is-secondary",
          localText("투명도: 낮은 TWR / 큰 질량", "Transparency: low TWR / high mass"),
        );
      }
      appendItem("is-pareto", localText("×: Pareto 지배", "×: Pareto-dominated"), paretoHelpText);
      appendItem("is-warning", localText("경고 링: 낮은 TWR/극단 질량비", "Warning ring: low TWR/extreme mass"));
      appendItem("is-pin", localText("윤곽선: 호버/선택/고정, 재클릭 해제", "Outline: hover/select/pin; click again unpins"));

      const divider = document.createElement("div");
      divider.className = "chart-guide-divider";
      divider.setAttribute("aria-hidden", "true");

      const reading = document.createElement("div");
      reading.className = "chart-guide-section chart-guide-reading";
      const heading = document.createElement("div");
      heading.className = "chart-guide-subheading";
      heading.textContent = localText("차트 읽기", "How to read");
      const cues = document.createElement("div");
      cues.className = "chart-reading-cues";
      appendReadingCue(
        cues,
        localText("왼쪽", "Left"),
        localText(
          "최초 호환 전원을 포함한 누적 연구력이 더 낮습니다.",
          "Lower cumulative research, including the first compatible power plant.",
        ),
      );
      appendReadingCue(cues, localText("아래", "Lower"), yAxisReadingText());
      appendReadingCue(
        cues,
        localText("먼저 볼 곳", "Look first"),
        localText(
          "좋은 후보는 보통 왼쪽 아래에서 시작하지만, 가속도와 임무 역할이 답을 바꿀 수 있습니다.",
          "Good candidates often start near the lower-left, but Acceleration and mission role can change the answer.",
        ),
      );
      appendReadingCue(
        cues,
        localText("현재 가정", "Assumptions"),
        `${appliedShipAssumptionText()} · dV ${formatNumber(state.targetDvKps, " km/s")} · ${accelerationAssumptionText()}`,
      );
      reading.append(heading, cues);
      guide.append(divider, reading);
    }

'''


def patch_interaction() -> bool:
    s = read(INTERACTION)

    s, n = re.subn(
        r"export function renderChartGuide\(\) \{.*?\n\s*\}\n\n(?=function appliedShipAssumptionText\(\))",
        NEW_RENDER_CHART_GUIDE,
        s,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit("Could not replace renderChartGuide().")

    noop_reading = '''export function renderChartReadingGuide() {
      const root = document.getElementById("chartReadingGuide");
      if (!root) return;
      root.innerHTML = "";
      root.hidden = true;
    }

'''
    s, n = re.subn(
        r"export function renderChartReadingGuide\(\) \{.*?\n\s*\}\n\n(?=export function valueDomain\(rows\) \{)",
        noop_reading,
        s,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit("Could not replace renderChartReadingGuide().")

    return write_if_changed(INTERACTION, s)


def main() -> None:
    changed = []
    for name, fn in (
        ("template", patch_template),
        ("styles", patch_styles),
        ("interaction", patch_interaction),
    ):
        if fn():
            changed.append(name)
    if changed:
        print("Updated:", ", ".join(changed))
    else:
        print("No changes needed.")


if __name__ == "__main__":
    main()
