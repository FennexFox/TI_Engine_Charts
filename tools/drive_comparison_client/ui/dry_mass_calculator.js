import { renderDryMassPresetControls, setPresetUiText, setTextById, setupDryMassPresetControls, syncUiFromState } from "../presets/library.js";
import { ARMOR_OPTIONS, DATA, EMPTY_WEAPON_MODULE, SHIP_CLASS_OPTIONS, dryMassCalcState, localText, renderRadiatorOptions, state } from "../state/core.js";
import { escapeHtml, formatCompact, formatNumber, trim } from "../shared/formatting.js";
import { clamp } from "../shared/math.js";
import { updateModuleEffectsPanel } from "./control_state.js";
import { enhanceSearchableSelects } from "./searchable_select.js";
import {
  applyShipDesignSimulationDefaultsToState,
  armorMassTons,
  armorMaxPoints,
  armorSelection,
  catalogDisplayName,
  dryMassCalcArmorTotals,
  dryMassCalcModuleTotals,
  dryMassCalcTotalTons,
  hardpointCapacity,
  normalizeDryMassCalcArmor,
  normalizeDryMassCalcSlots,
  normalizeDryMassCalcWeapons,
  normalizeShipDesignSimulationDefaults,
  resetDryMassCalcState,
  selectedArmorById,
  selectedModuleById,
  selectedShipClass,
  selectedWeaponById,
  sortedByCatalogTitle,
  usedWeaponHardpoints,
  utilityModulesForShipClass,
  weaponModulesForSection,
  weaponSelections,
  weaponSlotSize,
} from "../calc/dry_mass_model.js";

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

export function moduleEffectSummaries(module) {
      if (!module) return [];
      const effects = Array.isArray(module.effects) ? module.effects : [];
      const summaries = effects.map(effect => {
        const multiplier = Number(effect && effect.multiplier);
        const value = Number.isFinite(multiplier) ? `x${Number(multiplier.toPrecision(3))}` : "";
        if (effect && effect.type === "thrustMultiplier") return `${localText("추력", "Thrust")} ${value}`.trim();
        if (effect && effect.type === "exhaustVelocityMultiplier") return `${localText("EV/Isp", "EV/Isp")} ${value}`.trim();
        return effect && effect.type ? `${effect.type} ${value}`.trim() : "";
      }).filter(Boolean);
      const powerMW = Number(module.powerRequirementMW);
      if (Number.isFinite(powerMW) && powerMW > 0) {
        summaries.push(`${localText("보조 전력", "Aux power")} +${formatNumber(powerMW / 1000, " GW")}`);
      }
      return summaries;
    }

export function utilityModuleOptionLabel(item) {
      const base = `${catalogDisplayName(item)} (${formatNumber(Number(item.massTons) || 0, " t")})`;
      const effects = moduleEffectSummaries(item);
      return effects.length ? `${base} | ${effects.join(", ")}` : base;
    }

export function moduleEffectBadgesHtml(module) {
      const effects = moduleEffectSummaries(module);
      if (!effects.length) return "";
      const requirements = Array.isArray(module.effectRequirements)
        ? module.effectRequirements.map(requirement => requirement && requirement.type).filter(Boolean)
        : [];
      const requirementText = requirements.length ? ` · ${localText("조건", "requires")} ${requirements.join(", ")}` : "";
      return effects
        .map(effect => `<span class="effect-chip is-active">${escapeHtml(effect)}${escapeHtml(requirementText)}</span>`)
        .join("");
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
              const label = utilityModuleOptionLabel(item);
              return `<option value="${escapeHtml(item.dataName)}"${item.dataName === selectedId ? " selected" : ""}>${escapeHtml(label)}</option>`;
            })
            .join("");
          return `
            <div class="calc-slot-row">
              <span>${escapeHtml(localText("슬롯", "Slot"))} ${index + 1}</span>
              <select id="dryMassCalcSlot${index}" data-slot-index="${index}" data-searchable-select="true">${options}</select>
              <span class="calc-slot-mass">${escapeHtml(formatNumber(Number(selectedModule.massTons) || 0, " t"))}</span>
              <span class="calc-slot-effects">${moduleEffectBadgesHtml(selectedModule)}</span>
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

export function setupDryMassCalculator({ render = () => {} } = {}) {
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
        updateModuleEffectsPanel();
        if (state.moduleEffectsEnabled) render();
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
        updateModuleEffectsPanel();
        if (state.moduleEffectsEnabled) render();
      });
      slots.addEventListener("change", event => {
        const select = event.target.closest("select[data-slot-index]");
        if (!select) return;
        const index = Number(select.dataset.slotIndex);
        if (!Number.isFinite(index) || index < 0) return;
        dryMassCalcState.slotModules[index] = select.value;
        renderDryMassCalcModal();
        updateModuleEffectsPanel();
        if (state.moduleEffectsEnabled) render();
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
