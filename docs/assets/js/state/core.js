import { formatNumber, formatTwr, formatTwrDynamicUnit } from "../shared/formatting.js";

export const DATA = JSON.parse(document.getElementById("ti-data").textContent);
export const STATIC_TRANSLATIONS = JSON.parse(document.getElementById("ti-static-translations").textContent);
export const NOTE_HTML = JSON.parse(document.getElementById("ti-note-html").textContent);

const metricCalculationHooks = {
  chartMassOptions: () => [],
  effectiveDriveValues: row => row,
};

export function registerMetricCalculationHooks(hooks) {
  Object.assign(metricCalculationHooks, hooks || {});
}
export const STANDARD_GRAVITY_MPS2 = 9.80665;
export const DEFAULT_MIN_TWR = 0.0001;
export let UI_LANG = document.documentElement.lang === "en" ? "en" : "ko";
export const savedLanguage = localStorage.getItem("tiEngineChartLanguage");
    if (savedLanguage === "en" || savedLanguage === "ko") UI_LANG = savedLanguage;
export const POWER_RESEARCH_VIEWS = ["focus", "all", "best"];
export const MODULE_EFFECT_SOURCES = ["dryMassCalculator", "manual"];
export const DEFAULT_MODULE_EFFECT_SOURCE = "dryMassCalculator";
export const POWER_RESEARCH_VIEW_LABELS = {
      focus: { ko: "기본", en: "Base" },
      all: { ko: "전체 사다리", en: "All ladders" },
      best: { ko: "최적 가용", en: "Best Available" },
    };
export const state = {
      metric: "totalMassTons",
      thrusters: DATA.defaults.thrusterCount,
      fuelEfficiencyUnit: "kps",
      dryMassTons: DATA.defaults.dryMassTons,
      targetDvKps: DATA.defaults.targetDvKps,
      radiatorId: DATA.defaults.radiatorId,
      logX: false,
      logY: true,
      showTwrInfo: true,
      showMassInfo: true,
      paretoHighlight: true,
      showImpracticalCandidates: false,
      powerResearchView: "focus",
      moduleEffectsEnabled: false,
      moduleEffectSource: DEFAULT_MODULE_EFFECT_SOURCE,
      moduleEffectModuleIds: [],
      minTwr: DEFAULT_MIN_TWR,
      minDvKps: 0,
      searchTerm: "",
      sortKey: "research",
      sortDirection: "asc",
      lastTooltipItems: [],
      hoverPoints: [],
      tooltipPinned: false,
      pinnedTooltipItems: [],
      dismissedTooltipKeys: new Set(),
      hoverHitSignature: "",
      zoom: null,
      zoomContext: "",
      preserveViewportOnce: false,
      pan: null,
      categories: Object.fromEntries(DATA.categories.map(category => [category.key, !!category.defaultVisible])),
      families: Object.fromEntries(DATA.subfamilies.map(family => [family.key, true])),
    };

export function chartDefaultState() {
      return {
        metric: "totalMassTons",
        thrusters: DATA.defaults.thrusterCount,
        fuelEfficiencyUnit: "kps",
        dryMassTons: DATA.defaults.dryMassTons,
        targetDvKps: DATA.defaults.targetDvKps,
        radiatorId: DATA.defaults.radiatorId,
        logX: false,
        logY: true,
        showTwrInfo: true,
        showMassInfo: true,
        paretoHighlight: true,
        showImpracticalCandidates: false,
        powerResearchView: "focus",
        moduleEffectsEnabled: false,
        moduleEffectSource: DEFAULT_MODULE_EFFECT_SOURCE,
        moduleEffectModuleIds: [],
        minTwr: DEFAULT_MIN_TWR,
        minDvKps: 0,
        searchTerm: "",
        sortKey: "research",
        sortDirection: "asc",
        categories: Object.fromEntries(DATA.categories.map(category => [category.key, !!category.defaultVisible])),
        families: Object.fromEntries(DATA.subfamilies.map(family => [family.key, true])),
      };
    }

export function resetChartStateToDefaults() {
      Object.assign(state, chartDefaultState(), {
        lastTooltipItems: [],
        hoverPoints: [],
        tooltipPinned: false,
        pinnedTooltipItems: [],
        dismissedTooltipKeys: new Set(),
        hoverHitSignature: "",
        zoom: null,
        zoomContext: "",
        preserveViewportOnce: false,
        pan: null,
      });
    }

export function translateText(value, lang = UI_LANG) {
      let result = String(value ?? "");
      const pairs = lang === "en"
        ? STATIC_TRANSLATIONS
        : STATIC_TRANSLATIONS.map(([ko, en]) => [en, ko]);
      [...pairs]
        .sort((a, b) => String(b[0] ?? "").length - String(a[0] ?? "").length)
        .forEach(([from, to]) => {
          if (from) result = result.split(from).join(to);
        });
      return result;
    }

export function localText(ko, en) {
      return UI_LANG === "en" ? en : ko;
    }

export function normalizePowerResearchView(value) {
      return POWER_RESEARCH_VIEWS.includes(value) ? value : "focus";
    }

export function isBandMetricKey(metric = state.metric) {
      return metric === "totalMassTons" || metric === "fuelMassTons" || metric === "twr";
    }

export function powerResearchViewLabel(value = state.powerResearchView) {
      const label = POWER_RESEARCH_VIEW_LABELS[normalizePowerResearchView(value)] || POWER_RESEARCH_VIEW_LABELS.focus;
      return localText(label.ko, label.en);
    }

export function powerResearchActive() {
      return isBandMetricKey(state.metric) && POWER_RESEARCH_VIEWS.includes(state.powerResearchView);
    }

export const LEFT_PANEL_LAYOUT_STORAGE_KEY = "tiEngineChartLeftPanelLayout";
export const LEFT_PANEL_DEFAULT_ORDER = ["display", "simulation", "filter", "driveFilter"];
export const CHART_PRESET_STORAGE_KEY = "tiEngineChartNamedPresets";
export const CHART_PRESET_STARTUP_STORAGE_KEY = "tiEngineChartStartupPresetId";
export const DRY_MASS_PRESET_STORAGE_KEY = "tiEngineChartDryMassPresets";
export let leftPanelLayout = loadLeftPanelLayout();

export function setLeftPanelLayout(value) {
      leftPanelLayout = value;
}

export function normalizeLeftPanelOrder(order) {
      const seen = new Set();
      const normalized = [];
      if (Array.isArray(order)) {
        order.forEach(key => {
          if (LEFT_PANEL_DEFAULT_ORDER.includes(key) && !seen.has(key)) {
            normalized.push(key);
            seen.add(key);
          }
        });
      }
      LEFT_PANEL_DEFAULT_ORDER.forEach(key => {
        if (!seen.has(key)) normalized.push(key);
      });
      return normalized;
    }

export function loadLeftPanelLayout() {
      try {
        const raw = localStorage.getItem(LEFT_PANEL_LAYOUT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return {
          order: normalizeLeftPanelOrder(parsed.order),
          collapsed: parsed.collapsed && typeof parsed.collapsed === "object" ? parsed.collapsed : {},
        };
      } catch {
        return { order: LEFT_PANEL_DEFAULT_ORDER.slice(), collapsed: {} };
      }
    }

export function saveLeftPanelLayout() {
      try {
        localStorage.setItem(LEFT_PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(leftPanelLayout));
      } catch {
        // localStorage may be unavailable in some embedded/file contexts.
      }
    }

export function metricSelectLabel() {
      const metric = document.getElementById("metric");
      return metric?.selectedOptions?.[0]?.textContent?.trim() || metricLabel(state.metric);
    }

export function leftPanelCardSummary(key) {
      if (key === "display") {
        return metricSelectLabel();
      }
      if (key === "simulation") {
        const radiator = DATA.radiators.find(item => item.id === state.radiatorId);
        const parts = [
          formatNumber(state.dryMassTons, " t"),
          formatNumber(state.targetDvKps, " km/s"),
        ];
        if (state.metric === "totalMassTons" || state.metric === "fuelMassTons") {
          parts.push(`TWR ≥ ${formatTwrDynamicUnit(state.minTwr)}`);
        }
        parts.push(radiator ? radiatorDisplayName(radiator) : state.radiatorId);
        return parts.filter(Boolean).join(" · ");
      }
      if (key === "filter") {
        const parts = [];
        if (state.metric === "twr") {
          parts.push(`dV ≥ ${formatNumber(state.minDvKps, " km/s")}`);
        }
        if (state.paretoHighlight) parts.push(localText("파레토 ON", "Pareto ON"));
        if (state.showImpracticalCandidates) parts.push(localText("비현실 후보 ON", "Impractical ON"));
        if (state.logX || state.logY) {
          parts.push([
            state.logX ? localText("X축 로그", "Log X") : "",
            state.logY ? localText("Y축 로그", "Log Y") : "",
          ].filter(Boolean).join(" · "));
        }
        return parts.filter(Boolean).join(" · ") || localText("기본 필터", "Default filters");
      }
      if (key === "driveFilter") {
        const selectedFamilies = DATA.subfamilies.filter(family => !!state.categories[family.categoryKey] && !!state.families[family.key]).length;
        const activeCategories = DATA.categories.filter(category => !!state.categories[category.key]).length;
        const search = state.searchTerm ? localText("검색 있음", "Search active") : localText("검색 없음", "No search");
        return `${localText("엔진", "Engine")} ×${state.thrusters} · ${activeCategories}/${DATA.categories.length} ${localText("대분류", "categories")} · ${selectedFamilies}/${DATA.subfamilies.length} ${localText("계열", "families")} · ${search}`;
      }
      return "";
    }

export function updateLeftPanelCardSummaries() {
      document.querySelectorAll(".control-card[data-control-card]").forEach(card => {
        const key = card.dataset.controlCard;
        const summary = card.querySelector("[data-card-summary]");
        if (summary) summary.textContent = leftPanelCardSummary(key);
        const toggle = card.querySelector("[data-card-toggle]");
        if (toggle) {
          const expanded = card.dataset.collapsed !== "true";
          toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
          toggle.setAttribute("aria-label", expanded
            ? localText("카드 접기", "Collapse card")
            : localText("카드 펼치기", "Expand card"));
        }
      });
    }

export function applyLeftPanelOrder() {
      const root = document.querySelector(".controls");
      if (!root) return;
      const cards = Object.fromEntries(Array.from(root.querySelectorAll(".control-card[data-control-card]")).map(card => [card.dataset.controlCard, card]));
      const anchor = root.querySelector(".controls-toolbar");
      leftPanelLayout.order = normalizeLeftPanelOrder(leftPanelLayout.order);
      leftPanelLayout.order.forEach(key => {
        const card = cards[key];
        if (card) root.appendChild(card);
      });
      if (anchor && root.firstElementChild !== anchor) root.insertBefore(anchor, root.firstElementChild);
      updateLeftPanelMoveButtons();
      updateLeftPanelCardSummaries();
    }

export function updateLeftPanelMoveButtons() {
      const order = normalizeLeftPanelOrder(leftPanelLayout.order);
      document.querySelectorAll(".control-card[data-control-card]").forEach(card => {
        const index = order.indexOf(card.dataset.controlCard);
        const up = card.querySelector('[data-panel-move="up"]');
        const down = card.querySelector('[data-panel-move="down"]');
        if (up) up.disabled = index <= 0;
        if (down) down.disabled = index < 0 || index >= order.length - 1;
      });
    }

export function moveLeftPanelCard(key, delta) {
      const order = normalizeLeftPanelOrder(leftPanelLayout.order);
      const index = order.indexOf(key);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= order.length) return;
      [order[index], order[next]] = [order[next], order[index]];
      leftPanelLayout.order = order;
      saveLeftPanelLayout();
      applyLeftPanelOrder();
    }

export function setupLeftPanelCards() {
      const root = document.querySelector(".controls");
      if (!root) return;
      root.querySelectorAll(".control-card[data-control-card]").forEach(card => {
        const key = card.dataset.controlCard;
        const collapsed = !!leftPanelLayout.collapsed[key];
        card.dataset.collapsed = collapsed ? "true" : "false";
        const toggle = card.querySelector("[data-card-toggle]");
        if (toggle) {
          toggle.addEventListener("click", () => {
            const nextCollapsed = card.dataset.collapsed !== "true";
            card.dataset.collapsed = nextCollapsed ? "true" : "false";
            leftPanelLayout.collapsed[key] = nextCollapsed;
            saveLeftPanelLayout();
            updateLeftPanelCardSummaries();
          });
        }
        card.querySelectorAll("[data-panel-move]").forEach(button => {
          button.addEventListener("click", event => {
            event.preventDefault();
            moveLeftPanelCard(key, button.dataset.panelMove === "up" ? -1 : 1);
          });
          button.setAttribute("aria-label", button.dataset.panelMove === "up"
            ? localText("위로 이동", "Move up")
            : localText("아래로 이동", "Move down"));
          button.title = button.getAttribute("aria-label");
        });
      });
      const reset = document.getElementById("resetLeftPanelLayout");
      if (reset) {
        reset.addEventListener("click", () => {
          leftPanelLayout = { order: LEFT_PANEL_DEFAULT_ORDER.slice(), collapsed: {} };
          saveLeftPanelLayout();
          document.querySelectorAll(".control-card[data-control-card]").forEach(card => {
            card.dataset.collapsed = "false";
          });
          applyLeftPanelOrder();
        });
      }
      applyLeftPanelOrder();
    }


export const RADIATOR_KO_SHORT_NAMES = {
      ExoticSpike: "엑조틱 스파이크",
      DustyPlasma: "먼지 플라즈마",
      LithiumSpray: "리튬 스프레이",
      GalliumMist: "갈륨 안개",
      TinDroplet: "주석 방울",
      NanotubeFilament: "나노튜브 필라멘트",
      TitaniumArray: "티타늄 어레이",
      CobaltDust: "코발트 분진",
      MolybdenumPipe: "몰리브덴 파이프",
      IonicDust: "이온 분진",
      AluminumFin: "알루미늄 핀",
    };

export function cleanRadiatorDisplayName(name) {
      const text = String(name || "").trim();
      return UI_LANG === "ko" ? text.replace(/\s*라디에이터\s*$/u, "") : text;
    }

export function radiatorDisplayName(item) {
      if (!item) return "";
      const display = item.displayName;
      const projectDisplay = item.requiredProjectDisplay;
      let name = "";
      if (UI_LANG === "ko") {
        name = RADIATOR_KO_SHORT_NAMES[item.id] || "";
        if (!name && display && typeof display === "object") {
          name = display.ko || display.kor || "";
        }
        if (!name && projectDisplay && typeof projectDisplay === "object") {
          name = projectDisplay.ko || projectDisplay.kor || "";
        }
        if (!name && typeof display === "string") {
          name = translateText(display, "ko");
        }
      } else if (display && typeof display === "object") {
        name = display.en || display.ko || display.kor || item.id || "";
      } else if (typeof display === "string") {
        name = display;
      } else if (projectDisplay && typeof projectDisplay === "object" && !display) {
        name = projectDisplay.en || projectDisplay.ko || projectDisplay.kor || item.id || "";
      }
      return cleanRadiatorDisplayName(name || display || item.id || "");
    }

export function radiatorOptionLabel(item) {
      return `${radiatorDisplayName(item)} (${formatNumber(item.specificPowerKWPerKg, " kW/kg")})`;
    }

export function renderRadiatorOptions(select) {
      if (!select) return;
      const selectedId = state.radiatorId || select.value || (DATA.radiators[0] && DATA.radiators[0].id) || "";
      select.innerHTML = "";
      DATA.radiators.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = radiatorOptionLabel(item);
        option.selected = item.id === selectedId;
        select.appendChild(option);
      });
      if (DATA.radiators.some(item => item.id === selectedId)) {
        select.value = selectedId;
      }
    }

export function syncMetricGroupLabels() {
      const metric = document.getElementById("metric");
      if (!metric) return;
      const selectedValue = metric.value;
      const groups = metric.querySelectorAll("optgroup");
      if (groups[0]) groups[0].label = localText("시뮬레이션(총 질량, 연료질량, TWR)", "Simulation (total mass, fuel mass, TWR)");
      if (groups[1]) groups[1].label = localText("기본 정보(추력, 효율, 출력)", "Basic information (thrust, efficiency, power)");
      metric.innerHTML = metric.innerHTML;
      metric.value = selectedValue;
    }

export function applyStaticLanguage() {
      document.documentElement.lang = UI_LANG;
      const languageSelect = document.getElementById("uiLanguageSelect");
      if (languageSelect) languageSelect.value = UI_LANG;
      syncMetricGroupLabels();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(node => {
        node.nodeValue = translateText(node.nodeValue);
      });
      document.querySelectorAll("[placeholder],[aria-label],[title]").forEach(element => {
        ["placeholder", "aria-label", "title"].forEach(attribute => {
          if (element.hasAttribute(attribute)) {
            element.setAttribute(attribute, translateText(element.getAttribute(attribute)));
          }
        });
      });
      const note = document.getElementById("calculationNote");
      if (note) note.innerHTML = NOTE_HTML[UI_LANG] || NOTE_HTML.ko;
    }

export function setUiLanguage(lang) {
      UI_LANG = lang === "en" ? "en" : "ko";
      localStorage.setItem("tiEngineChartLanguage", UI_LANG);
    }

export const metricDefs = {
      thrustMN: {
        label: "추력 (MN)",
        hint: "템플릿 thrust_N을 MN으로 환산",
        value: row => metricCalculationHooks.effectiveDriveValues(row).thrustN / 1e6,
        format: value => formatNumber(value, " MN"),
      },
      fuelEfficiency: {
        get label() {
          return state.fuelEfficiencyUnit === "seconds" ? "연료효율 (s)" : "연료효율 (km/s)";
        },
        get hint() {
          return state.fuelEfficiencyUnit === "seconds"
            ? "EV_kps * 1000 / 9.80665"
            : "템플릿 EV_kps";
        },
        value: row => {
          const effective = metricCalculationHooks.effectiveDriveValues(row);
          return state.fuelEfficiencyUnit === "seconds" ? effective.specificImpulseSeconds : effective.exhaustVelocityKps;
        },
        format: value => formatNumber(value, state.fuelEfficiencyUnit === "seconds" ? " s" : " km/s"),
      },
      powerRequirementGW: {
        label: "출력 요구량 (GW)",
        hint: "thrust_N * EV_kps * 0.5 / 1,000,000 / efficiency",
        value: row => metricCalculationHooks.effectiveDriveValues(row).powerRequirementGW,
        format: value => formatNumber(value, " GW"),
      },
      totalMassTons: {
        label: "목표 dV 총질량 (t)",
        hint: "총질량 = 기준 건조질량 + 드라이브 + 전원 + 라디에이터 + 추진체",
        value: row => {
          const values = metricCalculationHooks.chartMassOptions(row);
          return values.length ? values[0].totalMassTons : NaN;
        },
        format: value => formatNumber(value, " t"),
      },
      fuelMassTons: {
        label: "목표 dV 연료질량 (t)",
        hint: "연료질량 = (기준 건조질량 + 드라이브 + 전원 + 라디에이터) * (질량비 - 1)",
        value: row => {
          const values = metricCalculationHooks.chartMassOptions(row);
          return values.length ? values[0].propellantTons : NaN;
        },
        format: value => formatNumber(value, " t"),
      },
      twr: {
        label: "TWR",
        hint: "추력 / (목표 dV 총질량 * g)",
        value: row => {
          const values = metricCalculationHooks.chartMassOptions(row);
          return values.length ? values[0].twr : NaN;
        },
        format: value => formatTwr(value, ""),
      },
    };

export function metricLabel(key) {
      return translateText(metricDefs[key].label);
    }

export function metricHint(key) {
      return translateText(metricDefs[key].hint);
    }

export const chart = document.getElementById("chart");
export const tooltip = document.getElementById("tooltip");
export const categoryRoot = document.getElementById("categories");
export const familyRoot = document.getElementById("families");
export const CHART_HIT_RADIUS_PX = 16;
export const CHART_LADDER_HIT_RADIUS_PX = 14;
export const CHART_CLICK_TOLERANCE_PX = 5;
export const EXTREME_MASS_RATIO = 1_000_000;
export const MASS_RATIO_OVERFLOW_EXPONENT = 709;
export const HIDDEN_REASON_PRIORITY = [
      "minTwr",
      "minDv",
      "targetDvOrMassRatio",
      "researchFilter",
      "invalidPowerPlant",
      "invalidComputation",
      "axisRange",
      "other",
      "familyFilter",
    ];
export const HELP_TEXT = {
      showTwrInfo: {
        ko: "목표 dV 총질량/연료질량 그래프에서 각 점의 밝기를 TWR로 인코딩합니다. 같은 질량대라도 실제로 가속이 가능한 후보인지 빠르게 구분할 때 유용합니다.",
        en: "On the target-dV total-mass/fuel-mass charts, point brightness encodes TWR. This helps separate candidates that can actually accelerate from sluggish designs at similar mass.",
      },
      showMassInfo: {
        ko: "TWR 그래프에서 각 점의 밝기를 총질량의 역수로 인코딩합니다. 높은 TWR 후보 중에서도 같은 목표 dV를 더 가벼운 총질량으로 달성하는 조합을 찾는 데 도움을 줍니다.",
        en: "On the TWR chart, point brightness encodes the inverse of total mass. This helps find high-TWR candidates that also reach the target dV with a lighter ship.",
      },
      paretoHighlight: {
        ko: "누적 연구력은 더 낮고, 총질량은 더 가볍고, TWR은 더 높은 후보가 존재하면 해당 후보를 흐리게 표시합니다. 명백히 밀리는 조합을 줄여 투자 후보를 좁히는 기능입니다.",
        en: "Dims candidates that are dominated by another option with no more research, no more total mass, and at least as much TWR. It narrows attention to stronger investment candidates.",
      },
      showImpracticalCandidates: {
        ko: "최소 TWR 또는 극단적 질량비 때문에 보통 숨겨지는 후보도 차트에 남깁니다. 왜 특정 계열이 사라지는지 조사하거나 낮은 dV 프리셋을 찾을 때 사용하세요.",
        en: "Keeps candidates that would normally be hidden by minimum TWR or extreme mass ratio. Use it to inspect why a family disappears or to design lower-dV presets.",
      },
      minTwr: {
        ko: "총질량 그래프에서 습질량 기준 TWR이 이 값보다 낮은 후보를 숨깁니다. 값을 낮추면 장거리 dV에는 가능하지만 가속이 매우 느린 조합까지 확인할 수 있습니다.",
        en: "On total-mass charts, hides candidates whose wet-mass TWR is below this threshold. Lower it to inspect designs that can reach the dV but accelerate very slowly.",
      },
      minDv: {
        ko: "TWR 그래프에서 실용 질량비 한계(극단적 질량비 기준)로 계산한 최대 dV가 이 값보다 낮은 후보를 숨깁니다.",
        en: "On the TWR chart, hides candidates whose maximum practical dV (using the extreme mass-ratio bound) is below this threshold.",
      },
    };
export const allDriveRowsById = new Map(DATA.drives.map(row => [row.id, row]));
export const SHIP_CATALOG = DATA.shipCatalog || {};
export const ALL_SHIP_HULLS = Array.isArray(SHIP_CATALOG.hulls) ? SHIP_CATALOG.hulls : [];
export const HUMAN_BUILDABLE_HULLS = ALL_SHIP_HULLS.filter(item => !item.alien && !item.noShipyardBuild && !item.simpleHull);
export const SHIP_CLASS_OPTIONS = HUMAN_BUILDABLE_HULLS.length ? HUMAN_BUILDABLE_HULLS : ALL_SHIP_HULLS;
export const ALL_UTILITY_MODULES = Array.isArray(SHIP_CATALOG.utilityModules) ? SHIP_CATALOG.utilityModules : [];
export const EMPTY_UTILITY_MODULE = ALL_UTILITY_MODULES.find(item => item.dataName === "Empty") || {
      dataName: "Empty",
      friendlyName: "Empty",
      displayName: { kor: "비움", en: "Empty" },
      massTons: 0,
      crew: 0,
      powerRequirementMW: 0,
      minConstructionTier: 0,
      alien: false,
    };
export const ALL_WEAPON_MODULES = Array.isArray(SHIP_CATALOG.weaponModules) ? SHIP_CATALOG.weaponModules : [];
export const EMPTY_WEAPON_MODULE = {
      dataName: "EmptyWeapon",
      friendlyName: "Empty",
      displayName: { kor: "비움", en: "Empty" },
      massTons: 0,
      crew: 0,
      mount: "",
      slotClass: "any",
      slotSize: 0,
      alien: false,
    };
export const ALL_ARMORS = Array.isArray(SHIP_CATALOG.armors) ? SHIP_CATALOG.armors : [];
export const HUMAN_ARMORS = ALL_ARMORS.filter(item => item && !item.alien);
export const ARMOR_OPTIONS = HUMAN_ARMORS.length ? HUMAN_ARMORS : ALL_ARMORS;
export const DEFAULT_ARMOR_ID = (ARMOR_OPTIONS.find(item => item.dataName === "SteelArmor") || ARMOR_OPTIONS[0] || {}).dataName || "";
export const dryMassCalcState = {
      classId: SHIP_CLASS_OPTIONS[0] ? SHIP_CLASS_OPTIONS[0].dataName : "",
      slotModules: [],
      weaponModules: {
        nose: [],
        hull: [],
      },
      armor: {
        tail: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        hull: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        nose: { armorId: DEFAULT_ARMOR_ID, points: 0 },
      },
      notes: "",
      simulationDefaults: {
        targetDvKps: DATA.defaults.targetDvKps,
        minTwr: DEFAULT_MIN_TWR,
        radiatorId: DATA.defaults.radiatorId,
      },
    };

export function normalizeModuleEffectSource(value) {
      return MODULE_EFFECT_SOURCES.includes(value) ? value : DEFAULT_MODULE_EFFECT_SOURCE;
    }

export function normalizeModuleEffectModuleIds(value) {
      const validIds = new Set(ALL_UTILITY_MODULES.map(item => item && item.dataName).filter(Boolean));
      const emptyId = EMPTY_UTILITY_MODULE.dataName || "Empty";
      const seen = new Set();
      const normalized = [];
      if (!Array.isArray(value)) return normalized;
      value.forEach(item => {
        const id = typeof item === "string" ? item : "";
        if (!id || id === emptyId || !validIds.has(id) || seen.has(id)) return;
        seen.add(id);
        normalized.push(id);
      });
      return normalized;
    }

export function selectedDryMassUtilityModuleIds() {
      return normalizeModuleEffectModuleIds(dryMassCalcState.slotModules);
    }

export function normalizeModuleEffectPresetState(value = {}) {
      const source = value && typeof value === "object" ? value : {};
      return {
        moduleEffectsEnabled: source.moduleEffectsEnabled === true,
        moduleEffectSource: normalizeModuleEffectSource(source.moduleEffectSource),
        moduleEffectModuleIds: normalizeModuleEffectModuleIds(source.moduleEffectModuleIds),
      };
    }

export function applyModuleEffectPresetState(value = {}) {
      const normalized = normalizeModuleEffectPresetState(value);
      state.moduleEffectsEnabled = normalized.moduleEffectsEnabled;
      state.moduleEffectSource = normalized.moduleEffectSource;
      state.moduleEffectModuleIds = normalized.moduleEffectModuleIds;
      return normalized;
    }

export function currentModuleEffectAssumptions(value = state) {
      const normalized = normalizeModuleEffectPresetState(value);
      const activeModuleIds = normalized.moduleEffectSource === "manual"
        ? normalized.moduleEffectModuleIds
        : selectedDryMassUtilityModuleIds();
      return {
        ...normalized,
        activeModuleIds: activeModuleIds.slice(),
        moduleIds: normalized.moduleEffectsEnabled ? activeModuleIds.slice() : [],
      };
    }

