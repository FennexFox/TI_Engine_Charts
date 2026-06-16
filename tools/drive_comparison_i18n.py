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
        '<div id="connectionLineControls" class="connection-line-controls" aria-label="연결선 표시">\n'
        '              <div class="connection-line-mode-label">연결선</div>\n'
        '              <div class="segmented compact connection-line-mode" role="radiogroup" aria-label="연결선 표시">\n'
        '                <label title="연결선을 숨깁니다." aria-label="끔: 연결선을 숨깁니다."><input type="radio" name="connectionLineMode" value="off" title="연결선을 숨깁니다.">끔</label>\n'
        '                <label title="드라이브 연구 선후관계가 확인되는 연결선만 표시합니다." aria-label="엄격: 드라이브 연구 선후관계가 확인되는 연결선만 표시합니다."><input type="radio" name="connectionLineMode" value="strict" title="드라이브 연구 선후관계가 확인되는 연결선만 표시합니다.">엄격</label>\n'
        '                <label title="드라이브 연구 연결선에 더해 반응로/전원 계통 진행선을 표시합니다." aria-label="계통: 드라이브 연구 연결선에 더해 반응로/전원 계통 진행선을 표시합니다."><input type="radio" name="connectionLineMode" value="lineage" title="드라이브 연구 연결선에 더해 반응로/전원 계통 진행선을 표시합니다." checked>계통</label>\n'
        '                <label title="넓은 계열 보조선까지 포함해 가능한 진행선을 모두 표시합니다." aria-label="전체: 넓은 계열 보조선까지 포함해 가능한 진행선을 모두 표시합니다."><input type="radio" name="connectionLineMode" value="all" title="넓은 계열 보조선까지 포함해 가능한 진행선을 모두 표시합니다.">전체</label>\n'
        '              </div>\n'
        '            </div>',
        '<div id="connectionLineControls" class="connection-line-controls" aria-label="Connection line mode">\n'
        '              <div class="connection-line-mode-label">Connection lines</div>\n'
        '              <div class="segmented compact connection-line-mode" role="radiogroup" aria-label="Connection line mode">\n'
        '                <label title="Hide connection lines." aria-label="Off: Hide connection lines."><input type="radio" name="connectionLineMode" value="off" title="Hide connection lines.">Off</label>\n'
        '                <label title="Show only prerequisite-backed drive research links." aria-label="Strict: Show only prerequisite-backed drive research links."><input type="radio" name="connectionLineMode" value="strict" title="Show only prerequisite-backed drive research links.">Strict</label>\n'
        '                <label title="Show drive research links plus reactor/power-lineage progression." aria-label="Lineage: Show drive research links plus reactor/power-lineage progression."><input type="radio" name="connectionLineMode" value="lineage" title="Show drive research links plus reactor/power-lineage progression." checked>Lineage</label>\n'
        '                <label title="Show all available progression lines, including broader family fallback lines." aria-label="All: Show all available progression lines, including broader family fallback lines."><input type="radio" name="connectionLineMode" value="all" title="Show all available progression lines, including broader family fallback lines.">All</label>\n'
        '              </div>\n'
        '            </div>',
    ),
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
    ("함선 설계 열기", "Open Ship Designer"),
    ("함선 설계 편집", "Edit Ship Design"),
    ("적용된 함선 템플릿 없음", "No ship template applied"),
    ("적용된 설계", "Applied design"),
    ("건조질량", "Dry mass"),
    ("모듈 성능 효과 적용", "Apply module performance effects"),
    ("선택 모듈 목록", "Selected modules"),
    ("성능 모듈 선택 없음", "No performance modules selected"),
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
        "X축은 최초 호환 전원을 포함한 누적 연구력입니다. 같은 연구력 대비 총질량, 가속도(TWR), 추력, 효율을 비교해 어느 추진기 계통에 투자할지 판단하는 데 초점을 둡니다.",
        "The X axis is cumulative research including the first compatible power plant. Use it to compare total mass, acceleration (TWR), thrust, and efficiency at similar research costs and decide which drive path to invest in.",
    ),
    ("차트 빠른 설정", "Chart quick controls"),
    ("차트 컨트롤", "Chart controls"),
    ("차트 옵션", "Chart options"),
    ("차트 보조 표시", "Chart overlays"),
    ("차트 신호", "Signals"),
    ("표시", "Display"),
    ("필터", "Filters"),
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
    ("시뮬레이션(총 질량, 연료질량, 가속도)", "Simulation (total mass, fuel mass, acceleration)"),
    ("가속도 (TWR)", "Acceleration (TWR)"),
    ("가속도", "Acceleration"),
    ("계산 메모", "Calculation note"),
    ("현재 최소 가속도 필터", "the current minimum acceleration filter"),
    ("현재 dV / 최소 가속도 설정", "current dV / minimum acceleration settings"),
    ("최소 가속도 필터 낮추기 또는 해제하기", "Lower or disable the minimum acceleration filter"),
    ("최소 가속도 또는 극단적 질량비", "minimum acceleration or extreme mass ratio"),
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
    ("엔진 수 제한이 있는 드라이브는 선택값에 가장 가까운 유효 엔진 수로 표시됩니다.", "Drives with engine-count restrictions are shown using the closest valid engine count."),
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
    ("시나리오 프리셋", "Scenario Preset"),
    ("총질량/연료질량/가속도 보조 표시", "Total mass/fuel mass/acceleration overlay"),
    ("가속도 정보 표시", "Show acceleration information"),
    ("총질량 정보 표시", "Show total mass information"),
    ("파레토 후보 강조", "Highlight Pareto candidates"),
    ("가속도 정보", "Acceleration info"),
    ("총질량 정보", "Total mass info"),
    ("파레토 강조", "Pareto highlight"),
    ("비현실적 후보 표시", "Show impractical candidates"),
    ("추가 전원 연구력 반영", "Include additional power research"),
    ("X축: 최초+추가 전원 포함 연구력", "X axis: first + additional power research"),
    ("X축: 최초 전원 포함 연구력", "X axis: first power-inclusive research"),
    ("추가 전원 포함 연구력:", "Additional power-inclusive research:"),
    ("누적 연구력 (최초+추가 전원 포함)", "Cumulative research (first + additional power included)"),
    ("누적 연구력 (최초 전원 포함)", "Cumulative research (first power included)"),
    ("개방 연구력:", "Unlock research:"),
    ("추진기 연구:", "Drive research:"),
    ("최소 가속도 (mg)", "Minimum acceleration (mg)"),
    ("최소 가속도", "Minimum acceleration"),
    ("최소 가속도 (TWR)", "Minimum acceleration (TWR)"),
    ("최소 dV", "Minimum dV"),
    ("최소 dV (km/s)", "Minimum dV (km/s)"),
    ("임무 dV 프리셋", "Mission dV preset"),
    ("사용자 지정", "Custom"),
    ("LEO 방어 / 비지구 궤도 - 2 km/s", "LEO Defense / non-Earth orbit - 2 km/s"),
    ("MEO에서 LEO - 4 km/s", "MEO to LEO - 4 km/s"),
    ("전 지구권 방어 - 8 km/s", "All Earth Defense - 8 km/s"),
    ("감속 연소 요격 - 20 km/s", "Deceleration Burn Intercept - 20 km/s"),
    ("소행성 강습 - 30 km/s", "Asteroid Assault - 30 km/s"),
    ("목성 강습 - 50 km/s", "Jupiter Assault - 50 km/s"),
    ("고속 소행성 강습 - 150 km/s", "Fast Asteroid Assault - 150 km/s"),
    ("카이퍼 벨트 강습 - 200 km/s", "Kuiper Belt Assault - 200 km/s"),
    ("고속 카이퍼 벨트 - 500 km/s", "Fast Kuiper Belt - 500 km/s"),
    ("표시: 가속도 >= 0.1mg", "Showing: acceleration >= 0.1mg"),
    ("표시: dV >= 0 km/s", "Showing: dV >= 0 km/s"),
    ("기준 없음", "No minimum threshold"),
    ("점 밝기: 가속도 높을수록 밝음", "Point brightness: brighter means higher acceleration"),
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
    ("가속도 = 추력 / (목표 Δv 달성 총질량 * g). Terra Invicta의 함선 acceleration과 같은 값이며, TWR은 이를 g 단위로 표현한 기술 용어입니다.", "Acceleration = thrust / (total mass for target Δv * g). Terra Invicta shows this as ship acceleration; TWR is the same value expressed in g."),
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
    for korean, english in ENGLISH_BLOCK_REPLACEMENTS:
        if korean.startswith("<strong>계산 메모."):
            return {"ko": korean, "en": english}
    raise RuntimeError("Calculation note translation is missing")
