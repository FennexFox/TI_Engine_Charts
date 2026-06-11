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

const fusionHydrogenDrive = {
  id: "fixtureFusionHydrogen",
  categoryKey: "Fusion",
  classification: "Fusion_Thermal",
  requiredPowerPlantClass: "Hybrid_Confinement_Fusion",
  propellant: "Hydrogen",
  thrustN: 1000,
  exhaustVelocityKps: 100,
  specificImpulseSeconds: specificImpulseSecondsFromExhaustVelocityKps(100),
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

const anythingPropellantDrive = {
  ...electricNobleGasDrive,
  id: "fixtureAnythingPropellant",
  propellant: "Anything",
};

const muonSpiker = {
  dataName: "MuonSpiker",
  friendlyName: "Muon Spiker",
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

const rawNeutroniumSpiker = {
  dataName: "RawNeutroniumSpiker",
  friendlyName: "Raw Neutronium Spiker",
  specialRules: ["ThrustMultiplier", "RequiresFissionDrive"],
  specialValue: 1.2,
};

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, got ${actual}`);
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, []);
  assertClose(result.effectiveThrustN, 1000, "no modules keeps thrust");
  assertClose(result.effectiveExhaustVelocityKps, 100, "no modules keeps exhaust velocity");
  assert.equal(result.activeEffects.length, 0, "no modules produces no active effects");
  assert.deepEqual(result.diagnostics.unmetRequirements, [], "no modules produces no unmet requirements");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [muonSpiker]);
  assertClose(result.effectiveThrustN, 1100, "thrust multiplier applies");
  assertClose(result.effectiveExhaustVelocityKps, 100, "thrust multiplier leaves exhaust velocity unchanged");
  assert.equal(result.activeEffects.length, 1, "thrust multiplier is summarized");
  assert.equal(result.activeEffects[0].field, "thrustN");
  assert.equal(result.diagnostics.unsupportedRules.length, 1, "unmodeled companion rule is diagnosed");
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
  assert.equal(result.diagnostics.skippedEffects.length, 1, "skipped effect is diagnosed");
}

{
  const result = evaluateModuleEffectsForDrive(electricNobleGasDrive, [hydrogenTankage]);
  assertClose(result.effectiveExhaustVelocityKps, 100, "hydrogen-only EV multiplier is skipped for other propellant");
  assert.equal(result.diagnostics.unmetRequirements[0].requirement, "hydrogenPropellant");
}

{
  const result = evaluateModuleEffectsForDrive(fusionHydrogenDrive, [electronicCountermeasures]);
  assert.equal(result.activeEffects.length, 0, "unsupported rule does not become active");
  assert.equal(result.diagnostics.unsupportedRules.length, 1, "unsupported rule is diagnosed");
  assert.equal(result.diagnostics.unsupportedRules[0].rule, "ECM");
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
}

assert.equal(driveSatisfiesRequirement(fusionHydrogenDrive, "fusionDrive"), true);
assert.equal(driveSatisfiesRequirement(fusionHydrogenDrive, "nuclearDrive"), true);
assert.equal(driveSatisfiesRequirement(fissionHydrogenDrive, "fissionDrive"), true);
assert.equal(driveSatisfiesRequirement(electricNobleGasDrive, "hydrogenPropellant"), false);
assert.equal(driveSatisfiesRequirement(electricNobleGasDrive, "nonIsruDrive"), true);
assert.equal(driveSatisfiesRequirement(anythingPropellantDrive, "nonIsruDrive"), false);

console.log("Module effect evaluator fixture verification passed");
