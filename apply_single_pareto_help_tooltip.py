#!/usr/bin/env python3
"""Keep only one tooltip for the Pareto-dominated help marker.

Run from the TI_Engine_Charts repository root:

    python apply_single_pareto_help_tooltip.py
    npm run build
    npm run verify

The Chart Guide help marker previously used both:
- a custom CSS tooltip from data-help; and
- a browser-native tooltip from the title attribute.

This script keeps the custom tooltip and removes the title attribute so hovering
over the ? marker does not show two tooltip surfaces at once. The accessible
label and data-help text remain in place.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path.cwd()
PARETO_HELP_SELECTOR = '.chart-guide-item .chart-guide-symbol.is-pareto + .chart-guide-help'


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def remove_native_title_from_js(path: Path) -> bool:
    if not path.exists():
        return False
    text = read(path)
    original = text

    # This is the line added by the Pareto help scripts. Keep aria-label and
    # data-help, but remove title so the browser does not show a second native
    # tooltip over the custom Chart Guide tooltip.
    text = re.sub(
        r'\n\s*help\.setAttribute\("title",\s*helpText\);',
        '',
        text,
    )

    # Defensive fallback for generated/minified-ish HTML copies that may have
    # compacted the same call onto a single line.
    text = text.replace('help.setAttribute("title", helpText);', '')

    if text != original:
        write(path, text)
        return True
    return False


def remove_native_title_from_html(path: Path) -> bool:
    if not path.exists():
        return False
    text = read(path)
    original = text
    text = text.replace('help.setAttribute("title", helpText);', '')
    if text != original:
        write(path, text)
        return True
    return False


def canonical_pareto_help_properties() -> str:
    return (
        f'        paretoHelpText: (() => {{\n'
        f'          const help = guide.querySelector("{PARETO_HELP_SELECTOR}");\n'
        f'          return help?.dataset.help || help?.getAttribute("aria-label") || "";\n'
        f'        }})(),\n'
        f'        paretoHelpHasNativeTitle: !!guide.querySelector("{PARETO_HELP_SELECTOR}")?.getAttribute("title"),\n'
    )


def update_browser_verify(path: Path) -> bool:
    if not path.exists():
        return False
    text = read(path)
    original = text

    # Normalize any existing Pareto help capture to read only the custom-tooltip
    # payload / accessible label, not the native title attribute.
    text = re.sub(
        r'\n\s*paretoHelp(?:Text)?:\s*guide\.querySelector\([^\n]+\)\?\.[^\n]+\n',
        '\n' + canonical_pareto_help_properties(),
        text,
        count=1,
    )

    # Some local versions used a short property name. Remove duplicated variants
    # if a previous replacement left more than one Pareto help property.
    first = text.find('        paretoHelpText: (() => {')
    if first != -1:
        tail_start = first + len('        paretoHelpText: (() => {')
        before = text[:tail_start]
        after = text[tail_start:]
        after = re.sub(
            r'\n\s*paretoHelp(?:Text)?:\s*guide\.querySelector\([^\n]+\)\?\.[^\n]+\n',
            '\n',
            after,
        )
        text = before + after

    # If no Pareto help capture exists yet, add it next to englishText in the
    # chart-guide verification object. Local branches may either inline the
    # expression as `englishText: guide.textContent` or return the previously
    # computed shorthand property `englishText`.
    if 'paretoHelpText: (() => {' not in text:
        next_text = text.replace(
            '        englishText: guide.textContent,\n',
            '        englishText: guide.textContent,\n' + canonical_pareto_help_properties(),
            1,
        )
        if next_text == text:
            next_text = text.replace(
                '      englishText,\n',
                '      englishText,\n' + canonical_pareto_help_properties().replace('        ', '      '),
                1,
            )
        text = next_text

    # Keep the existing content check, but ensure it reads the canonical property.
    text = re.sub(
        r'  expect\((?:/[^/]+/\.test\(chartGuideChecks\.paretoHelpText(?:\s*\|\|\s*chartGuideChecks\.paretoHelp)?\)|chartGuideChecks\.paretoHelp(?:Text)?\.includes\([^\n]+?\)), `\$\{htmlFile\}: Pareto[^`]+`\);',
        '  expect(/no more research/.test(chartGuideChecks.paretoHelpText || ""), `${htmlFile}: Pareto help tooltip is missing or incomplete`);',
        text,
        count=1,
    )

    # If the check does not exist, insert it after the visible Pareto guide item
    # check. This keeps older local branches aligned.
    if 'Pareto help tooltip is missing or incomplete' not in text:
        insertion_points = [
            '  expect(chartGuideChecks.englishText.includes("×: Pareto-dominated"), `${htmlFile}: guide does not explain Pareto-dominated markers`);\n',
            '  expect(/×: Pareto-dominated/.test(chartGuideChecks.englishText), `${htmlFile}: guide does not explain Pareto-dominated markers`);\n',
            '  expect(/Dim: Pareto-dominated/.test(chartGuideChecks.englishText), `${htmlFile}: guide does not explain Pareto dimming`);\n',
        ]
        for marker in insertion_points:
            if marker in text:
                text = text.replace(
                    marker,
                    marker + '  expect(/no more research/.test(chartGuideChecks.paretoHelpText || ""), `${htmlFile}: Pareto help tooltip is missing or incomplete`);\n',
                    1,
                )
                break

    # Add an explicit guard so future regressions do not reintroduce the native
    # title tooltip alongside the custom data-help tooltip.
    if 'Pareto help should not use a native title tooltip' not in text:
        anchor = '  expect(/no more research/.test(chartGuideChecks.paretoHelpText || ""), `${htmlFile}: Pareto help tooltip is missing or incomplete`);\n'
        if anchor in text:
            text = text.replace(
                anchor,
                anchor + '  expect(!chartGuideChecks.paretoHelpHasNativeTitle, `${htmlFile}: Pareto help should not use a native title tooltip in addition to the custom tooltip`);\n',
                1,
            )

    # Remove older title-positive assertions if they exist. Keep the new
    # negative guard that requires the native title tooltip to be absent.
    text = re.sub(
        r'\n\s*expect\(chartGuideChecks\.paretoHelpTitle[^;\n]*;\n',
        '\n',
        text,
    )

    if text != original:
        write(path, text)
        return True
    return False


def main() -> None:
    required = [
        ROOT / 'tools' / 'drive_comparison_client' / 'chart' / 'interaction.js',
        ROOT / 'tools' / 'drive_comparison_styles.css',
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise SystemExit('Run this script from the TI_Engine_Charts repository root. Missing:\n' + '\n'.join(missing))

    changed = []
    for rel in [
        Path('tools/drive_comparison_client/chart/interaction.js'),
        Path('docs/assets/js/chart/interaction.js'),
    ]:
        path = ROOT / rel
        if remove_native_title_from_js(path):
            changed.append(str(rel))

    if remove_native_title_from_html(ROOT / 'docs' / 'index.html'):
        changed.append('docs/index.html')

    if update_browser_verify(ROOT / 'tools' / 'verify_drive_comparison_browser.mjs'):
        changed.append('tools/verify_drive_comparison_browser.mjs')

    print('Kept only one Pareto help tooltip:')
    print('- Removed the browser-native title tooltip from the Chart Guide ? marker.')
    print('- Kept the custom data-help tooltip and accessible aria-label.')
    print('- Updated browser verification to require no native title tooltip.')
    if changed:
        print('\nChanged files:')
        for item in changed:
            print(f'- {item}')
    else:
        print('\nNo file changes were needed; the local tree already matched this behavior.')
    print('\nNext steps:')
    print('  npm run build')
    print('  npm run verify')


if __name__ == '__main__':
    main()
