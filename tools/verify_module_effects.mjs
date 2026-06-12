import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const moduleSource = readFileSync(resolve(toolsDir, "drive_comparison_client/calc/module_effects.js"), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`;
const {
  driveSatisfiesRequirement,
  evaluateModuleEffectsForDrive,
  resolveSelectedModules,
  specificImpulseSecondsFromExhaustVelocityKps,
} = await import(moduleUrl);

const STANDARD_GRAVITY_MPS2 = 9.80665;
const FIXTURE_DRY_WITH_HARDWARE_TONS = 1000;
const FIXTURE_TARGET_DV_KPS = 50;
const FIXTURE_MAX_MASS_RATIO = 100;

const fusionHydrogenDrive = {
  id: "fixtureFusionHydrogen",
  categoryKey: "Fusion",
  classification: "Fusion_Thermal",
  requiredPowerPlantClass: "Hybrid_Confinement_Fusion",
  propellant: "Hydrogen",
  thrustN: 1000,
  exhaustVelocityKps: 100,
  specificImpulseSeconds: specificImpulseSecondsFromExhaustVelocityKps(100),
  powerRequirementGW: 1,
};

const selfContainedDrive = {
  ...fusionHydrogenDrive,
  id: "fixtureSelfContained",
  categoryKey: "Chemical",
  classification: "Chemical",
  requiredPowerPlantClass: "None",
  powerRequirementGW: 0,
};

const fissionHydrogenDrive = {
  ...fusionHydrogenDrive,
  id: "fixtureFissionHydrogen",
  categoryKey: "Fission",
  classification: "Fission_Thermal",
  requiredPowerPlantClass: "Solid_Core_Fission",
};

const electricNobleGasDrive = {
  ...fusionHydrogenDrive,
  id: "fixtureElectricNobleGas",
  categoryKey: "Electric",
  classification: "Electrostatic",
  requiredPowerPlantClass: "Any_General",
  propellant: "NobleGases",
};

const chemicalHydrogenDrive = {
  ...fusionHydrogenDrive,
  id: "fixtureChemicalHydrogen",
  categoryKey: "Chemical",
  classification: "Chemical",
  requiredPowerPlantClass: "None",
};

const anythingPropellantDrive = {
  ...electricNobleGasDrive,
  id: "fixtureAnythingPropellant",
  propellant: "Anything",
};

const muonSpiker = {
  dataName: "MuonSpiker",
  friendlyName: "Muon Spiker",
  grouping: 3,
  effects: [{
    type: "thrustMultiplier",
    operation: "multiply",
    multiplier: 1.1,
    sourceRule: "ThrustMultiplier",
  }],
  effectRequirements: [{
    type: "fusionDrive",
    sourceRule: "RequiresFusionDrive",
  }],
  unmodeledRules: [{
    rule: "RadHardened",
    category: "damageMitigation",
  }],
};

const hydrogenTankage = {
  dataName: "HydrogenTankage",
  friendlyName: "Hydrogen Tankage",
  grouping: 4,
  effects: [{
    type: "exhaustVelocityMultiplier",
    operation: "multiply",
    multiplier: 1.2,
    sourceRule: "EVMultiplier",
  }],
  effectRequirements: [{
    type: "hydrogenPropellant",
    sourceRule: "RequiresHydrogenPropellant",
  }],
};

const hydronTrap = {
  dataName: "HydronTrap",
  friendlyName: "Hydron Trap",
  grouping: 4,
  effects: [{
    type: "exhaustVelocityMultiplier",
    operation: "multiply",
    multiplier: 1.5,
    sourceRule: "EVMultiplier",
  }],
  effectRequirements: [{
    type: "hydrogenPropellant",
    sourceRule: "RequiresHydrogenPropellant",
  }],
};

const electronicCountermeasures = {
  dataName: "ElectronicCountermeasures1",
  friendlyName: "Electronic Countermeasures",
  specialRules: ["ECM"],
  specialValue: 0.2,
};

const antimatterSpiker = {
  dataName: "AntimatterSpiker",
  friendlyName: "Antimatter Spiker",
  grouping: 3,
  effects: [{
    type: "thrustMultiplier",
    operation: "multiply",
    multiplier: 1.25,
    sourceRule: "ThrustMultiplier",
  }],
  effectRequirements: [{
    type: "nuclearDrive",
    sourceRule: "RequiresNuclearDrive",
  }],
};

const laserEngine = {
  dataName: "LaserEngine",
  friendlyName: "Laser Engine",
  powerRequirementMW: 5,
  specialRules: ["LaserPowerBonus"],
  unmodeledRules: [{
    rule: "LaserPowerBonus",
    category: "powerDemand",
  }],
};

const thermalSink = {
  dataName: "ThermalSink",
  friendlyName: "Thermal Sink",
  effects: [{
    type: "wasteHeatMultiplier",
    operation: "multiply",
    multiplier: 0.75,
    sourceRule: "WasteHeatMultiplier",
  }],
};

const unsupportedHeatSink = {
  dataName: "UnsupportedHeatSink",
  friendlyName: "Unsupported Heat Sink",
  unmodeledRules: [{
    rule: "HeatSinkBonus",
    category: "thermal",
  }],
};

const rawNeutroniumSpiker = {
  dataName: "RawNeutroniumSpiker",
  friendlyName: "Raw Neutronium Spiker",
  specialRules: ["ThrustMultiplier", "RequiresFissionDrive"],
  specialValue: 1.2,
};

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, got ${actual}`);
}

function fixtureMassSummary(row, modules = [], { enabled = true } = {}) {
  const evaluation = enabled
    ? evaluateModuleEffectsForDrive(row, modules)
    : evaluateModuleEffectsForDrive(row, []);
  const massRatio = Math.exp(FIXTURE_TARGET_DV_KPS / evaluation.effectiveExhaustVelocityKps);
  const powerPlantMassTons = evaluation.modifiedPowerRequirementGW * 20;
  const baseWasteHeatGW = evaluation.modifiedPowerRequirementGW * 0.5;
  const wasteHeatGW = baseWasteHeatGW * evaluation.wasteHeatMultiplier;
  const radiatorMassTons = wasteHeatGW * 10;
  const dryWithHardwareTons = FIXTURE_DRY_WITH_HARDWARE_TONS + powerPlantMassTons + radiatorMassTons;
  const propellantTons = dryWithHardwareTons * (massRatio - 1);
  const totalMassTons = dryWithHardwareTons + propellantTons;
  const twr = evaluation.effectiveThrustN / (totalMassTons * 1000 * STANDARD_GRAVITY_MPS2);
  return {
    ...evaluation,
    massRatio,
    powerPlantMassTons,
    baseWasteHeatGW,
    wasteHeatGW,
    radiatorMassTons,
    propellantTons,
    totalMassTons,
    twr,
    maxPracticalDvKps: evaluation.effectiveExhaustVelocityKps * Math.log(FIXTURE_MAX_MASS_RATIO),
  };
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, []);
  assertClose(result.effectiveThrustN, 1000, "no modules keeps thrust");
  assertClose(result.effectiveExhaustVelocityKps, 100, "no modules keeps exhaust velocity");
  assert.equal(result.activeEffects.length, 0, "no modules produces no active effects");
  assert.deepEqual(result.diagnostics.unmetRequirements, [], "no modules produces no unmet requirements");
}

{
  const base = fixtureMassSummary(fusionHydrogenDrive, []);
  const disabled = fixtureMassSummary(fusionHydrogenDrive, [muonSpiker, hydronTrap], { enabled: false });
  assertClose(disabled.effectiveThrustN, base.effectiveThrustN, "disabled module effects keep base thrust");
  assertClose(disabled.effectiveExhaustVelocityKps, base.effectiveExhaustVelocityKps, "disabled module effects keep base exhaust velocity");
  assertClose(disabled.massRatio, base.massRatio, "disabled module effects keep base mass ratio");
  assertClose(disabled.propellantTons, base.propellantTons, "disabled module effects keep base propellant");
  assertClose(disabled.totalMassTons, base.totalMassTons, "disabled module effects keep base total mass");
  assert.equal(disabled.activeEffects.length, 0, "disabled module effects produce no active effects");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [muonSpiker]);
  assertClose(result.effectiveThrustN, 1100, "thrust multiplier applies");
  assertClose(result.effectiveExhaustVelocityKps, 100, "thrust multiplier leaves exhaust velocity unchanged");
  assert.equal(result.activeEffects.length, 1, "thrust multiplier is summarized");
  assert.equal(result.activeEffects[0].field, "thrustN");
  assert.equal(result.diagnostics.unsupportedRules.length, 0, "out-of-scope companion rule is suppressed");
}

{
  const base = fixtureMassSummary(fusionHydrogenDrive, []);
  const thrust = fixtureMassSummary(fusionHydrogenDrive, [muonSpiker]);
  assertClose(thrust.effectiveThrustN, base.effectiveThrustN * 1.1, "thrust summary updates effective thrust");
  assertClose(thrust.massRatio, base.massRatio, "thrust-only summary keeps mass ratio");
  assertClose(thrust.propellantTons, base.propellantTons, "thrust-only summary keeps propellant");
  assertClose(thrust.totalMassTons, base.totalMassTons, "thrust-only summary keeps total mass");
  assert.ok(thrust.twr > base.twr * 1.09, "thrust-only summary increases TWR");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [hydrogenTankage]);
  assertClose(result.effectiveThrustN, 1000, "EV multiplier leaves thrust unchanged");
  assertClose(result.effectiveExhaustVelocityKps, 120, "EV multiplier applies");
  assertClose(
    result.effectiveSpecificImpulseSeconds,
    specificImpulseSecondsFromExhaustVelocityKps(120),
    "EV multiplier recomputes specific impulse",
  );
}

{
  const base = fixtureMassSummary(fusionHydrogenDrive, []);
  const ev = fixtureMassSummary(fusionHydrogenDrive, [hydronTrap]);
  assertClose(ev.effectiveExhaustVelocityKps, base.effectiveExhaustVelocityKps * 1.5, "EV summary updates exhaust velocity");
  assert.ok(ev.massRatio < base.massRatio, "EV summary lowers mass ratio");
  assert.ok(ev.propellantTons < base.propellantTons, "EV summary lowers propellant mass");
  assert.ok(ev.totalMassTons < base.totalMassTons, "EV summary lowers total mass");
  assert.ok(ev.maxPracticalDvKps > base.maxPracticalDvKps * 1.49, "EV summary raises max practical dV");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [muonSpiker, hydronTrap]);
  assertClose(result.effectiveThrustN, 1100, "compatible thrust multiplier applies with EV multiplier");
  assertClose(result.effectiveExhaustVelocityKps, 150, "compatible EV multiplier applies with thrust multiplier");
  assert.equal(result.activeEffects.length, 2, "multiple compatible modifiers are summarized");
  assertClose(result.multipliers.thrust, 1.1, "thrust multiplier total is tracked");
  assertClose(result.multipliers.exhaustVelocity, 1.5, "EV multiplier total is tracked");
}

{
  const result = evaluateModuleEffectsForDrive(fissionHydrogenDrive, [muonSpiker]);
  assertClose(result.effectiveThrustN, 1000, "unmet prerequisite skips thrust multiplier");
  assert.equal(result.activeEffects.length, 0, "unmet prerequisite effect is not active");
  assert.equal(result.diagnostics.unmetRequirements.length, 1, "unmet prerequisite is diagnosed");
  assert.equal(result.diagnostics.unmetRequirements[0].severity, "warning", "unmet prerequisite has severity");
  assert.equal(result.diagnostics.unmetRequirements[0].applied, false, "unmet prerequisite is marked not applied");
  assert.equal(result.diagnostics.unmetRequirements[0].messageKey, "moduleEffect.requirement.fusionDrive");
  assert.equal(result.diagnostics.skippedEffects.length, 1, "skipped effect is diagnosed");
  assert.equal(result.diagnostics.skippedEffects[0].reason, "unmetRequirement");
}

{
  const result = evaluateModuleEffectsForDrive(electricNobleGasDrive, [hydrogenTankage]);
  assertClose(result.effectiveExhaustVelocityKps, 100, "hydrogen-only EV multiplier is skipped for other propellant");
  assert.equal(result.diagnostics.unmetRequirements[0].requirement, "hydrogenPropellant");
}

{
  const nuclear = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [antimatterSpiker]);
  const nonNuclear = evaluateModuleEffectsForDrive(chemicalHydrogenDrive, [antimatterSpiker]);
  assertClose(nuclear.effectiveThrustN, 1250, "nuclear prerequisite allows antimatter spiker on nuclear drives");
  assertClose(nonNuclear.effectiveThrustN, 1000, "nuclear prerequisite blocks antimatter spiker on non-nuclear drives");
  assert.equal(nonNuclear.diagnostics.unmetRequirements[0].requirement, "nuclearDrive");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [muonSpiker, antimatterSpiker]);
  assertClose(result.effectiveThrustN, 1000, "mutually exclusive modules do not modify thrust");
  assert.equal(result.activeEffects.length, 0, "mutually exclusive effects are not active");
  assert.equal(result.diagnostics.mutualExclusions.length, 2, "mutual exclusion warns for each conflicting module");
  assert.equal(result.diagnostics.mutualExclusions[0].category, "mutualExclusion");
  assert.equal(result.diagnostics.mutualExclusions[0].applied, false);
  assert.equal(result.diagnostics.skippedEffects.filter(item => item.reason === "mutualExclusion").length, 2);
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [electronicCountermeasures]);
  const base = fixtureMassSummary(fusionHydrogenDrive, []);
  const unsupported = fixtureMassSummary(fusionHydrogenDrive, [electronicCountermeasures]);
  assert.equal(result.activeEffects.length, 0, "unsupported rule does not become active");
  assert.equal(result.diagnostics.unsupportedRules.length, 0, "out-of-scope unsupported rule is suppressed");
  assertClose(unsupported.effectiveThrustN, base.effectiveThrustN, "unsupported-only module keeps base thrust");
  assertClose(unsupported.effectiveExhaustVelocityKps, base.effectiveExhaustVelocityKps, "unsupported-only module keeps base exhaust velocity");
  assertClose(unsupported.totalMassTons, base.totalMassTons, "unsupported-only module keeps base total mass");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [laserEngine]);
  const base = fixtureMassSummary(fusionHydrogenDrive, []);
  const powered = fixtureMassSummary(fusionHydrogenDrive, [laserEngine]);
  assertClose(result.moduleAuxiliaryPowerGW, 0.005, "module auxiliary power converts MW to GW");
  assertClose(result.modifiedPowerRequirementGW, (Number(fusionHydrogenDrive.powerRequirementGW) || 0) + 0.005, "auxiliary power adds to drive power demand");
  assert.equal(result.diagnostics.powerWarnings.length, 1, "unsupported power bonus rule is diagnosed separately");
  assert.equal(result.diagnostics.powerWarnings[0].rule, "LaserPowerBonus");
  assert.ok(powered.powerPlantMassTons > base.powerPlantMassTons, "auxiliary power increases power plant mass fixture");
  assert.ok(powered.wasteHeatGW > base.wasteHeatGW, "auxiliary power increases waste heat fixture");
  assert.ok(powered.radiatorMassTons > base.radiatorMassTons, "auxiliary power increases radiator mass fixture");
  assert.ok(powered.totalMassTons > base.totalMassTons, "auxiliary power increases total mass fixture");
}

{
  const result = evaluateModuleEffectsForDrive(selfContainedDrive, [laserEngine]);
  const base = fixtureMassSummary(selfContainedDrive, []);
  const powered = fixtureMassSummary(selfContainedDrive, [laserEngine]);
  assertClose(result.moduleAuxiliaryPowerGW, 0.005, "self-contained drive keeps auxiliary module power");
  assertClose(result.modifiedPowerRequirementGW, 0.005, "self-contained drive exposes auxiliary power demand");
  assert.equal(result.powerContributions.length, 1, "auxiliary power remains an applied contribution");
  assert.ok(
    !result.diagnostics.powerWarnings.some(item => item.reason === "selfContainedDriveAuxiliaryPower"),
    "self-contained auxiliary power is modeled rather than warned away",
  );
  assert.ok(powered.totalMassTons > base.totalMassTons, "auxiliary power increases self-contained total mass fixture");
  assert.ok(powered.twr < base.twr, "auxiliary power lowers self-contained TWR fixture");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [thermalSink]);
  const base = fixtureMassSummary(fusionHydrogenDrive, []);
  const heat = fixtureMassSummary(fusionHydrogenDrive, [thermalSink]);
  assertClose(result.wasteHeatMultiplier, 0.75, "waste heat multiplier is tracked");
  assert.equal(result.activeEffects.length, 1, "waste heat multiplier is summarized");
  assert.equal(result.activeEffects[0].field, "wasteHeatGW");
  assertClose(heat.powerPlantMassTons, base.powerPlantMassTons, "heat-only multiplier keeps power plant mass");
  assert.ok(heat.wasteHeatGW < base.wasteHeatGW, "heat multiplier lowers waste heat fixture");
  assert.ok(heat.radiatorMassTons < base.radiatorMassTons, "heat multiplier lowers radiator mass fixture");
  assert.ok(heat.totalMassTons < base.totalMassTons, "heat multiplier lowers total mass fixture");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [unsupportedHeatSink]);
  const base = fixtureMassSummary(fusionHydrogenDrive, []);
  const unsupported = fixtureMassSummary(fusionHydrogenDrive, [unsupportedHeatSink]);
  assert.equal(result.diagnostics.heatWarnings.length, 1, "unsupported heat-like rule is diagnosed separately");
  assert.equal(result.diagnostics.heatWarnings[0].rule, "HeatSinkBonus");
  assertClose(unsupported.totalMassTons, base.totalMassTons, "unsupported heat-only module keeps base total mass");
}

{
  const result = evaluateModuleEffectsForDrive(fissionHydrogenDrive, [rawNeutroniumSpiker]);
  assertClose(result.effectiveThrustN, 1200, "raw specialRules fallback applies thrust multiplier");
  assert.equal(result.activeEffects[0].sourceRule, "ThrustMultiplier");
}

{
  const utilityModules = [muonSpiker, hydronTrap];
  const resolved = resolveSelectedModules(["MuonSpiker", "MissingModule", hydronTrap, "Empty"], { utilityModules });
  assert.deepEqual(resolved.modules.map(module => module.dataName), ["MuonSpiker", "HydronTrap"], "module IDs resolve through provided catalog");
  assert.deepEqual(resolved.unresolvedModules, [{ id: "MissingModule", index: 1 }], "missing module IDs are diagnosed");

  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, ["MuonSpiker", "MissingModule"], { utilityModules });
  assertClose(result.effectiveThrustN, 1100, "resolved module ID applies effect");
  assert.deepEqual(result.diagnostics.unresolvedModules, [{ id: "MissingModule", index: 1 }]);
  assert.equal(result.diagnostics.impossibleCombinations.length, 1, "missing module IDs are exposed as impossible combinations");
  assert.equal(result.diagnostics.impossibleCombinations[0].category, "impossibleCombination");
  assert.equal(result.diagnostics.impossibleCombinations[0].applied, false);
}

assert.equal(driveSatisfiesRequirement(fusionHydrogenDrive, "fusionDrive"), true);
assert.equal(driveSatisfiesRequirement(fusionHydrogenDrive, "nuclearDrive"), true);
assert.equal(driveSatisfiesRequirement(fissionHydrogenDrive, "fissionDrive"), true);
assert.equal(driveSatisfiesRequirement(electricNobleGasDrive, "hydrogenPropellant"), false);
assert.equal(driveSatisfiesRequirement(electricNobleGasDrive, "nonIsruDrive"), true);
assert.equal(driveSatisfiesRequirement(anythingPropellantDrive, "nonIsruDrive"), false);

console.log("Module effect evaluator fixture verification passed");
