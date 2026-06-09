import { readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(toolsDir, "drive_comparison_client");

function moduleFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) return moduleFiles(path);
      return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
    })
    .sort();
}

const files = moduleFiles(clientDir);
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: resolve(toolsDir, ".."),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    failures.push([
      relative(resolve(toolsDir, ".."), file).replace(/\\/g, "/"),
      result.stderr || result.stdout || `node --check exited with ${result.status}`,
    ].join("\n"));
  }
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(`Client module syntax verification passed for ${files.length} files`);
