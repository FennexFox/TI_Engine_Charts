import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(toolsDir, "drive_comparison_client");
const clientSourceFiles = [
  "00_bootstrap_state_i18n.js",
  "10_left_panel_controls.js",
  "20_dry_mass_calculator.js",
  "30_searchable_select.js",
  "40_preset_library.js",
  "50_filtering_diagnostics.js",
  "60_axis_scale_ticks.js",
  "70_chart_interaction.js",
  "80_chart_rendering.js",
  "90_tooltip_table_formatting.js",
  "99_startup.js",
];

const source = clientSourceFiles
  .map(filename => readFileSync(resolve(clientDir, filename), "utf8").replace(/\n*$/, ""))
  .join("\n\n");

new Script(source, { filename: "drive_comparison_client_combined.js" });
console.log(`Client syntax verification passed for ${clientSourceFiles.length} snippets`);
