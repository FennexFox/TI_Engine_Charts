const STANDARD_GRAVITY_MPS2 = 9.80665;

const RAW_EFFECT_RULES = {
  ThrustMultiplier: "thrustMultiplier",
  EVMultiplier: "exhaustVelocityMultiplier",
  WasteHeatMultiplier: "wasteHeatMultiplier",
};

const RAW_REQUIREMENT_RULES = {
  RequiresFissionDrive: "fissionDrive",
  RequiresFusionDrive: "fusionDrive",
  RequiresNuclearDrive: "nuclearDrive",
  RequiresHydrogenPropellant: "hydrogenPropellant",
  RequiresNonISRUDrive: "nonIsruDrive",
};

const DRIVE_CHART_UNMODELED_RULE_CATEGORIES = new Set([
  "powerdemand",
  "heat",
  "wasteheat",
  "thermal",
  "radiator",
]);

const RAW_UNMODELED_RULE_CATEGORIES = {
  LaserPowerBonus: "powerDemand",
  ParticleBeamPowerBonus: "powerDemand",
};

function finiteNumber(value, fallback = NaN) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function compactModuleName(module) {
  if (!module || typeof module !== "object") return "";
  const display = module.displayName;
  if (display && typeof display === "object") return display.en || display.kor || display.ko || "";
  return String(display || module.friendlyName || module.name || module.dataName || module.id || "");
}

function moduleId(module) {
  return String(module && (module.dataName || module.id || module.name) || "");
}

function normalizeToken(value) {
  return String(value || "").toLowerCase();
}

export function isModuleRuleRelevantToDriveChart(rule) {
  const category = typeof rule === "string"
    ? rule
    : rule && typeof rule === "object"
      ? rule.category
      : "";
  return DRIVE_CHART_UNMODELED_RULE_CATEGORIES.has(normalizeToken(category));
}

function rowTokens(row) {
  return [
    row && row.categoryKey,
    row && row.classification,
    row && row.requiredPowerPlantClass,
    row && row.powerBandKey,
    row && row.familyKey,
    row && row.subfamilyKey,
  ].map(normalizeToken).filter(Boolean);
}

function tokenIncludes(row, needle) {
  const normalizedNeedle = normalizeToken(needle);
  return rowTokens(row).some(token => token.includes(normalizedNeedle));
}

function isFissionDrive(row) {
  return normalizeToken(row && row.categoryKey) === "fission" || tokenIncludes(row, "fission") || tokenIncludes(row, "nuclearsaltwater");
}

function isFusionDrive(row) {
  return normalizeToken(row && row.categoryKey) === "fusion" || tokenIncludes(row, "fusion");
}

function isAntimatterDrive(row) {
  return normalizeToken(row && row.categoryKey) === "antimatter" || tokenIncludes(row, "antimatter");
}

function drivePropellant(row) {
  return normalizeToken(row && row.propellant);
}

export function specificImpulseSecondsFromExhaustVelocityKps(exhaustVelocityKps) {
  const exhaustVelocity = finiteNumber(exhaustVelocityKps);
  return Number.isFinite(exhaustVelocity) ? exhaustVelocity * 1000 / STANDARD_GRAVITY_MPS2 : NaN;
}

export function driveSatisfiesRequirement(row, requirementType) {
  switch (requirementType) {
    case "fissionDrive":
      return isFissionDrive(row);
    case "fusionDrive":
      return isFusionDrive(row);
    case "nuclearDrive":
      return isFissionDrive(row) || isFusionDrive(row) || isAntimatterDrive(row) || tokenIncludes(row, "nuclear");
    case "hydrogenPropellant":
      return drivePropellant(row) === "hydrogen";
    case "nonIsruDrive": {
      const propellant = drivePropellant(row);
      return !!propellant && propellant !== "anything";
    }
    default:
      return false;
  }
}

function moduleCatalogMap(options) {
  const catalog = Array.isArray(options.utilityModules)
    ? options.utilityModules
    : Array.isArray(options.moduleCatalog)
      ? options.moduleCatalog
      : [];
  return new Map(catalog.map(module => [moduleId(module), module]).filter(([id]) => id));
}

export function resolveSelectedModules(selectedModules, options = {}) {
  const catalog = moduleCatalogMap(options);
  const modules = [];
  const unresolvedModules = [];
  const selected = Array.isArray(selectedModules) ? selectedModules : [];
  selected.forEach((entry, index) => {
    if (!entry) return;
    if (typeof entry === "string") {
      const module = catalog.get(entry);
      if (module) {
        modules.push(module);
      } else if (entry !== "Empty") {
        unresolvedModules.push({ id: entry, index });
      }
      return;
    }
    if (typeof entry === "object") modules.push(entry);
  });
  return { modules, unresolvedModules };
}

function normalizedRequirements(module) {
  if (Array.isArray(module.effectRequirements) && module.effectRequirements.length) {
    return module.effectRequirements
      .map(requirement => ({
        type: String(requirement && requirement.type || ""),
        sourceRule: requirement && requirement.sourceRule ? String(requirement.sourceRule) : "",
      }))
      .filter(requirement => requirement.type);
  }
  const rules = Array.isArray(module.specialRules) ? module.specialRules : [];
  return rules
    .filter(rule => RAW_REQUIREMENT_RULES[rule])
    .map(rule => ({ type: RAW_REQUIREMENT_RULES[rule], sourceRule: rule }));
}

function normalizedEffects(module) {
  if (Array.isArray(module.effects) && module.effects.length) return module.effects;
  const rules = Array.isArray(module.specialRules) ? module.specialRules : [];
  const multiplier = finiteNumber(module.specialValue);
  return rules
    .filter(rule => RAW_EFFECT_RULES[rule])
    .map(rule => ({
      type: RAW_EFFECT_RULES[rule],
      operation: "multiply",
      multiplier,
      sourceRule: rule,
    }));
}

function unsupportedRules(module) {
  if (Array.isArray(module.unmodeledRules) && module.unmodeledRules.length) {
    return module.unmodeledRules.map(rule => ({
      rule: String(rule && rule.rule || ""),
      category: String(rule && rule.category || "unsupported"),
    })).filter(rule => rule.rule && isModuleRuleRelevantToDriveChart(rule));
  }
  const rules = Array.isArray(module.specialRules) ? module.specialRules : [];
  return rules
    .filter(rule => !RAW_EFFECT_RULES[rule] && !RAW_REQUIREMENT_RULES[rule])
    .map(rule => ({ rule, category: RAW_UNMODELED_RULE_CATEGORIES[rule] || "unsupported" }))
    .filter(rule => isModuleRuleRelevantToDriveChart(rule));
}

function moduleGrouping(module) {
  const grouping = finiteNumber(module && module.grouping);
  return Number.isInteger(grouping) && grouping >= 0 ? grouping : null;
}

function diagnosticFields(module, fields = {}) {
  return {
    severity: fields.severity || "warning",
    moduleId: moduleId(module),
    moduleName: compactModuleName(module),
    rule: fields.rule || "",
    category: fields.category || "validation",
    messageKey: fields.messageKey || "",
    applied: fields.applied === true,
    ...fields,
  };
}

function mutualExclusionWarnings(modules) {
  const grouped = new Map();
  modules.forEach(module => {
    const grouping = moduleGrouping(module);
    if (grouping === null) return;
    if (!grouped.has(grouping)) grouped.set(grouping, []);
    grouped.get(grouping).push(module);
  });
  const warnings = [];
  grouped.forEach((items, grouping) => {
    const uniqueItems = Array.from(new Map(items.map(module => [moduleId(module), module])).values());
    if (uniqueItems.length <= 1) return;
    const conflictingModuleIds = uniqueItems.map(module => moduleId(module));
    uniqueItems.forEach(module => {
      warnings.push(diagnosticFields(module, {
        severity: "warning",
        rule: "MutualExclusion",
        category: "mutualExclusion",
        messageKey: "moduleEffect.mutualExclusion",
        applied: false,
        grouping,
        conflictingModuleIds,
      }));
    });
  });
  return warnings;
}

function unresolvedModuleWarning(item) {
  const id = String(item && item.id || "");
  return {
    severity: "warning",
    moduleId: id,
    moduleName: id,
    rule: "UnresolvedModule",
    category: "impossibleCombination",
    messageKey: "moduleEffect.impossible.unresolvedModule",
    applied: false,
    index: item && item.index,
  };
}

function baseDriveValues(row) {
  const thrustN = finiteNumber(row && row.thrustN);
  const exhaustVelocityKps = finiteNumber(row && row.exhaustVelocityKps);
  const specificImpulseSeconds = Number.isFinite(finiteNumber(row && row.specificImpulseSeconds))
    ? finiteNumber(row && row.specificImpulseSeconds)
    : specificImpulseSecondsFromExhaustVelocityKps(exhaustVelocityKps);
  const powerRequirementGW = finiteNumber(row && row.powerRequirementGW, 0);
  return { thrustN, exhaustVelocityKps, specificImpulseSeconds, powerRequirementGW };
}

function requirementWarning(module, requirement) {
  return diagnosticFields(module, {
    severity: "warning",
    rule: requirement.sourceRule || requirement.type,
    category: "unmetRequirement",
    messageKey: `moduleEffect.requirement.${requirement.type}`,
    applied: false,
    requirement: requirement.type,
    sourceRule: requirement.sourceRule || "",
  });
}

function unsupportedRuleWarning(module, rule) {
  return diagnosticFields(module, {
    severity: "info",
    rule: rule.rule,
    category: rule.category || "unsupported",
    messageKey: `moduleEffect.unsupportedRule.${rule.category || "unsupported"}`,
    applied: false,
  });
}

function unsupportedEffectWarning(module, effect, reason) {
  return diagnosticFields(module, {
    severity: "warning",
    rule: String(effect && effect.sourceRule || effect && effect.type || ""),
    category: "unsupportedEffect",
    messageKey: `moduleEffect.unsupportedEffect.${reason}`,
    applied: false,
    type: String(effect && effect.type || ""),
    sourceRule: String(effect && effect.sourceRule || ""),
    reason,
  });
}

function isHeatRuleCategory(category) {
  const normalized = normalizeToken(category);
  return normalized === "heat"
    || normalized === "wasteheat"
    || normalized === "thermal"
    || normalized === "radiator";
}

function modulePowerContribution(module) {
  const powerRequirementMW = finiteNumber(module && module.powerRequirementMW, 0);
  if (!Number.isFinite(powerRequirementMW) || powerRequirementMW <= 0) return null;
  return {
    moduleId: moduleId(module),
    moduleName: compactModuleName(module),
    powerRequirementMW,
    powerRequirementGW: powerRequirementMW / 1000,
  };
}

export function evaluateModuleEffectsForDrive(row, selectedModules = [], options = {}) {
  const { modules, unresolvedModules } = resolveSelectedModules(selectedModules, options);
  const base = baseDriveValues(row || {});
  const effective = { ...base };
  const diagnostics = {
    unresolvedModules,
    unmetRequirements: [],
    unsupportedRules: [],
    unsupportedEffects: [],
    skippedEffects: [],
    mutualExclusions: [],
    impossibleCombinations: unresolvedModules.map(unresolvedModuleWarning),
    powerWarnings: [],
    heatWarnings: [],
  };
  diagnostics.mutualExclusions = mutualExclusionWarnings(modules);
  const blockedModuleIds = new Set(diagnostics.mutualExclusions.map(item => item.moduleId).filter(Boolean));
  const activeEffects = [];
  const powerContributions = [];
  const multipliers = {
    thrust: 1,
    exhaustVelocity: 1,
    wasteHeat: 1,
  };

  modules.forEach(module => {
    const isBlockedByMutualExclusion = blockedModuleIds.has(moduleId(module));
    const powerContribution = modulePowerContribution(module);
    if (powerContribution && !isBlockedByMutualExclusion) powerContributions.push(powerContribution);

    unsupportedRules(module).forEach(rule => {
      const warning = unsupportedRuleWarning(module, rule);
      diagnostics.unsupportedRules.push(warning);
      if (warning.category === "powerDemand") {
        diagnostics.powerWarnings.push({
          ...warning,
          reason: "unsupportedPowerRule",
        });
      }
      if (isHeatRuleCategory(warning.category)) {
        diagnostics.heatWarnings.push({
          ...warning,
          reason: "unsupportedHeatRule",
        });
      }
    });

    const unmetRequirements = normalizedRequirements(module)
      .filter(requirement => !driveSatisfiesRequirement(row || {}, requirement.type));
    unmetRequirements.forEach(requirement => {
      diagnostics.unmetRequirements.push(requirementWarning(module, requirement));
    });

    normalizedEffects(module).forEach(effect => {
      const multiplier = finiteNumber(effect && effect.multiplier);
      const summary = {
        moduleId: moduleId(module),
        moduleName: compactModuleName(module),
        type: String(effect && effect.type || ""),
        operation: String(effect && effect.operation || "multiply"),
        sourceRule: String(effect && effect.sourceRule || ""),
        multiplier,
      };
      if (isBlockedByMutualExclusion) {
        diagnostics.skippedEffects.push({
          ...summary,
          severity: "warning",
          rule: summary.sourceRule || summary.type,
          category: "mutualExclusion",
          messageKey: "moduleEffect.skipped.mutualExclusion",
          applied: false,
          reason: "mutualExclusion",
        });
        return;
      }
      if (unmetRequirements.length) {
        diagnostics.skippedEffects.push({
          ...summary,
          severity: "warning",
          rule: summary.sourceRule || summary.type,
          category: "unmetRequirement",
          messageKey: "moduleEffect.skipped.unmetRequirement",
          applied: false,
          reason: "unmetRequirement",
        });
        return;
      }
      if (summary.operation !== "multiply" || !Number.isFinite(multiplier)) {
        diagnostics.unsupportedEffects.push(unsupportedEffectWarning(module, effect, "unsupportedOperationOrValue"));
        return;
      }
      if (summary.type === "thrustMultiplier") {
        const before = effective.thrustN;
        effective.thrustN = before * multiplier;
        multipliers.thrust *= multiplier;
        activeEffects.push({ ...summary, field: "thrustN", before, after: effective.thrustN });
        return;
      }
      if (summary.type === "exhaustVelocityMultiplier") {
        const before = effective.exhaustVelocityKps;
        effective.exhaustVelocityKps = before * multiplier;
        effective.specificImpulseSeconds = specificImpulseSecondsFromExhaustVelocityKps(effective.exhaustVelocityKps);
        multipliers.exhaustVelocity *= multiplier;
        activeEffects.push({ ...summary, field: "exhaustVelocityKps", before, after: effective.exhaustVelocityKps });
        return;
      }
      if (summary.type === "wasteHeatMultiplier") {
        multipliers.wasteHeat *= multiplier;
        activeEffects.push({ ...summary, field: "wasteHeatGW" });
        return;
      }
      diagnostics.unsupportedEffects.push(unsupportedEffectWarning(module, effect, "unsupportedEffectType"));
    });
  });

  const moduleAuxiliaryPowerGW = powerContributions.reduce(
    (total, item) => total + item.powerRequirementGW,
    0,
  );
  effective.powerRequirementGW = base.powerRequirementGW + moduleAuxiliaryPowerGW;

  return {
    base,
    effective,
    baseThrustN: base.thrustN,
    baseExhaustVelocityKps: base.exhaustVelocityKps,
    baseSpecificImpulseSeconds: base.specificImpulseSeconds,
    effectiveThrustN: effective.thrustN,
    effectiveExhaustVelocityKps: effective.exhaustVelocityKps,
    effectiveSpecificImpulseSeconds: effective.specificImpulseSeconds,
    basePowerRequirementGW: base.powerRequirementGW,
    modifiedPowerRequirementGW: effective.powerRequirementGW,
    moduleAuxiliaryPowerGW,
    powerContributions,
    baseWasteHeatGW: null,
    modifiedWasteHeatGW: null,
    wasteHeatMultiplier: multipliers.wasteHeat,
    multipliers,
    activeEffects,
    diagnostics,
  };
}
