# Terra Invicta Research Catalog

Generated from `TerraInvicta_Data/StreamingAssets/Templates`.

This file is generated. Rebuild it with:

```powershell
python .\tools\build_research_catalog.py
```

Important interpretation notes:

- `requirements` in the JSON is the canonical source for prerequisite logic.
- `prerequisiteNodes` and `edges` are derived from research-node leaves only and intentionally omit objective, milestone, faction, and nation gates.
- `altPrereq0` is represented as an OR alternative for the first `prereqs` entry.

Node count: `867` total, `149` global techs, `718` projects.
Graph edge count: `1720`.

## Global Techs

| Name | dataName | Kind | Category | Cost | Requirements |
| --- | --- | --- | --- | ---: | --- |
| Electrothermal Propulsion | ElectrothermalPropulsion | tech | Energy | 500 | DeepSpacePropulsionConcepts |
| Advanced Electromagnetism | AdvancedMagnetics | tech | Energy | 1000 |  |
| High-Energy Lasers | HighEnergyLasers | tech | Energy | 1000 |  |
| Mass Drivers | MassDrivers | tech | Energy | 1000 | AdvancedMagnetics |
| Vacuum Electrostatic Principles | VacuumElectrostaticPrinciples | tech | Energy | 1000 | AdvancedMagnetics |
| Electromagnetic Propulsion | ElectromagneticPropulsion | tech | Energy | 1500 | DeepSpacePropulsionConcepts |
| Magnetic Force Manipulation | MagneticForceManipulation | tech | Energy | 2500 | AdvancedMagnetics |
| Electrostatic Propulsion | ElectrostaticPropulsion | tech | Energy | 3000 | DeepSpacePropulsionConcepts + VacuumElectrostaticPrinciples |
| Particle Beams | ParticleCannon | tech | Energy | 5000 | VacuumElectrostaticPrinciples + HighEnergyLasers |
| Solid Core Fission Systems | SolidCoreFissionSystems | tech | Energy | 5000 | NuclearFissioninSpace |
| Antimatter Containment | AntimatterContainment | tech | Energy | 10000 | AdvancedHydrogenContainment + AdvancedAtomicManipulation |
| Molten Core Fission Systems | MoltenCoreFissionSystems | tech | Energy | 10000 | SolidCoreFissionSystems + AdvancedCarbonManipulation |
| Electrostatic Plasma Confinement | ElectrostaticPlasmaConfinement | tech | Energy | 15000 | NuclearFusioninSpace + VacuumElectrostaticPrinciples |
| Gas Core Fission Systems | GasCoreFissionSystems | tech | Energy | 20000 | MoltenCoreFissionSystems + AdvancedHeatManagementConcepts |
| Advanced Fission Systems | AdvancedFissionSystems | tech | Energy | 25000 | GasCoreFissionSystems + Superalloys + Neutronics |
| Arc Lasers | ArcLasers | tech | Energy | 25000 | InfraredCombatLasers + Supercapacitors |
| Tokamaks | Tokamaks | tech | Energy | 25000 | MagneticPlasmaConfinementTechniques + NuclearFusioninSpace + AppliedArtificialIntelligence |
| Magnetic Plasma Confinement | MagneticPlasmaConfinementTechniques | tech | Energy | 35000 | HighTemperatureSuperconductors + SuperconductingMagnets |
| Clean Energy | CleanEnergy | tech | Energy | 50000 | DeuteriumHelium3Fusion + ArrivalInternationalDevelopment |
| Deuterium-Tritium Fusion | DeuteriumTritiumFusion | tech | Energy | 50000 | NuclearFusioninSpace + Neutronics |
| Magnetic Nozzles | MagneticNozzles | tech | Energy | 50000 | MagneticPlasmaConfinementTechniques + DeepSpacePropulsionConcepts |
| Z-Pinch Techniques | ZPinchTechniques | tech | Energy | 50000 | MagneticPlasmaConfinementTechniques + NuclearFusioninSpace + Supercapacitors |
| Inertial Confinement Fusion | InertialPlasmaConfinementTechniques | tech | Energy | 65000 | ArcLasers + NuclearFusioninSpace + AdvancedAtomicManipulation |
| Phased-Array Lasers | PhasedArrayLasers | tech | Energy | 70000 | ArcLasers + Ultracapacitors |
| Aneutronic Fusion | AneutronicFusion | tech | Energy | 75000 | DeuteriumHelium3Fusion + AdvancedHydrogenContainment |
| Deuterium-Deuterium Fusion | DeuteriumDeuteriumFusion | tech | Energy | 75000 | DeuteriumTritiumFusion + Superalloys |
| Deuterium-Helium-3 Fusion | DeuteriumHelium3Fusion | tech | Energy | 75000 | DeuteriumDeuteriumFusion + HighTemperatureSuperconductors + CarbonNanotubes |
| Future Tech: Energy | FutureTechEnergy | tech | Energy | 100000 |  |
| Proton-Proton Fusion | ProtonProtonFusion | tech | Energy | 100000 | AneutronicFusion + Ultracapacitors |
| Terawatt Fusion Reactors | TerawattFusionReactors | tech | Energy | 100000 | DeuteriumHelium3Fusion + Ultracapacitors + Diamondoids |
| Antimatter Mass Production | AntimatterMassProduction | tech | Energy | 125000 | AntimatterContainment + OurSpaceFuture + ParticleCannon |
| Augmented Reality | AugmentedReality | tech | InformationScience | 1500 |  |
| Photonic Computing | PhotonicComputing | tech | InformationScience | 1500 |  |
| Advanced Neural Networks | AdvancedNeuralNetworks | tech | InformationScience | 5000 | PhotonicComputing |
| Cybernetics | Cybernetics | tech | InformationScience | 5000 | AugmentedReality + Biotechnology |
| Networked Propaganda | NetworkedPropaganda | tech | InformationScience | 10000 | ArrivalMassCommunications + Cybernetics |
| Self-Repairing Software | SelfRepairingSoftware | tech | InformationScience | 10000 | AdvancedNeuralNetworks |
| Quantum Computing | QuantumComputing | tech | InformationScience | 15000 | AdvancedAtomicManipulation + AdvancedNeuralNetworks + AdvancedHeatManagementConcepts |
| Quantum Encryption | QuantumEncryption | tech | InformationScience | 20000 | QuantumComputing + SelfRepairingSoftware |
| Applied Artificial Intelligence | AppliedArtificialIntelligence | tech | InformationScience | 25000 | AdvancedNeuralNetworks + QuantumComputing |
| White Collar Automation | WhiteCollarAutomation | tech | InformationScience | 40000 | ArrivalInternationalDevelopment + SelfRepairingSoftware + AppliedArtificialIntelligence |
| Administration Algorithms | AdministrationAlgorithms | tech | InformationScience | 50000 | WhiteCollarAutomation + QuantumEncryption |
| Future Tech: Information Science | FutureTechInformationScience | tech | InformationScience | 100000 |  |
| Outpost Habs | OutpostHabs | tech | LifeScience | 1000 | MissionToSpace |
| Biotechnology | Biotechnology | tech | LifeScience | 1500 |  |
| Space Agriculture | SpaceAgriculture | tech | LifeScience | 2500 | SpaceResearch + Biotechnology |
| Space Medicine | SpaceMedicine | tech | LifeScience | 2500 | SpaceResearch + Biotechnology |
| Arrival Psychology | ArrivalPsychology | tech | LifeScience | 5000 | WeAreNotAlone + SpaceMedicine |
| Orbitals | OrbitalRingHabs | tech | LifeScience | 5000 | AdAstra |
| Predictive Genetics | PredictiveGenetics | tech | LifeScience | 5000 | Biotechnology + PhotonicComputing |
| Settlement Habs | SettlementHabs | tech | LifeScience | 5000 | AdAstra |
| Extended Space Survival | ExtendedSpaceSurvival | tech | LifeScience | 10000 | InSituResourceUtilization + SpaceAgriculture + ArrivalPsychology |
| Transform Phages | TransformPhages | tech | LifeScience | 10000 | PredictiveGenetics + Cybernetics |
| Designer Life Forms | DesignerLifeforms | tech | LifeScience | 30000 | MolecularAssemblers + TransformPhages + ArrivalLaw |
| Colony Habs | ColonyHabs | tech | LifeScience | 35000 | OurSpaceFuture + ExtendedSpaceSurvival + SettlementHabs |
| Mind and Machine | MindandMachine | tech | LifeScience | 35000 | AppliedArtificialIntelligence + Cybernetics + ArrivalPsychology |
| Ring Habs | OrbitalTorusHabs | tech | LifeScience | 35000 | OurSpaceFuture + ExtendedSpaceSurvival + OrbitalRingHabs |
| Genies | Genies | tech | LifeScience | 50000 | TransformPhages + AppliedArtificialIntelligence |
| Climate Change Mitigation | ClimateChangeMitigation | tech | LifeScience | 100000 | DesignerLifeforms + CleanEnergy + AdministrationAlgorithms |
| Future Tech: Life Science | FutureTechLifeScience | tech | LifeScience | 100000 |  |
| Advanced Carbon Manipulation | AdvancedCarbonManipulation | tech | Materials | 1000 |  |
| Advanced Chemical Rocketry | AdvancedChemicalRocketry | tech | Materials | 1000 |  |
| Orbital Shipbuilding | OrbitalShipbuilding | tech | Materials | 1000 | MissionToSpace |
| Advanced Superconductors | AdvancedSuperconductors | tech | Materials | 3500 | AdvancedMagnetics |
| Carbon Nanotubes | CarbonNanotubes | tech | Materials | 3500 | AdvancedCarbonManipulation |
| Next-Generation Aerospace | NextGenerationAerospace | tech | Materials | 5000 | CarbonNanotubes + AdvancedChemicalRocketry |
| Superalloys | Superalloys | tech | Materials | 5000 | AdvancedAtomicManipulation |
| Advanced Atomic Manipulation | AdvancedAtomicManipulation | tech | Materials | 10000 | AdvancedCarbonManipulation + PhotonicComputing |
| Supercapacitors | Supercapacitors | tech | Materials | 10000 | CarbonNanotubes + AdvancedSuperconductors |
| Superconducting Magnets | SuperconductingMagnets | tech | Materials | 10000 | MagneticForceManipulation + AdvancedSuperconductors |
| Diamondoids | Diamondoids | tech | Materials | 15000 | CarbonNanotubes + MolecularAssemblers |
| Neutronics | Neutronics | tech | Materials | 15000 | AdvancedAtomicManipulation + AdvancedNeuralNetworks + ParticleCannon |
| Advanced Hydrogen Containment | AdvancedHydrogenContainment | tech | Materials | 20000 | SuperconductingMagnets + Superalloys |
| Improved Shipbuilding Techniques | ImprovedShipbuildingTechniques | tech | Materials | 20000 | IndustrializationofSpace + NextGenerationAerospace + Superalloys |
| Fission Pulse Drives | FissionPulseDrives | tech | Materials | 25000 | SolidCoreFissionSystems + CarbonNanotubes + ElectromagneticPropulsion |
| Molecular Assemblers | MolecularAssemblers | tech | Materials | 25000 | QuantumComputing |
| High-Temperature Superconductors | HighTemperatureSuperconductors | tech | Materials | 40000 | AdvancedSuperconductors + AdvancedAtomicManipulation + AdvancedHeatManagementConcepts |
| Ultracapacitors | Ultracapacitors | tech | Materials | 40000 | Supercapacitors + MolecularAssemblers |
| Heavy Pulsed Propulsion | HeavyPulsedPropulsion | tech | Materials | 50000 | AdvancedFissionSystems + FissionPulseDrives + ImprovedShipbuildingTechniques |
| Titanic Spacecraft | TitanicSpacecraft | tech | Materials | 60000 | FleetLogistics + Diamondoids |
| Future Tech: Materials | FutureTechMaterials | tech | Materials | 100000 |  |
| Principles of Space Warfare | PrinciplesofSpaceWarfare | tech | MilitaryScience | 1000 | OrbitalShipbuilding |
| Directed Energy Warfare Doctrine | DirectedEnergyWarfareDoctrine | tech | MilitaryScience | 2500 | PrinciplesofSpaceWarfare |
| Kinetics Warfare Doctrine | KineticsWarfareDoctrine | tech | MilitaryScience | 2500 | PrinciplesofSpaceWarfare |
| Missile Warfare Doctrine | MissileWarfareDoctrine | tech | MilitaryScience | 2500 | PrinciplesofSpaceWarfare |
| Terrestrial Military Science | TerrestrialMilitaryScience | tech | MilitaryScience | 3000 | WeAreNotAlone |
| Infrared Combat Lasers | InfraredCombatLasers | tech | MilitaryScience | 5000 | HighEnergyLasers + DirectedEnergyWarfareDoctrine |
| Militarization of Space | MilitarizationofSpace | tech | MilitaryScience | 5000 | PrinciplesofSpaceWarfare |
| Railguns | Railguns | tech | MilitaryScience | 5000 | KineticsWarfareDoctrine + MassDrivers |
| Exoatmospheric Fighters | OrbitalFighters | tech | MilitaryScience | 7500 | NextGenerationAerospace + PrinciplesofSpaceWarfare |
| Arrival Security | ArrivalSecurity | tech | MilitaryScience | 10000 | TerrestrialMilitaryScience + ArrivalLaw |
| Space Assault Doctrine | SpaceAssaultDoctrine | tech | MilitaryScience | 10000 | MilitarizationofSpace + TerrestrialMilitaryScience |
| Space Navies | SpaceNavies | tech | MilitaryScience | 10000 | MilitarizationofSpace + AdAstra + NuclearFissioninSpace |
| Plasma Weapons | PlasmaWeapons | tech | MilitaryScience | 20000 | Railguns + SuperconductingMagnets |
| Networked Global Defense | NetworkedGlobalDefense | tech | MilitaryScience | 25000 | ArrivalSecurity + QuantumEncryption + TransInterfaceWarfare |
| Trans-Interface Warfare | TransInterfaceWarfare | tech | MilitaryScience | 25000 | TerrestrialMilitaryScience + VisibleCombatLasers + OrbitalFighters |
| Visible Combat Lasers | VisibleCombatLasers | tech | MilitaryScience | 25000 | InfraredCombatLasers + AdvancedHeatManagementConcepts |
| Advanced Missile Warfare Doctrine | AdvancedMissileWarfareDoctrine | tech | MilitaryScience | 30000 | MissileWarfareDoctrine + AdvancedChemicalRocketry + AdvancedNeuralNetworks |
| Coilguns | Coilguns | tech | MilitaryScience | 30000 | Railguns + Supercapacitors + SuperconductingMagnets |
| Targeted Biological Warfare | TargetedBiologicalWarfare | tech | MilitaryScience | 30000 | NetworkedGlobalDefense + DesignerLifeforms |
| Antimatter Weaponry | AntimatterWeaponry | tech | MilitaryScience | 35000 | AntimatterContainment + MilitarizationofSpace |
| Ultraviolet Combat Lasers | UltravioletCombatLasers | tech | MilitaryScience | 60000 | VisibleCombatLasers + MilitarizationofSpace |
| Future Tech: Military Science | FutureTechMilitaryScience | tech | MilitaryScience | 100000 |  |
| We Are Not Alone | WeAreNotAlone | tech | SocialScience | 500 |  |
| Space Tourism | SpaceTourism | tech | SocialScience | 1000 | MissionToSpace |
| Arrival Domestic Politics | ArrivalDomesticPolitics | tech | SocialScience | 2000 | WeAreNotAlone |
| Arrival Economics | ArrivalEconomics | tech | SocialScience | 2500 | WeAreNotAlone |
| Arrival Sociology | ArrivalSociology | tech | SocialScience | 2500 | WeAreNotAlone |
| Space Research | SpaceResearch | tech | SocialScience | 2500 | MissionToSpace + AugmentedReality |
| Ad Astra | AdAstra | tech | SocialScience | 5000 | MissiontotheMoon + OrbitalShipbuilding |
| Arrival International Development | ArrivalInternationalDevelopment | tech | SocialScience | 5000 | ArrivalEconomics + ArrivalInternationalRelations |
| Arrival International Relations | ArrivalInternationalRelations | tech | SocialScience | 5000 | WeAreNotAlone |
| Arrival Law | ArrivalLaw | tech | SocialScience | 5000 | ArrivalDomesticPolitics + MissionToSpace |
| Arrival Mass Communications | ArrivalMassCommunications | tech | SocialScience | 5000 | ArrivalSociology + ArrivalPsychology |
| Directed Space Research | DirectedSpaceResearch | tech | SocialScience | 5000 | SpaceResearch + AdAstra + QuantumComputing |
| Independence Movements | IndependenceMovements | tech | SocialScience | 5000 | ArrivalDomesticPolitics + ArrivalSociology |
| Fall of Empires | FallofEmpires | tech | SocialScience | 10000 | IndependenceMovements + ArrivalInternationalRelations |
| Unity Movements | UnityMovements | tech | SocialScience | 10000 | ArrivalInternationalRelations |
| Industrialization of Space | IndustrializationofSpace | tech | SocialScience | 15000 | OrbitalShipbuilding + SpaceMiningandRefining |
| Arrival Culture | ArrivalCulture | tech | SocialScience | 20000 | ArrivalMassCommunications + ArrivalDomesticPolitics |
| Space Commerce | SpaceCommerce | tech | SocialScience | 20000 | IndustrializationofSpace + ArrivalEconomics + ArrivalLaw |
| Great Nations | GreatNations | tech | SocialScience | 25000 | UnityMovements + ArrivalDomesticPolitics |
| Our Space Future | OurSpaceFuture | tech | SocialScience | 30000 | SpaceNavies + DirectedSpaceResearch + SpaceCommerce |
| Arrival Governance | ArrivalGovernance | tech | SocialScience | 35000 | ArrivalCulture + ArrivalSecurity + OurSpaceFuture |
| Integrated Earth-Space Economy | IntegratedEarthSpaceEconomy | tech | SocialScience | 40000 | ArrivalInternationalDevelopment + OurSpaceFuture + NextGenerationAerospace |
| Fleet Logistics | FleetLogistics | tech | SocialScience | 45000 | SpaceNavies + IntegratedEarthSpaceEconomy + ImprovedShipbuildingTechniques |
| Interplanetary Polities | InterplanetaryPolities | tech | SocialScience | 50000 | ColonyHabs + OrbitalTorusHabs + ArrivalGovernance |
| Future Tech: Social Science | FutureTechSocialScience | tech | SocialScience | 100000 |  |
| Accelerando | Accelerando | tech | SocialScience | 150000 | MindandMachine + IntegratedEarthSpaceEconomy + ArrivalGovernance |
| Mission To Space | MissionToSpace | tech | SpaceScience | 250 |  |
| Skywatch | Skywatch | tech | SpaceScience | 250 |  |
| Deep Space Propulsion Concepts | DeepSpacePropulsionConcepts | tech | SpaceScience | 1000 | MissionToSpace |
| Deep System Skywatch | DeepSystemSkywatch | tech | SpaceScience | 1000 | Skywatch |
| Mission to the Moon | MissiontotheMoon | tech | SpaceScience | 1000 | OutpostHabs |
| Advanced Heat Management Concepts | AdvancedHeatManagementConcepts | tech | SpaceScience | 2500 | DeepSpacePropulsionConcepts |
| Mission to Mars | MissiontoMars | tech | SpaceScience | 2500 | OutpostHabs + Skywatch |
| Mission to Venus | MissiontoVenus | tech | SpaceScience | 2500 | MissiontotheMoon + AdvancedHeatManagementConcepts |
| Nuclear Fission In Space | NuclearFissioninSpace | tech | SpaceScience | 2500 | DeepSpacePropulsionConcepts |
| Space Mining and Refining | SpaceMiningandRefining | tech | SpaceScience | 2500 | MassDrivers + OutpostHabs |
| Mission to the Asteroids | MissiontotheAsteroids | tech | SpaceScience | 3500 | MissiontoMars + SpaceMiningandRefining + DeepSpacePropulsionConcepts |
| High-Energy Electromagnetic Propulsion | HighEnergyElectromagneticPropulsion | tech | SpaceScience | 5000 | ElectromagneticPropulsion + SuperconductingMagnets |
| In Situ Resource Utilization | InSituResourceUtilization | tech | SpaceScience | 5000 | SpaceMiningandRefining |
| Mission to Jupiter | MissiontoJupiter | tech | SpaceScience | 10000 | MissiontotheAsteroids |
| Mission to Mercury | MissiontotheInnerPlanets | tech | SpaceScience | 15000 | MissiontoVenus + MissiontoMars |
| Mission to Saturn | MissiontoSaturn | tech | SpaceScience | 25000 | MissiontoJupiter + NuclearFissioninSpace |
| Nuclear Fusion Methodologies | NuclearFusioninSpace | tech | SpaceScience | 50000 | AdvancedSuperconductors + NuclearFissioninSpace + AdvancedHeatManagementConcepts |
| Mission to the Outer Planets | MissiontotheOuterPlanets | tech | SpaceScience | 75000 | MissiontoSaturn + DeepSystemSkywatch + ExtendedSpaceSurvival |
| Antimatter Propulsion | AntimatterPropulsion | tech | SpaceScience | 100000 | AntimatterMassProduction + MagneticNozzles |
| Future Tech: Space Science | FutureTechSpaceScience | tech | SpaceScience | 100000 |  |

## Faction Projects

| Name | dataName | Kind | Category | Cost | Requirements |
| --- | --- | --- | --- | ---: | --- |
| Solar Collector | Project_SolarCollector | project | Energy | 100 | (Project_PlatformCore OR Project_OutpostCore) |
| Solid Core Fission Reactor I | Project_SolidCoreFissionReactorI | project | Energy | 250 | SolidCoreFissionSystems |
| Energy Lab | Project_EnergyLab | project | Energy | 300 | (Project_PlatformCore OR Project_OutpostCore) |
| Fission Pile | Project_FissionPile | project | Energy | 500 | (Project_PlatformCore OR Project_OutpostCore) + NuclearFissioninSpace |
| Molten Core Fission Reactor I | Project_MoltenCoreFissionReactorI | project | Energy | 500 | MoltenCoreFissionSystems |
| Solid Core Fission Reactor II | Project_SolidCoreFissionReactorII | project | Energy | 500 | Project_SolidCoreFissionReactorI |
| High Thrust Probes | Project_HighThrustProbes | project | Energy | 600 | AdvancedChemicalRocketry |
| Solid Core Fission Reactor III | Project_SolidCoreFissionReactorIII | project | Energy | 600 | Project_SolidCoreFissionReactorII |
| Solid Core Fission Reactor IV | Project_SolidCoreFissionReactorIV | project | Energy | 700 | Project_SolidCoreFissionReactorIII |
| Compact Solid Core Fission Reactor I | Project_SolidCoreFissionReactorVI | project | Energy | 700 | Project_SolidCoreFissionReactorII |
| Solar Array | Project_SolarArray | project | Energy | 750 | (Project_OrbitalCore OR Project_SettlementCore) + Project_SolarCollector |
| Space Tugs | Project_SpaceTugs | project | Energy | 750 | AdvancedChemicalRocketry |
| Molten Salt Fission Reactor I | Project_MoltenSaltFissionReactorI | project | Energy | 800 | Project_MoltenCoreFissionReactorI + Project_SolidCoreFissionReactorIII |
| Solid Core Fission Reactor V | Project_SolidCoreFissionReactorV | project | Energy | 800 | Project_SolidCoreFissionReactorIV |
| Compact Solid Core Fission Reactor II | Project_SolidCoreFissionReactorVII | project | Energy | 800 | Project_SolidCoreFissionReactorVI |
| Vapor Core Fission Reactor I | Project_VaporCoreFissionReactorI | project | Energy | 800 | GasCoreFissionSystems + Project_MoltenCoreFissionReactorII |
| Compact Solid Core Fission Reactor III | Project_SolidCoreFissionReactorVIII | project | Energy | 900 | Project_SolidCoreFissionReactorVII |
| Aerospike Engines | Project_Aerospikes | project | Energy | 1000 | NextGenerationAerospace |
| Commercial Rocket Companies | Project_CommercialRocketCompanies | project | Energy | 1000 | Project_ReusableRockets |
| Fission Reactor Array | Project_FissionReactorArray | project | Energy | 1000 | (Project_OrbitalCore OR Project_SettlementCore) + Project_FissionPile |
| Gas Core Fission Reactor I | Project_GasCoreFissionReactorI | project | Energy | 1000 | GasCoreFissionSystems |
| Heavy Fission Pile | Project_HeavyFissionPile | project | Energy | 1000 | MoltenCoreFissionSystems + Project_FissionPile |
| Molten Core Fission Reactor II | Project_MoltenCoreFissionReactorII | project | Energy | 1000 | Project_MoltenCoreFissionReactorI + AdvancedCarbonManipulation |
| Reusable Rockets | Project_ReusableRockets | project | Energy | 1000 | AdvancedChemicalRocketry |
| Scramjets | Project_Scramjets | project | Energy | 1000 | NextGenerationAerospace |
| Solar Steamers | Project_SolarSteamers | project | Energy | 1000 | ElectrothermalPropulsion |
| Compact Solid Core Fission Reactor IV | Project_SolidCoreFissionReactorIX | project | Energy | 1000 | Project_SolidCoreFissionReactorVIII |
| Compact Solid Core Fission Reactor V | Project_SolidCoreFissionReactorX | project | Energy | 1200 | Project_SolidCoreFissionReactorIX |
| Vapor Core Fission Reactor II | Project_VaporCoreFissionReactorII | project | Energy | 1200 | Project_VaporCoreFissionReactorI + AdvancedCarbonManipulation |
| Gas Core Fission Reactor II | Project_GasCoreFissionReactorII | project | Energy | 1250 | Project_GasCoreFissionReactorI |
| Energy Research Center | Project_EnergyResearchCenter | project | Energy | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_EnergyLab + DirectedSpaceResearch |
| Gas Core Fission Reactor III | Project_GasCoreFissionReactorIII | project | Energy | 1500 | Project_GasCoreFissionReactorII + CarbonNanotubes |
| Molten Salt Fission Reactor II | Project_MoltenSaltFissionReactorII | project | Energy | 1500 | Project_MoltenSaltFissionReactorI + Project_MoltenCoreFissionReactorIII |
| Muon Spiker | Project_MuonSpiker | project | Energy | 1500 | OrbitalShipbuilding + DeuteriumTritiumFusion + AdvancedAtomicManipulation + ParticleCannon |
| Vapor Core Fission Reactor III | Project_VaporCoreFissionReactorIII | project | Energy | 1500 | Superalloys + CarbonNanotubes + Project_VaporCoreFissionReactorII |
| Directed Energy Launch Systems | Project_DirectedEnergyLaunchSystems | project | Energy | 2000 | NextGenerationAerospace + InfraredCombatLasers |
| Molten Core Fission Reactor III | Project_MoltenCoreFissionReactorIII | project | Energy | 2000 | Project_MoltenCoreFissionReactorII + CarbonNanotubes |
| Neutronium Spiker | Project_NeutroniumSpiker | project | Energy | 2000 | OrbitalShipbuilding + Project_UltracoldNeutronContainment |
| Nuclear Freighters | Project_NuclearFreighters | project | Energy | 2000 | SolidCoreFissionSystems |
| Electrostatic Confinement Fusion Reactor I | Project_ElectrostaticConfinementFusionReactorI | project | Energy | 2500 | DeuteriumTritiumFusion + ElectrostaticPlasmaConfinement |
| Fusion Pile | Project_FusionPile | project | Energy | 2500 | (Project_PlatformCore OR Project_OutpostCore) + DeuteriumTritiumFusion |
| Laser Engine | Project_LaserEngine | project | Energy | 2500 | Project_Warships + HighEnergyLasers + Supercapacitors |
| Mirror Cell Fusion Reactor I | Project_MirrorCellFusionReactorI | project | Energy | 2500 | DeuteriumTritiumFusion + MagneticPlasmaConfinementTechniques |
| Antimatter Spiker | Project_AntimatterSpiker | project | Energy | 3000 | OrbitalShipbuilding + AntimatterContainment |
| Fission Reactor Farm | Project_FissionReactorFarm | project | Energy | 3000 | (Project_RingCore OR Project_ColonyCore) + Project_FissionReactorArray |
| Heavy Fission Reactor Array | Project_HeavyFissionReactorArray | project | Energy | 3000 | GasCoreFissionSystems + Project_HeavyFissionPile + Project_FissionReactorArray |
| Solar Farm | Project_SolarFarm | project | Energy | 3000 | (Project_RingCore OR Project_ColonyCore) + Project_SolarArray |
| Cyclotron | Project_Cyclotron | project | Energy | 5000 | SuperconductingMagnets + Project_ElectronLance |
| Electrostatic Confinement Fusion Reactor II | Project_ElectrostaticConfinementFusionReactorII | project | Energy | 5000 | DeuteriumDeuteriumFusion + Project_ElectrostaticConfinementFusionReactorI |
| Fusion Reactor Array | Project_FusionReactorArray | project | Energy | 5000 | (Project_OrbitalCore OR Project_SettlementCore) + Project_FusionPile |
| Fusion Tokamak I | Project_FusionTokamakI | project | Energy | 5000 | DeuteriumTritiumFusion + Tokamaks |
| Heavy Fusion Pile | Project_HeavyFusionPile | project | Energy | 5000 | AneutronicFusion + Project_FusionPile |
| Mirror Cell Fusion Reactor II | Project_MirrorCellFusionReactorII | project | Energy | 5000 | DeuteriumDeuteriumFusion + Project_MirrorCellFusionReactorI |
| Heavy Fission Reactor Farm | Project_HeavyFissionReactorFarm | project | Energy | 6500 | AdvancedFissionSystems + Project_FissionReactorFarm + Project_HeavyFissionReactorArray |
| Advanced Laser Engine | Project_AdvancedLaserEngine | project | Energy | 10000 | Ultracapacitors + Project_LaserEngine |
| Energy Institute | Project_EnergyInstitute | project | Energy | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_EnergyResearchCenter + AdministrationAlgorithms |
| Fusion Freighters | Project_FusionFreighters | project | Energy | 10000 | (Project_TritonReflexDrive OR Project_TritonTorusDrive) + Project_NuclearFreighters |
| Fusion Reactor Farm | Project_FusionReactorFarm | project | Energy | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_FusionReactorArray |
| Fusion Tokamak II | Project_FusionTokamakII | project | Energy | 10000 | DeuteriumDeuteriumFusion + Project_FusionTokamakI |
| Heavy Fusion Reactor Array | Project_HeavyFusionReactorArray | project | Energy | 10000 | Project_HeavyFusionPile + Project_FusionReactorArray |
| Hybrid Confinement Fusion Reactor I | Project_HybridConfinementFusionReactorI | project | Energy | 10000 | DeuteriumTritiumFusion + MagneticPlasmaConfinementTechniques + ElectrostaticPlasmaConfinement |
| Inertial Confinement Fusion Reactor I | Project_InertialConfinementFusionReactorI | project | Energy | 10000 | DeuteriumTritiumFusion + InertialPlasmaConfinementTechniques |
| Mirror Cell Fusion Reactor III | Project_MirrorCellFusionReactorIII | project | Energy | 10000 | DeuteriumHelium3Fusion + Project_MirrorCellFusionReactorII |
| Terawatt Gas Core Fission Reactor I | Project_GasCoreFissionReactorIV | project | Energy | 10000 | AdvancedFissionSystems + Project_GasCoreFissionReactorII |
| Terawatt Gas Core Fission Reactor II | Project_GasCoreFissionReactorV | project | Energy | 10000 | Project_GasCoreFissionReactorIV |
| Terawatt Gas Core Fission Reactor III | Project_GasCoreFissionReactorVI | project | Energy | 10000 | Project_GasCoreFissionReactorV |
| Z-Pinch Fusion Reactor I | Project_ZPinchFusionReactorI | project | Energy | 10000 | DeuteriumTritiumFusion + ZPinchTechniques |
| Electrostatic Confinement Fusion Reactor III | Project_ElectrostaticConfinementFusionReactorIII | project | Energy | 15000 | ProtonProtonFusion + Project_ElectrostaticConfinementFusionReactorII + Project_Exotics |
| Fusion Tokamak III | Project_FusionTokamakIII | project | Energy | 15000 | DeuteriumHelium3Fusion + Project_FusionTokamakII |
| Inertial Confinement Fusion Reactor II | Project_InertialConfinementFusionReactorII | project | Energy | 15000 | DeuteriumDeuteriumFusion + Project_InertialConfinementFusionReactorI |
| Particle Collider | Project_ParticleCollider | project | Energy | 15000 | AntimatterContainment + ParticleCannon + Project_PlatformCore |
| Subsurface Radiation Analysis | Project_SubsurfaceRadiatonAnalysis | project | Energy | 15000 | InSituResourceUtilization + AppliedArtificialIntelligence |
| Fusion Tokamak IV | Project_FusionTokamakIV | project | Energy | 20000 | Project_FusionTokamakIII |
| Hybrid Confinement Fusion Reactor II | Project_HybridConfinementFusionReactorII | project | Energy | 20000 | DeuteriumDeuteriumFusion + Project_HybridConfinementFusionReactorI |
| Inertial Confinement Fusion Reactor III | Project_InertialConfinementFusionReactorIII | project | Energy | 20000 | DeuteriumHelium3Fusion + Project_InertialConfinementFusionReactorII |
| Z-Pinch Fusion Reactor II | Project_ZPinchFusionReactorII | project | Energy | 20000 | DeuteriumDeuteriumFusion + Project_ZPinchFusionReactorI |
| Antimatter Plasma Core Reactor I | Project_AntimatterPlasmaCoreReactorI | project | Energy | 25000 | AntimatterMassProduction + GasCoreFissionSystems |
| Heavy Fusion Reactor Farm | Project_HeavyFusionReactorFarm | project | Energy | 25000 | Project_FusionReactorFarm + Project_HeavyFusionReactorArray + TerawattFusionReactors |
| Inertial Confinement Fusion Reactor IV | Project_InertialConfinementFusionReactorIV | project | Energy | 25000 | AneutronicFusion + Project_InertialConfinementFusionReactorIII |
| Atomsmasher | Project_Atomsmasher | project | Energy | 30000 | Project_OrbitalCore + Project_ParticleCollider + AntimatterMassProduction |
| Fusion Tokamak V | Project_FusionTokamakV | project | Energy | 35000 | ProtonProtonFusion + Project_FusionTokamakIV + Project_Exotics |
| Inertial Confinement Fusion Reactor V | Project_InertialConfinementFusionReactorV | project | Energy | 35000 | TerawattFusionReactors + Project_InertialConfinementFusionReactorIV + Project_Exotics |
| Civilian Fusion Reactors | Project_CivilianFusionReactors | project | Energy | 50000 | DeuteriumTritiumFusion + ArrivalInternationalDevelopment |
| Hybrid Confinement Fusion Reactor III | Project_HybridConfinementFusionReactorIII | project | Energy | 50000 | InertialPlasmaConfinementTechniques + DeuteriumHelium3Fusion + Project_HybridConfinementFusionReactorII |
| Interstellar Launch Facility | Project_InterstellarLaunchingLaser | project | Energy | 50000 | (TerawattFusionReactors OR AntimatterPropulsion) + Project_RingCore + PhasedArrayLasers + Project_ExoticHybridSystems + TitanicSpacecraft + faction:EscapeCouncil |
| Z-Pinch Fusion Reactor III | Project_ZPinchFusionReactorIII | project | Energy | 50000 | DeuteriumHelium3Fusion + Project_ZPinchFusionReactorII |
| Z-Pinch Fusion Reactor IV | Project_ZPinchFusionReactorIV | project | Energy | 50000 | AneutronicFusion + Project_ZPinchFusionReactorIII |
| Antimatter Plasma Core Reactor II | Project_AntimatterPlasmaCoreReactorII | project | Energy | 75000 | Project_AntimatterPlasmaCoreReactorI + MagneticPlasmaConfinementTechniques |
| Hybrid Confinement Fusion Reactor IV | Project_HybridConfinementFusionReactorIV | project | Energy | 75000 | AneutronicFusion + TerawattFusionReactors + PlasmaWeapons + Project_HybridConfinementFusionReactorIII |
| Flow-Stabilized Z-Pinch Fusion Reactor | Project_FlowStabilizedZPinchFusionReactor | project | Energy | 80000 | TerawattFusionReactors + Project_ZPinchFusionReactorIV + Project_ExoticHybridSystems |
| Inertial Confinement Fusion Reactor VI | Project_InertialConfinementFusionReactorVI | project | Energy | 100000 | ProtonProtonFusion + Project_InertialConfinementFusionReactorV + Project_ExoticHybridSystems |
| Supercollider | Project_Supercollider | project | Energy | 100000 | Project_RingCore + Project_Atomsmasher + Accelerando |
| Antimatter Plasma Core Reactor III | Project_AntimatterPlasmaCoreReactorIII | project | Energy | 150000 | Project_AntimatterPlasmaCoreReactorII + Diamondoids + Project_Exotics |
| Antimatter Beam Core Reactor | Project_AntimatterBeamCoreReactor | project | Energy | 500000 | Project_AntimatterPlasmaCoreReactorIII + Project_ExoticHybridSystems |
| Inertial Confinement Fusion Reactor VII | Project_InertialConfinementFusionReactorVII | project | Energy | 500000 | Accelerando + Project_InertialConfinementFusionReactorVI |
| Automated Solar Collector | Project_AutomatedSolarCollector | project | InformationScience | 200 | (Project_AutomatedPlatformCore OR Project_AutomatedOutpostCore) + Project_SolarCollector |
| Automated Supply Depot | Project_AutomatedSupplyDepot | project | InformationScience | 200 | (Project_AutomatedPlatformCore OR Project_AutomatedOutpostCore) + Project_SupplyDepot |
| Information Science Lab | Project_InformationScienceLab | project | InformationScience | 300 | (Project_PlatformCore OR Project_OutpostCore) |
| Electronic Countermeasures | Project_ECM1 | project | InformationScience | 500 | Project_Warships |
| Listening Post | Project_ListeningPost | project | InformationScience | 500 | Project_PlatformCore + ArrivalSecurity |
| Talent Development | Project_ResistanceTalentDevelopment | project | InformationScience | 500 | WeAreNotAlone + Project_TheirSignatures + faction:ResistCouncil |
| Targeting Computer | Project_TargetingComputer1 | project | InformationScience | 500 | PhotonicComputing + Project_Warships |
| Automated Fission Pile | Project_AutomatedFissionPile | project | InformationScience | 1000 | (Project_AutomatedPlatformCore OR Project_AutomatedOutpostCore) + Project_FissionPile + WhiteCollarAutomation |
| Automated Mining Complex | Project_AutomatedMiningComplex | project | InformationScience | 1000 | Project_AutomatedOutpostCore + Project_OutpostMiningComplex |
| Automated Outpost Core | Project_AutomatedOutpostCore | project | InformationScience | 1000 | Project_OutpostCore + AppliedArtificialIntelligence |
| Automated Platform Core | Project_AutomatedPlatformCore | project | InformationScience | 1000 | Project_PlatformCore + AppliedArtificialIntelligence |
| Global Listening Network | Project_GlobalListeningNetwork | project | InformationScience | 1000 | PhotonicComputing + Project_TheirOperations |
| Space Traffic Control | Project_SpaceTrafficControl | project | InformationScience | 1200 | WhiteCollarAutomation + SpaceCommerce |
| Cybernetic Implants | Project_CyberneticImplants | project | InformationScience | 1500 | Cybernetics |
| Information Science Research Center | Project_InformationScienceResearchCenter | project | InformationScience | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_InformationScienceLab + DirectedSpaceResearch |
| Resource Market Administration | Project_ResourceMarketAdministration | project | InformationScience | 2000 | WhiteCollarAutomation + SpaceMiningandRefining |
| Contraband Scanners | Project_ContrabandScanners | project | InformationScience | 2500 | AdvancedNeuralNetworks |
| Operational Security | Project_OperationalSecurity | project | InformationScience | 2500 | MilitarizationofSpace + Project_ResistVictory + faction:ResistCouncil |
| Directed Focus | Project_DirectedFocus | project | InformationScience | 3000 | WhiteCollarAutomation + AdAstra |
| Improved ECM Module | Project_ECM2 | project | InformationScience | 3000 | MissileWarfareDoctrine + SelfRepairingSoftware + Project_ECM1 |
| Reconnaissance Array | Project_ReconnaissanceArray | project | InformationScience | 3000 | Project_OrbitalCore + Project_ListeningPost + QuantumEncryption |
| Targeting Computer II | Project_TargetingComputer2 | project | InformationScience | 3000 | QuantumComputing + Project_TargetingComputer1 |
| Advanced Climate Modeling | Project_AdvancedClimateModeling | project | InformationScience | 5000 | QuantumComputing + Project_TheirComputers |
| Augmented Combat Training | Project_AugmentedCombatTraining | project | InformationScience | 5000 | AugmentedReality |
| Augmented Learning | Project_AugmentedLearning | project | InformationScience | 5000 | AugmentedReality |
| Damage Control Drones | Project_DamageControlDrones | project | InformationScience | 5000 | AugmentedReality + Project_Warships + Project_TheirRobotics |
| Neural Engineering | Project_NeuralEngineering | project | InformationScience | 5000 | AppliedArtificialIntelligence + Project_CyberneticImplants |
| Self-Driving Vehicles | Project_SelfDrivingVehicles | project | InformationScience | 8000 | AdvancedNeuralNetworks |
| Algorithmic Economic Management | Project_AlgorithmicEconomicManagement | project | InformationScience | 10000 | AdministrationAlgorithms + ArrivalEconomics |
| Civilian Photonic Computing | Project_CivilianPhotonicComputing | project | InformationScience | 10000 | PhotonicComputing + ArrivalEconomics |
| Civilian Quantum Computing | Project_CivilianQuantumComputing | project | InformationScience | 10000 | QuantumComputing + SpaceCommerce |
| Advanced ECM Module | Project_ECM3 | project | InformationScience | 10000 | AdvancedMissileWarfareDoctrine + QuantumEncryption + Project_ECM2 |
| Improved Terminal Guidance Systems | Project_ImprovedTerminalGuidanceSystems | project | InformationScience | 10000 | AdvancedMissileWarfareDoctrine + SelfRepairingSoftware + milestone:AccessAlienShip |
| Information Science Institute | Project_InformationScienceInstitute | project | InformationScience | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_InformationScienceResearchCenter + QuantumComputing |
| Networked Psyops | Project_NetworkedPsyops | project | InformationScience | 10000 | NetworkedPropaganda + WhiteCollarAutomation + Project_Psyops |
| Precision Focusing Software | Project_PrecisionFocusingSoftware | project | InformationScience | 10000 | InfraredCombatLasers + AppliedArtificialIntelligence + milestone:AccessAlienShip |
| Social Media Campaigns | Project_SocialMediaCampaigns | project | InformationScience | 10000 | NetworkedPropaganda |
| Targeted Community Support | Project_TargetedCommunitySupport | project | InformationScience | 10000 | WhiteCollarAutomation |
| Targeting Computer III | Project_TargetingComputer3 | project | InformationScience | 10000 | AppliedArtificialIntelligence + Project_TargetingComputer2 |
| Training Simulation Implants | Project_TrainingSimulationImplants | project | InformationScience | 10000 | MindandMachine + Project_CovertOperations |
| Transnational Coordination | Project_TransnationalCoordination | project | InformationScience | 10000 | AdvancedNeuralNetworks |
| Vital Point Shell Targeting | Project_VitalPointShellTargeting | project | InformationScience | 10000 | Railguns + AppliedArtificialIntelligence + milestone:AccessAlienShip |
| Argus Complex | Project_ArgusComplex | project | InformationScience | 15000 | Project_RingCore + Project_ReconnaissanceArray + MindandMachine |
| Cyborging | Project_Cyborging | project | InformationScience | 15000 | MindandMachine + Project_NeuralEngineering |
| Network Intrusion Protocols | Project_NetworkIntrusionProtocols | project | InformationScience | 15000 | AppliedArtificialIntelligence + NetworkedGlobalDefense |
| Predictive Logistics Systems | Project_PredictiveLogisticsSystems | project | InformationScience | 20000 | TerrestrialMilitaryScience + WhiteCollarAutomation |
| Algorithmic Extraction Management | Project_AlgorithmicExtractionManagement | project | InformationScience | 50000 | AdministrationAlgorithms + SpaceCommerce |
| Transnational Management | Project_TransnationalManagement | project | InformationScience | 50000 | AdministrationAlgorithms + Project_TransnationalCoordination |
| Hab Living Quarters | Project_Quarters | project | LifeScience | 200 | (Project_PlatformCore OR Project_OutpostCore) + MissionToSpace |
| Climate Lab | Project_ClimateLab | project | LifeScience | 300 | Project_PlatformCore |
| Hydroponics Bay | Project_HydroponicsBay | project | LifeScience | 300 | (Project_PlatformCore OR Project_OutpostCore) + SpaceAgriculture |
| Life Science Lab | Project_LifeScienceLab | project | LifeScience | 300 | (Project_PlatformCore OR Project_OutpostCore) |
| Farm | Project_Farm | project | LifeScience | 1000 | (Project_OrbitalCore OR Project_SettlementCore) + Project_HydroponicsBay |
| High Thrust Ergonomics | Project_High-ThrustErgonomics | project | LifeScience | 1000 | Biotechnology + Project_Warships |
| Orbital Core | Project_OrbitalCore | project | LifeScience | 1000 | Project_PlatformCore + OrbitalRingHabs |
| Space Medical Center | Project_OrbitalHospital | project | LifeScience | 1000 | Project_OrbitalCore + SpaceMedicine |
| Residential Module | Project_ResidentialModule | project | LifeScience | 1000 | (Project_OrbitalCore OR Project_SettlementCore) + Project_Quarters + ExtendedSpaceSurvival + SpaceCommerce |
| Settlement Core | Project_SettlementCore | project | LifeScience | 1000 | Project_OutpostCore + SettlementHabs |
| Climate Research Center | Project_ClimateResearchCenter | project | LifeScience | 1500 | Project_OrbitalCore + Project_ClimateLab + ArrivalInternationalDevelopment |
| Life Science Research Center | Project_LifeScienceResearchCenter | project | LifeScience | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_LifeScienceLab + DirectedSpaceResearch |
| Astronaut Fitness Regimen | Project_AstronautFitnessRegimen | project | LifeScience | 2500 | SpaceMedicine + Project_High-ThrustErgonomics |
| Civilian Complex | Project_CivilianComplex | project | LifeScience | 3000 | (Project_RingCore OR Project_ColonyCore) + Project_ResidentialModule + InterplanetaryPolities |
| Colony Core | Project_ColonyCore | project | LifeScience | 3000 | Project_SettlementCore + ColonyHabs |
| Interrogation Techniques | Project_InterrogationTechniques | project | LifeScience | 3500 | ArrivalPsychology + AugmentedReality |
| Agriculture Complex | Project_AgricultureComplex | project | LifeScience | 5000 | (Project_RingCore OR Project_ColonyCore) + Project_Farm + DesignerLifeforms |
| Carbon Recapture Technologies | Project_CarbonRecaptureTechnologies | project | LifeScience | 5000 | ClimateChangeMitigation |
| Ecological Stabilization Programs | Project_EcologicalStabilizationPrograms | project | LifeScience | 5000 | DesignerLifeforms |
| Ring Core | Project_RingCore | project | LifeScience | 5000 | Project_OrbitalCore + OrbitalTorusHabs |
| Space Hospital | Project_GeriatricsFacility | project | LifeScience | 5000 | Project_RingCore + Project_OrbitalHospital + TransformPhages |
| Acceleration Pharmaceuticals | Project_AccelerationPharmaceuticals | project | LifeScience | 10000 | ExtendedSpaceSurvival |
| Climate Institute | Project_ClimateInstitute | project | LifeScience | 10000 | Project_RingCore + Project_ClimateResearchCenter + IntegratedEarthSpaceEconomy |
| Life Science Institute | Project_LifeScienceInstitute | project | LifeScience | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_LifeScienceResearchCenter + AppliedArtificialIntelligence |
| Onboarding Transform Injections | Project_OnboardingInjections | project | LifeScience | 10000 | TransformPhages + Project_CovertOperations |
| Singleton Viruses | Project_SingletonViruses | project | LifeScience | 10000 | TargetedBiologicalWarfare |
| High-G Recombinants | Project_High-GRecombinants | project | LifeScience | 20000 | Genies + Project_AccelerationPharmaceuticals |
| Microbial Drills | Project_MicrobialDrills | project | LifeScience | 20000 | InSituResourceUtilization + DesignerLifeforms + Project_ThermalMiningTechniques |
| Invasive Species Containment | Project_InvasiveSpeciesContainment | project | LifeScience | 30000 | DesignerLifeforms + Project_XenologicalCulls + Project_WarDogNecropsy + milestone:AccessWarDogCorpus + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| DNA Repairs | Project_DNARepairs | project | LifeScience | 50000 | TransformPhages + SelfRepairingSoftware + MolecularAssemblers |
| Methuselah Therapies | Project_MethuselahTherapies | project | LifeScience | 75000 | Genies + AdministrationAlgorithms + Project_DNARepairs |
| Fuel Cell II | Project_FuelCellII | project | Materials | 250 | SpaceAgriculture |
| Liquid Hydrogen Containment | Project_LiquidHydrogenContainment | project | Materials | 250 | OrbitalShipbuilding |
| Potassium Heat Sinks | Project_PotassiumHeatSink | project | Materials | 250 | AdvancedHeatManagementConcepts |
| Materials Lab | Project_MaterialsLab | project | Materials | 300 | (Project_PlatformCore OR Project_OutpostCore) |
| Fuel Cell III | Project_FuelCellIII | project | Materials | 350 | DesignerLifeforms + Project_FuelCellII |
| Antimatter Trap | Project_AntimatterTrap | project | Materials | 500 | Project_PlatformCore + AntimatterContainment |
| Molybdenum Pipe Radiator | Project_MolybdenumPipeRadiator | project | Materials | 500 | OrbitalShipbuilding |
| Repair Bay | Project_RepairBay | project | Materials | 500 | MilitarizationofSpace |
| Space Dock | Project_SpaceDock | project | Materials | 500 | (Project_PlatformCore OR Project_OutpostCore) + OrbitalShipbuilding |
| Antimatter Harvester | Project_AntimatterHarvester | project | Materials | 1000 | Project_OrbitalCore + Project_AntimatterTrap |
| Armor Struts | Project_ArmorStruts | project | Materials | 1000 | Superalloys + OrbitalShipbuilding |
| Automated Solar Mirror | Project_AutomatedSolarMirror | project | Materials | 1000 | Project_AutomatedPlatformCore + Project_SolarMirror |
| Component Armoring | Project_ComponentArmor | project | Materials | 1000 | ImprovedShipbuildingTechniques |
| Composite Armor | Project_CompositeArmor | project | Materials | 1000 | OrbitalShipbuilding + AdvancedCarbonManipulation |
| Construction Module | Project_ConstructionModule | project | Materials | 1000 | (Project_PlatformCore OR Project_OutpostCore) + IndustrializationofSpace |
| Graphene Batteries | Project_GrapheneBattery | project | Materials | 1000 | OrbitalShipbuilding + AdvancedCarbonManipulation |
| Hybrid Air-Breathing Rockets | Project_HybridAir-BreathingRockets | project | Materials | 1000 | NextGenerationAerospace + AdvancedHeatManagementConcepts |
| Lake Tanganyika Bridge | Project_LakeTanganyikaBridge | project | Materials | 1000 | ArrivalInternationalDevelopment |
| Nanofactory | Project_Nanofactory | project | Materials | 1000 | (Project_OrbitalCore OR Project_SettlementCore) + Project_ConstructionModule + IndustrializationofSpace + AdvancedAtomicManipulation |
| Nevelskoy Strait Tunnel | Project_NevelskoyStraitTunnel | project | Materials | 1000 | ArrivalInternationalDevelopment |
| Remass Scoop | Project_RemassScoop | project | Materials | 1000 | ImprovedShipbuildingTechniques |
| Slush Hydrogen Tankage | Project_SlushHydrogenTankage | project | Materials | 1000 | AdvancedHydrogenContainment + Project_LiquidHydrogenContainment |
| Sodium Heat Sinks | Project_SodiumHeatSink | project | Materials | 1000 | AdvancedHeatManagementConcepts |
| Zanzibar Channel Bridge | Project_ZanzibarChannelBridge | project | Materials | 1000 | ArrivalInternationalDevelopment |
| Antimatter Farm | Project_AntimatterFarm | project | Materials | 1500 | Project_RingCore + Project_AntimatterHarvester + MagneticPlasmaConfinementTechniques |
| Materials Research Center | Project_MaterialsResearchCenter | project | Materials | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_MaterialsLab + DirectedSpaceResearch |
| Molten Salt Heat Sinks | Project_MoltenSaltHeatSink | project | Materials | 1500 | AdvancedHeatManagementConcepts |
| Shipyard | Project_Shipyard | project | Materials | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_SpaceDock + IndustrializationofSpace |
| Nanotube Filament Radiator | Project_NanotubeFilamentRadiator | project | Materials | 2000 | AdvancedHeatManagementConcepts + CarbonNanotubes |
| Bridge of the Horns | Project_BridgeoftheHorns | project | Materials | 2500 | ArrivalInternationalDevelopment |
| Diphu Pass Opening | Project_DiphuPass | project | Materials | 2500 | ArrivalInternationalDevelopment |
| Foamed Metal Armor | Project_FoamedMetalArmor | project | Materials | 2500 | OrbitalShipbuilding + Superalloys |
| Gold Rush | Project_GoldRush | project | Materials | 2500 | Project_SettlementMiningComplex + Project_EscapeVictory + faction:EscapeCouncil |
| Lithium Heat Sinks | Project_LithiumHeatSink | project | Materials | 2500 | AdvancedHeatManagementConcepts + Project_MolecularBenefication |
| Malacca Strait Bridge | Project_MalaccaStraitBridge | project | Materials | 2500 | ArrivalInternationalDevelopment |
| Palk Strait Bridge | Project_PalkStraitBridge | project | Materials | 2500 | ArrivalInternationalDevelopment |
| Quantum Batteries | Project_QuantumBattery | project | Materials | 2500 | OrbitalShipbuilding + AdvancedAtomicManipulation |
| Solar Mirror | Project_SolarMirror | project | Materials | 2500 | Project_PlatformCore + Project_SolarCollector + AdvancedHeatManagementConcepts |
| Strait of Tiran Causeway | Project_StraitofTiranCauseway | project | Materials | 2500 | ArrivalInternationalDevelopment |
| Sunda Strait Bridge | Project_SundaStraitBridge | project | Materials | 2500 | ArrivalInternationalDevelopment |
| Wakhan Corridor Project | Project_WakhanCorridorProject | project | Materials | 2500 | ArrivalInternationalDevelopment |
| Ionic Dust Radiator | Project_IonicDustRadiator | project | Materials | 3000 | AdvancedHeatManagementConcepts + VacuumElectrostaticPrinciples |
| Cobalt Dust Radiator | Project_CobaltDustRadiator | project | Materials | 5000 | AdvancedHeatManagementConcepts + MagneticForceManipulation |
| Darien Gap Road | Project_DarienGapRoad | project | Materials | 5000 | ArrivalInternationalDevelopment |
| Exotic Heat Sinks | Project_ExoticHeatSink | project | Materials | 5000 | AdvancedHeatManagementConcepts + Project_Exotics |
| Hydron Trap | Project_HydronTrap | project | Materials | 5000 | AdvancedAtomicManipulation + Project_SlushHydrogenTankage + Project_ExoticHybridSystems |
| Nanotube Armor | Project_NanotubeArmor | project | Materials | 5000 | OrbitalShipbuilding + CarbonNanotubes |
| Salvage Bay | Project_SalvageBay | project | Materials | 5000 | IndustrializationofSpace + AdvancedAtomicManipulation |
| Solar Mirror Array | Project_SolarMirrorArray | project | Materials | 5000 | Project_OrbitalCore + Project_SolarMirror + Superalloys + AppliedArtificialIntelligence |
| Spaceworks | Project_Spaceworks | project | Materials | 5000 | (Project_RingCore OR Project_ColonyCore) + Project_Shipyard + SpaceNavies |
| Strait of Gibraltar Crossing | Project_StraitofGibraltarCrossing | project | Materials | 5000 | ArrivalInternationalDevelopment + Superalloys |
| Superconducting Coil Batteries | Project_SuperconductingCoilBattery | project | Materials | 5000 | ImprovedShipbuildingTechniques + HighTemperatureSuperconductors |
| Talsinki Tunnel | Project_TalsinkiTunnel | project | Materials | 5000 | ArrivalInternationalDevelopment |
| Thermal Mining Techniques | Project_ThermalMiningTechniques | project | Materials | 5000 | SpaceMiningandRefining + AdvancedHeatManagementConcepts |
| North Channel Crossing | Project_NorthChannelCrossing | project | Materials | 7500 | ArrivalInternationalDevelopment + Superalloys |
| Soya Strait Bridge | Project_SoyaStraitBridge | project | Materials | 7500 | ArrivalInternationalDevelopment |
| Adamantine Armor | Project_AdamantaneArmor | project | Materials | 10000 | ImprovedShipbuildingTechniques + Diamondoids |
| Battery Farms | Project_BatteryFarms | project | Materials | 10000 | (Project_QuantumBattery OR Project_SuperconductingCoilBattery) + ArrivalInternationalDevelopment |
| Bering Strait Crossing | Project_BeringStraitCrossing | project | Materials | 10000 | ArrivalInternationalDevelopment + Superalloys |
| Exotic Armor | Project_ExoticArmor | project | Materials | 10000 | ImprovedShipbuildingTechniques + Project_Exotics |
| Exotic Spike Radiator | Project_ExoticSpikeRadiator | project | Materials | 10000 | AdvancedHeatManagementConcepts + Project_ExoticHybridSystems |
| Hybrid Armor | Project_HybridArmor | project | Materials | 10000 | Project_ExoticArmor + Project_AdamantaneArmor |
| Industrial Atomic Assemblers | Project_IndustrialAtomicAssemblers | project | Materials | 10000 | MolecularAssemblers + ArrivalInternationalDevelopment + Project_TheirRobotics |
| Materials Institute | Project_MaterialsInstitute | project | Materials | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_MaterialsResearchCenter + AppliedArtificialIntelligence |
| Army Nuclear Hardening | Project_NuclearHardening | project | Materials | 10000 | NetworkedGlobalDefense + Project_ExoticArmor |
| Rapid Military Prototyping | Project_RapidMilitaryPrototyping | project | Materials | 10000 | TerrestrialMilitaryScience + MolecularAssemblers + Project_TheirTechnology |
| Rapid Repairing Materials | Project_RapidRepairingMaterials | project | Materials | 10000 | (TerrestrialMilitaryScience OR ImprovedShipbuildingTechniques) + MolecularAssemblers |
| Tin Droplet Radiator | Project_TinDropletRadiator | project | Materials | 10000 | AdvancedHeatManagementConcepts + SuperconductingMagnets |
| Ultracold Neutron Containment | Project_UltracoldNeutronContainment | project | Materials | 10000 | Neutronics + Diamondoids + Project_Exotics |
| Urban Armoring | Project_UrbanArmoring | project | Materials | 10000 | NetworkedGlobalDefense + Project_MegafaunaNecropsy + milestone:AccessAlienMegafauna |
| Deep Space Metallurgy | Project_DeepSpaceMetallurgy | project | Materials | 15000 | SpaceMiningandRefining + AppliedArtificialIntelligence |
| Maglev Trains | Project_MaglevTrains | project | Materials | 15000 | SuperconductingMagnets |
| Nanofacturing Complex | Project_NanofacturingComplex | project | Materials | 15000 | (Project_RingCore OR Project_ColonyCore) + Project_Nanofactory + MolecularAssemblers |
| Rapid Distillation Techniques | Project_RapidDistillationTechniques | project | Materials | 15000 | SpaceMiningandRefining + TransformPhages |
| Slag Valorization | Project_SlagValorization | project | Materials | 15000 | SpaceCommerce + Superalloys |
| Water Purification Techniques | Project_WaterPurificationTechniques | project | Materials | 15000 | SpaceMiningandRefining + AdvancedAtomicManipulation |
| Gallium Mist Radiator | Project_GalliumMistRadiator | project | Materials | 20000 | AdvancedHeatManagementConcepts + SuperconductingMagnets + ImprovedShipbuildingTechniques + Project_MolecularBenefication |
| Molecular Beneficiation | Project_MolecularBenefication | project | Materials | 20000 | SpaceMiningandRefining + MolecularAssemblers |
| Plasma Extraction Techniques | Project_PlasmaExtractionTechniques | project | Materials | 20000 | SpaceCommerce + ElectrostaticPlasmaConfinement |
| Rapid Fissile Enrichment | Project_RapidFissileEnrichment | project | Materials | 20000 | SpaceMiningandRefining + MolecularAssemblers + AppliedArtificialIntelligence |
| Soletta | Project_Soletta | project | Materials | 20000 | Project_RingCore + Project_SolarMirrorArray + Diamondoids + AdministrationAlgorithms + Ultracapacitors |
| Lithium Spray Radiator | Project_LithiumSprayRadiator | project | Materials | 30000 | AdvancedHeatManagementConcepts + SuperconductingMagnets + ImprovedShipbuildingTechniques + Project_MolecularBenefication |
| Dusty Plasma Radiator | Project_DustyPlasmaRadiator | project | Materials | 40000 | AdvancedHeatManagementConcepts + MagneticPlasmaConfinementTechniques + ImprovedShipbuildingTechniques + OurSpaceFuture |
| Interplanetary Warships | Project_Warships | project | MilitaryScience | 250 | OrbitalShipbuilding |
| Point Defense Laser Turrets | Project_PointDefenseLaserTurret | project | MilitaryScience | 250 | DirectedEnergyWarfareDoctrine |
| Marine Platoon Barracks | Project_MarinePlatoonBarracks | project | MilitaryScience | 300 | (Project_PlatformCore OR Project_OutpostCore) + MilitarizationofSpace |
| Military Science Lab | Project_MilitaryScienceLab | project | MilitaryScience | 300 | (Project_PlatformCore OR Project_OutpostCore) |
| Point Defense Array | Project_PointDefenseArray | project | MilitaryScience | 300 | (Project_PlatformCore OR Project_OutpostCore) + InfraredCombatLasers |
| 40mm Autocannon | Project_40mmAutocannon | project | MilitaryScience | 500 | KineticsWarfareDoctrine + Project_Warships |
| Talent Development | Project_HumanityFirstTalentDevelopment | project | MilitaryScience | 500 | WeAreNotAlone + Project_TheirSignatures + faction:DestroyCouncil |
| Infrared Laser Batteries | Project_60cmIRLaserBattery | project | MilitaryScience | 500 | InfraredCombatLasers |
| Killer Instinct | Project_KillerInstinct | project | MilitaryScience | 500 | Project_HumanityFirstTalentDevelopment + faction:DestroyCouncil |
| Infrared Laser Cannon | Project_240cmIRLaserCannon | project | MilitaryScience | 500 | InfraredCombatLasers |
| Magazine | Project_Magazine | project | MilitaryScience | 500 | Project_Warships |
| Marine Assault Unit | Project_MarineAssaultUnit | project | MilitaryScience | 500 | MilitarizationofSpace |
| Hydrolox Explosive Warhead Missiles | Project_CopperheadMissileBay | project | MilitaryScience | 650 | MissileWarfareDoctrine + Project_CryogenicLiquid-FuelRockets |
| E-Beam Batteries | Project_EBeamBatteries | project | MilitaryScience | 800 | ParticleCannon + DirectedEnergyWarfareDoctrine |
| Hypergolic Fragmentation Warhead Missiles | Project_RattlerMissileBay | project | MilitaryScience | 800 | MissileWarfareDoctrine + Project_Liquid-FuelRockets |
| Hypergolic Explosive Warhead Missiles | Project_AnacondaMissileBay | project | MilitaryScience | 800 | MissileWarfareDoctrine + Project_Liquid-FuelRockets |
| Advanced Marine Assault Unit | Project_AdvancedMarineAssaultUnit | project | MilitaryScience | 1000 | SpaceAssaultDoctrine + Project_MarineAssaultUnit |
| Electron Lance | Project_ElectronLance | project | MilitaryScience | 1000 | ParticleCannon + DirectedEnergyWarfareDoctrine + Project_PatrolVessels |
| Hydrolox Fragmentation Warhead Missiles | Project_ViperMissileBay | project | MilitaryScience | 1000 | MissileWarfareDoctrine + Project_CryogenicLiquid-FuelRockets |
| Layered Defense Array | Project_LayeredDefenseArray | project | MilitaryScience | 1000 | (Project_OrbitalCore OR Project_SettlementCore) + Project_PointDefenseArray + MilitarizationofSpace |
| Marine Company Barracks | Project_MarineCompanyBarracks | project | MilitaryScience | 1000 | (Project_OrbitalCore OR Project_SettlementCore) + SpaceAssaultDoctrine + Project_MarinePlatoonBarracks |
| Point Defense Arc Laser Turrets | Project_PointDefenseArcLaserTurret | project | MilitaryScience | 1000 | ArcLasers |
| Hydrolox Penetrator Warhead Missiles | Project_LanceheadMissileBay | project | MilitaryScience | 1500 | AdvancedMissileWarfareDoctrine + Project_CryogenicLiquid-FuelRockets |
| Hypergolic Penetrator Warhead Missiles | Project_HarlequinMissileBay | project | MilitaryScience | 1500 | AdvancedMissileWarfareDoctrine + Project_Liquid-FuelRockets |
| Infrared Arc Laser Batteries | Project_60cmIRArcLaserBattery | project | MilitaryScience | 1500 | ArcLasers |
| Infrared Arc Laser Cannon | Project_240cmIRArcLaserCannon | project | MilitaryScience | 1500 | ArcLasers |
| Military Science Research Center | Project_MilitaryScienceResearchCenter | project | MilitaryScience | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_MilitaryScienceLab + DirectedSpaceResearch |
| Point Defense Phaser Turrets | Project_PointDefensePhaserTurret | project | MilitaryScience | 1500 | PhasedArrayLasers |
| Hydrolox-Fueled Nuclear Missiles | Project_HadesNuclearTorpedoBay | project | MilitaryScience | 2000 | AdvancedMissileWarfareDoctrine + MilitarizationofSpace + Project_CryogenicLiquid-FuelRockets |
| Hypergolic-Fueled Nuclear Torpedoes | Project_CerebrusNuclearTorpedoBay | project | MilitaryScience | 2000 | AdvancedMissileWarfareDoctrine + Project_Liquid-FuelRockets |
| Nuclear-Powered Fragmentation Warhead Torpedoes | Project_ZeusTorpedoBay | project | MilitaryScience | 2000 | AdvancedMissileWarfareDoctrine + Project_SolidCoreFissionReactorVI |
| Nuclear-Powered Explosive Warhead Torpedoes | Project_AthenaTorpedoBay | project | MilitaryScience | 2000 | AdvancedMissileWarfareDoctrine + Project_SolidCoreFissionReactorVI |
| Patrol Vessels | Project_PatrolVessels | project | MilitaryScience | 2000 | Project_Warships + PrinciplesofSpaceWarfare |
| Best and Brightest | Project_BestandBrightest | project | MilitaryScience | 2500 | Project_Warships + Project_CooperateVictory + faction:CooperateCouncil |
| Elite Marine Assault Unit | Project_EliteMarineAssaultUnit | project | MilitaryScience | 2500 | OurSpaceFuture + Project_AdvancedMarineAssaultUnit |
| Infrared Phaser Batteries | Project_60cmIRPhaserBattery | project | MilitaryScience | 2500 | PhasedArrayLasers |
| Infrared Phaser Cannon | Project_240cmIRPhaserCannon | project | MilitaryScience | 2500 | PhasedArrayLasers |
| Ion Batteries | Project_IonBatteries | project | MilitaryScience | 2500 | AdvancedAtomicManipulation + Project_EBeamBatteries |
| Ion Cannon | Project_IonCannon | project | MilitaryScience | 2500 | AdvancedAtomicManipulation + Project_ElectronLance |
| Space Force Basic Training | Project_SpaceForceBasicTraining | project | MilitaryScience | 2500 | MilitarizationofSpace |
| Spaceport Security Framework | Project_SpaceportSecurityFramework | project | MilitaryScience | 2500 | ArrivalSecurity |
| Rail Cannon | Project_RailCannonMk1 | project | MilitaryScience | 3000 | Railguns |
| Railgun Batteries | Project_RailgunBatteryMk1 | project | MilitaryScience | 3000 | Railguns |
| Improved Rail Cannon | Project_RailCannonMk2 | project | MilitaryScience | 4000 | Project_RailCannonMk1 + MagneticForceManipulation |
| Improved Railgun Batteries | Project_RailgunBatteryMk2 | project | MilitaryScience | 4000 | Project_RailgunBatteryMk1 + MagneticForceManipulation |
| Advanced Rail Cannon | Project_RailCannonMk3 | project | MilitaryScience | 5000 | Project_RailCannonMk2 |
| Advanced Railgun Batteries | Project_RailgunBatteryMk3 | project | MilitaryScience | 5000 | Project_RailgunBatteryMk2 |
| Army Dispersion Tactics | Project_ArmyDispersionTactics | project | MilitaryScience | 5000 | TransInterfaceWarfare |
| Battlestations | Project_Battlestations | project | MilitaryScience | 5000 | (Project_RingCore OR Project_ColonyCore) + Project_LayeredDefenseArray + VisibleCombatLasers |
| Cadre Development Programs | Project_CadreDevelopmentPrograms | project | MilitaryScience | 5000 | TerrestrialMilitaryScience + WhiteCollarAutomation + Project_AugmentedCombatTraining |
| Coil Cannon | Project_CoilCannonMk1 | project | MilitaryScience | 5000 | Coilguns |
| Coilgun Batteries | Project_CoilgunBatteryMk1 | project | MilitaryScience | 5000 | Coilguns |
| Counteralien Operations Teams | Project_CounteralienOperationsTeams | project | MilitaryScience | 5000 | Project_RapidResponseTeams + Project_CadreDevelopmentPrograms + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil |
| Counterinsurgency Operations | Project_CounterinsurgencyOperations | project | MilitaryScience | 5000 | TerrestrialMilitaryScience + ArrivalInternationalDevelopment |
| Flag Bridge | Project_FlagBridge | project | MilitaryScience | 5000 | SpaceNavies + Project_PatrolVessels |
| Green Laser Batteries | Project_60cmGreenLaserBattery | project | MilitaryScience | 5000 | VisibleCombatLasers |
| Green Laser Cannon | Project_240cmGreenLaserCannon | project | MilitaryScience | 5000 | VisibleCombatLasers |
| Guerrilla Warfare | Project_GuerrillaWarfare | project | MilitaryScience | 5000 | TerrestrialMilitaryScience + ArrivalDomesticPolitics |
| Hypersonic Sea-Launched Cruise Missiles | Project_HypersonicSea-LaunchedCruiseMissiles | project | MilitaryScience | 5000 | NextGenerationAerospace |
| Marine Battalion Barracks | Project_MarineBattalionBarracks | project | MilitaryScience | 5000 | (Project_RingCore OR Project_ColonyCore) + Project_MarineCompanyBarracks |
| Mountain Warfare Doctrine | Project_MountainWarfareDoctrine | project | MilitaryScience | 5000 | TerrestrialMilitaryScience |
| Nemesis Nuclear Torpedoes | Project_NemesisNuclearTorpedoBay | project | MilitaryScience | 5000 | AdvancedMissileWarfareDoctrine + MilitarizationofSpace + Project_SolidCoreFissionReactorVII |
| Nuclear-Powered Penetrator Warhead Torpedoes | Project_AresTorpedoBay | project | MilitaryScience | 5000 | AdvancedMissileWarfareDoctrine + Project_SolidCoreFissionReactorVI |
| Particle Beam Batteries | Project_ParticleBeamBatteries | project | MilitaryScience | 5000 | Supercapacitors + Project_IonBatteries |
| Particle Lance | Project_ParticleLance | project | MilitaryScience | 5000 | Supercapacitors + Project_IonCannon |
| Plasma Batteries | Project_PlasmaBatteryMk1 | project | MilitaryScience | 5000 | PlasmaWeapons + Project_PatrolVessels |
| Plasma Cannon | Project_PlasmaCannonMk1 | project | MilitaryScience | 5000 | PlasmaWeapons + Project_FleetCombatants |
| Psyops | Project_Psyops | project | MilitaryScience | 5000 | ArrivalDomesticPolitics + ArrivalPsychology + TerrestrialMilitaryScience |
| Space Navy Academies | Project_SpaceNavyAcademies | project | MilitaryScience | 5000 | SpaceNavies |
| Tactical Drones | Project_TacticalDrones | project | MilitaryScience | 5000 | TerrestrialMilitaryScience + SelfRepairingSoftware + Project_TheirRobotics |
| Urban Warfare Doctrine | Project_UrbanWarfareDoctrine | project | MilitaryScience | 5000 | TerrestrialMilitaryScience + AdvancedNeuralNetworks |
| Wet Navy Modernization | Project_WetNavyModernization | project | MilitaryScience | 5000 | TerrestrialMilitaryScience + MolecularAssemblers + AdvancedMissileWarfareDoctrine |
| Fleet Combatants | Project_FleetCombatants | project | MilitaryScience | 6000 | Project_PatrolVessels + MilitarizationofSpace |
| Freedom Fighters | Project_FreedomFighters | project | MilitaryScience | 7500 | IndependenceMovements + Project_GuerrillaWarfare |
| Green Arc Laser Batteries | Project_60cmGreenArcLaserBattery | project | MilitaryScience | 7500 | VisibleCombatLasers + ArcLasers |
| Green Arc Laser Cannon | Project_240cmGreenArcLaserCannon | project | MilitaryScience | 7500 | VisibleCombatLasers + ArcLasers |
| Improved Plasma Batteries | Project_PlasmaBatteryMk2 | project | MilitaryScience | 7500 | (MagneticPlasmaConfinementTechniques OR ElectrostaticPlasmaConfinement) + Ultracapacitors + Project_PlasmaBatteryMk1 |
| Improved Plasma Cannon | Project_PlasmaCannonMk2 | project | MilitaryScience | 7500 | (MagneticPlasmaConfinementTechniques OR ElectrostaticPlasmaConfinement) + Ultracapacitors + Project_PlasmaCannonMk1 |
| Ultraviolet Laser Batteries | Project_60cmUVLaserBattery | project | MilitaryScience | 7500 | UltravioletCombatLasers |
| Ultraviolet Laser Cannon | Project_240cmUVLaserCannon | project | MilitaryScience | 7500 | UltravioletCombatLasers |
| Fleet Officer Schoolhouses | Project_FleetOfficerSchoolhouses | project | MilitaryScience | 10000 | FleetLogistics |
| Full Spectrum Combined Arms | Project_FullSpectrumCombinedArms | project | MilitaryScience | 10000 | TransInterfaceWarfare + Project_Warships |
| The Immortals | Project_Immortals | project | MilitaryScience | 10000 | Project_EliteMarineAssaultUnit + Project_SubmitVictory + Project_LoyaltyTraining + faction:SubmitCouncil |
| Improved Coil Cannon | Project_CoilCannonMk2 | project | MilitaryScience | 10000 | Project_CoilCannonMk1 + HighTemperatureSuperconductors + Superalloys |
| Improved Coilgun Batteries | Project_CoilgunBatteryMk2 | project | MilitaryScience | 10000 | Project_CoilgunBatteryMk1 + HighTemperatureSuperconductors + Superalloys |
| Military Science Institute | Project_MilitaryScienceInstitute | project | MilitaryScience | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_MilitaryScienceResearchCenter + AppliedArtificialIntelligence + ArrivalSecurity |
| Shaped-Charge Nuclear Missiles | Project_OlympusNuclearTorpedoBay | project | MilitaryScience | 10000 | AdvancedMissileWarfareDoctrine + FissionPulseDrives + MilitarizationofSpace + Project_SolidCoreFissionReactorVIII |
| Advanced Plasma Batteries | Project_PlasmaBatteryMk3 | project | MilitaryScience | 10000 | Project_PlasmaBatteryMk2 + Coilguns + Project_Exotics |
| Advanced Plasma Cannon | Project_PlasmaCannonMk3 | project | MilitaryScience | 10000 | Project_PlasmaCannonMk2 + Coilguns + Project_Exotics |
| Resistance Rangers | Project_Rangers | project | MilitaryScience | 10000 | Project_EliteMarineAssaultUnit + Project_ResistVictory + Project_GuerrillaWarfare + faction:ResistCouncil |
| Rapid Stabilization Operations | Project_RapidStabilizationOperations | project | MilitaryScience | 10000 | NetworkedGlobalDefense + Project_CounterinsurgencyOperations + Project_Psyops |
| Ships of the Line | Project_ShipsoftheLine | project | MilitaryScience | 10000 | Project_FleetCombatants + ImprovedShipbuildingTechniques |
| Humanity First Spartans | Project_Spartans | project | MilitaryScience | 10000 | Project_EliteMarineAssaultUnit + Project_DestroyVictory + Project_CadreDevelopmentPrograms + faction:DestroyCouncil |
| Territorial Defense Battalions | Project_TerritorialDefenseBattalions | project | MilitaryScience | 10000 | NetworkedGlobalDefense |
| Titans | Project_Titans | project | MilitaryScience | 10000 | Project_ShipsoftheLine + TitanicSpacecraft |
| Ultraviolet Arc Laser Batteries | Project_60cmUVArcLaserBattery | project | MilitaryScience | 10000 | UltravioletCombatLasers + ArcLasers |
| Ultraviolet Arc Laser Cannon | Project_240cmUVArcLaserCannon | project | MilitaryScience | 10000 | UltravioletCombatLasers + ArcLasers |
| Green Phaser Batteries | Project_60cmGreenPhaserBattery | project | MilitaryScience | 12000 | VisibleCombatLasers + PhasedArrayLasers + Project_Exotics |
| Green Phaser Cannon | Project_240cmGreenPhaserCannon | project | MilitaryScience | 12000 | VisibleCombatLasers + PhasedArrayLasers + Project_Exotics |
| Acheron Shaped-Nuclear Torpedoes | Project_AcheronNuclearTorpedoBay | project | MilitaryScience | 15000 | HeavyPulsedPropulsion + Project_OlympusNuclearTorpedoBay |
| Advanced Coil Cannon | Project_CoilCannonMk3 | project | MilitaryScience | 15000 | Project_CoilCannonMk2 + Ultracapacitors + Project_Exotics |
| Advanced Coilgun Batteries | Project_CoilgunBatteryMk3 | project | MilitaryScience | 15000 | Project_CoilgunBatteryMk2 + Ultracapacitors + Project_Exotics |
| Antimatter Particle Cannon | Project_AntimatterParticleCannon | project | MilitaryScience | 15000 | AntimatterWeaponry + Project_ParticleLance |
| Ultraviolet Phaser Batteries | Project_60cmUVPhaserBattery | project | MilitaryScience | 18000 | UltravioletCombatLasers + PhasedArrayLasers + Project_ExoticHybridSystems |
| Ultraviolet Phaser Cannon | Project_240cmUVPhaserCannon | project | MilitaryScience | 18000 | UltravioletCombatLasers + PhasedArrayLasers + Project_ExoticHybridSystems |
| Antimatter Torpedoes | Project_AntimatterTorpedoLauncher | project | MilitaryScience | 20000 | AdvancedMissileWarfareDoctrine + AntimatterWeaponry + Project_SolidCoreFissionReactorIX |
| Sentinel Complex | Project_SentinelComplex | project | MilitaryScience | 20000 | Project_RingCore + Project_Exotics + NetworkedGlobalDefense + ArrivalCulture + faction:AppeaseCouncil |
| Smart Spacecraft Defenses | Project_SmartSpacecraftDefenses | project | MilitaryScience | 20000 | AppliedArtificialIntelligence + Project_TheirTechnology + Project_Warships |
| Tartarus Shaped-Nuclear Torpedoes | Project_TartarusNuclearTorpedoBay | project | MilitaryScience | 25000 | Diamondoids + Project_AcheronNuclearTorpedoBay + Project_Exotics |
| Independent Commands | Project_IndependentCommands | project | MilitaryScience | 50000 | FleetLogistics |
| Spinal Neutron Lance | Project_SpinalNeutronLance | project | MilitaryScience | 50000 | AdvancedFissionSystems + Project_UltracoldNeutronContainment + Project_ParticleLance + Project_ShipsoftheLine + Project_ExoticHybridSystems |
| Styx Shaped-Nuclear Torpedoes | Project_StyxNuclearTorpedoBay | project | MilitaryScience | 50000 | Project_ExoticHybridSystems + Project_TartarusNuclearTorpedoBay |
| Audience Research | Project_AudienceResearch | project | SocialScience | 100 |  |
| Commercial Research | Project_CommercialResearch | project | SocialScience | 100 |  |
| Operations Research | Project_OperationsResearch | project | SocialScience | 100 |  |
| Tourist Berth | Project_TouristBerth | project | SocialScience | 200 | Project_PlatformCore + SpaceTourism |
| European Decolonization | Project_EuropeanDecolonization | project | SocialScience | 250 | IndependenceMovements |
| Social Science Lab | Project_SocialScienceLab | project | SocialScience | 300 | (Project_PlatformCore OR Project_OutpostCore) |
| Talent Development | Project_AcademyTalentDevelopment | project | SocialScience | 500 | WeAreNotAlone + Project_TheirSignatures + faction:CooperateCouncil |
| Broadcast Outlet | Project_BroadcastOutlet | project | SocialScience | 500 | (Project_PlatformCore OR Project_OutpostCore) + ArrivalMassCommunications |
| Capitalization | Project_Capitalization | project | SocialScience | 500 | ArrivalEconomics + faction:ExploitCouncil |
| Caribbean Community | Project_CaribbeanCommunity | project | SocialScience | 500 | ArrivalInternationalRelations + nation:JAM |
| For the Greater Good | Project_ForTheGreaterGood | project | SocialScience | 500 | ArrivalSociology + faction:AppeaseCouncil |
| Friends in High Places | Project_FriendsinHighPlaces | project | SocialScience | 500 | ArrivalDomesticPolitics + faction:ResistCouncil |
| Talent Development | Project_InitiativeTalentDevelopment | project | SocialScience | 500 | WeAreNotAlone + Project_TheirSignatures + faction:ExploitCouncil |
| One People | Project_OnePeople | project | SocialScience | 500 | ArrivalMassCommunications + Project_ServantTalentDevelopment + faction:SubmitCouncil |
| Talent Development | Project_ProtectorateTalentDevelopment | project | SocialScience | 500 | WeAreNotAlone + Project_TheirSignatures + faction:AppeaseCouncil |
| Publicize Alien Threat | Project_PublicizeAlienThreat | project | SocialScience | 500 | WeAreNotAlone + Project_TheirOperations + faction:ResistCouncil/DestroyCouncil/EscapeCouncil |
| Talent Development | Project_ServantTalentDevelopment | project | SocialScience | 500 | WeAreNotAlone + Project_TheirSignatures + faction:SubmitCouncil |
| Strategic Lobbying | Project_StrategicLobbying | project | SocialScience | 500 | ArrivalDomesticPolitics |
| The Ivory Tower | Project_TheIvoryTower | project | SocialScience | 500 | ArrivalSociology + ArrivalDomesticPolitics + faction:CooperateCouncil |
| Clandestine Cells | Project_ClandestineCells | project | SocialScience | 600 | WeAreNotAlone |
| A Period of Unity | Project_APeriodofUnity | project | SocialScience | 1000 | UnityMovements + nation:VNM |
| Administration Node | Project_AdministrationNode | project | SocialScience | 1000 | (Project_PlatformCore OR Project_OutpostCore) + AdvancedNeuralNetworks + ArrivalDomesticPolitics |
| African Independence Movements | Project_AfricanIndependenceMovements | project | SocialScience | 1000 | IndependenceMovements |
| American Liberation Movements | Project_AmericanLiberationMovements | project | SocialScience | 1000 | IndependenceMovements |
| Arrival Markets | Project_ArrivalStockMarkets | project | SocialScience | 1000 | ArrivalEconomics |
| Asia-Pacific Regionalist Movements | Project_Asia-PacificRegionalistMovements | project | SocialScience | 1000 | IndependenceMovements |
| Celtic League | Project_CelticLeague | project | SocialScience | 1000 | UnityMovements + nation:IRL |
| Central American Confederation | Project_CentralAmericanConfederation | project | SocialScience | 1000 | UnityMovements + nation:GTM |
| Central Asian Union | Project_CentralAsianUnion | project | SocialScience | 1000 | UnityMovements + nation:KAZ |
| Communications Hub | Project_CommunicationsHub | project | SocialScience | 1000 | (Project_OrbitalCore OR Project_SettlementCore) + Project_BroadcastOutlet + NetworkedPropaganda |
| Corridor Diplomacy | Project_CorridorDiplomacy | project | SocialScience | 1000 | ArrivalInternationalRelations |
| European Autonomy Movements | Project_EuropeanAutonomyMovements | project | SocialScience | 1000 | IndependenceMovements |
| Hungarian Irredentism | Project_HungarianIrredentism | project | SocialScience | 1000 | UnityMovements + nation:HUN |
| Institutional Outreach | Project_InstitutionalOutreach | project | SocialScience | 1000 | ArrivalDomesticPolitics |
| National Research Oversight | Project_NationalResearchOversight | project | SocialScience | 1000 | ArrivalDomesticPolitics |
| The Nordic Federation | Project_NordicFederation | project | SocialScience | 1000 | UnityMovements + nation:SCA |
| Regulatory Capture | Project_RegulatoryCapture | project | SocialScience | 1000 | ArrivalLaw |
| Space Hotel | Project_SpaceHotel | project | SocialScience | 1000 | Project_OrbitalCore + Project_TouristBerth |
| Bootstrap Spaceflight Programs | Project_BootstrapSpaceflightPrograms | project | SocialScience | 1200 | AdvancedChemicalRocketry + ArrivalEconomics |
| Covert Operations | Project_CovertOperations | project | SocialScience | 1200 | QuantumEncryption + Project_ClandestineCells |
| Management Research | Project_ManagementResearch | project | SocialScience | 1500 |  |
| Skunkworks | Project_SkunkWorks | project | SocialScience | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + AdvancedNeuralNetworks |
| Social Science Research Center | Project_SocialScienceResearchCenter | project | SocialScience | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_SocialScienceLab + DirectedSpaceResearch |
| Transnational Investments | Project_TransnationalInvestments | project | SocialScience | 1500 | ArrivalInternationalDevelopment |
| Administration Tower | Project_AdministrationTower | project | SocialScience | 2000 | (Project_OrbitalCore OR Project_SettlementCore) + Project_AdministrationNode + WhiteCollarAutomation + ArrivalInternationalRelations |
| African Confederations | Project_EastAfricanFederation | project | SocialScience | 2000 | ArrivalInternationalRelations + nation:TZA |
| Commercial Mining Companies | Project_CommercialMiningCompanies | project | SocialScience | 2000 | SpaceCommerce |
| Common Cause | Project_CommonCause | project | SocialScience | 2000 | ArrivalInternationalRelations + ArrivalLaw + objective:ResearchTheirMethods |
| Maximum Effort | Project_MaximumEffort | project | SocialScience | 2000 | ArrivalLaw + ArrivalEconomics |
| Company Engineers | Project_CompanyEngineers | project | SocialScience | 2500 | DirectedSpaceResearch + Project_ExploitVictory + faction:ExploitCouncil |
| Entrenchment | Project_Entrenchment | project | SocialScience | 2500 | ArrivalLaw + Project_AppeaseVictory + faction:AppeaseCouncil |
| Global Command Structure | Project_GlobalCommandStructure | project | SocialScience | 2500 | IndependenceMovements |
| Instruments of Soft Power | Project_InstrumentsofSoftPower | project | SocialScience | 2500 | ArrivalDomesticPolitics + ArrivalCulture |
| Operations Center | Project_OperationsCenter | project | SocialScience | 2500 | (Project_OrbitalCore OR Project_SettlementCore) + AugmentedReality |
| Proscription | Project_Proscription | project | SocialScience | 2500 | ArrivalSecurity + Project_DestroyVictory + faction:DestroyCouncil |
| Regional African Unions | Project_RegionalAfricanUnions | project | SocialScience | 2500 | UnityMovements + Project_EastAfricanFederation |
| Restored Warsaw Pact | Project_RestoredWarsawPact | project | SocialScience | 2500 | ArrivalInternationalRelations + nation:RUS |
| Project Review | Project_ReviewFailedProjects | project | SocialScience | 2500 | SpaceResearch |
| Adaptive FDI Modeling | Project_AdapativeFDIModeling | project | SocialScience | 3000 | WhiteCollarAutomation + Project_TransnationalInvestments |
| Apparatchiks | Project_Apparatchiks | project | SocialScience | 3000 | ArrivalDomesticPolitics + WhiteCollarAutomation |
| Dissolution of Russia | Project_DissolutionofRussia | project | SocialScience | 3000 | FallofEmpires |
| Loyalty Training | Project_LoyaltyTraining | project | SocialScience | 3000 | ArrivalCulture + NetworkedPropaganda |
| Space Resort | Project_SpaceResort | project | SocialScience | 3000 | Project_RingCore + Project_SpaceHotel |
| Crisis Diplomacy | Project_UnitedEffort | project | SocialScience | 3000 | ArrivalInternationalRelations + QuantumEncryption + objective:ResearchTheirOperations |
| Administration Complex | Project_AdministrationComplex | project | SocialScience | 5000 | (Project_RingCore OR Project_ColonyCore) + Project_AdministrationTower + AdministrationAlgorithms + ArrivalGovernance |
| Appeals to Fear Messaging | Project_AppealtoFearMessaging | project | SocialScience | 5000 | ArrivalPsychology + ArrivalSecurity + ArrivalMassCommunications + Project_TheirOperations + faction:DestroyCouncil/ExploitCouncil/SubmitCouncil/AppeaseCouncil |
| Appeals to Hope Messaging | Project_AppealtoHopeMessaging | project | SocialScience | 5000 | ArrivalCulture + Project_TheirOperations + faction:ResistCouncil/EscapeCouncil/CooperateCouncil |
| Autonomous Research Groups | Project_AutonomousResearchGroups | project | SocialScience | 5000 | DirectedSpaceResearch + SelfRepairingSoftware |
| Crash Training Program | Project_CrashTrainingProgram | project | SocialScience | 5000 | AugmentedReality + Project_CovertOperations |
| End of the American Empire | Project_EndofAmerica | project | SocialScience | 5000 | FallofEmpires |
| End of India | Project_EndofIndia | project | SocialScience | 5000 | FallofEmpires |
| Externalized Costs | Project_ExternalizedCosts | project | SocialScience | 5000 | ArrivalEconomics + faction:ExploitCouncil/AppeaseCouncil/EscapeCouncil |
| Freistaat Union | Project_FreistaatConfederation | project | SocialScience | 5000 | UnityMovements + nation:DEU |
| Gulf Cooperation Council | Project_GulfCooperationCouncil | project | SocialScience | 5000 | UnityMovements + nation:SAU |
| Induced Inflection Points | Project_InducedInflectionPoints | project | SocialScience | 5000 | Accelerando |
| Institutional Bastions | Project_InstitutionalBastions | project | SocialScience | 5000 | ArrivalLaw + ArrivalInternationalDevelopment |
| Integrated Resource Market | Project_IntegratedResourceMarket | project | SocialScience | 5000 | IntegratedEarthSpaceEconomy |
| Media Center | Project_MediaCenter | project | SocialScience | 5000 | (Project_RingCore OR Project_ColonyCore) + Project_CommunicationsHub + ArrivalCulture |
| Media Literacy Training | Project_MediaLiteracyTraining | project | SocialScience | 5000 | ArrivalCulture |
| Nigerian Confederation | Project_NigerianConfederation | project | SocialScience | 5000 | UnityMovements + Project_RegionalAfricanUnions + nation:NGA |
| Stewards of South America | Project_GranColombia | project | SocialScience | 5000 | UnityMovements |
| Southeast Asian Alliance | Project_SoutheastAsianAlliance | project | SocialScience | 5000 | GreatNations + nation:THA |
| The Republic of the Southern Cross | Project_SouthernCross | project | SocialScience | 5000 | UnityMovements + nation:AUS |
| Stakeholder Subversion | Project_StakeholderSubversion | project | SocialScience | 5000 | ArrivalEconomics + AdvancedNeuralNetworks |
| Total War Framing | Project_TotalWarFraming | project | SocialScience | 5000 | NetworkedPropaganda + faction:SubmitCouncil/DestroyCouncil/ExploitCouncil |
| The United Malay Nation | Project_UnitedMalayNation | project | SocialScience | 5000 | UnityMovements + nation:MYS |
| End of China | Project_EndofChina | project | SocialScience | 6000 | FallofEmpires |
| Executive Privilege | Project_ExecutivePrivilege | project | SocialScience | 7500 | ArrivalLaw |
| Government Network Analysis | Project_GovernmentNetworkAnalysis | project | SocialScience | 7500 | ArrivalDomesticPolitics + AppliedArtificialIntelligence |
| Sanctioned Investigations | Project_SanctionedInvestigations | project | SocialScience | 7500 | ArrivalLaw |
| A Common Concern | Project_ACommonConcern | project | SocialScience | 10000 | ArrivalCulture + ArrivalEconomics + Project_TheirOperations + faction:ResistCouncil/CooperateCouncil/EscapeCouncil/SubmitCouncil |
| Civil Defense Programs | Project_CivilDefensePrograms | project | SocialScience | 10000 | ArrivalSecurity |
| Command Center | Project_CommandCenter | project | SocialScience | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_OperationsCenter + QuantumEncryption + FleetLogistics |
| Restored Commonwealth | Project_CommonwealthRestored | project | SocialScience | 10000 | (Project_EndofAmerica OR Project_ForwardRussia) + UnityMovements + nation:GBR |
| Encrypted Research Systems | Project_EncryptedResearchSystems | project | SocialScience | 10000 | QuantumEncryption |
| Foundry | Project_Foundry | project | SocialScience | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_SkunkWorks + AdministrationAlgorithms |
| Greater Dominion | Project_GreaterDominion | project | SocialScience | 10000 | GreatNations + Project_EndofAmerica + nation:CSA |
| Greater Indonesia | Project_GreaterIndonesia | project | SocialScience | 10000 | UnityMovements + nation:IDN |
| Greater Malaysia | Project_GreaterMalaysia | project | SocialScience | 10000 | GreatNations + Project_UnitedMalayNation + nation:MYS |
| National Labs | Project_NationalLabs | project | SocialScience | 10000 | ArrivalLaw + Project_NationalResearchOversight |
| The Intermarium | Project_SlavicCommonwealth | project | SocialScience | 10000 | UnityMovements + nation:POL |
| Social Science Institute | Project_SocialScienceInstitute | project | SocialScience | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_SocialScienceResearchCenter + AdministrationAlgorithms |
| South American Union | Project_SouthAmericanUnion | project | SocialScience | 10000 | GreatNations + Project_GranColombia + nation:BOL |
| Stewards of the South | Project_StewardoftheSouth | project | SocialScience | 10000 | GreatNations + Project_GranColombia + nation:BRA |
| The Shia Nation | Project_TheShiaNation | project | SocialScience | 10000 | UnityMovements + nation:IRN |
| Akhand Bharat | Project_GreaterIndia | project | SocialScience | 15000 | GreatNations + nation:IND |
| The Pacific Defense League | Project_PacificLeague | project | SocialScience | 15000 | (Project_Pan-AsianCooperative OR Project_EndofAmerica) + nation:JPN |
| Unidad Colombia | Project_UnidadColombia | project | SocialScience | 15000 | GreatNations + Project_GranColombia + nation:COL |
| United Turkestan | Project_UnitedTurkestan | project | SocialScience | 15000 | UnityMovements + nation:TUR |
| African Union | Project_AfricanUnion | project | SocialScience | 20000 | GreatNations + Project_RegionalAfricanUnions + nation:ETH |
| Great African Union | Project_GreatAfricanUnion | project | SocialScience | 20000 | Project_AfricanUnion |
| United Arab League | Project_UnitedArabLeague | project | SocialScience | 20000 | UnityMovements + nation:EGY |
| United North America | Project_UnitedNorthAmerica | project | SocialScience | 20000 | GreatNations + nation:USA |
| Europe Ascendant | Project_EuropeAscendant | project | SocialScience | 25000 | UnityMovements + nation:EUA |
| Focused National Research | Project_FocusedNationalResearch | project | SocialScience | 25000 | ArrivalGovernance + Project_NationalLabs |
| Global Ambition | Project_GlobalAmbition | project | SocialScience | 25000 | ArrivalGovernance |
| Greater Austronesia | Project_GreaterAustronesia | project | SocialScience | 30000 | GreatNations + Project_GreaterIndonesia + nation:IDN |
| Greater Intermarium | Project_GreaterIntermarium | project | SocialScience | 30000 | GreatNations + Project_SlavicCommonwealth + Project_DissolutionofRussia |
| Greater United North America | Project_GreaterUnitedNorthAmerica | project | SocialScience | 30000 | Project_UnitedNorthAmerica + nation:USA |
| Global Arms Control Regime | Project_GlobalArmsControlRegime | project | SocialScience | 35000 | ArrivalGovernance + faction:CooperateCouncil/AppeaseCouncil |
| Global Counterproliferation Regime | Project_GlobalCounterproliferationRegime | project | SocialScience | 35000 | ArrivalGovernance + faction:CooperateCouncil/AppeaseCouncil |
| The Caliphate | Project_TheCaliphate | project | SocialScience | 35000 | UnityMovements |
| Forward Russia | Project_ForwardRussia | project | SocialScience | 40000 | GreatNations + Project_RestoredWarsawPact + nation:RUS |
| Greater Pan-Asia | Project_GreaterPanAsia | project | SocialScience | 40000 | Project_Pan-AsianCooperative |
| Liberating Mainland China | Project_LiberatingMainlandChina | project | SocialScience | 40000 | UnityMovements + nation:TWN |
| Pan-Asian Combine | Project_Pan-AsianCooperative | project | SocialScience | 40000 | GreatNations + nation:CHN |
| Global Empire | Project_GlobalEmpire | project | SocialScience | 50000 | Accelerando |
| Great Europa | Project_GreatEuropa | project | SocialScience | 50000 | GreatNations + Project_EuropeAscendant + nation:EUA |
| Independent Habitats | Project_IndependentHabitats | project | SocialScience | 50000 | InterplanetaryPolities |
| The Greater Caliphate | Project_TheGreaterCaliphate | project | SocialScience | 50000 | GreatNations + Project_TheCaliphate + nation:CPH |
| The House of Islam | Project_TheHouseofIslam | project | SocialScience | 50000 | GreatNations + Project_TheGreaterCaliphate + nation:CPH |
| Greater India | Project_UnitedIndosphere | project | SocialScience | 50000 | Project_GreaterIndia |
| The Protectorate Authority | Project_ProtectorateAuthority | project | SocialScience | 500000 | Accelerando + GreatNations + Project_CoexistencePact + faction:AppeaseCouncil |
| Cryogenic-Fuel Space Rockets | Project_CryogenicLiquid-FuelRockets | project | SpaceScience | 100 | Project_Liquid-FuelRockets |
| Liquid-Fuel Space Rockets | Project_Liquid-FuelRockets | project | SpaceScience | 100 | Project_Solid-FuelSpaceRockets |
| Platform Core | Project_PlatformCore | project | SpaceScience | 100 |  |
| Solid-Fuel Space Rockets | Project_Solid-FuelSpaceRockets | project | SpaceScience | 100 |  |
| Space Science Lab | Project_SpaceScienceLab | project | SpaceScience | 100 | (Project_PlatformCore OR Project_OutpostCore) |
| Amplitron Drive | Project_AmplitronDrive | project | SpaceScience | 200 | ElectrothermalPropulsion |
| E-Beam Drive | Project_E-BeamDrive | project | SpaceScience | 200 | ElectrothermalPropulsion + HighEnergyLasers |
| Mass Driver | Project_MassDriver | project | SpaceScience | 200 | ElectromagneticPropulsion |
| Plasma Wave Drive | Project_PlasmaWaveDrive | project | SpaceScience | 200 | ElectromagneticPropulsion + AdvancedSuperconductors |
| Tungsten Resistojet | Project_TungstenResistojet | project | SpaceScience | 200 | ElectrothermalPropulsion |
| Kiwi Drive | Project_KiwiDrive | project | SpaceScience | 250 | Project_SolidCoreFissionReactorVI |
| Mobile Space Science Lab | Project_MobileSpaceScienceLab | project | SpaceScience | 250 | OrbitalShipbuilding + SpaceResearch + MissiontoMars |
| Quartz Drive | Project_QuartzDrive | project | SpaceScience | 250 | Project_GasCoreFissionReactorI |
| Colloid Drive | Project_ColloidDrive | project | SpaceScience | 300 | ElectrostaticPropulsion |
| Ion Drive | Project_IonDrive | project | SpaceScience | 300 | ElectrostaticPropulsion |
| Nerva Drive | Project_NervaDrive | project | SpaceScience | 300 | Project_SolidCoreFissionReactorI |
| Outpost Core | Project_OutpostCore | project | SpaceScience | 300 | OutpostHabs |
| Supply Depot | Project_SupplyDepot | project | SpaceScience | 300 | (Project_PlatformCore OR Project_OutpostCore) + OrbitalShipbuilding |
| Solar Outpost Kit | Project_SolarOutpostKit | project | SpaceScience | 350 | Project_OutpostCore + Project_SolarCollector + Project_ConstructionModule |
| Solar Platform Kit | Project_SolarPlatformKit | project | SpaceScience | 350 | Project_PlatformCore + Project_SolarCollector + Project_ConstructionModule |
| VASIMR | Project_VASIMR | project | SpaceScience | 400 | ElectromagneticPropulsion |
| Fission Outpost Kit | Project_FissionOutpostKit | project | SpaceScience | 500 | Project_OutpostCore + Project_FissionPile + Project_ConstructionModule |
| Fission Platform Kit | Project_FissionPlatformKit | project | SpaceScience | 500 | Project_PlatformCore + Project_FissionPile + Project_ConstructionModule |
| Interplanetary Chemical Rockets | Project_ImprovedInterplanetaryRockets | project | SpaceScience | 500 | AdvancedChemicalRocketry + Project_CryogenicLiquid-FuelRockets |
| Outpost Mining Complex | Project_OutpostMiningComplex | project | SpaceScience | 500 | Project_OutpostCore + SpaceMiningandRefining |
| Talent Development | Project_ProjectExodusTalentDevelopment | project | SpaceScience | 500 | WeAreNotAlone + Project_TheirSignatures + faction:EscapeCouncil |
| Pulsed Plasmoid Drive | Project_PulsedPlasmoidDrive | project | SpaceScience | 500 | ElectromagneticPropulsion + Supercapacitors |
| Rocket Scientists | Project_RocketScientists | project | SpaceScience | 500 | AdvancedChemicalRocketry + faction:EscapeCouncil |
| Snare Drive | Project_SnareDrive | project | SpaceScience | 500 | Project_SolidCoreFissionReactorVII |
| Superconducting Mass Driver | Project_SuperconductingMassDriver | project | SpaceScience | 500 | HighEnergyElectromagneticPropulsion + Project_MassDriver + SuperconductingMagnets |
| Superheavy Chemical Rockets | Project_SuperheavyRockets | project | SpaceScience | 500 | AdvancedChemicalRocketry |
| Cavity Drive | Project_CavityDrive | project | SpaceScience | 750 | Project_VaporCoreFissionReactorI |
| Cermet Nerva Drive | Project_CermetNerva | project | SpaceScience | 750 | Project_NervaDrive |
| Rover Drive | Project_RoverDrive | project | SpaceScience | 750 | Project_SolidCoreFissionReactorVIII |
| Lorentz Drive | Project_LorentzDrive | project | SpaceScience | 800 | (Project_SolidCoreFissionReactorI OR Project_FuelCellIII) + HighEnergyElectromagneticPropulsion |
| Advanced VASIMR Drive | Project_PonderomotiveVASIMR | project | SpaceScience | 900 | HighEnergyElectromagneticPropulsion + Project_VASIMR |
| Advanced Nerva Drive | Project_AdvancedNervaDrive | project | SpaceScience | 1000 | Project_NervaDrive |
| Automated Solar Platform Kit | Project_AutomatedSolarPlatformKit | project | SpaceScience | 1000 | Project_AutomatedSolarCollector + Project_AutomatedSupplyDepot |
| Deep Space Telescope | Project_DeepSpaceTelescope | project | SpaceScience | 1000 | (Project_OrbitalCore OR Project_SettlementCore) + AdvancedNeuralNetworks + DirectedSpaceResearch + DeepSystemSkywatch + Project_HydraInterrogation + objective:ResearchAlienTechnology + faction:EscapeCouncil |
| Dumbo Drive | Project_Dumbo | project | SpaceScience | 1000 | Project_SolidCoreFissionReactorII |
| Fission Frag Drive | Project_FissionFragDrive | project | SpaceScience | 1000 | AdvancedCarbonManipulation + Project_SolidCoreFissionReactorVII |
| In-Situ Resource Utilization Module | Project_ISRUModule | project | SpaceScience | 1000 | OrbitalShipbuilding + InSituResourceUtilization |
| Z-Pinch Microfission Drive | Project_Z-pinchMicrofissionDrive | project | SpaceScience | 1000 | ZPinchTechniques + FissionPulseDrives |
| Advanced Cavity Drive | Project_AdvancedCavityDrive | project | SpaceScience | 1500 | (Project_VaporCoreFissionReactorIII OR Project_GasCoreFissionReactorII) + Project_CavityDrive + SuperconductingMagnets |
| Advanced Cermet Nerva | Project_AdvancedCermetNerva | project | SpaceScience | 1500 | Project_CermetNerva + Project_Dumbo |
| Particle Drive | Project_AdvancedPebbleDrive | project | SpaceScience | 1500 | Project_PebbleDrive + Project_SolidCoreFissionReactorX |
| Advanced Prospecting Surveys | Project_AdvancedProspectingSurveys | project | SpaceScience | 1500 | OrbitalShipbuilding + IndustrializationofSpace + Project_MobileSpaceScienceLab |
| Advanced Vortex Drive | Project_AdvancedVortexDrive | project | SpaceScience | 1500 | Project_VortexDrive + Project_VaporCoreFissionReactorIII |
| Automated Fission Platform Kit | Project_AutomatedFissionPlatformKit | project | SpaceScience | 1500 | Project_AutomatedFissionPile + Project_AutomatedSupplyDepot |
| Fusion Outpost Kit | Project_FusionOutpostKit | project | SpaceScience | 1500 | Project_OutpostCore + Project_FusionPile + Project_ConstructionModule |
| Fusion Platform Kit | Project_FusionPlatformKit | project | SpaceScience | 1500 | Project_PlatformCore + Project_FusionPile + Project_ConstructionModule |
| Grid Drive | Project_GridDrive | project | SpaceScience | 1500 | (Project_SolidCoreFissionReactorI OR Project_FuelCellIII) + CarbonNanotubes + Project_IonDrive |
| Helicon Drive | Project_HeliconDrive | project | SpaceScience | 1500 | (Project_SolidCoreFissionReactorII OR Project_MoltenCoreFissionReactorI) + HighEnergyElectromagneticPropulsion |
| Lars Drive | Project_LarsDrive | project | SpaceScience | 1500 | Project_MoltenCoreFissionReactorI |
| Lightbulb Drive | Project_LightbulbDrive | project | SpaceScience | 1500 | Project_QuartzDrive |
| Pebble Drive | Project_PebbleDrive | project | SpaceScience | 1500 | Project_SolidCoreFissionReactorIX |
| Settlement Mining Complex | Project_SettlementMiningComplex | project | SpaceScience | 1500 | Project_SettlementCore + Project_OutpostMiningComplex |
| Space Science Research Center | Project_SpaceScienceResearchCenter | project | SpaceScience | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_SpaceScienceLab + DirectedSpaceResearch |
| Vortex Drive | Project_VortexDrive | project | SpaceScience | 1500 | Project_VaporCoreFissionReactorII |
| Neutronium Microfission Drive | Project_NeutroniumMicrofissionDrive | project | SpaceScience | 2000 | Project_UltracoldNeutronContainment + FissionPulseDrives |
| Pharos Drive | Project_PharosDrive | project | SpaceScience | 2000 | Superalloys + Project_GasCoreFissionReactorIII |
| Pulsar Drive | Project_PulsarDrive | project | SpaceScience | 2000 | (ArcLasers OR ParticleCannon) + Project_NervaDrive + Project_SolidCoreFissionReactorIII |
| Teardrop Drive | Project_TeardropDrive | project | SpaceScience | 2000 | Project_MoltenCoreFissionReactorII |
| Devolved Space Command | Project_DevolvedSpaceCommand | project | SpaceScience | 2500 | IndustrializationofSpace + AdministrationAlgorithms |
| Heavy Dumbo | Project_HeavyDumbo | project | SpaceScience | 2500 | Project_Dumbo + Project_SolidCoreFissionReactorIV |
| Improved Maintenance Procedures | Project_ImprovedMaintenanceProcedures | project | SpaceScience | 2500 | IndustrializationofSpace |
| Research Campus | Project_ResearchCampus | project | SpaceScience | 2500 | (Project_OrbitalCore OR Project_SettlementCore) + QuantumComputing |
| Colony Mining Complex | Project_ColonyMiningComplex | project | SpaceScience | 3000 | Project_ColonyCore + Project_SettlementMiningComplex + Superalloys |
| Advanced Pulsar Drive | Project_AdvancedPulsarDrive | project | SpaceScience | 4000 | SuperconductingMagnets + Project_PulsarDrive + Project_SolidCoreFissionReactorV |
| Long-Range Chemical Rockets | Project_AdvancedInterplanetaryRockets | project | SpaceScience | 5000 | AdvancedHydrogenContainment + Project_ImprovedInterplanetaryRockets |
| Antimatter Microfission Drive | Project_AntimatterMicrofissionDrive | project | SpaceScience | 5000 | AntimatterContainment + FissionPulseDrives |
| Automated Solar Outpost Kit | Project_AutomatedSolarOutpostKit | project | SpaceScience | 5000 | Project_AutomatedSolarCollector + Project_AutomatedMiningComplex |
| Burner Drive | Project_BurnerDrive | project | SpaceScience | 5000 | Superalloys + Project_GasCoreFissionReactorII |
| Dusty Plasma Drive | Project_DustyPlasmaDrive | project | SpaceScience | 5000 | Project_GasCoreFissionReactorI + MagneticNozzles + Project_FissionFragDrive + HighTemperatureSuperconductors |
| Fission Spinner Drive | Project_FissionSpinnerDrive | project | SpaceScience | 5000 | Project_LarsDrive + Project_MoltenCoreFissionReactorII |
| Helium-3 Mine | Project_Helium-3Mine | project | SpaceScience | 5000 | Project_RingCore + DeuteriumHelium3Fusion + MissiontoJupiter + SpaceMiningandRefining |
| Minimag Orion Drive | Project_MinimagOrion | project | SpaceScience | 5000 | Project_Z-pinchMicrofissionDrive |
| Rapid Shipbuilding | Project_RapidShipbuilding | project | SpaceScience | 5000 | ImprovedShipbuildingTechniques + SelfRepairingSoftware |
| Triton Fusor Drive | Project_TritonFusorDrive | project | SpaceScience | 5000 | MagneticNozzles + Project_ElectrostaticConfinementFusionReactorI |
| Triton Torus Drive | Project_TritonTorusDrive | project | SpaceScience | 5000 | MagneticNozzles + Project_FusionTokamakI |
| Automated Fission Outpost Kit | Project_AutomatedFissionOutpostKit | project | SpaceScience | 6500 | Project_AutomatedFissionPile + Project_AutomatedMiningComplex |
| Deuteron Fusor Drive | Project_DeuteronFusorDrive | project | SpaceScience | 7500 | MagneticNozzles + Project_ElectrostaticConfinementFusionReactorII |
| Triton Polywell Drive | Project_TritonPolywellDrive | project | SpaceScience | 7500 | MagneticNozzles + Project_HybridConfinementFusionReactorI |
| Triton Reflex Drive | Project_TritonReflexDrive | project | SpaceScience | 7500 | MagneticNozzles + Project_MirrorCellFusionReactorI |
| Advanced Minimag Orion Drive | Project_AdvancedMinimagOrion | project | SpaceScience | 10000 | Project_MinimagOrion |
| Deuteron Torus Drive | Project_DeuteronTorusDrive | project | SpaceScience | 10000 | MagneticNozzles + Project_FusionTokamakII |
| Lodestar Fission Lantern | Project_LodestarFissionLantern | project | SpaceScience | 10000 | MagneticForceManipulation + Project_GasCoreFissionReactorIV |
| Orion Drive | Project_OrionDrive | project | SpaceScience | 10000 | FissionPulseDrives |
| Space Science Institute | Project_SpaceScienceInstitute | project | SpaceScience | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_SpaceScienceResearchCenter + AppliedArtificialIntelligence |
| Zeta Triton Drive | Project_ZetaTritonDrive | project | SpaceScience | 10000 | MagneticNozzles + Project_ZPinchFusionReactorI |
| Pegasus Drive | Project_PegasusDrive | project | SpaceScience | 12000 | (Project_FissionSpinnerDrive OR Project_TeardropDrive) + Project_MoltenCoreFissionReactorIII |
| Triton Nova Drive | Project_TritonNovaDrive | project | SpaceScience | 14000 | MagneticNozzles + Project_InertialConfinementFusionReactorI |
| Deuteron Reflex Drive | Project_DeuteronReflexDrive | project | SpaceScience | 15000 | MagneticNozzles + Project_MirrorCellFusionReactorII |
| Flare Drive | Project_FlareDrive | project | SpaceScience | 15000 | MagneticForceManipulation + Project_GasCoreFissionReactorV |
| Protium Fusor Drive | Project_ProtiumFusorDrive | project | SpaceScience | 15000 | MagneticNozzles + Project_ElectrostaticConfinementFusionReactorIII |
| Firestar Fission Lantern | Project_FirestarFissionLantern | project | SpaceScience | 20000 | SuperconductingMagnets + Superalloys + Project_GasCoreFissionReactorVI |
| Hardened Hab Shelters | Project_HardenedHabShelters | project | SpaceScience | 20000 | TransInterfaceWarfare + Diamondoids + ExtendedSpaceSurvival |
| Helion Reflex Drive | Project_HelionReflexDrive | project | SpaceScience | 20000 | MagneticNozzles + Project_MirrorCellFusionReactorIII |
| Research University | Project_ResearchUniversity | project | SpaceScience | 20000 | (Project_RingCore OR Project_ColonyCore) + Project_ResearchCampus + IntegratedEarthSpaceEconomy |
| H-Orion Drive | Project_AdvancedOrionDrive | project | SpaceScience | 25000 | HeavyPulsedPropulsion + Project_OrionDrive |
| Antimatter Pulsed Plasma Core Lantern | Project_AntimatterPulsedPlasmaCoreLantern | project | SpaceScience | 25000 | AntimatterPropulsion + MagneticNozzles + Project_AntimatterPlasmaCoreReactorI |
| Deuteron Nova Lantern | Project_DeuteronNovaLantern | project | SpaceScience | 25000 | MagneticNozzles + Project_InertialConfinementFusionReactorII |
| Deuteron Polywell Drive | Project_DeuteronPolywellDrive | project | SpaceScience | 25000 | MagneticNozzles + Project_HybridConfinementFusionReactorII |
| Zeta Deuteron Drive | Project_ZetaDeuteronDrive | project | SpaceScience | 25000 | MagneticNozzles + Project_ZPinchFusionReactorII |
| Helion Torus Lantern | Project_HelionTorusLantern | project | SpaceScience | 30000 | MagneticNozzles + Project_FusionTokamakIII |
| Poseidon Lantern | Project_NeutronFluxLantern | project | SpaceScience | 35000 | AdvancedFissionSystems |
| Helion Plasmajet Lantern | Project_HelionPlasmajetLantern | project | SpaceScience | 45000 | MagneticNozzles + Project_HybridConfinementFusionReactorIII |
| Antimatter Plasma Core Torch | Project_AntimatterPlasmaCoreTorch | project | SpaceScience | 50000 | AntimatterPropulsion + Project_AntimatterPlasmaCoreReactorII + Project_AntimatterPulsedPlasmaCoreLantern |
| Zeta Helion Lantern | Project_ZetaHelionLantern | project | SpaceScience | 50000 | MagneticNozzles + Project_ZPinchFusionReactorIII |
| Helion Nova Lantern | Project_HelionNovaLantern | project | SpaceScience | 55000 | MagneticNozzles + Project_InertialConfinementFusionReactorIII |
| Protium Torus Lantern | Project_ProtiumTorusLantern | project | SpaceScience | 60000 | MagneticNozzles + Project_FusionTokamakV |
| Zeta Borane Lantern | Project_ZetaBoraneLantern | project | SpaceScience | 60000 | MagneticNozzles + Project_ZPinchFusionReactorIV |
| Borane Nova Lantern | Project_BoraneNovaLantern | project | SpaceScience | 65000 | MagneticNozzles + Project_InertialConfinementFusionReactorV |
| Borane Plasmajet Torch | Project_BoranePlasmajetTorch | project | SpaceScience | 75000 | MagneticNozzles + Project_HybridConfinementFusionReactorIV |
| Zeta Deuteron Torch | Project_ZetaDeuteronTorch | project | SpaceScience | 100000 | MagneticNozzles + Project_FlowStabilizedZPinchFusionReactor |
| Advanced Antimatter Plasma Core Torch | Project_AdvancedAntimatterPlasmaCoreTorch | project | SpaceScience | 120000 | AntimatterPropulsion + Project_AntimatterPlasmaCoreReactorIII + Project_AntimatterPlasmaCoreTorch |
| Helion Nova Torch | Project_HelionNovaTorch | project | SpaceScience | 120000 | MagneticNozzles + Project_InertialConfinementFusionReactorIV |
| Poseidon Torch | Project_NeutronFluxTorch | project | SpaceScience | 150000 | Project_NeutronFluxLantern + MagneticNozzles |
| Pion Torch | Project_AntimatterBeamCoreTorch | project | SpaceScience | 200000 | AntimatterPropulsion + MagneticNozzles + Project_AntimatterBeamCoreReactor |
| Protium Nova Torch | Project_ProtiumNovaTorch | project | SpaceScience | 200000 | MagneticNozzles + Project_InertialConfinementFusionReactorVI |
| Protium Converter Torch | Project_ProtiumConverterTorch | project | SpaceScience | 1000000 | Project_ProtiumNovaTorch + Project_InertialConfinementFusionReactorVII |
| Alien Advanced Master Project | Project_AlienAdvancedMasterProject | project | Xenology | -1 | Project_AlienMasterProject + faction:AlienCouncil |
| Alien Master Project | Project_AlienMasterProject | project | Xenology | -1 | faction:AlienCouncil |
| Alien Signatures | Project_TheirSignatures | project | Xenology | 25 | objective:InvestigateAlienCrashdown |
| Alien Methods | Project_TheirMethods | project | Xenology | 300 | objective:InvestigateAlienAbductions |
| Xenology Lab | Project_XenologyLab | project | Xenology | 300 | (Project_PlatformCore OR Project_OutpostCore) + WeAreNotAlone + Project_TheirSignatures |
| Alien Flora | Project_AlienFlora | project | Xenology | 500 | milestone:DetectXenoforming |
| Alien Operations | Project_TheirOperations | project | Xenology | 500 | objective:InvestigateEnthrallMission |
| Xenoscience Research Center | Project_XenoscienceResearchCenter | project | Xenology | 1500 | (Project_OrbitalCore OR Project_SettlementCore) + Project_XenologyLab + DirectedSpaceResearch |
| Alien Movements | Project_TheirMovements | project | Xenology | 2000 | Project_TheirOperations |
| Alien Origin | Project_TheirOrigin | project | Xenology | 2000 | Project_TheirSignatures + DeepSystemSkywatch |
| Alien Bandwidth | Project_AlienBandwidth | project | Xenology | 2500 | Project_HydraDiplomacy + Project_SubmitVictory + faction:SubmitCouncil |
| Appease the Invaders | Project_AppeaseVictory | project | Xenology | 2500 | Project_TheirOperations + faction:AppeaseCouncil |
| Purify the Earth | Project_DestroyVictory | project | Xenology | 2500 | Project_TheirMethods + faction:DestroyCouncil |
| Means to an End | Project_ExploitVictory | project | Xenology | 2500 | Project_Pherocytes + faction:ExploitCouncil |
| Rapid Response Teams | Project_RapidResponseTeams | project | Xenology | 2500 | TerrestrialMilitaryScience + milestone:TargetedByTerrorMission + faction:ResistCouncil/DestroyCouncil/ExploitCouncil/EscapeCouncil/CooperateCouncil |
| Defend the Earth | Project_ResistVictory | project | Xenology | 2500 | Project_TheirOperations + faction:ResistCouncil |
| Path to Paradise | Project_SubmitVictory | project | Xenology | 2500 | Project_TheirMethods + faction:SubmitCouncil |
| War Dog Necropsy | Project_WarDogNecropsy | project | Xenology | 2500 | Biotechnology + milestone:AccessWarDogCorpus |
| Hydra Containment | Project_AlienContainment | project | Xenology | 5000 | Project_Pherocytes |
| Alien-Adapted ECM | Project_AlienECM | project | Xenology | 5000 | Project_ECM1 + Project_TheirComputers + Project_TheirWarships + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Leave the Cradle | Project_EscapeVictory | project | Xenology | 5000 | Project_TheirOrigin + faction:EscapeCouncil |
| Executive Protection | Project_ExecutiveProtection | project | Xenology | 5000 | Project_Pherocytes + ArrivalSecurity + faction:ResistCouncil/DestroyCouncil/ExploitCouncil/EscapeCouncil/CooperateCouncil/AppeaseCouncil |
| Griffin Autopsy | Project_GriffinAutopsy | project | Xenology | 5000 | Biotechnology + milestone:AccessGriffinCorpus |
| Hydra Biology | Project_HydraBiology | project | Xenology | 5000 | objective:AccessHydraCorpus |
| Hydra Direct Support Network | Project_NegotiatedSupportChannel | project | Xenology | 5000 | Project_HydraDiplomacy + IndustrializationofSpace + faction:AppeaseCouncil |
| Pherocytes | Project_Pherocytes | project | Xenology | 5000 | (Project_HydraBiology OR Project_CoexistencePact) |
| Hydra Direct Support Network | Project_ProxySupportChannel | project | Xenology | 5000 | Project_HydraDiplomacy + MissionToSpace + faction:SubmitCouncil |
| Salamander Autopsy | Project_SalamanderAutopsy | project | Xenology | 5000 | Biotechnology + milestone:AccessSalamanderCorpus + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil |
| Security Measures | Project_SecurityMeasures | project | Xenology | 5000 | Project_TheirOperations + AdvancedNeuralNetworks + ArrivalSecurity + faction:ResistCouncil/DestroyCouncil/ExploitCouncil/EscapeCouncil/CooperateCouncil/AppeaseCouncil |
| Alien Computers | Project_TheirComputers | project | Xenology | 5000 | Project_TheirTechnology + QuantumComputing |
| Their Demands | Project_TheirDemands | project | Xenology | 5000 | Project_HydraDiplomacy + faction:AppeaseCouncil/CooperateCouncil/SubmitCouncil |
| Xenoflora Defoliants | Project_XenofloraDefoliants | project | Xenology | 5000 | Project_AlienFlora + milestone:DetectXenoforming + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Xenotourism | Project_Xenotourism | project | Xenology | 5000 | SpaceTourism + Project_XenofaunaHarmony + faction:SubmitCouncil/AppeaseCouncil |
| Pherocyte-Enhanced Interrogations | Project_Pherocyte-EnhancedInterrogations | project | Xenology | 8000 | ArrivalPsychology + AugmentedReality + Project_PherocyteMastery + faction:ExploitCouncil |
| Alien Army Analysis | Project_AlienArmyAnalysis | project | Xenology | 10000 | NetworkedGlobalDefense + Project_TheirTechnology + milestone:AlienArmyDestroyed |
| Coordinated Resource Support | Project_CoordinatedResourceSupport | project | Xenology | 10000 | Project_ProxySupportChannel + SpaceCommerce + Project_SubmitVictory + faction:SubmitCouncil |
| Directed Resource Channel | Project_DirectedResourceChannel | project | Xenology | 10000 | Project_NegotiatedSupportChannel + SpaceCommerce + Project_AppeaseVictory + faction:AppeaseCouncil |
| Griffin Interrogation | Project_GriffinInterrogation | project | Xenology | 10000 | Biotechnology + Project_Pherocytes + milestone:AccessLiveGriffin |
| Hydra Diplomacy | Project_HydraDiplomacy | project | Xenology | 10000 | Project_HydraLanguage + faction:AppeaseCouncil/CooperateCouncil/SubmitCouncil |
| Hydra Language | Project_HydraLanguage | project | Xenology | 10000 | (objective:CaptureAHydra OR objective:ContactTheAliens) |
| Idea Injections | Project_IdeaViruses | project | Xenology | 10000 | TargetedBiologicalWarfare + AppliedArtificialIntelligence + Project_PherocyteMastery + faction:ExploitCouncil |
| Megafauna Necropsy | Project_MegafaunaNecropsy | project | Xenology | 10000 | Biotechnology + milestone:AccessAlienMegafauna |
| Pherocyte Emitter | Project_PherocyteEmitter | project | Xenology | 10000 | MindandMachine + Project_Pherocytes + Project_NeuralEngineering |
| Pherocyte Liability Theory | Project_PherocyteLiabilityTheory | project | Xenology | 10000 | ArrivalLaw + Project_Pherocytes + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Pherocyte Quarantine Protocols | Project_PherocyteQuarantineProtocols | project | Xenology | 10000 | PredictiveGenetics + ArrivalMassCommunications + Project_Pherocytes + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Pherocyte Scanners | Project_PherocyteScanners | project | Xenology | 10000 | MolecularAssemblers + Project_Pherocytes + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Reverse-Engineered Alien Small Arms | Project_Reverse-EngineeredAlienSmallArms | project | Xenology | 10000 | Project_TheirTechnology + milestone:AccessAlienTech |
| Salamander Interrogation | Project_SalamanderInterrogation | project | Xenology | 10000 | Biotechnology + Project_Pherocytes + milestone:AccessLiveSalamander |
| Strategic Deception | Project_StrategicDeception | project | Xenology | 10000 | ArrivalSecurity + Project_HydraInterrogation + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| The Alien Nation | Project_TheAlienNation | project | Xenology | 10000 | Project_HydraDiplomacy + faction:SubmitCouncil |
| The One True Path | Project_TheOneTruePath | project | Xenology | 10000 | Project_SubmitVictory + Project_TheAlienNation + Project_TheirDemands + faction:SubmitCouncil |
| Alien Technology | Project_TheirTechnology | project | Xenology | 10000 | Project_TheirSignatures + milestone:AccessAlienTech |
| Alien Warships | Project_TheirWarships | project | Xenology | 10000 | Project_TheirTechnology + objective:SalvageAlienWarship |
| Xenofauna Harmony | Project_XenofaunaHarmony | project | Xenology | 10000 | Project_AlienFlora + milestone:AlienMegafaunaSpawns + faction:SubmitCouncil/AppeaseCouncil |
| Xenoscience Institute | Project_XenoscienceInstitute | project | Xenology | 10000 | (Project_RingCore OR Project_ColonyCore) + Project_XenoscienceResearchCenter + Project_Exotics + AppliedArtificialIntelligence |
| Alien Red Teaming | Project_AlienRedTeaming | project | Xenology | 15000 | MindandMachine + Project_HydraInterrogation + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil |
| Maskirovka | Project_Maskirovka | project | Xenology | 15000 | QuantumEncryption + Project_StrategicDeception + Project_TheirTechnology + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Security Accountability Chaining | Project_SecurityAccountabilityChaining | project | Xenology | 15000 | ArrivalSecurity + Project_PherocyteScanners + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Alien Robotics | Project_TheirRobotics | project | Xenology | 15000 | Project_TheirComputers |
| Xenological Culls | Project_XenologicalCulls | project | Xenology | 15000 | TargetedBiologicalWarfare + Project_XenofloraDefoliants + Project_MegafaunaNecropsy + milestone:AccessAlienMegafauna + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| A New Home | Project_ANewHome | project | Xenology | 20000 | objective:BeginTheSearch + faction:EscapeCouncil |
| Advanced Xenological Monitoring | Project_AdvancedXenologicalMonitoring | project | Xenology | 20000 | AdministrationAlgorithms + Project_MegafaunaNecropsy + Project_AlienFlora + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Community Policing Drones | Project_CommunityPolicingDrones | project | Xenology | 20000 | NextGenerationAerospace + NetworkedGlobalDefense + Project_Pherocytes + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Exotic Materials | Project_Exotics | project | Xenology | 20000 | (Project_TheirTechnology OR Project_HydraDiplomacy) + (objective:SalvageAlienWarship OR objective:ContactTheAliens) |
| Hunter-Killer Tactical Units | Project_Hunter-KillerTacticalUnits | project | Xenology | 20000 | NetworkedGlobalDefense + Project_SalamanderInterrogation + Project_Reverse-EngineeredAlienSmallArms + Project_CounteralienOperationsTeams + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil |
| Hydra Interrogation | Project_HydraInterrogation | project | Xenology | 20000 | Project_HydraLanguage + Project_AlienContainment + objective:CaptureAHydra + faction:CooperateCouncil/DestroyCouncil/EscapeCouncil/ExploitCouncil/ResistCouncil |
| Operational Misdirection | Project_OperationalMisdirection | project | Xenology | 20000 | FleetLogistics + Project_StrategicDeception + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Pherocyte Exposure Network Tracing | Project_PherocyteExposureNetworkTracing | project | Xenology | 20000 | WhiteCollarAutomation + Project_Pherocytes + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Pherocyte Mass Emitter | Project_PherocyteMassEmitter | project | Xenology | 20000 | Project_PherocyteMastery + Project_PherocyteEmitter |
| Policymaker Behavioral Analysis | Project_PolicymakerBehaviorialAnalysis | project | Xenology | 20000 | ArrivalGovernance + WhiteCollarAutomation + Project_Pherocytes + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Predictive Abduction Modeling | Project_PredictiveAbductionModeling | project | Xenology | 20000 | WhiteCollarAutomation + Project_HydraInterrogation + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Regional Security Sweeps | Project_RegionalSecuritySweeps | project | Xenology | 20000 | NetworkedGlobalDefense + Project_PherocyteDeconOperations + Project_RapidResponseTeams + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil |
| Their Purpose | Project_TheirPurpose | project | Xenology | 20000 | Project_HydraInterrogation |
| Their Weakness | Project_TheirWeakness | project | Xenology | 20000 | Project_HydraInterrogation + faction:DestroyCouncil/CooperateCouncil |
| Coexistence Pact | Project_CoexistencePact | project | Xenology | 25000 | Project_AppeaseVictory + Project_TheirDemands + faction:AppeaseCouncil |
| A Cooperative Resolution | Project_CooperateVictory | project | Xenology | 25000 | Project_TheirOperations + faction:CooperateCouncil |
| Exotic Hybrid Systems | Project_ExoticHybridSystems | project | Xenology | 25000 | QuantumComputing + Project_Exotics |
| Industrial Support Agreement | Project_IndustrialSupportAgreement | project | Xenology | 25000 | Project_DirectedResourceChannel + IntegratedEarthSpaceEconomy + faction:AppeaseCouncil |
| Pherocyte Decon Operations | Project_PherocyteDeconOperations | project | Xenology | 25000 | DesignerLifeforms + ArrivalSecurity + Project_PherocyteScanners + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| The Final Assault | Project_TheFinalAssault | project | Xenology | 25000 | Project_ResistVictory + Project_TheChokePoint + faction:ResistCouncil |
| Battlefield Pherocyte Decontamination | Project_BattlefieldPherocyteDecontamination | project | Xenology | 30000 | NetworkedGlobalDefense + Project_PherocyteDeconOperations + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Battlefield Pherocyte Deployment | Project_BattlefieldPherocyteDeployment | project | Xenology | 30000 | Project_PherocyteMastery + faction:ExploitCouncil |
| Pherocyte Resistance | Project_PherocyteResistance | project | Xenology | 30000 | Project_HydraInterrogation + Project_Pherocytes |
| Public Behavioral Monitoring | Project_PublicBehaviorialMonitoring | project | Xenology | 30000 | ArrivalCulture + Cybernetics + Project_Pherocytes + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| Wormholes | Project_Wormholes | project | Xenology | 30000 | Project_Exotics + Project_HydraInterrogation + Project_TheirOrigin + faction:CooperateCouncil/DestroyCouncil/EscapeCouncil/ExploitCouncil/ResistCouncil |
| Pherocyte Inoculations | Project_PherocyteInoculations | project | Xenology | 35000 | TransformPhages + Project_MegafaunaNecropsy + Project_GriffinInterrogation + Project_WarDogNecropsy + Project_SalamanderInterrogation + faction:DestroyCouncil/ResistCouncil/ExploitCouncil/CooperateCouncil/EscapeCouncil/AppeaseCouncil |
| The Choke Point | Project_TheChokePoint | project | Xenology | 40000 | Project_Wormholes + Project_TheirPurpose + faction:CooperateCouncil/DestroyCouncil/ExploitCouncil/ResistCouncil |
| Hydra Biowarfare | Project_HydraBiowarfare | project | Xenology | 50000 | Project_TheirWeakness + Project_PherocyteResistance + faction:DestroyCouncil |
| Integrated Human-Hydra Economy | Project_IntegratedHuman-HydraEconomy | project | Xenology | 50000 | Project_CoordinatedResourceSupport + IntegratedEarthSpaceEconomy + faction:SubmitCouncil |
| Kill the Hive | Project_KilltheHive | project | Xenology | 50000 | Project_DestroyVictory + Project_TheChokePoint + Project_HydraBiowarfare + faction:DestroyCouncil |
| Megafauna Mastery | Project_MegafaunaMastery | project | Xenology | 50000 | Project_PherocyteMastery + Project_MegafaunaNecropsy + Project_AlienFlora + faction:ExploitCouncil |
| Pherocyte Mastery | Project_PherocyteMastery | project | Xenology | 50000 | Project_PherocyteResistance + faction:ExploitCouncil |
| The Great Journey Ahead | Project_TheGreatJourney | project | Xenology | 50000 | Project_EscapeVictory + Project_ExoticHybridSystems + Project_ANewHome + faction:EscapeCouncil |
| Enslave the Masters | Project_EnslavetheMasters | project | Xenology | 75000 | Project_ExploitVictory + Project_TheChokePoint + Project_PherocyteMastery + faction:ExploitCouncil |
| A Permanent Peace | Project_APermanentPeace | project | Xenology | 100000 | Project_CooperateVictory + Project_PherocyteResistance + Project_TheirDemands + Project_TheirWeakness + Project_TheChokePoint + faction:CooperateCouncil |
