"""Translation and metadata-redaction helpers for the drive comparison page.

This module keeps static i18n replacement data and source metadata cleanup out of
``build_drive_comparison.py``.  The chart builder emits a GitHub Pages-ready HTML
shell plus native ES module client assets, while embedded chart data remains in
the page as JSON.
"""

from __future__ import annotations

import copy
from pathlib import Path
from typing import Any


ENGLISH_BLOCK_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    (
        "<strong>계산 메모.</strong> 총질량은 기본 선체 건조 질량, 드라이브 질량, 전원 질량, 선택 라디에이터 질량, 목표 Δv에 필요한 추진체 질량을 합산합니다. 기본 드라이브 출력, 드라이브 질량, 전원 질량, 폐열, 라디에이터 질량은 이 저장소의 ship-plan 계산과 같은 항을 사용합니다. 모듈 효과가 켜져 있으면 지원되는 추진, 보조 전력, 폐열 배율이 표시되는 수정값에 반영되고, 지원되지 않는 모듈 규칙은 UI에 표시됩니다.",
        "<strong>Calculation note.</strong> Total mass adds the base hull dry mass, drive mass, power plant mass, selected radiator mass, and propellant mass required for the target Δv. Base drive power, drive mass, power plant mass, waste heat, and radiator mass use the same terms as this repository's ship-plan calculation. When module effects are enabled, supported drive, auxiliary-power, and waste-heat modifiers are folded into the displayed modified values; unsupported module rules are listed in the UI.",
    ),
    (
        "선택한 목표 Δv에 필요한 총질량 = 기준 건조질량 + 드라이브 + 전원 + 라디에이터 + 추진체",
        "Total mass required for the selected target Δv = base dry mass + drive + power plant + radiator + propellant",
    ),
    (
        "선택한 목표 Δv에 필요한 연료질량 = (기준 건조질량 + 드라이브 + 전원 + 라디에이터) * (질량비 - 1)",
        "Fuel mass required for the selected target Δv = (base dry mass + drive + power plant + radiator) * (mass ratio - 1)",
    ),
    (
        "총질량 = 기준 건조질량 + 드라이브 + 전원 + 라디에이터 + 추진체",
        "Total mass = base dry mass + drive + power plant + radiator + propellant",
    ),
    (" 밴드: 최초 전원 연구력 기준", " band: first power research basis"),
    (" 밴드: 추가 전원 연구력 포함", " band: including additional power research"),
)


ENGLISH_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ('<html lang="ko">', '<html lang="en">'),
    ("함선 설계", "Ship Designer"),
    ("설계 열기", "Open Designer"),
    ("새 이름으로 저장", "Save as New"),
    ("전원 보기", "Power view"),
    ("시뮬레이션 기본 조건", "Simulation defaults"),
    ("기본 프리셋을 설정했습니다.", "Default preset set."),
    ("기본 프리셋을 해제했습니다.", "Default preset cleared."),
    ("기본 프리셋 저장에 실패했습니다.", "Failed to save default preset."),
    ("기본 프리셋", "Default preset"),
    ("기본 지정", "Set default"),
    ("기본 해제", "Clear default"),
    ("선체 기본 질량", "Hull mass"),
    ("기본 필터", "Default filters"),
    ("기본 정보(추력, 효율, 출력)", "Basic information (thrust, efficiency, power)"),
    ("기본 전원", "Base power"),
    ("(기본)", "(default)"),
    ("기본", "Base"),
    ("호환 전원 전체", "All compatible power"),
    ("최적 가용 전원", "Best available power"),
    ("호환 전원", "compatible power"),
    ("전원 비교", "power comparison"),
    ("최적 가용 전원", "best available power"),
    ("누적 연구력 (전원 사다리 포함)", "Cumulative research (power ladder included)"),
    ("누적 연구력 (전원 진행 포함)", "Cumulative research (power progression included)"),
    ("Terra Invicta 드라이브 비교", "Terra Invicta Drive Comparison"),
    (
        "X축은 최초 호환 전원을 포함한 누적 연구력입니다. 같은 연구력 대비 총질량, TWR, 추력, 효율을 비교해 어느 추진기 계통에 투자할지 판단하는 데 초점을 둡니다.",
        "The X axis is cumulative research including the first compatible power plant. Use it to compare total mass, TWR, thrust, and efficiency at similar research costs and decide which drive path to invest in.",
    ),
    ("표시", "Display"),
    ("시뮬레이션 조건", "Simulation conditions"),
    ("필터 및 표시", "Filters and display"),
    ("드라이브 필터", "Drive filters"),
    ("패널 배열 초기화", "Reset panel layout"),
    ("카드 접기", "Collapse card"),
    ("카드 펼치기", "Expand card"),
    ("파레토 ON", "Pareto ON"),
    ("비현실 후보 ON", "Impractical ON"),
    ("검색 있음", "Search active"),
    ("검색 없음", "No search"),
    ("엔진", "Engine"),
    ("계열", "families"),
    ("세로축", "Vertical axis"),
    ("시뮬레이션(총 질량, 연료질량, TWR)", "Simulation (total mass, fuel mass, TWR)"),
    ("엔진/프로젝트 검색", "Engine/project search"),
    ("드라이브 또는 프로젝트 검색", "Search drive or project"),
    ("추력 (MN)", "Thrust (MN)"),
    ("연료효율 (km/s or s)", "Fuel efficiency (km/s or s)"),
    ("연료효율 (km/s)", "Fuel efficiency (km/s)"),
    ("연료효율 (s)", "Fuel efficiency (s)"),
    ("출력 요구량 (GW)", "Power requirement (GW)"),
    ("목표 Δv 달성 총질량 (t)", "Total mass for target Δv (t)"),
    ("목표 Δv 달성 연료질량 (t)", "Fuel mass for target Δv (t)"),
    ("목표 Δv 총질량 (t)", "Total mass for target Δv (t)"),
    ("목표 Δv 연료질량 (t)", "Fuel mass for target Δv (t)"),
    ("목표 dV 총질량 (t)", "Total mass for target Δv (t)"),
    ("목표 dV 연료질량 (t)", "Fuel mass for target Δv (t)"),
    ("엔진 수", "Engine count"),
    ("기준 선체 건조 질량 (t)", "Base hull dry mass (t)"),
    ("프로젝트 링크", "Project links"),
    ("Ko-fi 후원", "Support on Ko-fi"),
    ("건조질량 계산기", "Dry-mass calculator"),
    ("건조질량에 적용", "Apply to dry mass"),
    ("건조질량만 적용", "Apply dry mass only"),
    ("건조질량·기본 조건 적용", "Apply dry mass & sim defaults"),
    ("초기화", "Reset"),
    ("함급", "Hull Class"),
    ("MC 소모", "MC cost"),
    ("조선소 건조일수 (T1/T2/T3)", "Shipyard build days (T1/T2/T3)"),
    ("내부 유틸리티 모듈", "Internal utility modules"),
    ("무장 하드포인트", "Weapon hardpoints"),
    ("장갑 카탈로그 없음", "No armor catalog"),
    ("장갑", "Armor"),
    ("함수 하드포인트", "Nose hardpoints"),
    ("함체 하드포인트", "Hull hardpoints"),
    ("함미", "Tail"),
    ("함체", "Hull"),
    ("함수", "Nose"),
    ("무장 추가", "Add weapon"),
    ("하드포인트 없음", "No hardpoints"),
    ("남은 하드포인트 없음", "No remaining hardpoints"),
    ("유틸리티 슬롯", "Utility slots"),
    ("추가 승무원", "Extra crew"),
    ("닫기", "Close"),
    ("목표 dV (km/s)", "Target dV (km/s)"),
    ("라디에이터", "Radiator"),
    ("축 스케일", "Axis scale"),
    ("총질량/연료질량/TWR 보조 표시", "Total mass/fuel mass/TWR overlay"),
    ("TWR 정보 표시", "Show TWR information"),
    ("총질량 정보 표시", "Show total mass information"),
    ("파레토 후보 강조", "Highlight Pareto candidates"),
    ("비현실적 후보 표시", "Show impractical candidates"),
    ("추가 전원 연구력 반영", "Include additional power research"),
    ("X축: 최초+추가 전원 포함 연구력", "X axis: first + additional power research"),
    ("X축: 최초 전원 포함 연구력", "X axis: first power-inclusive research"),
    ("추가 전원 포함 연구력:", "Additional power-inclusive research:"),
    ("누적 연구력 (최초+추가 전원 포함)", "Cumulative research (first + additional power included)"),
    ("누적 연구력 (최초 전원 포함)", "Cumulative research (first power included)"),
    ("개방 연구력:", "Unlock research:"),
    ("추진기 연구:", "Drive research:"),
    ("최소 TWR (mg)", "Minimum TWR (mg)"),
    ("최소 TWR", "Minimum TWR"),
    ("최소 dV", "Minimum dV"),
    ("최소 dV (km/s)", "Minimum dV (km/s)"),
    ("표시: TWR >= 0.1mg", "Showing: TWR >= 0.1mg"),
    ("표시: dV >= 0 km/s", "Showing: dV >= 0 km/s"),
    ("기준 없음", "No minimum threshold"),
    ("점 밝기: TWR 높을수록 밝음", "Point brightness: brighter means higher TWR"),
    ("점 밝기: 총질량 낮을수록 밝음", "Point brightness: brighter means lower total mass"),
    ("흐린 점: Pareto 지배 후보", "Dim points: Pareto-dominated candidates"),
    ("X축 로그", "Log X axis"),
    ("Y축 로그", "Log Y axis"),
    ("대분류 / 세부 계열", "Category / Subfamily"),
    ("대분류", "Category"),
    ("세부 계열", "Subfamily"),
    ("전체 선택", "Select all"),
    ("전체 해제", "Clear all"),
    ("보기 초기화", "Reset view"),
    ("개 추진기 표시", " drives shown"),
    ("개 드라이브 표시", " drives shown"),
    ("선택 없음", "No selection"),
    ("추진기", "Drive"),
    ("누적 연구력", "Cumulative research"),
    ("값", "Value"),
    ("전원 단계", "Power plant tier"),
    ("템플릿 thrust_N을 MN으로 환산", "Template thrust_N converted to MN"),
    ("템플릿 EV_kps", "Template EV_kps"),
    (
      "연료질량 = (기준 건조질량 + 드라이브 + 전원 + 라디에이터) * (질량비 - 1)",
      "Fuel mass = (base dry mass + drive + power plant + radiator) * (mass ratio - 1)",
    ),
    ("추력 / (목표 Δv 달성 총질량 * g)", "Thrust / (total mass for target Δv * g)"),
    ("추력:", "Thrust:"),
    ("출력 요구량:", "Power requirement:"),
    ("선택 해제", "Clear selection"),
    ("항목 삭제", "Remove item"),
    ("순서 변경", "Reorder card"),
    ("위로 이동", "Move up"),
    ("아래로 이동", "Move down"),
    ("자체 프로젝트", "Own project"),
    ("효율", "Efficiency"),
    ("드라이브 질량", "Drive mass"),
    ("선체", "Hull"),
    ("드라이브", "Drive"),
    ("전원", "Power plant"),
    ("추진체", "Propellant"),
    ("폐열", "Waste heat"),
    ("없음", "None"),
)


def redacted_source_label(key: str, value: Any) -> str | None:
    if value is None:
        return value
    if key in {"gameVersion", "gameVersionSource", "steamBuildId"}:
        return str(value)
    if key == "templatesDir":
        return "TerraInvicta_Data/StreamingAssets/Templates"
    name = Path(str(value)).name
    return name or str(value)


def redact_source_paths(data: dict[str, Any]) -> dict[str, Any]:
    result = copy.deepcopy(data)
    source = result.get("source")
    if isinstance(source, dict):
        result["source"] = {
            key: redacted_source_label(str(key), value)
            for key, value in source.items()
        }
    return result


def client_translation_pairs() -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for korean, english in (*ENGLISH_BLOCK_REPLACEMENTS, *ENGLISH_REPLACEMENTS):
        if korean.startswith("<html "):
            continue
        pairs.append((korean, english))
    return pairs


def apply_static_english_html(html: str) -> str:
    replacements = sorted(
        (*ENGLISH_BLOCK_REPLACEMENTS, *ENGLISH_REPLACEMENTS),
        key=lambda pair: len(pair[0]),
        reverse=True,
    )
    for korean, english in replacements:
        html = html.replace(korean, english)
    return html


def note_html_translations() -> dict[str, str]:
    korean, english = ENGLISH_BLOCK_REPLACEMENTS[0]
    return {"ko": korean, "en": english}
