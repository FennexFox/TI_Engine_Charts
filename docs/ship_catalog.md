# Terra Invicta Ship Catalog

Generated from `TerraInvicta_Data/StreamingAssets/Templates`.

This file is generated. Rebuild it with:

```powershell
python .\tools\build_ship_catalog.py
```

Important interpretation notes:

- Hull dry mass comes from `TIShipHullTemplate.mass_tons`.
- Weapon dry mass comes from weapon template `baseWeaponMass_tons`.
- Weapon hardpoint use is derived from mount names: `Half*` = 1, `One*` = 1, `Two*` = 2, `Three*` = 3, `Four*` = 4.
- Utility module dry mass comes from `TIUtilityModuleTemplate.mass_tons`.
- Human shipyard build times use `constructionTimeModifier`: T1 Space Dock = 1.0, T2 Shipyard = 0.8, T3 Spaceworks = 0.6.
- Armor templates are included for dry-mass calculation; armor mass depends on hull dimensions, armor material, and nose/lateral/tail point layout.

Hull count: `28` total, `12` human buildable.
Utility module count: `58` total, `42` human.
Weapon module count: `309` total, `245` human.
Armor count: `12`.

## Hulls

| Name | dataName | Mass t | Tier | Nose HP | Hull HP | Utility | Required project |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gunship | Gunship | 178 | 1 | 1 | 0 | 2 | Project_Warships |
| Escort | Escort | 350 | 1 | 0 | 2 | 2 | Project_Warships |
| Corvette | Corvette | 400 | 1 | 1 | 1 | 3 | Project_Warships |
| Frigate | Frigate | 600 | 1 | 1 | 2 | 5 | Project_PatrolVessels |
| Monitor | Monitor | 800 | 2 | 0 | 4 | 3 | Project_PatrolVessels |
| Destroyer | Destroyer | 825 | 2 | 2 | 2 | 5 | Project_PatrolVessels |
| Cruiser | Cruiser | 1000 | 2 | 2 | 3 | 7 | Project_FleetCombatants |
| Battlecruiser | Battlecruiser | 1200 | 2 | 3 | 2 | 5 | Project_FleetCombatants |
| Battleship | Battleship | 1600 | 3 | 2 | 6 | 6 | Project_FleetCombatants |
| Lancer | Lancer | 2000 | 3 | 4 | 3 | 7 | Project_ShipsoftheLine |
| Dreadnought | Dreadnought | 2400 | 3 | 3 | 8 | 7 | Project_ShipsoftheLine |
| Titan | Titan | 3200 | 3 | 4 | 6 | 9 | Project_Titans |
| Fighter | STOFighter | 30 | 1 | 1 | 1 | 1 |  |
| Gunship | AlienGunship | 192 | 1 | 1 | 0 | 3 | Project_AlienMasterProject |
| Corvette | AlienCorvette | 288 | 1 | 1 | 1 | 4 | Project_AlienMasterProject |
| Escort | AlienEscort | 288 | 1 | 0 | 2 | 4 | Project_AlienMasterProject |
| Frigate | AlienFrigate | 576 | 1 | 1 | 3 | 5 | Project_AlienMasterProject |
| Destroyer | AlienDestroyer | 672 | 2 | 2 | 2 | 5 | Project_AlienMasterProject |
| Monitor | AlienMonitor | 672 | 2 | 1 | 4 | 5 | Project_AlienMasterProject |
| Cruiser | AlienCruiser | 1056 | 2 | 2 | 4 | 7 | Project_AlienMasterProject |
| Battlecruiser | AlienBattlecruiser | 1440 | 2 | 3 | 3 | 6 | Project_AlienMasterProject |
| Battleship | AlienBattleship | 1536 | 2 | 2 | 6 | 7 | Project_AlienMasterProject |
| Lancer | AlienLancer | 1536 | 2 | 6 | 4 | 7 | Project_AlienMasterProject |
| Dreadnought | AlienDreadnought | 2016 | 2 | 4 | 8 | 9 | Project_AlienMasterProject |
| Titan | AlienTitan | 2304 | 3 | 6 | 8 | 7 | Project_AlienMasterProject |
| Assault Carrier | AlienAssaultCarrier | 2688 | 3 | 0 | 6 | 6 | Project_AlienMasterProject |
| Mothership | AlienMothership | 7680 | 3 | 4 | 16 | 7 | Project_AlienMasterProject |
| Fighter | SalamanderGunship | 20 | 1 | 1 | 1 | 1 | Project_AlienMasterProject |

## Utility Modules

| Name | dataName | Mass t | Crew | Power MW | Min tier | Required project |
| --- | --- | --- | --- | --- | --- | --- |
| Empty | Empty | 0 | 0 | 0 | 0 |  |
| ISRU Module | ISRUModule | 100 | 5 | 0 | 0 | Project_ISRUModule |
| Remass Scoop | RemassScoop | 40 | 1 | 0 | 0 | Project_RemassScoop |
| Component Armor | ComponentArmor | 500 | 0 | 0 | 0 | Project_ComponentArmor |
| Antimatter Spiker | AntimatterSpiker | 30 | 3 | 0 | 0 | Project_AntimatterSpiker |
| Muon Spiker | MuonSpiker | 30 | 3 | 0 | 0 | Project_MuonSpiker |
| Neutronium Spiker | NeutroniumSpiker | 30 | 3 | 0 | 0 | Project_NeutroniumSpiker |
| Liquid Hydrogen Containment | LiquidHydrogenContainment | 5 | 3 | 0 | 0 | Project_LiquidHydrogenContainment |
| Slush Hydrogen Tankage | SlushHydrogenTankage | 10 | 3 | 0 | 0 | Project_SlushHydrogenTankage |
| Hydron Trap | HydronTrap | 20 | 3 | 0 | 0 | Project_HydronTrap |
| ECM | ElectronicCountermeasures1 | 10 | 2 | 2 | 0 | Project_ECM1 |
| ECM Mk2 | ElectronicCountermeasures2 | 10 | 2 | 3 | 0 | Project_ECM2 |
| ECM Mk3 | ElectronicCountermeasures3 | 10 | 2 | 4 | 0 | Project_ECM3 |
| Targeting Computer | TargetingComputer1 | 10 | 1 | 1 | 0 | Project_TargetingComputer1 |
| Targeting Computer Mk2 | TargetingComputer2 | 10 | 1 | 1 | 0 | Project_TargetingComputer2 |
| Targeting Computer Mk3 | TargetingComputer3 | 10 | 1 | 1 | 0 | Project_TargetingComputer3 |
| Salvage Bay | SalvageBay | 1000 | 20 | 5 | 2 | Project_SalvageBay |
| Armor Struts | ArmorStruts | 100 | 0 | 0 | 0 | Project_ArmorStruts |
| Vector Thrusters | VectorThrusters | 20 | 0 | 0 | 0 | Project_PatrolVessels |
| Flag Bridge | FlagBridge | 90 | 18 | 1 | 2 | Project_FlagBridge |
| Laser Engine | LaserEngine | 25 | 3 | 5 | 0 | Project_LaserEngine |
| Advanced Laser Engine | AdvancedLaserEngine | 50 | 3 | 10 | 0 | Project_AdvancedLaserEngine |
| Cyclotron | Cyclotron | 50 | 3 | 5 | 0 | Project_Cyclotron |
| Magazine | Magazine | 100 | 3 | 0 | 0 | Project_Magazine |
| Advanced Marine Assault Unit | AdvancedMarineAssaultUnit | 200 | 30 | 0 | 0 | Project_AdvancedMarineAssaultUnit |
| Elite Marine Assault Unit | EliteMarineAssaultUnit | 200 | 30 | 0 | 0 | Project_EliteMarineAssaultUnit |
| Immortals | Immortals | 200 | 30 | 0 | 0 | Project_Immortals |
| Marine Assault Unit | MarineAssaultUnit | 200 | 30 | 0 | 0 | Project_MarineAssaultUnit |
| Mobile Space Science Lab | MobileSpaceScienceLab | 200 | 12 | 1 | 0 | Project_MobileSpaceScienceLab |
| Rangers | Rangers | 200 | 30 | 0 | 0 | Project_Rangers |
| Spartans | Spartans | 200 | 30 | 0 | 0 | Project_Spartans |
| Solar Platform Kit | SolarPlatformKit | 260 | 3 | 0 | 0 | Project_SolarPlatformKit |
| Solar Outpost Kit | SolarOutpostKit | 300 | 3 | 0 | 0 | Project_SolarOutpostKit |
| Automated Fission Platform Kit | AutomatedFissionPlatformKit | 325 | 12 | 0 | 0 | Project_AutomatedFissionPlatformKit |
| Automated Solar Platform Kit | AutomatedSolarPlatformKit | 325 | 12 | 0 | 0 | Project_AutomatedSolarPlatformKit |
| Fission Platform Kit | FissionPlatformKit | 325 | 3 | 0 | 0 | Project_FissionPlatformKit |
| Fission Outpost Kit | FissionOutpostKit | 350 | 3 | 0 | 0 | Project_FissionOutpostKit |
| Fusion Platform Kit | FusionPlatformKit | 375 | 3 | 0 | 0 | Project_FusionPlatformKit |
| Fusion Outpost Kit | FusionOutpostKit | 400 | 3 | 0 | 0 | Project_FusionOutpostKit |
| Repair Bay | RepairBay | 700 | 10 | 0 | 0 | Project_RepairBay |
| Automated Solar Outpost Kit | AutomatedSolarOutpostKit | 1500 | 12 | 0 | 0 | Project_AutomatedSolarOutpostKit |
| Automated Fission Outpost Kit | AutomatedFissionOutpostKit | 1650 | 12 | 0 | 0 | Project_AutomatedFissionOutpostKit |
| Unknown | AlienMuonSpiker | 10 | 0 | 0 | 0 | Project_AlienMasterProject |
| Unknown | AlienHydronTrap | 10 | 0 | 0 | 0 | Project_AlienMasterProject |
| Unknown | AlienSlushHydrogenTankage | 10 | 0 | 0 | 0 | Project_AlienMasterProject |
| Unknown | HydraInfiltrationPod | 10 | 1 | 0 | 0 | Project_AlienMasterProject |
| Unknown | SalamanderTerrorUnitPod | 10 | 30 | 0 | 0 | Project_AlienMasterProject |
| Unknown | AlienArmyPod | 10000 | 3000 | 0 | 3 | Project_AlienMasterProject |
| Unknown | AlienSurveillanceModule | 20 | 3 | 0 | 0 | Project_AlienMasterProject |
| Alien ECM | AlienECM | 10 | 1 | 2 | 0 | Project_AlienMasterProject |
| Unknown | AlienTargetingComputer | 10 | 1 | 1 | 0 | Project_AlienMasterProject |
| Unknown | AlienSurveillancePlatform | 0 | 8 | 0 | 1 | Project_AlienMasterProject |
| Unknown | AlienSurveillanceOrbital | 0 | 32 | 0 | 2 | Project_AlienMasterProject |
| Unknown | AlienSurveillanceRing | 0 | 128 | 0 | 3 | Project_AlienMasterProject |
| Unknown | AlienMagazine | 100 | 1 | 0 | 0 | Project_AlienMasterProject |
| Unknown | AlienFusionOutpostKit | 500 | 0 | 0 | 0 | Project_AlienMasterProject |
| Unknown | AlienFusionPlatformKit | 500 | 0 | 0 | 0 | Project_AlienMasterProject |
| Unknown | AlienRepairBay | 500 | 4 | 0 | 0 | Project_AlienMasterProject |

## Weapon Modules

| Name | dataName | Type | Mount | Slot | Size | Mass t | Crew | Required project |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 35mm Autocannon | 35mmAutocannon | gun | HalfNose | nose | 1 | 1 | 0 |  |
| 40mm Autocannon | 40mmNoseAutocannon | gun | HalfNose | nose | 1 | 2 | 0 | Project_40mmAutocannon |
| 10-inch Cannon | 10-inchCannon | gun | OneNose | nose | 1 | 125 | 4 | Project_Warships |
| 240 cm Infrared Phaser Cannon | 240cmIRPhaserCannon | laser | OneNose | nose | 1 | 150 | 4 | Project_240cmIRPhaserCannon |
| 240 cm Green Arc Laser Cannon | 240cmGreenArcLaserCannon | laser | OneNose | nose | 1 | 235 | 4 | Project_240cmGreenArcLaserCannon |
| 240 cm Green Phaser Cannon | 240cmGreenPhaserCannon | laser | OneNose | nose | 1 | 235 | 4 | Project_240cmGreenPhaserCannon |
| 240 cm Infrared Arc Laser Cannon | 240cmIRArcLaserCannon | laser | OneNose | nose | 1 | 235 | 4 | Project_240cmIRArcLaserCannon |
| 240 cm Ultraviolet Arc Laser Cannon | 240cmUVArcLaserCannon | laser | OneNose | nose | 1 | 235 | 4 | Project_240cmUVArcLaserCannon |
| 240 cm Ultraviolet Phaser Cannon | 240cmUVPhaserCannon | laser | OneNose | nose | 1 | 235 | 4 | Project_240cmUVPhaserCannon |
| 240 cm Green Laser Cannon | 240cmGreenLaserCannon | laser | OneNose | nose | 1 | 300 | 4 | Project_240cmGreenLaserCannon |
| 240 cm Infrared Laser Cannon | 240cmIRLaserCannon | laser | OneNose | nose | 1 | 300 | 4 | Project_240cmIRLaserCannon |
| 240 cm Ultraviolet Laser Cannon | 240cmUVLaserCannon | laser | OneNose | nose | 1 | 300 | 4 | Project_240cmUVLaserCannon |
| Light Coil Cannon Mk3 | LightCoilCannonMk3 | magnetic | OneNose | nose | 1 | 50 | 4 | Project_CoilCannonMk3 |
| Light Rail Cannon Mk3 | LightRailCannonMk3 | magnetic | OneNose | nose | 1 | 50 | 4 | Project_RailCannonMk3 |
| Light Coil Cannon Mk2 | LightCoilCannonMk2 | magnetic | OneNose | nose | 1 | 55 | 4 | Project_CoilCannonMk2 |
| Light Rail Cannon Mk2 | LightRailCannonMk2 | magnetic | OneNose | nose | 1 | 55 | 4 | Project_RailCannonMk2 |
| Light Coil Cannon Mk1 | LightCoilCannonMk1 | magnetic | OneNose | nose | 1 | 60 | 4 | Project_CoilCannonMk1 |
| Light Rail Cannon Mk1 | LightRailCannonMk1 | magnetic | OneNose | nose | 1 | 60 | 4 | Project_RailCannonMk1 |
| Light Ion Cannon | LightIonCannon | particle | OneNose | nose | 1 | 15 | 2 | Project_IonCannon |
| Light Particle Lance | LightParticleLance | particle | OneNose | nose | 1 | 20 | 3 | Project_ParticleLance |
| 12-inch Cannon | 12-inchCannon | gun | TwoNoseVert | nose | 2 | 225 | 5 | Project_PatrolVessels |
| 480 cm Infrared Phaser Cannon | 480cmIRPhaserCannon | laser | TwoNoseVert | nose | 2 | 250 | 5 | Project_240cmIRPhaserCannon |
| 480 cm Green Arc Laser Cannon | 480cmGreenArcLaserCannon | laser | TwoNoseVert | nose | 2 | 395 | 5 | Project_240cmGreenArcLaserCannon |
| 480 cm Green Phaser Cannon | 480cmGreenPhaserCannon | laser | TwoNoseVert | nose | 2 | 395 | 5 | Project_240cmGreenPhaserCannon |
| 480 cm Infrared Arc Laser Cannon | 480cmIRArcLaserCannon | laser | TwoNoseVert | nose | 2 | 395 | 5 | Project_240cmIRArcLaserCannon |
| 480 cm Ultraviolet Arc Laser Cannon | 480cmUVArcLaserCannon | laser | TwoNoseVert | nose | 2 | 395 | 5 | Project_240cmUVArcLaserCannon |
| 480 cm Ultraviolet Phaser Cannon | 480cmUVPhaserCannon | laser | TwoNoseVert | nose | 2 | 395 | 5 | Project_240cmUVPhaserCannon |
| 480 cm Green Laser Cannon | 480cmGreenLaserCannon | laser | TwoNoseVert | nose | 2 | 500 | 5 | Project_240cmGreenLaserCannon |
| 480 cm Infrared Laser Cannon | 480cmIRLaserCannon | laser | TwoNoseVert | nose | 2 | 500 | 5 | Project_240cmIRLaserCannon |
| 480 cm Ultraviolet Laser Cannon | 480cmUVLaserCannon | laser | TwoNoseVert | nose | 2 | 500 | 5 | Project_240cmUVLaserCannon |
| Coil Cannon Mk3 | CoilCannonMk3 | magnetic | TwoNoseVert | nose | 2 | 100 | 5 | Project_CoilCannonMk3 |
| Rail Cannon Mk3 | RailCannonMk3 | magnetic | TwoNoseVert | nose | 2 | 100 | 5 | Project_RailCannonMk3 |
| Coil Cannon Mk2 | CoilCannonMk2 | magnetic | TwoNoseVert | nose | 2 | 110 | 5 | Project_CoilCannonMk2 |
| Rail Cannon Mk2 | RailCannonMk2 | magnetic | TwoNoseVert | nose | 2 | 110 | 5 | Project_RailCannonMk2 |
| Coil Cannon Mk1 | CoilCannonMk1 | magnetic | TwoNoseVert | nose | 2 | 120 | 5 | Project_CoilCannonMk1 |
| Rail Cannon Mk1 | RailCannonMk1 | magnetic | TwoNoseVert | nose | 2 | 120 | 5 | Project_RailCannonMk1 |
| Electron Lance | ElectronLance | particle | TwoNoseVert | nose | 2 | 30 | 2 | Project_ElectronLance |
| Ion Cannon | IonCannon | particle | TwoNoseVert | nose | 2 | 30 | 2 | Project_IonCannon |
| Antimatter Cannon | AntimatterParticleCannon | particle | TwoNoseVert | nose | 2 | 40 | 4 | Project_AntimatterParticleCannon |
| Particle Lance | ParticleLance | particle | TwoNoseVert | nose | 2 | 40 | 3 | Project_ParticleLance |
| 720 cm Infrared Phaser Cannon | 720cmIRPhaserCannon | laser | ThreeNoseAngle | nose | 3 | 350 | 6 | Project_240cmIRPhaserCannon |
| 720 cm Green Arc Laser Cannon | 720cmGreenArcLaserCannon | laser | ThreeNoseAngle | nose | 3 | 555 | 6 | Project_240cmGreenArcLaserCannon |
| 720 cm Green Phaser Cannon | 720cmGreenPhaserCannon | laser | ThreeNoseAngle | nose | 3 | 555 | 6 | Project_240cmGreenPhaserCannon |
| 720 cm Infrared Arc Laser Cannon | 720cmIRArcLaserCannon | laser | ThreeNoseAngle | nose | 3 | 555 | 6 | Project_240cmIRArcLaserCannon |
| 720 cm Ultraviolet Arc Laser Cannon | 720cmUVArcLaserCannon | laser | ThreeNoseAngle | nose | 3 | 555 | 6 | Project_240cmUVArcLaserCannon |
| 720 cm Ultraviolet Phaser Cannon | 720cmUVPhaserCannon | laser | ThreeNoseAngle | nose | 3 | 555 | 6 | Project_240cmUVPhaserCannon |
| 720 cm Green Laser Cannon | 720cmGreenLaserCannon | laser | ThreeNoseAngle | nose | 3 | 700 | 6 | Project_240cmGreenLaserCannon |
| 720 cm Infrared Laser Cannon | 720cmIRLaserCannon | laser | ThreeNoseAngle | nose | 3 | 700 | 6 | Project_240cmIRLaserCannon |
| 720 cm Ultraviolet Laser Cannon | 720cmUVLaserCannon | laser | ThreeNoseAngle | nose | 3 | 700 | 6 | Project_240cmUVLaserCannon |
| Heavy Coil Cannon Mk3 | HeavyCoilCannonMk3 | magnetic | ThreeNoseAngle | nose | 3 | 150 | 6 | Project_CoilCannonMk3 |
| Heavy Rail Cannon Mk3 | HeavyRailCannonMk3 | magnetic | ThreeNoseAngle | nose | 3 | 150 | 6 | Project_RailCannonMk3 |
| Heavy Coil Cannon Mk2 | HeavyCoilCannonMk2 | magnetic | ThreeNoseAngle | nose | 3 | 165 | 6 | Project_CoilCannonMk2 |
| Heavy Rail Cannon Mk2 | HeavyRailCannonMk2 | magnetic | ThreeNoseAngle | nose | 3 | 165 | 6 | Project_RailCannonMk2 |
| Heavy Coil Cannon Mk1 | HeavyCoilCannonMk1 | magnetic | ThreeNoseAngle | nose | 3 | 180 | 6 | Project_CoilCannonMk1 |
| Heavy Rail Cannon Mk1 | HeavyRailCannonMk1 | magnetic | ThreeNoseAngle | nose | 3 | 180 | 6 | Project_RailCannonMk1 |
| Heavy Siege Coiler Mk1 | HeavySiegeCoilerMk1 | magnetic | ThreeNoseAngle | nose | 3 | 1000 | 6 | Project_CoilCannonMk1 |
| Heavy Siege Coiler Mk2 | HeavySiegeCoilerMk2 | magnetic | ThreeNoseAngle | nose | 3 | 1000 | 6 | Project_CoilCannonMk2 |
| Heavy Siege Coiler Mk3 | HeavySiegeCoilerMk3 | magnetic | ThreeNoseAngle | nose | 3 | 1000 | 6 | Project_CoilCannonMk3 |
| Heavy Electron Lance | HeavyElectronLance | particle | ThreeNoseAngle | nose | 3 | 60 | 2 | Project_ElectronLance |
| Heavy Ion Cannon | HeavyIonCannon | particle | ThreeNoseAngle | nose | 3 | 60 | 2 | Project_IonCannon |
| Heavy Particle Lance | HeavyParticleLance | particle | ThreeNoseAngle | nose | 3 | 80 | 3 | Project_ParticleLance |
| Heavy Antimatter Cannon | HeavyAntimatterParticleCannon | particle | ThreeNoseAngle | nose | 3 | 240 | 4 | Project_AntimatterParticleCannon |
| Heavy Plasma Cannon Mk3 | PlasmaCannonMk3 | plasma | ThreeNoseAngle | nose | 3 | 420 | 5 | Project_PlasmaCannonMk3 |
| Heavy Plasma Cannon Mk2 | PlasmaCannonMk2 | plasma | ThreeNoseAngle | nose | 3 | 480 | 5 | Project_PlasmaCannonMk2 |
| Heavy Plasma Cannon Mk1 | PlasmaCannonMk1 | plasma | ThreeNoseAngle | nose | 3 | 540 | 5 | Project_PlasmaCannonMk1 |
| 960 cm Infrared Phaser Cannon | 960cmIRPhaserCannon | laser | FourNose | nose | 4 | 450 | 8 | Project_240cmIRPhaserCannon |
| 960 cm Green Arc Laser Cannon | 960cmGreenArcLaserCannon | laser | FourNose | nose | 4 | 715 | 8 | Project_240cmGreenArcLaserCannon |
| 960 cm Green Phaser Cannon | 960cmGreenPhaserCannon | laser | FourNose | nose | 4 | 715 | 8 | Project_240cmGreenPhaserCannon |
| 960 cm Infrared Arc Laser Cannon | 960cmIRArcLaserCannon | laser | FourNose | nose | 4 | 715 | 8 | Project_240cmIRArcLaserCannon |
| 960 cm Ultraviolet Arc Laser Cannon | 960cmUVArcLaserCannon | laser | FourNose | nose | 4 | 715 | 8 | Project_240cmUVArcLaserCannon |
| 960 cm Ultraviolet Phaser Cannon | 960cmUVPhaserCannon | laser | FourNose | nose | 4 | 715 | 8 | Project_240cmUVPhaserCannon |
| 960 cm Green Laser Cannon | 960cmGreenLaserCannon | laser | FourNose | nose | 4 | 900 | 8 | Project_240cmGreenLaserCannon |
| 960 cm Infrared Laser Cannon | 960cmIRLaserCannon | laser | FourNose | nose | 4 | 900 | 8 | Project_240cmIRLaserCannon |
| 960 cm Ultraviolet Laser Cannon | 960cmUVLaserCannon | laser | FourNose | nose | 4 | 900 | 8 | Project_240cmUVLaserCannon |
| Spinal Coiler Mk3 | SpinalCoilerMk3 | magnetic | FourNose | nose | 4 | 200 | 6 | Project_CoilCannonMk3 |
| Spinal Railgun Mk3 | SpinalRailgunMk3 | magnetic | FourNose | nose | 4 | 200 | 6 | Project_RailCannonMk3 |
| Spinal Coiler Mk2 | SpinalCoilerMk2 | magnetic | FourNose | nose | 4 | 220 | 6 | Project_CoilCannonMk2 |
| Spinal Railgun Mk2 | SpinalRailgunMk2 | magnetic | FourNose | nose | 4 | 220 | 6 | Project_RailCannonMk2 |
| Spinal Coiler Mk1 | SpinalCoilerMk1 | magnetic | FourNose | nose | 4 | 240 | 6 | Project_CoilCannonMk1 |
| Spinal Railgun Mk1 | SpinalRailgunMk1 | magnetic | FourNose | nose | 4 | 240 | 6 | Project_RailCannonMk1 |
| Spinal Siege Coiler Mk1 | SpinalSiegeCoilerMk1 | magnetic | FourNose | nose | 4 | 1500 | 6 | Project_CoilCannonMk1 |
| Spinal Siege Coiler Mk2 | SpinalSiegeCoilerMk2 | magnetic | FourNose | nose | 4 | 1500 | 6 | Project_CoilCannonMk2 |
| Spinal Siege Coiler Mk3 | SpinalSiegeCoilerMk3 | magnetic | FourNose | nose | 4 | 1500 | 6 | Project_CoilCannonMk3 |
| Spinal Electron Lance | SpinalElectronLance | particle | FourNose | nose | 4 | 120 | 2 | Project_ElectronLance |
| Spinal Ion Cannon | SpinalIonCannon | particle | FourNose | nose | 4 | 120 | 2 | Project_IonCannon |
| Spinal Particle Lance | SpinalParticleLance | particle | FourNose | nose | 4 | 160 | 3 | Project_ParticleLance |
| Spinal Neutron Lance | SpinalNeutronLance | particle | FourNose | nose | 4 | 360 | 8 | Project_SpinalNeutronLance |
| Spinal Antimatter Cannon | SpinalAntimatterParticleCannon | particle | FourNose | nose | 4 | 480 | 4 | Project_AntimatterParticleCannon |
| Superheavy Plasma Cannon Mk3 | HeavyPlasmaCannonMk3 | plasma | FourNose | nose | 4 | 560 | 6 | Project_PlasmaCannonMk3 |
| Superheavy Plasma Cannon Mk2 | HeavyPlasmaCannonMk2 | plasma | FourNose | nose | 4 | 640 | 6 | Project_PlasmaCannonMk2 |
| Superheavy Plasma Cannon Mk1 | HeavyPlasmaCannonMk1 | plasma | FourNose | nose | 4 | 720 | 6 | Project_PlasmaCannonMk1 |
| 30mm Autocannon | 30mmAutocannon | gun | OneHull | hull | 1 | 3 | 1 | Project_Warships |
| 40mm Autocannon | 40mmAutocannon | gun | OneHull | hull | 1 | 25 | 1 | Project_40mmAutocannon |
| 6-inch Gun Battery | 6-inchCannon | gun | OneHull | hull | 1 | 25 | 3 | Project_Warships |
| Point Defense Arc Laser Turret | PointDefenseArcLaserTurret | laser | OneHull | hull | 1 | 20 | 2 | Project_PointDefenseArcLaserTurret |
| Point Defense Laser Turret | PointDefenseLaserTurret | laser | OneHull | hull | 1 | 20 | 2 | Project_PointDefenseLaserTurret |
| Point Defense Phaser Turret | PointDefensePhaserTurret | laser | OneHull | hull | 1 | 20 | 2 | Project_PointDefensePhaserTurret |
| 60 cm Infrared Phaser Battery | 60cmIRPhaserBattery | laser | OneHull | hull | 1 | 75 | 2 | Project_60cmIRPhaserBattery |
| 60 cm Green Arc Laser Battery | 60cmGreenArcLaserBattery | laser | OneHull | hull | 1 | 115 | 2 | Project_60cmGreenArcLaserBattery |
| 60 cm Green Phaser Battery | 60cmGreenPhaserBattery | laser | OneHull | hull | 1 | 115 | 2 | Project_60cmGreenPhaserBattery |
| 60 cm Infrared Arc Laser Battery | 60cmIRArcLaserBattery | laser | OneHull | hull | 1 | 115 | 2 | Project_60cmIRArcLaserBattery |
| 60 cm Ultraviolet Arc Laser Battery | 60cmUVArcLaserBattery | laser | OneHull | hull | 1 | 115 | 2 | Project_60cmUVArcLaserBattery |
| 60 cm Ultraviolet Phaser Battery | 60cmUVPhaserBattery | laser | OneHull | hull | 1 | 115 | 2 | Project_60cmUVPhaserBattery |
| 60 cm Green Laser Battery | 60cmGreenLaserBattery | laser | OneHull | hull | 1 | 150 | 2 | Project_60cmGreenLaserBattery |
| 60 cm Infrared Laser Battery | 60cmIRLaserBattery | laser | OneHull | hull | 1 | 150 | 2 | Project_60cmIRLaserBattery |
| 60 cm Ultraviolet Laser Battery | 60cmUVLaserBattery | laser | OneHull | hull | 1 | 150 | 2 | Project_60cmUVLaserBattery |
| Light Coilgun Battery Mk3 | LightCoilgunBatteryMk3 | magnetic | OneHull | hull | 1 | 40 | 3 | Project_CoilgunBatteryMk3 |
| Light Railgun Battery Mk3 | LightRailgunBatteryMk3 | magnetic | OneHull | hull | 1 | 40 | 3 | Project_RailgunBatteryMk3 |
| Light Coilgun Battery Mk2 | LightCoilgunBatteryMk2 | magnetic | OneHull | hull | 1 | 45 | 3 | Project_CoilgunBatteryMk2 |
| Light Railgun Battery Mk2 | LightRailgunBatteryMk2 | magnetic | OneHull | hull | 1 | 45 | 3 | Project_RailgunBatteryMk2 |
| Light Coilgun Battery Mk1 | LightCoilgunBatteryMk1 | magnetic | OneHull | hull | 1 | 50 | 3 | Project_CoilgunBatteryMk1 |
| Light Railgun Battery Mk1 | LightRailgunBatteryMk1 | magnetic | OneHull | hull | 1 | 50 | 3 | Project_RailgunBatteryMk1 |
| Harlequin Missile Pod | HarlequinMissilePod | missile | HalfHull | hull | 1 | 2 | 0 | Project_HarlequinMissileBay |
| Hermes Torpedo Pod | HermesTorpedoPod | missile | HalfHull | hull | 1 | 2 | 0 | Project_HarlequinMissileBay |
| Keelback Missile Pod | KeelbackMissilePod | missile | HalfHull | hull | 1 | 2 | 0 | Project_HarlequinMissileBay |
| Rattler Missile Pod | RattlerMissilePod | missile | HalfHull | hull | 1 | 2 | 0 | Project_RattlerMissileBay |
| Riverjack Missile Pod | RiverjackMissilePod | missile | HalfHull | hull | 1 | 2 | 0 | Project_RattlerMissileBay |
| Anaconda Missile Pod | AnacondaMissilePod | missile | HalfHull | hull | 1 | 5 | 0 | Project_AnacondaMissileBay |
| Cobra Missile Pod | CobraMissilePod | missile | HalfHull | hull | 1 | 5 | 0 | Project_AnacondaMissileBay |
| Harlequin Missile Bay | HarlequinMissileBay | missile | OneHull | hull | 1 | 5 | 2 | Project_HarlequinMissileBay |
| Hera Torpedo Pod | HeraTorpedoPod | missile | HalfHull | hull | 1 | 5 | 0 | Project_AnacondaMissileBay |
| Keelback Missile Bay | KeelbackMissileBay | missile | OneHull | hull | 1 | 5 | 2 | Project_HarlequinMissileBay |
| Lancehead Missile Pod | LanceheadMissilePod | missile | HalfHull | hull | 1 | 5 | 0 | Project_LanceheadMissileBay |
| Racer Missile Pod | RacerMissilePod | missile | HalfHull | hull | 1 | 5 | 0 | Project_RattlerMissileBay |
| Rattler Missile Bay | RattlerMissileBay | missile | OneHull | hull | 1 | 5 | 2 | Project_RattlerMissileBay |
| Riverjack Missile Bay | RiverjackMissileBay | missile | OneHull | hull | 1 | 5 | 2 | Project_RattlerMissileBay |
| Viper Missile Pod | ViperMissilePod | missile | HalfHull | hull | 1 | 5 | 0 | Project_ViperMissileBay |
| Vulcan Torpedo Pod | VulcanTorpedoPod | missile | HalfHull | hull | 1 | 5 | 0 | Project_LanceheadMissileBay |
| Artemis Torpedo Pod | ArtemisTorpedoPod | missile | HalfHull | hull | 1 | 7 | 0 | Project_CopperheadMissileBay |
| Copperhead Missile Pod | CopperheadMissilePod | missile | HalfHull | hull | 1 | 7 | 0 | Project_CopperheadMissileBay |
| Krait Missile Pod | KraitMissilePod | missile | HalfHull | hull | 1 | 7 | 0 |  |
| Python Nuclear Missile Pod | PythonNuclearMissilePod | missile | HalfHull | hull | 1 | 7 | 0 | Project_HadesNuclearTorpedoBay |
| Anaconda Missile Bay | AnacondaMissileBay | missile | OneHull | hull | 1 | 10 | 3 | Project_AnacondaMissileBay |
| Apollo Torpedo Bay | ApolloTorpedoBay | missile | OneHull | hull | 1 | 10 | 2 | Project_ViperMissileBay |
| Apollo Torpedo Pod | ApolloTorpedoPod | missile | HalfHull | hull | 1 | 10 | 0 | Project_ViperMissileBay |
| Ares Torpedo Bay | AresTorpedoBay | missile | OneHull | hull | 1 | 10 | 2 | Project_AresTorpedoBay |
| Cobra Missile Bay | CobraMissileBay | missile | OneHull | hull | 1 | 10 | 3 | Project_AnacondaMissileBay |
| Hades Nuclear Torpedo Pod | HadesNuclearTorpedoPod | missile | HalfHull | hull | 1 | 10 | 0 | Project_HadesNuclearTorpedoBay |
| Hera Torpedo Bay | HeraTorpedoBay | missile | OneHull | hull | 1 | 10 | 3 | Project_AnacondaMissileBay |
| Hercules Torpedo Bay | HerculesTorpedoBay | missile | OneHull | hull | 1 | 10 | 2 | Project_RattlerMissileBay |
| Hercules Torpedo Pod | HerculesTorpedoPod | missile | HalfHull | hull | 1 | 10 | 0 | Project_RattlerMissileBay |
| Hermes Torpedo Bay | HermesTorpedoBay | missile | OneHull | hull | 1 | 10 | 2 | Project_HarlequinMissileBay |
| Hestia Torpedo Bay | PoseidonTorpedoBay | missile | OneHull | hull | 1 | 10 | 2 | Project_AresTorpedoBay |
| Lancehead Missile Bay | LanceheadMissileBay | missile | OneHull | hull | 1 | 10 | 2 | Project_LanceheadMissileBay |
| Racer Missile Bay | RacerMissileBay | missile | OneHull | hull | 1 | 10 | 2 | Project_RattlerMissileBay |
| Viper Missile Bay | ViperMissileBay | missile | OneHull | hull | 1 | 10 | 2 | Project_ViperMissileBay |
| Vulcan Torpedo Bay | VulcanTorpedoBay | missile | OneHull | hull | 1 | 10 | 2 | Project_LanceheadMissileBay |
| Zeus Torpedo Bay | ZeusTorpedoBay | missile | OneHull | hull | 1 | 10 | 2 | Project_ZeusTorpedoBay |
| Cerberus Nuclear Torpedo Pod | CerebrusNuclearTorpedoPod | missile | HalfHull | hull | 1 | 12 | 0 | Project_CerebrusNuclearTorpedoBay |
| Artemis Torpedo Bay | ArtemisTorpedoBay | missile | OneHull | hull | 1 | 15 | 3 | Project_CopperheadMissileBay |
| Athena Torpedo Bay | AthenaTorpedoBay | missile | OneHull | hull | 1 | 15 | 3 | Project_AthenaTorpedoBay |
| Copperhead Missile Bay | CopperheadMissileBay | missile | OneHull | hull | 1 | 15 | 3 | Project_CopperheadMissileBay |
| Krait Missile Bay | KraitMissileBay | missile | OneHull | hull | 1 | 15 | 3 | Project_Warships |
| Python Nuclear Missile Bay | PythonNuclearMissileBay | missile | OneHull | hull | 1 | 15 | 6 | Project_HadesNuclearTorpedoBay |
| Sidewinder Shaped Nuclear Missile Bay | SidewinderNuclearMissileBay | missile | OneHull | hull | 1 | 15 | 6 | Project_AcheronNuclearTorpedoBay |
| Acheron Shaped Nuclear Torpedo Bay | AcheronNuclearTorpedoBay | missile | OneHull | hull | 1 | 20 | 6 | Project_AcheronNuclearTorpedoBay |
| Hades Nuclear Torpedo Bay | HadesNuclearTorpedoBay | missile | OneHull | hull | 1 | 20 | 6 | Project_HadesNuclearTorpedoBay |
| Nemesis Nuclear Torpedo Bay | NemesisNuclearTorpedoBay | missile | OneHull | hull | 1 | 20 | 6 | Project_NemesisNuclearTorpedoBay |
| Olympus Shaped Nuclear Torpedo Bay | OlympusNuclearTorpedoBay | missile | OneHull | hull | 1 | 20 | 6 | Project_OlympusNuclearTorpedoBay |
| Styx Shaped Nuclear Torpedo Bay | StyxNuclearTorpedoBay | missile | OneHull | hull | 1 | 20 | 6 | Project_StyxNuclearTorpedoBay |
| Tartarus Shaped Nuclear Torpedo Bay | TartarusNuclearTorpedoBay | missile | OneHull | hull | 1 | 20 | 6 | Project_TartarusNuclearTorpedoBay |
| Cerberus Nuclear Torpedo Bay | CerebrusNuclearTorpedoBay | missile | OneHull | hull | 1 | 25 | 6 | Project_CerebrusNuclearTorpedoBay |
| Antimatter Torpedo Launcher | AntimatterTorpedoLauncher | missile | OneHull | hull | 1 | 50 | 6 | Project_AntimatterTorpedoLauncher |
| Point Defense E-Beamer | PointDefenseE-Beamer | particle | OneHull | hull | 1 | 5 | 1 | Project_EBeamBatteries |
| Point Defense Ion Battery | PointDefenseIonBattery | particle | OneHull | hull | 1 | 5 | 1 | Project_IonBatteries |
| Light E-Beam Battery | LightE-BeamBattery | particle | OneHull | hull | 1 | 10 | 1 | Project_EBeamBatteries |
| Light Ion Battery | LightIonBattery | particle | OneHull | hull | 1 | 10 | 1 | Project_IonBatteries |
| 8-inch Gun Battery | 8-inchCannon | gun | TwoHullHoriz | hull | 2 | 50 | 4 | Project_PatrolVessels |
| 120 cm Infrared Phaser Battery | 120cmIRPhaserBattery | laser | TwoHullHoriz | hull | 2 | 100 | 3 | Project_60cmIRPhaserBattery |
| 120 cm Green Arc Laser Battery | 120cmGreenArcLaserBattery | laser | TwoHullHoriz | hull | 2 | 155 | 3 | Project_60cmGreenArcLaserBattery |
| 120 cm Green Phaser Battery | 120cmGreenPhaserBattery | laser | TwoHullHoriz | hull | 2 | 155 | 3 | Project_60cmGreenPhaserBattery |
| 120 cm Infrared Arc Laser Battery | 120cmIRArcLaserBattery | laser | TwoHullHoriz | hull | 2 | 155 | 3 | Project_60cmIRArcLaserBattery |
| 120 cm Ultraviolet Arc Laser Battery | 120cmUVArcLaserBattery | laser | TwoHullHoriz | hull | 2 | 155 | 3 | Project_60cmUVArcLaserBattery |
| 120 cm Ultraviolet Phaser Battery | 120cmUVPhaserBattery | laser | TwoHullHoriz | hull | 2 | 155 | 3 | Project_60cmUVPhaserBattery |
| 120 cm Green Laser Battery | 120cmGreenLaserBattery | laser | TwoHullHoriz | hull | 2 | 200 | 3 | Project_60cmGreenLaserBattery |
| 120 cm Infrared Laser Battery | 120cmIRLaserBattery | laser | TwoHullHoriz | hull | 2 | 200 | 3 | Project_60cmIRLaserBattery |
| 120 cm Ultraviolet Laser Battery | 120cmUVLaserBattery | laser | TwoHullHoriz | hull | 2 | 200 | 3 | Project_60cmUVLaserBattery |
| Coilgun Battery Mk3 | CoilgunBatteryMk3 | magnetic | TwoHullHoriz | hull | 2 | 80 | 4 | Project_CoilgunBatteryMk3 |
| Railgun Battery Mk3 | RailgunBatteryMk3 | magnetic | TwoHullHoriz | hull | 2 | 80 | 4 | Project_RailgunBatteryMk3 |
| Coilgun Battery Mk2 | CoilgunBatteryMk2 | magnetic | TwoHullHoriz | hull | 2 | 90 | 4 | Project_CoilgunBatteryMk2 |
| Railgun Battery Mk2 | RailgunBatteryMk2 | magnetic | TwoHullHoriz | hull | 2 | 90 | 4 | Project_RailgunBatteryMk2 |
| Coilgun Battery Mk1 | CoilgunBatteryMk1 | magnetic | TwoHullHoriz | hull | 2 | 100 | 4 | Project_CoilgunBatteryMk1 |
| Railgun Battery Mk1 | RailgunBatteryMk1 | magnetic | TwoHullHoriz | hull | 2 | 100 | 4 | Project_RailgunBatteryMk1 |
| E-Beam Battery | E-BeamBattery | particle | TwoHullHoriz | hull | 2 | 20 | 2 | Project_EBeamBatteries |
| Ion Battery | IonBattery | particle | TwoHullHoriz | hull | 2 | 20 | 2 | Project_IonBatteries |
| Particle Beam Battery | ParticleBeamBattery | particle | TwoHullHoriz | hull | 2 | 25 | 2 | Project_ParticleBeamBatteries |
| Antimatter Point Defense Battery | AntimatterPointDefenseBattery | particle | TwoHullHoriz | hull | 2 | 40 | 4 | Project_AntimatterParticleCannon |
| Plasma Battery Mk3 | PlasmaBatteryMk3 | plasma | TwoHullHoriz | hull | 2 | 240 | 4 | Project_PlasmaBatteryMk3 |
| Plasma Battery Mk2 | PlasmaBatteryMk2 | plasma | TwoHullHoriz | hull | 2 | 280 | 4 | Project_PlasmaBatteryMk2 |
| Plasma Battery Mk1 | PlasmaBatteryMk1 | plasma | TwoHullHoriz | hull | 2 | 320 | 4 | Project_PlasmaBatteryMk1 |
| 360 cm Infrared Phaser Battery | 360cmIRPhaserBattery | laser | FourHull | hull | 4 | 200 | 4 | Project_60cmIRPhaserBattery |
| 360 cm Green Arc Laser Battery | 360cmGreenArcLaserBattery | laser | FourHull | hull | 4 | 315 | 4 | Project_60cmGreenArcLaserBattery |
| 360 cm Green Phaser Battery | 360cmGreenPhaserBattery | laser | FourHull | hull | 4 | 315 | 4 | Project_60cmGreenPhaserBattery |
| 360 cm Infrared Arc Laser Battery | 360cmIRArcLaserBattery | laser | FourHull | hull | 4 | 315 | 4 | Project_60cmIRArcLaserBattery |
| 360 cm Ultraviolet Arc Laser Battery | 360cmUVArcLaserBattery | laser | FourHull | hull | 4 | 315 | 4 | Project_60cmUVArcLaserBattery |
| 360 cm Ultraviolet Phaser Battery | 360cmUVPhaserBattery | laser | FourHull | hull | 4 | 315 | 4 | Project_60cmUVPhaserBattery |
| 360 cm Green Laser Battery | 360cmGreenLaserBattery | laser | FourHull | hull | 4 | 400 | 4 | Project_60cmGreenLaserBattery |
| 360 cm Infrared Laser Battery | 360cmIRLaserBattery | laser | FourHull | hull | 4 | 400 | 4 | Project_60cmIRLaserBattery |
| 360 cm Ultraviolet Laser Battery | 360cmUVLaserBattery | laser | FourHull | hull | 4 | 400 | 4 | Project_60cmUVLaserBattery |
| Heavy Coilgun Battery Mk3 | HeavyCoilgunBatteryMk3 | magnetic | FourHull | hull | 4 | 160 | 5 | Project_CoilgunBatteryMk3 |
| Heavy Railgun Battery Mk3 | HeavyRailgunBatteryMk3 | magnetic | FourHull | hull | 4 | 160 | 5 | Project_RailgunBatteryMk3 |
| Heavy Coilgun Battery Mk2 | HeavyCoilgunBatteryMk2 | magnetic | FourHull | hull | 4 | 180 | 5 | Project_CoilgunBatteryMk2 |
| Heavy Railgun Battery Mk2 | HeavyRailgunBatteryMk2 | magnetic | FourHull | hull | 4 | 180 | 5 | Project_RailgunBatteryMk2 |
| Heavy Coilgun Battery Mk1 | HeavyCoilgunBatteryMk1 | magnetic | FourHull | hull | 4 | 200 | 5 | Project_CoilgunBatteryMk1 |
| Heavy Railgun Battery Mk1 | HeavyRailgunBatteryMk1 | magnetic | FourHull | hull | 4 | 200 | 5 | Project_RailgunBatteryMk1 |
| Heavy E-Beam Battery | HeavyE-BeamBattery | particle | FourHull | hull | 4 | 40 | 2 | Project_EBeamBatteries |
| Heavy Ion Battery | HeavyIonBattery | particle | FourHull | hull | 4 | 40 | 2 | Project_IonBatteries |
| Heavy Particle Beam Battery | HeavyParticleBeamBattery | particle | FourHull | hull | 4 | 50 | 2 | Project_ParticleBeamBatteries |
| Heavy Antimatter Point Defense Battery | HeavyAntimatterPointDefenseBattery | particle | FourHull | hull | 4 | 120 | 4 | Project_AntimatterParticleCannon |
| Heavy Plasma Battery Mk3 | HeavyPlasmaBatteryMk3 | plasma | FourHull | hull | 4 | 480 | 5 | Project_PlasmaBatteryMk3 |
| Heavy Plasma Battery Mk2 | HeavyPlasmaBatteryMk2 | plasma | FourHull | hull | 4 | 560 | 5 | Project_PlasmaBatteryMk2 |
| Heavy Plasma Battery Mk1 | HeavyPlasmaBatteryMk1 | plasma | FourHull | hull | 4 | 640 | 5 | Project_PlasmaBatteryMk1 |
| Surface-to-Orbit Green Arc Laser Array | RegionDefenseGreenArcLaser | laser | RegionDefense |  | 1 | 0 | 0 |  |
| Surface-to-Orbit Green Laser Array | RegionDefenseGreenLaser | laser | RegionDefense |  | 1 | 0 | 0 |  |
| Surface-to-Orbit Green Phaser Array | RegionDefenseGreenPhaser | laser | RegionDefense |  | 1 | 0 | 0 |  |
| Surface-to-Orbit Infrared Arc Laser Array | RegionDefenseIRArcLaser | laser | RegionDefense |  | 1 | 0 | 0 |  |
| Surface-to-Orbit Infrared Laser Array | RegionDefenseIRLaser | laser | RegionDefense |  | 1 | 0 | 0 |  |
| Surface-to-Orbit Infrared Phaser Array | RegionDefenseIRPhaser | laser | RegionDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Green Arc Laser Cannon | T1BaseGreenArcLaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Green Laser Cannon | T1BaseGreenLaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Green Phaser Cannon | T1BaseGreenPhaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Infrared Arc Laser Cannon | T1BaseIRArcLaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Infrared Laser Cannon | T1BaseIRLaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Infrared Phaser Cannon | T1BaseIRPhaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Ultraviolet Arc Laser Cannon | T1BaseUVArcLaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Ultraviolet Laser Cannon | T1BaseUVLaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Small Surface-to-Orbit Ultraviolet Phaser Cannon | T1BaseUVPhaser | laser | T1BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Green Arc Laser Cannon | T2BaseGreenArcLaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Green Laser Cannon | T2BaseGreenLaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Green Phaser Cannon | T2BaseGreenPhaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Infrared Arc Laser Cannon | T2BaseIRArcLaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Infrared Laser Cannon | T2BaseIRLaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Infrared Phaser Cannon | T2BaseIRPhaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Ultraviolet Arc Laser Cannon | T2BaseUVArcLaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Ultraviolet Laser Cannon | T2BaseUVLaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Large Surface-to-Orbit Ultraviolet Phaser Cannon | T2BaseUVPhaser | laser | T2BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Green Arc Laser Cannon | T3BaseGreenArcLaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Green Laser Cannon | T3BaseGreenLaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Green Phaser Cannon | T3BaseGreenPhaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Infrared Arc Laser Cannon | T3BaseIRArcLaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Infrared Laser Cannon | T3BaseIRLaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Infrared Phaser Cannon | T3BaseIRPhaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Ultraviolet Arc Laser Cannon | T3BaseUVArcLaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Ultraviolet Laser Cannon | T3BaseUVLaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Huge Surface-to-Orbit Ultraviolet Phaser Cannon | T3BaseUVPhaser | laser | T3BaseDefense |  | 1 | 0 | 0 |  |
| Alien 256 cm Orange Laser Cannon | Alien256cmOrangeLaserCannon | laser | OneNose | nose | 1 | 246 | 0 | Project_AlienMasterProject |
| Alien 256 cm Violet Laser Cannon | Alien256cmVioletLaserCannon | laser | OneNose | nose | 1 | 246 | 0 | Project_AlienMasterProject |
| Alien 256 cm X-Ray Laser Cannon | Alien256cmXaserCannon | laser | OneNose | nose | 1 | 333 | 0 | Project_AlienAdvancedMasterProject |
| Alien Mini Mag Cannon | AlienMiniLightMagCannon | magnetic | HalfNose | nose | 1 | 10 | 0 | Project_AlienMasterProject |
| Enhanced Alien Light Mag Cannon | AdvancedAlienLightMagCannon | magnetic | OneNose | nose | 1 | 50 | 1 | Project_AlienMasterProject |
| Alien Light Mag Cannon | AlienLightMagCannon | magnetic | OneNose | nose | 1 | 50 | 1 | Project_AlienMasterProject |
| Advanced Alien Light Mag Cannon | Gen3AlienLightMagCannon | magnetic | OneNose | nose | 1 | 50 | 1 | Project_AlienAdvancedMasterProject |
| Alien Light Particle Cannon | AlienLightParticleCannon | particle | OneNose | nose | 1 | 150 | 1 | Project_AlienMasterProject |
| Alien 512 cm Orange Laser Cannon | Alien512cmOrangeLaserCannon | laser | TwoNoseVert | nose | 2 | 416 | 0 | Project_AlienMasterProject |
| Alien 512 cm Violet Laser Cannon | Alien512cmVioletLaserCannon | laser | TwoNoseVert | nose | 2 | 416 | 0 | Project_AlienMasterProject |
| Alien 512 cm X-Ray Laser Cannon | Alien512cmXaserCannon | laser | TwoNoseVert | nose | 2 | 547 | 0 | Project_AlienAdvancedMasterProject |
| Enhanced Alien Mag Cannon | AdvancedAlienMagCannon | magnetic | TwoNoseVert | nose | 2 | 100 | 2 | Project_AlienMasterProject |
| Alien Mag Cannon | AlienMagCannon | magnetic | TwoNoseVert | nose | 2 | 100 | 2 | Project_AlienMasterProject |
| Advanced Alien Mag Cannon | Gen3AlienMagCannon | magnetic | TwoNoseVert | nose | 2 | 100 | 2 | Project_AlienAdvancedMasterProject |
| Alien Particle Cannon | AlienParticleCannon | particle | TwoNoseVert | nose | 2 | 80 | 1 | Project_AlienMasterProject |
| Alien 768 cm Orange Laser Cannon | Alien768cmOrangeLaserCannon | laser | ThreeNoseAngle | nose | 3 | 587 | 0 | Project_AlienMasterProject |
| Alien 768 cm Violet Laser Cannon | Alien768cmVioletLaserCannon | laser | ThreeNoseAngle | nose | 3 | 587 | 0 | Project_AlienMasterProject |
| Alien 768 cm X-Ray Laser Cannon | Alien768cmXaserCannon | laser | ThreeNoseAngle | nose | 3 | 760 | 0 | Project_AlienAdvancedMasterProject |
| Alien 768 cm Gamma Ray Laser Cannon | Alien768cmGraserCannon | laser | ThreeNoseAngle | nose | 3 | 1400 | 0 | Project_AlienAdvancedMasterProject |
| Enhanced Alien Heavy Mag Cannon | AdvancedAlienHeavyMagCannon | magnetic | ThreeNoseAngle | nose | 3 | 150 | 2 | Project_AlienMasterProject |
| Alien Heavy Mag Cannon | AlienHeavyMagCannon | magnetic | ThreeNoseAngle | nose | 3 | 150 | 2 | Project_AlienMasterProject |
| Advanced Alien Heavy Mag Cannon | Gen3AlienHeavyMagCannon | magnetic | ThreeNoseAngle | nose | 3 | 150 | 2 | Project_AlienAdvancedMasterProject |
| Alien Heavy Particle Cannon | AlienHeavyParticleCannon | particle | ThreeNoseAngle | nose | 3 | 400 | 2 | Project_AlienMasterProject |
| Alien Plasma Cannon | AlienPlasmaCannon | plasma | ThreeNoseAngle | nose | 3 | 390 | 2 | Project_AlienMasterProject |
| Alien 1024 cm Orange Laser Cannon | Alien1024cmOrangeLaserCannon | laser | FourNose | nose | 4 | 758 | 0 | Project_AlienMasterProject |
| Alien 1024 cm Violet Laser Cannon | Alien1024cmVioletLaserCannon | laser | FourNose | nose | 4 | 758 | 0 | Project_AlienMasterProject |
| Alien 1024 cm X-Ray Laser Cannon | Alien1024cmXaserCannon | laser | FourNose | nose | 4 | 973 | 0 | Project_AlienAdvancedMasterProject |
| Alien 1024 cm Gamma Ray Laser Cannon | Alien1024cmGraserCannon | laser | FourNose | nose | 4 | 1827 | 0 | Project_AlienAdvancedMasterProject |
| Enhanced Alien Spinal Mag Cannon | AdvancedAlienSpinalMagCannon | magnetic | FourNose | nose | 4 | 200 | 3 | Project_AlienMasterProject |
| Alien Spinal Mag Cannon | AlienSpinalMagCannon | magnetic | FourNose | nose | 4 | 200 | 3 | Project_AlienMasterProject |
| Advanced Alien Spinal Mag Cannon | Gen3AlienSpinalMagCannon | magnetic | FourNose | nose | 4 | 200 | 3 | Project_AlienAdvancedMasterProject |
| Alien Spinal Particle Cannon | AlienSpinalParticleCannon | particle | FourNose | nose | 4 | 800 | 2 | Project_AlienMasterProject |
| Alien Heavy Spinal Particle Cannon | AlienRelativisticParticleCannon | particle | FourNose | nose | 4 | 1200 | 2 | Project_AlienMasterProject |
| Alien Heavy Plasma Cannon | AlienHeavyPlasmaCannon | plasma | FourNose | nose | 4 | 520 | 2 | Project_AlienMasterProject |
| Alien Point Defense Laser Turret | AlienPointDefenseLaserTurret | laser | OneHull | hull | 1 | 21 | 0 | Project_AlienMasterProject |
| Alien 64 cm Orange Laser Battery | Alien64cmOrangeLaserBattery | laser | OneHull | hull | 1 | 118 | 0 | Project_AlienMasterProject |
| Alien 64 cm Violet Laser Battery | Alien64cmVioletLaserBattery | laser | OneHull | hull | 1 | 118 | 0 | Project_AlienMasterProject |
| Enhanced Alien Light Mag Battery | AdvancedAlienLightMagBattery | magnetic | OneHull | hull | 1 | 40 | 1 | Project_AlienMasterProject |
| Alien Light Mag Battery | AlienLightMagBattery | magnetic | OneHull | hull | 1 | 40 | 1 | Project_AlienMasterProject |
| Advanced Alien Light Mag Battery | Gen3AlienLightMagBattery | magnetic | OneHull | hull | 1 | 40 | 1 | Project_AlienAdvancedMasterProject |
| Glittering Jewel Missile Bay | GlitteringJewelMissileBay | missile | OneHull | hull | 1 | 3 | 1 | Project_AlienMasterProject |
| Glittering Jewel Missile Pod | GlitteringJewelMissilePod | missile | HalfHull | hull | 1 | 3 | 0 | Project_AlienMasterProject |
| Brilliant Sky Missile Bay | BrilliantSkyMissileBay | missile | OneHull | hull | 1 | 10 | 1 | Project_AlienAdvancedMasterProject |
| Iridescent Star Torpedo Bay | IridescentStarTorpedoBay | missile | OneHull | hull | 1 | 10 | 1 | Project_AlienMasterProject |
| Luminous Swarm Missile Bay | LuminousSwarmMissileBay | missile | OneHull | hull | 1 | 10 | 1 | Project_AlienMasterProject |
| Predatory Star Torpedo Bay | PredatoryStarTorpedoBay | missile | OneHull | hull | 1 | 20 | 1 | Project_AlienAdvancedMasterProject |
| Alien Point Defense Particle Beam | AlienPointDefenseParticleBeam | particle | OneHull | hull | 1 | 1 | 0 | Project_AlienMasterProject |
| Alien 128 cm Orange Laser Battery | Alien128cmOrangeLaserBattery | laser | TwoHullHoriz | hull | 2 | 160 | 0 | Project_AlienMasterProject |
| Alien 128 cm Violet Laser Battery | Alien128cmVioletLaserBattery | laser | TwoHullHoriz | hull | 2 | 160 | 0 | Project_AlienMasterProject |
| Enhanced Alien Mag Battery | AdvancedAlienMagBattery | magnetic | TwoHullHoriz | hull | 2 | 80 | 2 | Project_AlienMasterProject |
| Alien Mag Battery | AlienMagBattery | magnetic | TwoHullHoriz | hull | 2 | 80 | 2 | Project_AlienMasterProject |
| Advanced Alien Mag Battery | Gen3AlienMagBattery | magnetic | TwoHullHoriz | hull | 2 | 80 | 2 | Project_AlienAdvancedMasterProject |
| Alien Plasma Battery | AlienPlasmaBattery | plasma | TwoHullHoriz | hull | 2 | 200 | 1 | Project_AlienMasterProject |
| Alien 384 cm Orange Laser Battery | Alien384cmOrangeLaserBattery | laser | FourHull | hull | 4 | 331 | 0 | Project_AlienMasterProject |
| Alien 384 cm Violet Laser Battery | Alien384cmVioletLaserBattery | laser | FourHull | hull | 4 | 331 | 0 | Project_AlienMasterProject |
| Alien 384 cm X-Ray Laser Battery | Alien384cmXaserBattery | laser | FourHull | hull | 4 | 440 | 0 | Project_AlienAdvancedMasterProject |
| Enhanced Alien Heavy Mag Battery | AdvancedAlienHeavyMagBattery | magnetic | FourHull | hull | 4 | 160 | 3 | Project_AlienMasterProject |
| Alien Heavy Mag Battery | AlienHeavyMagBattery | magnetic | FourHull | hull | 4 | 160 | 3 | Project_AlienMasterProject |
| Advanced Alien Heavy Mag Battery | Gen3AlienHeavyMagBattery | magnetic | FourHull | hull | 4 | 160 | 3 | Project_AlienAdvancedMasterProject |
| Alien Heavy Plasma Battery | AlienHeavyPlasmaBattery | plasma | FourHull | hull | 4 | 400 | 2 | Project_AlienMasterProject |
| Surface-to-Orbit Alien Laser Array | AlienRegionDefenseLaser | laser | RegionDefense |  | 1 | 0 | 0 | Project_AlienMasterProject |
| Small Surface-to-Orbit Alien Laser Cannon | AlienT1BaseDefenseLaser | laser | T1BaseDefense |  | 1 | 0 | 0 | Project_AlienMasterProject |
| Large Surface-to-Orbit Alien Laser Cannon | AlienT2BaseDefenseLaser | laser | T2BaseDefense |  | 1 | 0 | 0 | Project_AlienMasterProject |
| Huge Surface-to-Orbit Alien Laser Cannon | AlienT3BaseDefenseLaser | laser | T3BaseDefense |  | 1 | 0 | 0 | Project_AlienMasterProject |

## Armor

| Name | dataName | Density kg/m3 | X-ray HV cm | Baryonic HV cm | Required project |
| --- | --- | --- | --- | --- | --- |
| Foamed Metal Armor | FoamedMetalArmor | 920 | 29.4 | 134.9 | Project_FoamedMetalArmor |
| Nanotube Armor | NanotubeArmor | 1720 | 19.9 | 155.4 | Project_NanotubeArmor |
| Adamantine Armor | AdamantaneArmor | 1800 | 18 | 115.8 | Project_AdamantaneArmor |
| Composite Armor | CompositeArmor | 1930 | 15.3 | 72 | Project_CompositeArmor |
| Hybrid Armor | HybridArmor | 2000 | 4.5 | 11 | Project_HybridArmor |
| Exotic Armor | ExoticArmor | 2200 | 5.2 | 12 | Project_ExoticArmor |
| Boron Carbide Armor | BoronCarbideArmor | 2520 | 22.2 | 13.8 |  |
| Silicon Carbide Armor | SiliconCarbideArmor | 3210 | 9.1 | 58 |  |
| Titanium Armor | TitaniumArmor | 4820 | 4.2 | 10.5 |  |
| Steel Armor | SteelArmor | 7850 | 2 | 7.5 |  |
| Alien Diamondoid Armor | AlienAdamantaneArmor | 1800 | 18 | 115.8 | Project_AlienMasterProject |
| Alien Exotic Armor | AlienExoticArmor | 2200 | 5.2 | 12 | Project_AlienMasterProject |
