import { render } from "../chart/interaction.js";
import { cloneJson, renderDryMassPresetControls, setPresetUiText, setTextById, setupDryMassPresetControls, syncUiFromState } from "../presets/library.js";
import { ALL_UTILITY_MODULES, ALL_WEAPON_MODULES, ARMOR_OPTIONS, DATA, DEFAULT_ARMOR_ID, EMPTY_UTILITY_MODULE, EMPTY_WEAPON_MODULE, SHIP_CLASS_OPTIONS, UI_LANG, dryMassCalcState, localText, renderRadiatorOptions, state } from "../state/core.js";
import { enhanceSearchableSelects } from "../ui/searchable_select.js";
import { escapeHtml, formatCompact, formatNumber, trim } from "../ui/tooltip_table.js";
import { clamp } from "./filtering.js";

export function catalogDisplayName(item) {
      const display = item && item.displayName;
      if (display && typeof display === "object") {
        return UI_LANG === "en"
          ? display.en || display.kor || item.friendlyName || item.dataName
          : display.kor || display.en || item.friendlyName || item.dataName;
      }
      return item ? (item.friendlyName || item.dataName || "") : "";
    }

export function compareCatalogTitles(left, right) {
      const locale = UI_LANG === "en" ? "en" : "ko-KR";
      const titleCompare = catalogDisplayName(left).localeCompare(catalogDisplayName(right), locale, {
        numeric: true,
        sensitivity: "base",
      });
      if (titleCompare) return titleCompare;
      return String(left && left.dataName || "").localeCompare(String(right && right.dataName || ""), "en", {
        numeric: true,
        sensitivity: "base",
      });
    }

export function sortedByCatalogTitle(items) {
      return [...items].sort(compareCatalogTitles);
    }

export function selectedShipClass() {
      return SHIP_CLASS_OPTIONS.find(item => item.dataName === dryMassCalcState.classId) || SHIP_CLASS_OPTIONS[0] || null;
    }

export function utilityModulesForShipClass(shipClass) {
      const hullTier = Number(shipClass && shipClass.constructionTier) || 0;
      const modules = ALL_UTILITY_MODULES.filter(item => {
        if (!item || item.dataName === "Empty") return false;
        if (item.alien) return false;
        return (Number(item.minConstructionTier) || 0) <= hullTier;
      });
      return [EMPTY_UTILITY_MODULE, ...sortedByCatalogTitle(modules)];
    }

export function selectedModuleById(id) {
      return ALL_UTILITY_MODULES.find(item => item.dataName === id) || EMPTY_UTILITY_MODULE;
    }

export function selectedWeaponById(id) {
      return ALL_WEAPON_MODULES.find(item => item.dataName === id) || EMPTY_WEAPON_MODULE;
    }

export function selectedArmorById(id) {
      return ARMOR_OPTIONS.find(item => item.dataName === id) || ARMOR_OPTIONS[0] || null;
    }

export function armorSelection(section) {
      if (!dryMassCalcState.armor || typeof dryMassCalcState.armor !== "object") dryMassCalcState.armor = {};
      if (!dryMassCalcState.armor[section] || typeof dryMassCalcState.armor[section] !== "object") {
        dryMassCalcState.armor[section] = { armorId: DEFAULT_ARMOR_ID, points: 0 };
      }
      if (!dryMassCalcState.armor[section].armorId) dryMassCalcState.armor[section].armorId = DEFAULT_ARMOR_ID;
      dryMassCalcState.armor[section].points = Math.max(0, Math.round(Number(dryMassCalcState.armor[section].points) || 0));
      return dryMassCalcState.armor[section];
    }

export function armorPlateThicknessM(armor) {
      const density = Number(armor && armor.densityKgM3) || 0;
      const heat = Number(armor && armor.heatOfVaporizationMJkg) || 0;
      if (density <= 0 || heat <= 0) return 0;
      const massDamagePointKg = 20 / heat;
      const volumeDamagePointM3 = massDamagePointKg / density;
      return volumeDamagePointM3 / 0.005;
    }

export function armorSectionThicknessM(armor, points) {
      return armorPlateThicknessM(armor) * Math.max(0, Number(points) || 0);
    }

export function selectedArmorMaxBonus() {
      return dryMassCalcState.slotModules
        .map(selectedModuleById)
        .reduce((sum, module) => {
          const rules = Array.isArray(module.specialRules) ? module.specialRules : [];
          return sum + (rules.includes("ArmorStruts") ? (Number(module.specialValue) || 0) : 0);
        }, 0);
    }

export function armorMaxDepthM(shipClass, section) {
      if (!shipClass) return 0;
      const length = Number(shipClass.lengthM) || 0;
      const width = Number(shipClass.widthM) || 0;
      const simple = !!shipClass.simpleHull;
      const base = section === "hull"
        ? width * (simple ? 0.06 : 0.12)
        : length * (simple ? (section === "tail" ? 0 : 0.018) : 0.036);
      return base * (1 + selectedArmorMaxBonus());
    }

export function armorMaxPoints(shipClass, section, armor) {
      const plate = armorPlateThicknessM(armor);
      if (plate <= 0) return 0;
      return Math.max(0, Math.trunc(armorMaxDepthM(shipClass, section) / plate));
    }

export function normalizeDryMassCalcArmor() {
      const shipClass = selectedShipClass();
      for (const section of ["tail", "hull", "nose"]) {
        const selection = armorSelection(section);
        const armor = selectedArmorById(selection.armorId);
        if (!armor) {
          selection.armorId = DEFAULT_ARMOR_ID;
          selection.points = 0;
          continue;
        }
        selection.armorId = armor.dataName;
        selection.points = clamp(Math.round(selection.points), 0, armorMaxPoints(shipClass, section, armor));
      }
    }

export function armorSectionVolumeM3(armor, points, shipClass, lateralArmorDepthM, lateral) {
      const length = Number(shipClass && shipClass.lengthM) || 0;
      const width = Number(shipClass && shipClass.widthM) || 0;
      if (!armor || points <= 0 || length <= 0 || width <= 0) return 0;
      const radiusWithArmor = (width + lateralArmorDepthM + lateralArmorDepthM) / 2;
      const enlargedCapArea = Math.PI * radiusWithArmor * radiusWithArmor;
      if (lateral) {
        const baseVolume = Math.PI * (width / 2) * (width / 2) * length;
        return Math.max(0, (enlargedCapArea * length - baseVolume) / 2);
      }
      return armorSectionThicknessM(armor, points) * enlargedCapArea * 3;
    }

export function armorMassTons(section, shipClass) {
      const hullSelection = armorSelection("hull");
      const hullArmor = selectedArmorById(hullSelection.armorId);
      const lateralArmorDepthM = armorSectionThicknessM(hullArmor, hullSelection.points);
      const selection = armorSelection(section);
      const armor = selectedArmorById(selection.armorId);
      const points = Math.max(0, Number(selection.points) || 0);
      const volumeM3 = armorSectionVolumeM3(armor, points, shipClass, lateralArmorDepthM, section === "hull");
      return Math.max(0, volumeM3 * (Number(armor && armor.densityKgM3) || 0) / 1000);
    }

export function dryMassCalcArmorTotals(shipClass = selectedShipClass()) {
      const tailMassTons = armorMassTons("tail", shipClass);
      const hullMassTons = armorMassTons("hull", shipClass);
      const noseMassTons = armorMassTons("nose", shipClass);
      return {
        tailMassTons,
        hullMassTons,
        noseMassTons,
        massTons: tailMassTons + hullMassTons + noseMassTons,
      };
    }

export function hardpointCapacity(shipClass, section) {
      if (!shipClass) return 0;
      return Math.max(0, Number(section === "nose" ? shipClass.noseHardpoints : shipClass.hullHardpoints) || 0);
    }

export function weaponSlotSize(module) {
      if (!module || module.dataName === EMPTY_WEAPON_MODULE.dataName) return 0;
      return Math.max(0, Number(module.slotSize) || 1);
    }

export function weaponSlotClass(module) {
      return String(module && module.slotClass || "");
    }

export function weaponFitsSection(module, section) {
      const slotClass = weaponSlotClass(module);
      return slotClass === section || slotClass === "any";
    }

export function weaponModulesForSection(section) {
      const modules = ALL_WEAPON_MODULES.filter(item => {
        if (!item || item.alien) return false;
        return weaponFitsSection(item, section) && weaponSlotSize(item) > 0;
      });
      return [EMPTY_WEAPON_MODULE, ...sortedByCatalogTitle(modules)];
    }

export function weaponSelections(section) {
      if (!dryMassCalcState.weaponModules || typeof dryMassCalcState.weaponModules !== "object") {
        dryMassCalcState.weaponModules = { nose: [], hull: [] };
      }
      if (!Array.isArray(dryMassCalcState.weaponModules[section])) {
        dryMassCalcState.weaponModules[section] = [];
      }
      return dryMassCalcState.weaponModules[section];
    }

export function usedWeaponHardpoints(section) {
      return weaponSelections(section)
        .map(selectedWeaponById)
        .reduce((sum, module) => sum + weaponSlotSize(module), 0);
    }

export function formatHardpointSize(value) {
      return Number.isFinite(value) ? trim(value) : "-";
    }

export function formatDays(value) {
      const days = Number(value);
      if (!Number.isFinite(days) || days <= 0) return "-";
      return formatCompact(days, 1_000);
    }

export function shipyardBuildTimeRow(shipClass) {
      const times = shipClass && shipClass.shipyardBuildTimesDays || {};
      const value = [
        formatDays(times.t1 ?? shipClass.baseConstructionTimeDays),
        formatDays(times.t2 ?? shipClass.baseConstructionTimeDays),
        formatDays(times.t3 ?? shipClass.baseConstructionTimeDays),
      ].join(" / ");
      return [localText("조선소 건조일수 (T1/T2/T3)", "Shipyard build days (T1/T2/T3)"), value];
    }

export function groupedShipClassOptionsHtml() {
      const groups = new Map();
      SHIP_CLASS_OPTIONS.forEach(item => {
        const missionControl = Number(item.missionControl) || 0;
        if (!groups.has(missionControl)) groups.set(missionControl, []);
        groups.get(missionControl).push(item);
      });
      return Array.from(groups.entries())
        .sort(([left], [right]) => left - right)
        .map(([missionControl, items]) => {
          const groupLabel = `${localText("MC 소모", "MC cost")} ${formatHardpointSize(missionControl)}`;
          const options = sortedByCatalogTitle(items)
            .map(item => `<option value="${escapeHtml(item.dataName)}">${escapeHtml(catalogDisplayName(item))}</option>`)
            .join("");
          return `<optgroup label="${escapeHtml(groupLabel)}">${options}</optgroup>`;
        })
        .join("");
    }

export function weaponOptionLabel(item) {
      if (item.dataName === EMPTY_WEAPON_MODULE.dataName) return catalogDisplayName(item);
      return `${catalogDisplayName(item)} (${formatHardpointSize(weaponSlotSize(item))} HP, ${formatNumber(Number(item.massTons) || 0, " t")})`;
    }

export function normalizeDryMassCalcWeapons() {
      const shipClass = selectedShipClass();
      for (const section of ["nose", "hull"]) {
        const capacity = hardpointCapacity(shipClass, section);
        const allowedIds = new Set(weaponModulesForSection(section).map(item => item.dataName));
        const normalized = [];
        let used = 0;
        for (const id of weaponSelections(section)) {
          if (!allowedIds.has(id)) continue;
          const module = selectedWeaponById(id);
          const size = weaponSlotSize(module);
          if (size <= 0) continue;
          if (used + size <= capacity + 1e-9) {
            normalized.push(id);
            used += size;
          }
        }
        dryMassCalcState.weaponModules[section] = normalized;
      }
    }

export function normalizeDryMassCalcSlots() {
      const shipClass = selectedShipClass();
      if (!shipClass) {
        dryMassCalcState.slotModules = [];
        dryMassCalcState.weaponModules = { nose: [], hull: [] };
        normalizeDryMassCalcArmor();
        return;
      }
      normalizeDryMassCalcWeapons();
      const desired = Math.max(0, Number(shipClass.utilitySlots ?? shipClass.internalModules) || 0);
      const allowedIds = new Set(utilityModulesForShipClass(shipClass).map(item => item.dataName));
      if (dryMassCalcState.slotModules.length > desired) {
        dryMassCalcState.slotModules = dryMassCalcState.slotModules.slice(0, desired);
      }
      dryMassCalcState.slotModules = dryMassCalcState.slotModules.map(id => allowedIds.has(id) ? id : EMPTY_UTILITY_MODULE.dataName);
      while (dryMassCalcState.slotModules.length < desired) {
        dryMassCalcState.slotModules.push(EMPTY_UTILITY_MODULE.dataName);
      }
      normalizeDryMassCalcArmor();
    }

export function normalizeShipDesignSimulationDefaults() {
      if (!dryMassCalcState.simulationDefaults || typeof dryMassCalcState.simulationDefaults !== "object") {
        dryMassCalcState.simulationDefaults = {};
      }
      const defaults = dryMassCalcState.simulationDefaults;
      if (!Number.isFinite(Number(defaults.targetDvKps))) defaults.targetDvKps = state.targetDvKps;
      defaults.targetDvKps = clamp(Number(defaults.targetDvKps), 0, 100000);
      if (!Number.isFinite(Number(defaults.minTwr))) defaults.minTwr = state.minTwr;
      defaults.minTwr = clamp(Number(defaults.minTwr), 0.0001, 10);
      if (typeof defaults.radiatorId !== "string" || !DATA.radiators.some(item => item.id === defaults.radiatorId)) {
        defaults.radiatorId = state.radiatorId || (DATA.radiators[0] && DATA.radiators[0].id) || "";
      }
      return defaults;
    }

export function applyShipDesignSimulationDefaultsToState() {
      const defaults = normalizeShipDesignSimulationDefaults();
      state.targetDvKps = clamp(Number(defaults.targetDvKps), 0, 100000);
      state.minTwr = clamp(Number(defaults.minTwr), 0.0001, 10);
      if (DATA.radiators.some(item => item.id === defaults.radiatorId)) {
        state.radiatorId = defaults.radiatorId;
      }
    }

export function resetDryMassCalcState() {
      dryMassCalcState.classId = SHIP_CLASS_OPTIONS[0] ? SHIP_CLASS_OPTIONS[0].dataName : "";
      dryMassCalcState.slotModules = [];
      dryMassCalcState.weaponModules = { nose: [], hull: [] };
      dryMassCalcState.armor = {
        tail: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        hull: { armorId: DEFAULT_ARMOR_ID, points: 0 },
        nose: { armorId: DEFAULT_ARMOR_ID, points: 0 },
      };
      dryMassCalcState.notes = "";
      dryMassCalcState.simulationDefaults = {
        targetDvKps: state.targetDvKps,
        minTwr: state.minTwr,
        radiatorId: state.radiatorId,
      };
      normalizeShipDesignSimulationDefaults();
      normalizeDryMassCalcSlots();
    }

export function exportedDryMassCalculatorPreset() {
      normalizeDryMassCalcSlots();
      return {
        classId: dryMassCalcState.classId,
        slotModules: dryMassCalcState.slotModules.slice(),
        weaponModules: {
          nose: weaponSelections("nose").slice(),
          hull: weaponSelections("hull").slice(),
        },
        armor: Object.fromEntries(["tail", "hull", "nose"].map(section => {
          const selection = armorSelection(section);
          return [section, {
            armorId: selection.armorId,
            points: selection.points,
          }];
        })),
        notes: String(dryMassCalcState.notes || ""),
        simulationDefaults: cloneJson(normalizeShipDesignSimulationDefaults()),
      };
    }

export function applyDryMassCalculatorPreset(rawCalculator) {
      if (!rawCalculator || typeof rawCalculator !== "object") return false;

      if (typeof rawCalculator.classId === "string" && SHIP_CLASS_OPTIONS.some(item => item.dataName === rawCalculator.classId)) {
        dryMassCalcState.classId = rawCalculator.classId;
      }

      if (Array.isArray(rawCalculator.slotModules)) {
        dryMassCalcState.slotModules = rawCalculator.slotModules.filter(item => typeof item === "string");
      }

      if (rawCalculator.weaponModules && typeof rawCalculator.weaponModules === "object") {
        ["nose", "hull"].forEach(section => {
          const values = rawCalculator.weaponModules[section];
          if (Array.isArray(values)) {
            dryMassCalcState.weaponModules[section] = values.filter(item => typeof item === "string");
          }
        });
      }

      if (rawCalculator.armor && typeof rawCalculator.armor === "object") {
        ["tail", "hull", "nose"].forEach(section => {
          const rawSelection = rawCalculator.armor[section];
          if (!rawSelection || typeof rawSelection !== "object") return;
          const selection = armorSelection(section);
          if (typeof rawSelection.armorId === "string" && ARMOR_OPTIONS.some(item => item.dataName === rawSelection.armorId)) {
            selection.armorId = rawSelection.armorId;
          }
          if (Number.isFinite(Number(rawSelection.points))) {
            selection.points = Math.round(Number(rawSelection.points));
          }
        });
      }

      if (typeof rawCalculator.notes === "string") {
        dryMassCalcState.notes = rawCalculator.notes.slice(0, 2000);
      }

      if (rawCalculator.simulationDefaults && typeof rawCalculator.simulationDefaults === "object") {
        const rawDefaults = rawCalculator.simulationDefaults;
        if (!dryMassCalcState.simulationDefaults || typeof dryMassCalcState.simulationDefaults !== "object") {
          dryMassCalcState.simulationDefaults = {};
        }
        if (Number.isFinite(Number(rawDefaults.targetDvKps))) {
          dryMassCalcState.simulationDefaults.targetDvKps = clamp(Number(rawDefaults.targetDvKps), 0, 100000);
        }
        if (Number.isFinite(Number(rawDefaults.minTwr))) {
          dryMassCalcState.simulationDefaults.minTwr = clamp(Number(rawDefaults.minTwr), 0.0001, 10);
        }
        if (typeof rawDefaults.radiatorId === "string" && DATA.radiators.some(item => item.id === rawDefaults.radiatorId)) {
          dryMassCalcState.simulationDefaults.radiatorId = rawDefaults.radiatorId;
        }
      }
      normalizeShipDesignSimulationDefaults();

      normalizeDryMassCalcSlots();
      return true;
    }

export function dryMassCalcModuleTotals() {
      const utilityTotals = dryMassCalcState.slotModules
        .map(selectedModuleById)
        .reduce((totals, module) => {
          totals.massTons += Number(module.massTons) || 0;
          totals.crew += Number(module.crew) || 0;
          totals.powerMW += Number(module.powerRequirementMW) || 0;
          return totals;
        }, { massTons: 0, crew: 0, powerMW: 0 });
      const weaponTotals = ["nose", "hull"]
        .flatMap(section => weaponSelections(section).map(selectedWeaponById))
        .reduce((totals, module) => {
          totals.massTons += Number(module.massTons) || 0;
          totals.crew += Number(module.crew) || 0;
          return totals;
        }, { massTons: 0, crew: 0 });
      return {
        utilityMassTons: utilityTotals.massTons,
        weaponMassTons: weaponTotals.massTons,
        massTons: utilityTotals.massTons + weaponTotals.massTons,
        utilityCrew: utilityTotals.crew,
        weaponCrew: weaponTotals.crew,
        crew: utilityTotals.crew + weaponTotals.crew,
        powerMW: utilityTotals.powerMW,
      };
    }

export function dryMassCalcTotalTons() {
      const shipClass = selectedShipClass();
      if (!shipClass) return 0;
      return (Number(shipClass.massTons) || 0) + dryMassCalcModuleTotals().massTons + dryMassCalcArmorTotals(shipClass).massTons;
    }

export function renderWeaponSection(section, shipClass) {
      const capacity = hardpointCapacity(shipClass, section);
      const used = usedWeaponHardpoints(section);
      const remaining = Math.max(0, capacity - used);
      const label = section === "nose" ? localText("함수", "Nose") : localText("함체", "Hull");
      if (capacity <= 0) {
        return `
          <div class="calc-weapon-group">
            <div class="calc-group-header">
              <strong>${escapeHtml(label)}</strong>
              <span class="calc-capacity">0 HP</span>
            </div>
            <div class="calc-empty">${escapeHtml(localText("하드포인트 없음", "No hardpoints"))}</div>
          </div>
        `;
      }

      const selections = weaponSelections(section);
      const rows = selections.map((selectedId, index) => {
        const selectedWeapon = selectedWeaponById(selectedId);
        const usedWithoutCurrent = used - weaponSlotSize(selectedWeapon);
        const fitLimit = Math.max(0, capacity - usedWithoutCurrent);
        const options = weaponModulesForSection(section)
          .filter(item => item.dataName === EMPTY_WEAPON_MODULE.dataName || weaponSlotSize(item) <= fitLimit + 1e-9)
          .map(item => `<option value="${escapeHtml(item.dataName)}"${item.dataName === selectedId ? " selected" : ""}>${escapeHtml(weaponOptionLabel(item))}</option>`)
          .join("");
        return `
          <div class="calc-slot-row">
            <span>${escapeHtml(label)} ${index + 1}</span>
            <select id="dryMassCalcWeapon${section}${index}" data-weapon-section="${section}" data-weapon-index="${index}" data-searchable-select="true">${options}</select>
            <span class="calc-slot-mass">${escapeHtml(formatNumber(Number(selectedWeapon.massTons) || 0, " t"))}</span>
          </div>
        `;
      });

      if (remaining > 1e-9) {
        const options = weaponModulesForSection(section)
          .filter(item => item.dataName === EMPTY_WEAPON_MODULE.dataName || weaponSlotSize(item) <= remaining + 1e-9)
          .map(item => `<option value="${escapeHtml(item.dataName)}">${escapeHtml(item.dataName === EMPTY_WEAPON_MODULE.dataName ? localText("무장 추가", "Add weapon") : weaponOptionLabel(item))}</option>`)
          .join("");
        rows.push(`
          <div class="calc-slot-row">
            <span>${escapeHtml(localText("추가", "Add"))}</span>
            <select id="dryMassCalcWeapon${section}New" data-weapon-section="${section}" data-weapon-index="new" data-searchable-select="true">${options}</select>
            <span class="calc-slot-mass">${escapeHtml(formatHardpointSize(remaining))} HP</span>
          </div>
        `);
      }

      return `
        <div class="calc-weapon-group">
          <div class="calc-group-header">
            <strong>${escapeHtml(label)}</strong>
            <span class="calc-capacity">${escapeHtml(formatHardpointSize(used))} / ${escapeHtml(formatHardpointSize(capacity))} HP</span>
          </div>
          ${rows.join("") || `<div class="calc-empty">${escapeHtml(localText("남은 하드포인트 없음", "No remaining hardpoints"))}</div>`}
        </div>
      `;
    }

export function renderArmorRows(shipClass) {
      if (!ARMOR_OPTIONS.length) {
        return `<div class="calc-empty">${escapeHtml(localText("장갑 카탈로그 없음", "No armor catalog"))}</div>`;
      }
      const sectionLabels = {
        tail: localText("함미", "Tail"),
        hull: localText("함체", "Hull"),
        nose: localText("함수", "Nose"),
      };
      return ["tail", "hull", "nose"].map(section => {
        const selection = armorSelection(section);
        const selectedArmor = selectedArmorById(selection.armorId);
        const maxPoints = armorMaxPoints(shipClass, section, selectedArmor);
        const massTons = armorMassTons(section, shipClass);
        const options = sortedByCatalogTitle(ARMOR_OPTIONS)
          .map(item => `<option value="${escapeHtml(item.dataName)}"${item.dataName === selection.armorId ? " selected" : ""}>${escapeHtml(catalogDisplayName(item))}</option>`)
          .join("");
        return `
          <div class="calc-armor-row">
            <div class="calc-armor-title">${escapeHtml(sectionLabels[section])}</div>
            <select id="dryMassCalcArmor${section}" data-armor-section="${section}" data-armor-field="type" data-searchable-select="true">${options}</select>
            <div class="calc-armor-point-row">
              <input id="dryMassCalcArmor${section}Points" type="number" min="0" max="${escapeHtml(maxPoints)}" step="1" value="${escapeHtml(selection.points)}" data-armor-section="${section}" data-armor-field="points">
              <span class="calc-slot-mass">${escapeHtml(formatNumber(massTons, " t"))}</span>
            </div>
          </div>
        `;
      }).join("");
    }

export function renderDryMassCalcModal() {
      const classSelect = document.getElementById("dryMassCalcClass");
      const info = document.getElementById("dryMassCalcInfo");
      const slots = document.getElementById("dryMassCalcSlots");
      const weapons = document.getElementById("dryMassCalcWeapons");
      const armor = document.getElementById("dryMassCalcArmor");
      const total = document.getElementById("dryMassCalcTotal");
      const breakdown = document.getElementById("dryMassCalcBreakdown");
      const title = document.getElementById("dryMassCalcTitle");
      const close = document.getElementById("dryMassCalcClose");
      const apply = document.getElementById("dryMassCalcApply");
      const applyWithDefaults = document.getElementById("dryMassCalcApplyWithDefaults");
      const reset = document.getElementById("dryMassCalcReset");
      const classLabel = document.getElementById("dryMassCalcClassLabel");
      const slotsLabel = document.getElementById("dryMassCalcSlotsLabel");
      const weaponsLabel = document.getElementById("dryMassCalcWeaponsLabel");
      const armorLabel = document.getElementById("dryMassCalcArmorLabel");
      const notesLabel = document.getElementById("dryMassCalcNotesLabel");
      const notes = document.getElementById("dryMassCalcNotes");
      const simulationDefaultsLabel = document.getElementById("shipPresetSimulationDefaultsLabel");
      const targetDvLabel = document.getElementById("shipPresetTargetDvLabel");
      const targetDvInput = document.getElementById("shipPresetTargetDv");
      const minTwrLabel = document.getElementById("shipPresetMinTwrLabel");
      const minTwrInput = document.getElementById("shipPresetMinTwr");
      const radiatorLabel = document.getElementById("shipPresetRadiatorLabel");
      const radiatorSelect = document.getElementById("shipPresetRadiator");
      const button = document.getElementById("dryMassCalcButton");

      if (button) {
        button.setAttribute("aria-label", localText("건조질량 계산기", "Dry-mass calculator"));
        button.title = localText("건조질량 계산기", "Dry-mass calculator");
      }
      if (title) title.textContent = localText("건조질량 계산기", "Dry-mass calculator");
      if (close) close.textContent = localText("닫기", "Close");
      if (apply) apply.textContent = localText("건조질량만 적용", "Apply dry mass only");
      setTextById("dryMassCalcApplyWithDefaults", "건조질량 + 조건 적용", "Apply dry mass + defaults");
      if (reset) reset.textContent = localText("초기화", "Reset");
      if (classLabel) classLabel.textContent = localText("함급", "Hull Class");
      if (slotsLabel) slotsLabel.textContent = localText("내부 유틸리티 모듈", "Internal utility modules");
      if (weaponsLabel) weaponsLabel.textContent = localText("무장 하드포인트", "Weapon hardpoints");
      if (armorLabel) armorLabel.textContent = localText("장갑", "Armor");
      if (notesLabel) notesLabel.textContent = localText("메모", "Notes");
      if (simulationDefaultsLabel) simulationDefaultsLabel.textContent = localText("시뮬레이션 기본 조건", "Simulation defaults");
      if (targetDvLabel) targetDvLabel.textContent = localText("목표 dV (km/s)", "Target dV (km/s)");
      if (minTwrLabel) minTwrLabel.textContent = localText("최소 TWR", "Minimum TWR");
      if (radiatorLabel) radiatorLabel.textContent = localText("라디에이터", "Radiator");
      const simulationDefaults = normalizeShipDesignSimulationDefaults();
      if (targetDvInput) targetDvInput.value = String(Math.round(simulationDefaults.targetDvKps));
      if (minTwrInput) minTwrInput.value = String(Number(simulationDefaults.minTwr.toPrecision(4)));
      if (radiatorSelect) {
        renderRadiatorOptions(radiatorSelect);
        radiatorSelect.value = simulationDefaults.radiatorId;
      }
      if (notes) {
        notes.placeholder = localText("선박 설계 가정 메모", "Ship design assumption notes");
        if (notes.value !== String(dryMassCalcState.notes || "")) notes.value = String(dryMassCalcState.notes || "");
      }
      setPresetUiText();
      renderDryMassPresetControls();

      if (!classSelect || !info || !slots || !weapons || !armor || !total) return;

      classSelect.innerHTML = groupedShipClassOptionsHtml();
      if (!SHIP_CLASS_OPTIONS.length) {
        info.innerHTML = `<span>${escapeHtml(localText("함급 카탈로그 없음", "No hull catalog"))}</span><strong>-</strong>`;
        slots.innerHTML = "";
        weapons.innerHTML = "";
        armor.innerHTML = "";
        total.textContent = `${localText("예상 건조질량", "Estimated dry mass")}: -`;
        if (breakdown) breakdown.innerHTML = "";
        return;
      }
      if (!SHIP_CLASS_OPTIONS.some(item => item.dataName === dryMassCalcState.classId)) {
        dryMassCalcState.classId = SHIP_CLASS_OPTIONS[0].dataName;
      }
      classSelect.value = dryMassCalcState.classId;

      const shipClass = selectedShipClass();
      normalizeDryMassCalcSlots();
      const moduleOptions = utilityModulesForShipClass(shipClass);
      const moduleTotals = dryMassCalcModuleTotals();
      const armorTotals = dryMassCalcArmorTotals(shipClass);
      const hullMass = Number(shipClass.massTons) || 0;
      info.innerHTML = [
        [localText("선체 기본 질량", "Hull mass"), formatNumber(hullMass, " t")],
        shipyardBuildTimeRow(shipClass),
        [localText("Structural Integrity", "Structural Integrity"), formatCompact(Number(shipClass.structuralIntegrity) || 0, 1_000)],
        [localText("함수 하드포인트", "Nose hardpoints"), formatHardpointSize(hardpointCapacity(shipClass, "nose"))],
        [localText("함체 하드포인트", "Hull hardpoints"), formatHardpointSize(hardpointCapacity(shipClass, "hull"))],
        [localText("유틸리티 슬롯", "Utility slots"), String(dryMassCalcState.slotModules.length)],
        [localText("승무원", "Crew"), formatCompact(Number(shipClass.crew) || 0, 1_000)],
        [localText("최대 장교 수", "Max officers"), String(Number(shipClass.maxOfficers) || 0)],
        [localText("요구 프로젝트", "Required project"), shipClass.requiredProject || "-"],
      ].map(([label, value]) => `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`).join("");

      weapons.innerHTML = [
        renderWeaponSection("nose", shipClass),
        renderWeaponSection("hull", shipClass),
      ].join("");

      armor.innerHTML = renderArmorRows(shipClass);

      if (!dryMassCalcState.slotModules.length) {
        slots.innerHTML = `<div class="calc-empty">${escapeHtml(localText("선택 가능한 내부 슬롯 없음", "No internal slots"))}</div>`;
      } else {
        slots.innerHTML = dryMassCalcState.slotModules.map((selectedId, index) => {
          const selectedModule = selectedModuleById(selectedId);
          const options = moduleOptions
            .map(item => {
              const label = `${catalogDisplayName(item)} (${formatNumber(Number(item.massTons) || 0, " t")})`;
              return `<option value="${escapeHtml(item.dataName)}"${item.dataName === selectedId ? " selected" : ""}>${escapeHtml(label)}</option>`;
            })
            .join("");
          return `
            <div class="calc-slot-row">
              <span>${escapeHtml(localText("슬롯", "Slot"))} ${index + 1}</span>
              <select id="dryMassCalcSlot${index}" data-slot-index="${index}" data-searchable-select="true">${options}</select>
              <span class="calc-slot-mass">${escapeHtml(formatNumber(Number(selectedModule.massTons) || 0, " t"))}</span>
            </div>
          `;
        }).join("");
      }
      total.textContent = `${localText("예상 건조질량", "Estimated dry mass")}: ${formatNumber(dryMassCalcTotalTons(), " t")}`;
      if (breakdown) {
        breakdown.innerHTML = [
          `${localText("선체", "Hull")} ${formatNumber(hullMass, " t")}`,
          `${localText("장갑", "Armor")} ${formatNumber(armorTotals.massTons, " t")}`,
          `${localText("무장", "Weapons")} ${formatNumber(moduleTotals.weaponMassTons, " t")}`,
          `${localText("유틸리티", "Utility")} ${formatNumber(moduleTotals.utilityMassTons, " t")}`,
          `${localText("추가 승무원", "Extra crew")} ${formatCompact(moduleTotals.crew, 1_000)}`,
          `${localText("모듈 전력", "Module power")} ${formatNumber(moduleTotals.powerMW, " MW")}`,
        ].map(item => `<span>${escapeHtml(item)}</span>`).join("");
      }
      enhanceSearchableSelects(document.getElementById("dryMassCalcModal"));
    }

export function setupDryMassCalculator() {
      const modal = document.getElementById("dryMassCalcModal");
      const button = document.getElementById("dryMassCalcButton");
      const classSelect = document.getElementById("dryMassCalcClass");
      const slots = document.getElementById("dryMassCalcSlots");
      const weapons = document.getElementById("dryMassCalcWeapons");
      const armor = document.getElementById("dryMassCalcArmor");
      const close = document.getElementById("dryMassCalcClose");
      const apply = document.getElementById("dryMassCalcApply");
      const applyWithDefaults = document.getElementById("dryMassCalcApplyWithDefaults");
      const reset = document.getElementById("dryMassCalcReset");
      const dryMass = document.getElementById("dryMass");
      const dryMassNumber = document.getElementById("dryMassNumber");
      const notes = document.getElementById("dryMassCalcNotes");
      const presetTargetDv = document.getElementById("shipPresetTargetDv");
      const presetMinTwr = document.getElementById("shipPresetMinTwr");
      const presetRadiator = document.getElementById("shipPresetRadiator");
      if (!modal || !button || !classSelect || !slots || !weapons || !armor || !close || !apply || !applyWithDefaults || !reset || !dryMass || !dryMassNumber || !notes || !presetTargetDv || !presetMinTwr || !presetRadiator) return;

      const openModal = () => {
        renderDryMassCalcModal();
        modal.classList.add("is-open");
        const firstSearchableTrigger = modal.querySelector(".searchable-select-trigger");
        (firstSearchableTrigger || classSelect).focus();
      };
      const closeModal = () => {
        modal.classList.remove("is-open");
      };
      let pointerStartedInsideDialog = false;
      let suppressNextOverlayClick = false;

      button.addEventListener("click", openModal);
      close.addEventListener("click", closeModal);
      reset.addEventListener("click", () => {
        resetDryMassCalcState();
        renderDryMassCalcModal();
      });
      notes.addEventListener("input", () => {
        dryMassCalcState.notes = notes.value.slice(0, 2000);
      });
      presetTargetDv.addEventListener("input", () => {
        normalizeShipDesignSimulationDefaults().targetDvKps = clamp(Number(presetTargetDv.value) || 0, 0, 100000);
      });
      presetMinTwr.addEventListener("input", () => {
        normalizeShipDesignSimulationDefaults().minTwr = clamp(Number(presetMinTwr.value) || 0.0001, 0.0001, 10);
      });
      presetRadiator.addEventListener("change", () => {
        const defaults = normalizeShipDesignSimulationDefaults();
        if (DATA.radiators.some(item => item.id === presetRadiator.value)) {
          defaults.radiatorId = presetRadiator.value;
        }
      });
      modal.addEventListener("pointerdown", event => {
        pointerStartedInsideDialog = !!event.target.closest(".modal-dialog");
      });
      modal.addEventListener("pointerup", event => {
        if (event.target === modal && pointerStartedInsideDialog) {
          suppressNextOverlayClick = true;
          window.setTimeout(() => {
            suppressNextOverlayClick = false;
          }, 0);
        }
        pointerStartedInsideDialog = false;
      });
      modal.addEventListener("pointercancel", () => {
        pointerStartedInsideDialog = false;
        suppressNextOverlayClick = false;
      });
      modal.addEventListener("click", event => {
        if (event.target !== modal) return;
        if (suppressNextOverlayClick) {
          suppressNextOverlayClick = false;
          return;
        }
        closeModal();
      });
      modal.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
      });
      classSelect.addEventListener("change", () => {
        dryMassCalcState.classId = classSelect.value;
        normalizeDryMassCalcSlots();
        renderDryMassCalcModal();
      });
      slots.addEventListener("change", event => {
        const select = event.target.closest("select[data-slot-index]");
        if (!select) return;
        const index = Number(select.dataset.slotIndex);
        if (!Number.isFinite(index) || index < 0) return;
        dryMassCalcState.slotModules[index] = select.value;
        renderDryMassCalcModal();
      });
      weapons.addEventListener("change", event => {
        const select = event.target.closest("select[data-weapon-section]");
        if (!select) return;
        const section = select.dataset.weaponSection;
        if (section !== "nose" && section !== "hull") return;
        const value = select.value;
        const selections = weaponSelections(section);
        if (select.dataset.weaponIndex === "new") {
          if (value !== EMPTY_WEAPON_MODULE.dataName) selections.push(value);
        } else {
          const index = Number(select.dataset.weaponIndex);
          if (!Number.isFinite(index) || index < 0) return;
          if (value === EMPTY_WEAPON_MODULE.dataName) {
            selections.splice(index, 1);
          } else {
            selections[index] = value;
          }
        }
        normalizeDryMassCalcWeapons();
        renderDryMassCalcModal();
      });
      armor.addEventListener("change", event => {
        const control = event.target.closest("[data-armor-section]");
        if (!control) return;
        const section = control.dataset.armorSection;
        if (!["tail", "hull", "nose"].includes(section)) return;
        const selection = armorSelection(section);
        if (control.dataset.armorField === "type") {
          selection.armorId = control.value;
        } else if (control.dataset.armorField === "points") {
          selection.points = Math.round(Number(control.value) || 0);
        }
        normalizeDryMassCalcArmor();
        renderDryMassCalcModal();
      });
      apply.addEventListener("click", () => {
        const value = clamp(dryMassCalcTotalTons(), 0, 1000000);
        state.dryMassTons = value;
        dryMass.value = String(clamp(value, Number(dryMass.min), Number(dryMass.max)));
        dryMassNumber.value = String(Math.round(value));
        closeModal();
        render();
      });
      applyWithDefaults.addEventListener("click", () => {
        const value = clamp(dryMassCalcTotalTons(), 0, 1000000);
        state.dryMassTons = value;
        applyShipDesignSimulationDefaultsToState();
        syncUiFromState();
        closeModal();
        render();
      });

      normalizeDryMassCalcSlots();
      setupDryMassPresetControls();
      renderDryMassCalcModal();
    }


