import { isBandMetric, optionMetricValue } from "./metrics.js";
import { evaluateModuleEffectsForDrive } from "./module_effects.js";
import { DATA, EXTREME_MASS_RATIO, HIDDEN_REASON_PRIORITY, MASS_RATIO_OVERFLOW_EXPONENT, STANDARD_GRAVITY_MPS2, UI_LANG, currentModuleEffectAssumptions, metricDefs, powerResearchActive, state } from "../state/core.js";
import { clamp } from "../shared/math.js";

export function rowCategoryLabel(row) {
      return UI_LANG === "en" ? (row.categoryLabelEn || row.categoryLabel) : (row.categoryLabel || row.categoryLabelEn);
    }

export function rowFamilyLabel(row) {
      return UI_LANG === "en" ? (row.familyLabelEn || row.familyLabel) : (row.familyLabel || row.familyLabelEn);
    }

export function rowProjectLabel(row) {
      return UI_LANG === "en"
        ? (row.requiredProjectDisplay.en || row.requiredProjectDisplay.ko || row.requiredProject)
        : (row.requiredProjectDisplay.ko || row.requiredProjectDisplay.en || row.requiredProject);
    }

export function syncFilterInputs() {
      document.querySelectorAll(".category-row").forEach(row => {
        const input = row.querySelector("input");
        input.checked = !!state.categories[row.dataset.categoryKey];
      });
      document.querySelectorAll(".family-row").forEach(row => {
        const activeCategory = !!state.categories[row.dataset.categoryKey];
        const input = row.querySelector("input");
        row.style.display = activeCategory ? "" : "none";
        input.disabled = !activeCategory;
        input.checked = !!state.families[row.dataset.familyKey];
      });
    }


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


export function filteredRows() {
      return computeDriveDiagnostics().visibleRows;
    }

export function computeDriveDiagnostics() {
      const familyStats = new Map(DATA.subfamilies.map(family => [family.key, {
        ...family,
        total: 0,
        visible: 0,
        hidden: 0,
        selected: !!state.categories[family.categoryKey] && !!state.families[family.key],
        hiddenReasons: {},
      }]));
      const visibleRows = [];
      DATA.drives.forEach(row => {
        const evaluation = evaluateDriveVisibility(row);
        if (evaluation.visible) visibleRows.push(row);
        if (!rowInFamilyDiagnosticScope(row)) return;
        const stats = familyStats.get(row.familyKey);
        if (!stats) return;
        stats.total += 1;
        if (evaluation.visible) {
          stats.visible += 1;
        } else if (stats.selected) {
          stats.hidden += 1;
          const reasons = evaluation.reasons.filter(reason => reason !== "familyFilter");
          (reasons.length ? reasons : ["other"]).forEach(reason => {
            stats.hiddenReasons[reason] = (stats.hiddenReasons[reason] || 0) + 1;
          });
        }
      });
      const families = DATA.subfamilies.map(family => {
        const stats = familyStats.get(family.key);
        return {
          ...stats,
          dominantReason: dominantHiddenReason(stats.hiddenReasons),
        };
      });
      return {
        visibleRows,
        families,
        zeroFamilies: families.filter(family => family.selected && family.total > 0 && family.visible === 0),
      };
    }

export function evaluateDriveVisibility(row) {
      const reasons = [];
      if (!rowMatchesSelectedThrusterCount(row) || !rowMatchesSearch(row) || !rowFamilySelected(row)) {
        reasons.push("familyFilter");
      }
      if (!Number.isFinite(rowUnlockResearchValue(row)) || rowUnlockResearchValue(row) <= 0) {
        reasons.push("researchFilter");
      }
      if (isBandMetric()) {
        reasons.push(...bandMetricHiddenReasons(row));
      } else {
        const value = metricDefs[state.metric].value(row);
        if (!Number.isFinite(value) || value <= 0) reasons.push("axisRange");
      }
      return {
        visible: reasons.length === 0,
        reasons: [...new Set(reasons)],
      };
    }

export function rowFamilySelected(row) {
      return !!state.categories[row.categoryKey] && !!state.families[row.familyKey];
    }

export function rowInFamilyDiagnosticScope(row) {
      return rowMatchesSelectedThrusterCount(row) && rowMatchesSearch(row);
    }

export function rowMatchesSearch(row) {
      if (!state.searchTerm) return true;
      const haystack = [
        row.displayName,
        row.baseDisplayName,
        row.requiredProject,
        rowProjectLabel(row),
        rowCategoryLabel(row),
        rowFamilyLabel(row),
      ].join(" ").toLocaleLowerCase();
      return haystack.includes(state.searchTerm);
    }

export function bandMetricHiddenReasons(row) {
      const configuredOptions = row.powerOptions || row.reactorOptions || [];
      if (!configuredOptions.length) return ["invalidPowerPlant"];
      const massInfo = massRatioDiagnostics(row);
      const options = massOptions(row);
      if (!options.length) {
        if (massInfo.overflow || massInfo.extreme) return ["targetDvOrMassRatio"];
        return [massInfo.invalid ? "invalidComputation" : "invalidPowerPlant"];
      }
      const finiteMetricOptions = options.filter(option => Number.isFinite(optionMetricValue(option)) && optionMetricValue(option) > 0);
      if (!finiteMetricOptions.length) return ["invalidComputation"];
      const reasons = [];
      if ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.minTwr > 0 && !state.showImpracticalCandidates) {
        const twrPassing = finiteMetricOptions.some(option => Number.isFinite(option.twr) && option.twr >= state.minTwr);
        if (!twrPassing) {
          reasons.push("minTwr");
          if (massInfo.extreme || massInfo.overflow || finiteMetricOptions.some(isExtremeMassRatioOption)) {
            reasons.push("targetDvOrMassRatio");
          }
        }
      }
      if (state.metric === "twr" && state.minDvKps > 0 && !state.showImpracticalCandidates) {
        const dvPassing = finiteMetricOptions.some(
          option => Number.isFinite(option.maxPracticalDvKps) && option.maxPracticalDvKps >= state.minDvKps,
        );
        if (!dvPassing) reasons.push("minDv");
      }
      return reasons;
    }

export function massRatioDiagnostics(row) {
      const targetDv = Number(state.targetDvKps);
      const exhaustVelocity = Number(effectiveDriveValues(row).exhaustVelocityKps);
      if (!Number.isFinite(targetDv) || !Number.isFinite(exhaustVelocity) || exhaustVelocity <= 0) {
        return { invalid: true, overflow: false, extreme: false, massRatio: NaN };
      }
      const exponent = targetDv / exhaustVelocity;
      if (!Number.isFinite(exponent)) {
        return { invalid: true, overflow: false, extreme: false, massRatio: NaN };
      }
      if (exponent > MASS_RATIO_OVERFLOW_EXPONENT) {
        return { invalid: false, overflow: true, extreme: true, massRatio: Infinity };
      }
      const massRatio = Math.exp(exponent);
      return {
        invalid: !Number.isFinite(massRatio),
        overflow: !Number.isFinite(massRatio),
        extreme: Number.isFinite(massRatio) && massRatio >= EXTREME_MASS_RATIO,
        massRatio,
      };
    }

export function isExtremeMassRatioOption(option) {
      return Number.isFinite(option.massRatio) && option.massRatio >= EXTREME_MASS_RATIO;
    }

export function isImpracticalOption(option) {
      if (!state.showImpracticalCandidates) return false;
      return ((state.metric === "totalMassTons" || state.metric === "fuelMassTons") && state.minTwr > 0 && Number.isFinite(option.twr) && option.twr < state.minTwr)
        || isExtremeMassRatioOption(option);
    }

export function dominantHiddenReason(hiddenReasons) {
      return HIDDEN_REASON_PRIORITY.find(reason => (hiddenReasons && hiddenReasons[reason] > 0)) || "other";
    }

export function rowUnlockResearchValue(row) {
      const value = Number(row.unlockCumulativeResearch);
      if (Number.isFinite(value) && value > 0) return value;
      return Number(row.cumulativeResearch);
    }

export function selectedRadiator() {
      return DATA.radiators.find(item => item.id === state.radiatorId) || DATA.radiators[0] || null;
    }

export function moduleEffectEvaluationForDrive(row) {
      const assumptions = currentModuleEffectAssumptions();
      if (!assumptions.moduleEffectsEnabled) return null;
      return evaluateModuleEffectsForDrive(row, assumptions.activeModuleIds, {
        utilityModules: DATA.shipCatalog && DATA.shipCatalog.utilityModules,
      });
    }

export function effectiveDriveValues(row) {
      const evaluation = moduleEffectEvaluationForDrive(row);
      if (!evaluation) {
        return {
          thrustN: row.thrustN,
          exhaustVelocityKps: row.exhaustVelocityKps,
          specificImpulseSeconds: row.specificImpulseSeconds,
          powerRequirementGW: row.powerRequirementGW,
          basePowerRequirementGW: row.powerRequirementGW,
          moduleAuxiliaryPowerGW: 0,
          wasteHeatMultiplier: 1,
          moduleEffectEvaluation: null,
        };
      }
      return {
        thrustN: evaluation.effectiveThrustN,
        exhaustVelocityKps: evaluation.effectiveExhaustVelocityKps,
        specificImpulseSeconds: evaluation.effectiveSpecificImpulseSeconds,
        powerRequirementGW: evaluation.modifiedPowerRequirementGW,
        basePowerRequirementGW: evaluation.basePowerRequirementGW,
        moduleAuxiliaryPowerGW: evaluation.moduleAuxiliaryPowerGW,
        wasteHeatMultiplier: evaluation.wasteHeatMultiplier,
        moduleEffectEvaluation: evaluation,
      };
    }

export function massOptions(row) {
      const baseDryTons = state.dryMassTons;
      const targetDv = state.targetDvKps;
      const radiator = selectedRadiator();
      const radiatorSpecificPower = radiator ? Number(radiator.specificPowerKWPerKg) : NaN;
      const effective = effectiveDriveValues(row);
      const effectEvaluation = effective.moduleEffectEvaluation;
      const massRatioMinusOne = Math.exp(targetDv / effective.exhaustVelocityKps) - 1;
      if (!Number.isFinite(massRatioMinusOne) || massRatioMinusOne < 0) return [];
      const massRatio = massRatioMinusOne + 1;
      const baseOptions = row.powerOptions || row.reactorOptions || [];
      const auxiliaryPowerOptions = Array.isArray(row.auxiliaryPowerOptions) ? row.auxiliaryPowerOptions : [];
      const moduleAuxiliaryPowerGW = Number.isFinite(Number(effective.moduleAuxiliaryPowerGW)) ? Number(effective.moduleAuxiliaryPowerGW) : 0;
      const options = row.powerRequirementGW <= 0 && moduleAuxiliaryPowerGW > 0 && auxiliaryPowerOptions.length
        ? auxiliaryPowerOptions.filter(option => Number(option.maxOutputGW) >= moduleAuxiliaryPowerGW)
        : baseOptions;
      const computed = options.map(option => {
        const basePowerRequirementGW = Number.isFinite(Number(effective.basePowerRequirementGW)) ? Number(effective.basePowerRequirementGW) : row.powerRequirementGW;
        const modifiedPowerRequirementGW = Number.isFinite(Number(effective.powerRequirementGW)) ? Number(effective.powerRequirementGW) : basePowerRequirementGW;
        const wasteHeatMultiplier = Number.isFinite(Number(effective.wasteHeatMultiplier)) ? Number(effective.wasteHeatMultiplier) : 1;
        const baseSelfContained = !!option.selfContained || basePowerRequirementGW <= 0;
        const modifiedExternalPowerRequirementGW = baseSelfContained ? moduleAuxiliaryPowerGW : modifiedPowerRequirementGW;
        const selfContained = modifiedExternalPowerRequirementGW <= 0;
        const basePowerPlantMassTons = baseSelfContained ? 0 : Math.max(1, option.specificMassTonsPerGW * basePowerRequirementGW);
        const powerPlantMassTons = selfContained ? 0 : Math.max(1, option.specificMassTonsPerGW * modifiedExternalPowerRequirementGW);
        const baseWasteHeatGW = baseSelfContained || row.openCycleCooling ? 0 : basePowerRequirementGW * (1 - option.efficiency);
        const auxiliaryWasteHeatGW = moduleAuxiliaryPowerGW > 0 ? moduleAuxiliaryPowerGW * (1 - option.efficiency) : 0;
        const modifiedDriveWasteHeatGW = baseSelfContained || row.openCycleCooling ? 0 : basePowerRequirementGW * (1 - option.efficiency);
        const modifiedWasteHeatGW = selfContained ? 0 : Math.max(0, (modifiedDriveWasteHeatGW + auxiliaryWasteHeatGW) * wasteHeatMultiplier);
        const baseRadiatorMassTons = !baseSelfContained && radiatorSpecificPower > 0
          ? Math.max(0, baseWasteHeatGW * 1_000_000 / radiatorSpecificPower / 1000)
          : 0;
        const radiatorMassTons = !selfContained && radiatorSpecificPower > 0
          ? Math.max(0, modifiedWasteHeatGW * 1_000_000 / radiatorSpecificPower / 1000)
          : 0;
        const hardwareMassTons = row.driveMassTons + powerPlantMassTons + radiatorMassTons;
        const dryWithHardwareTons = baseDryTons + hardwareMassTons;
        const propellantTons = dryWithHardwareTons * massRatioMinusOne;
        const totalMassTons = dryWithHardwareTons + propellantTons;
        const twr = effective.thrustN / (totalMassTons * 1000 * STANDARD_GRAVITY_MPS2);
        const baseMassRatioMinusOne = Math.exp(targetDv / row.exhaustVelocityKps) - 1;
        const baseMassRatio = baseMassRatioMinusOne + 1;
        const baseHardwareMassTons = row.driveMassTons + basePowerPlantMassTons + baseRadiatorMassTons;
        const baseDryWithHardwareTons = baseDryTons + baseHardwareMassTons;
        const basePropellantTons = baseDryWithHardwareTons * baseMassRatioMinusOne;
        const baseTotalMassTons = baseDryWithHardwareTons + basePropellantTons;
        const baseTwr = row.thrustN / (baseTotalMassTons * 1000 * STANDARD_GRAVITY_MPS2);
        const moduleEffectFields = effectEvaluation ? {
          baseThrustN: effectEvaluation.baseThrustN,
          effectiveThrustN: effectEvaluation.effectiveThrustN,
          baseExhaustVelocityKps: effectEvaluation.baseExhaustVelocityKps,
          effectiveExhaustVelocityKps: effectEvaluation.effectiveExhaustVelocityKps,
          baseSpecificImpulseSeconds: effectEvaluation.baseSpecificImpulseSeconds,
          effectiveSpecificImpulseSeconds: effectEvaluation.effectiveSpecificImpulseSeconds,
          activeModuleEffects: effectEvaluation.activeEffects,
          powerContributions: effectEvaluation.powerContributions,
          moduleAuxiliaryPowerGW: effectEvaluation.moduleAuxiliaryPowerGW,
          wasteHeatMultiplier: effectEvaluation.wasteHeatMultiplier,
          moduleEffectDiagnostics: {
            ...effectEvaluation.diagnostics,
          },
        } : {};
        return {
          ...option,
          basePowerPlantMassTons,
          reactorMassTons: powerPlantMassTons,
          powerPlantMassTons,
          basePowerRequirementGW,
          modifiedPowerRequirementGW,
          moduleAuxiliaryPowerGW,
          baseWasteHeatGW,
          modifiedWasteHeatGW,
          wasteHeatMultiplier,
          baseRadiatorMassTons,
          radiatorMassTons,
          wasteHeatGW: modifiedWasteHeatGW,
          baseHardwareMassTons,
          hardwareMassTons,
          baseDryTons,
          baseDryWithHardwareTons,
          dryWithHardwareTons,
          basePropellantTons,
          propellantTons,
          baseTotalMassTons,
          totalMassTons,
          baseTwr,
          twr,
          maxPracticalDvKps: effective.exhaustVelocityKps * Math.log(EXTREME_MASS_RATIO),
          baseMaxPracticalDvKps: row.exhaustVelocityKps * Math.log(EXTREME_MASS_RATIO),
          baseMassRatio,
          massRatio,
          baseMassRatioMinusOne,
          massRatioMinusOne,
          ...moduleEffectFields,
        };
      });
      return actualPowerFrontier(row, computed);
    }

export function chartMassOptions(row, metric = state.metric) {
      const options = massOptions(row);
      if ((metric === "totalMassTons" || metric === "fuelMassTons") && state.minTwr > 0 && !state.showImpracticalCandidates) {
        return options.filter(option => Number.isFinite(option.twr) && option.twr >= state.minTwr);
      }
      if (metric === "twr" && state.minDvKps > 0 && !state.showImpracticalCandidates) {
        return options.filter(option => Number.isFinite(option.maxPracticalDvKps) && option.maxPracticalDvKps >= state.minDvKps);
      }
      return options;
    }

export function chartSummaryMassOptions(row) {
      const options = chartMassOptions(row);
      return powerResearchActive() ? options : options.slice(0, 1);
    }

export function actualPowerFrontier(row, options) {
      if (row.requiredPowerPlantClass !== "Any_General" || row.powerRequirementGW <= 0 || options.length <= 1) {
        return options;
      }
      const frontier = [];
      let bestTotalMass = Infinity;
      options.forEach((option, index) => {
        if (index === 0 || option.totalMassTons < bestTotalMass * (1 - 1e-9)) {
          frontier.push(option);
          bestTotalMass = Math.min(bestTotalMass, option.totalMassTons);
        }
      });
      return frontier;
    }


