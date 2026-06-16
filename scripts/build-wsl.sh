#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

usage() {
  cat <<'USAGE'
Usage: ./scripts/build-wsl.sh [options]

Build the Terra Invicta Engine Charts site from WSL/Linux with a Linux Python,
Node, npm, and npx toolchain.

Default mode:
  Rebuild docs/index.html and docs/assets/js from checked-in generated data.
  This does not read a local Terra Invicta installation and does not run
  browser verification. Run npm run verify separately when needed.

Options:
  --from-game
      Regenerate data/generated/research_catalog.json, data/generated/ship_catalog.json, their docs
      Markdown, and the dashboard from a local Terra Invicta Templates directory.

  --templates-dir PATH
      Explicit path to TerraInvicta_Data/StreamingAssets/Templates. Usually used
      with --from-game. If omitted, common WSL Steam locations and
      TI_TEMPLATES_DIR are checked.

  --game-version VERSION
      Override the Terra Invicta version label embedded in the generated page.

  --preset-library PATH
      Use an alternate built-in preset library JSON file.

  --input-html-data PATH
      Existing generated HTML page whose embedded chart data should be reused in
      default checked-in/UI-only mode. Defaults to docs/index.html.

  --verify
      Also run the build script's Playwright browser verification step. This
      requires Playwright Chromium to be installed for this WSL/Linux user.

  --skip-verify
      Compatibility no-op. Verification is skipped by default.

  -h, --help
      Show this help.

Examples:
  ./scripts/build-wsl.sh
  ./scripts/build-wsl.sh --verify
  ./scripts/build-wsl.sh --from-game
  ./scripts/build-wsl.sh --from-game \
    --templates-dir "/mnt/c/Program Files (x86)/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates"
USAGE
}

script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(CDPATH= cd -- "$script_dir/.." && pwd -P)"
venv_dir="${VENV_DIR:-$repo_root/.venv-wsl}"

verify=0
from_game=0
templates_dir="${TI_TEMPLATES_DIR:-}"
game_version=""
preset_library=""
input_html_data=""

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

run() {
  printf '+ '
  printf '%q ' "$@"
  printf '\n'
  "$@"
}

require_value() {
  local option="$1"
  local value="${2:-}"
  if [[ -z "$value" || "$value" == --* ]]; then
    fail "$option requires a value"
  fi
}

is_windows_tool_path() {
  local path_value="$1"
  local resolved="$path_value"
  if command -v realpath >/dev/null 2>&1; then
    resolved="$(realpath -m -- "$path_value" 2>/dev/null || printf '%s' "$path_value")"
  fi
  case "$path_value" in
    /mnt/[a-zA-Z]/*|*.exe|*.cmd|*.bat) return 0 ;;
  esac
  case "$resolved" in
    /mnt/[a-zA-Z]/*|*.exe|*.cmd|*.bat) return 0 ;;
  esac
  return 1
}

require_linux_tool() {
  local name="$1"
  local path_value
  path_value="$(command -v -- "$name" 2>/dev/null || true)"
  if [[ -z "$path_value" ]]; then
    fail "required command not found in WSL/Linux PATH: $name"
  fi
  if is_windows_tool_path "$path_value"; then
    cat >&2 <<EOFMSG
error: $name resolves to a Windows tool from WSL:
  $path_value

Use Linux/WSL $name instead. Install the tool inside WSL and make sure Linux
paths such as /usr/bin, ~/.local/bin, or your WSL nvm directory appear before
/mnt/c/... entries in PATH. Then run 'hash -r' and retry.
EOFMSG
    exit 1
  fi
  printf '%s' "$path_value"
}

reject_windows_tool_if_present() {
  local name="$1"
  local path_value
  path_value="$(command -v -- "$name" 2>/dev/null || true)"
  if [[ -n "$path_value" ]]; then
    if is_windows_tool_path "$path_value"; then
      fail "$name resolves to a Windows tool from WSL: $path_value. Install/use the Linux tool inside WSL and fix PATH ordering."
    fi
  fi
}

check_playwright_chromium() {
  local browser_check_output
  if ! browser_check_output="$(node <<'NODE' 2>&1
const fs = require('fs');

try {
  const { chromium } = require('playwright');
  const executablePath = chromium.executablePath();

  if (!fs.existsSync(executablePath)) {
    console.error(executablePath);
    process.exit(2);
  }

  console.log(executablePath);
} catch (error) {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
}
NODE
)"; then
    cat >&2 <<EOFMSG
error: Playwright Chromium is not installed for this WSL/Linux environment.

The expected browser executable was not found:
  $browser_check_output

Install the browser once from this repository with:
  npx playwright install chromium

If WSL reports missing system libraries, run:
  npx playwright install --with-deps chromium

Or run the default build path without browser verification:
  ./scripts/build-wsl.sh
  ./scripts/build-wsl.sh --from-game
EOFMSG
    exit 1
  fi

  echo "+ Playwright Chromium found: $browser_check_output"
}

while (($#)); do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --verify)
      verify=1
      ;;
    --skip-verify)
      verify=0
      ;;
    --from-game)
      from_game=1
      ;;
    --templates-dir)
      require_value "$1" "${2:-}"
      templates_dir="$2"
      shift
      ;;
    --templates-dir=*)
      templates_dir="${1#*=}"
      require_value "--templates-dir" "$templates_dir"
      ;;
    --game-version)
      require_value "$1" "${2:-}"
      game_version="$2"
      shift
      ;;
    --game-version=*)
      game_version="${1#*=}"
      require_value "--game-version" "$game_version"
      ;;
    --preset-library)
      require_value "$1" "${2:-}"
      preset_library="$2"
      shift
      ;;
    --preset-library=*)
      preset_library="${1#*=}"
      require_value "--preset-library" "$preset_library"
      ;;
    --input-html-data)
      require_value "$1" "${2:-}"
      input_html_data="$2"
      shift
      ;;
    --input-html-data=*)
      input_html_data="${1#*=}"
      require_value "--input-html-data" "$input_html_data"
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
  shift
done

if [[ $from_game -eq 0 && -n "$templates_dir" ]]; then
  fail "--templates-dir reads local game data; pass --from-game to use it explicitly"
fi

if [[ $from_game -eq 1 && -n "$input_html_data" ]]; then
  fail "--input-html-data is only valid for the default checked-in/UI-only build"
fi

if [[ $from_game -eq 1 && -n "$templates_dir" && ! -d "$templates_dir" ]]; then
  fail "Templates directory not found: $templates_dir"
fi

cd "$repo_root"

reject_windows_tool_if_present python
reject_windows_tool_if_present python3
base_python="$(command -v python3 2>/dev/null || command -v python 2>/dev/null || true)"
if [[ -z "$base_python" ]]; then
  fail "python3 or python is required inside WSL/Linux"
fi
if is_windows_tool_path "$base_python"; then
  fail "python resolves to a Windows tool from WSL: $base_python. Install Python inside WSL and fix PATH ordering."
fi

require_linux_tool node >/dev/null
require_linux_tool npm >/dev/null
require_linux_tool npx >/dev/null

if [[ ! -x "$venv_dir/bin/python" ]]; then
  run "$base_python" -m venv "$venv_dir"
fi

python_bin="$venv_dir/bin/python"
if is_windows_tool_path "$python_bin"; then
  fail "virtualenv Python resolves outside WSL/Linux: $python_bin"
fi

export PATH="$venv_dir/bin:$PATH"

if [[ -f requirements.txt ]]; then
  run "$python_bin" -m pip install -r requirements.txt
elif [[ -f requirements-dev.txt ]]; then
  run "$python_bin" -m pip install -r requirements-dev.txt
else
  echo "+ no Python requirements file found; skipping pip install"
fi

if [[ -f package-lock.json ]]; then
  run npm ci
elif [[ -f package.json ]]; then
  run npm install
else
  fail "package.json not found in repository root: $repo_root"
fi

if [[ $verify -eq 1 ]]; then
  check_playwright_chromium
fi

find_templates_dir() {
  local candidate
  if [[ -n "$templates_dir" && -d "$templates_dir" ]]; then
    printf '%s\n' "$templates_dir"
    return 0
  fi
  for candidate in \
    "/mnt/c/Program Files (x86)/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates" \
    "/mnt/c/Program Files/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates" \
    "/mnt/d/SteamLibrary/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates" \
    "/mnt/e/SteamLibrary/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates"
  do
    if [[ -d "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

build_args=(--no-commit --no-push)

if [[ $verify -eq 0 ]]; then
  build_args+=(--skip-verify)
fi
if [[ -n "$game_version" ]]; then
  build_args+=(--game-version "$game_version")
fi
if [[ -n "$preset_library" ]]; then
  build_args+=(--preset-library "$preset_library")
fi

if [[ $from_game -eq 1 ]]; then
  if ! templates_dir="$(find_templates_dir)"; then
    cat >&2 <<'EOFMSG'
error: could not find a Terra Invicta Templates directory for --from-game.

Pass it explicitly, for example:
  ./scripts/build-wsl.sh --from-game \
    --templates-dir "/mnt/c/Program Files (x86)/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates"

Or set TI_TEMPLATES_DIR to that path. The directory must contain files such as
TIDriveTemplate.json, TIPowerPlantTemplate.json, and TIRadiatorTemplate.json.
EOFMSG
    exit 1
  fi
  for required_file in TIDriveTemplate.json TIPowerPlantTemplate.json TIRadiatorTemplate.json; do
    if [[ ! -f "$templates_dir/$required_file" ]]; then
      fail "Templates directory is missing $required_file: $templates_dir"
    fi
  done
  build_args+=(--templates-dir "$templates_dir")
else
  build_args+=(--ui-only)
  if [[ -n "$input_html_data" ]]; then
    build_args+=(--input-html-data "$input_html_data")
  fi
fi

run "$python_bin" scripts/rebuild_pages.py "${build_args[@]}"
