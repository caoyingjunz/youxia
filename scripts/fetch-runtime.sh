#!/usr/bin/env bash
# 拉取可随安装包分发的 RetroArch + FBNeo 核心（GPL，需随附许可证）。
# 用法：
#   ./scripts/fetch-runtime.sh              # 当前机器平台
#   ./scripts/fetch-runtime.sh darwin-arm64
#   ./scripts/fetch-runtime.sh darwin-x64
#   ./scripts/fetch-runtime.sh win32-x64
#   ./scripts/fetch-runtime.sh all
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/emulator/runtime"
STABLE="${RETROARCH_STABLE:-1.20.0}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

need() { command -v "$1" >/dev/null 2>&1 || { echo "缺少依赖: $1"; exit 1; }; }
need curl
need unzip

download() {
  local url="$1" dest="$2"
  echo "↓ $url"
  curl -fL --retry 3 --retry-delay 2 -o "$dest" "$url"
}

fetch_core() {
  local platform_path="$1" # e.g. apple/osx/arm64 or windows/x86_64
  local core_name="$2"     # fbneo_libretro.dylib
  local dest_dir="$3"
  mkdir -p "$dest_dir"
  local zip="$TMP/${core_name}.zip"
  download "https://buildbot.libretro.com/nightly/${platform_path}/latest/${core_name}.zip" "$zip"
  unzip -o -q "$zip" -d "$dest_dir"
}

fetch_darwin() {
  local arch="$1" # arm64 | x64
  local ra_arch="$arch"
  [[ "$arch" == "x64" ]] && ra_arch="x86_64"
  local dest="$OUT/darwin-${arch}"
  mkdir -p "$dest/cores"
  # RetroArch.app (universal dmg on newer builds; fall back to arch-specific zip if needed)
  local dmg="$TMP/RetroArch.dmg"
  if download "https://buildbot.libretro.com/stable/${STABLE}/apple/osx/${ra_arch}/RetroArch.dmg" "$dmg" 2>/dev/null; then
    local mount
    mount="$(hdiutil attach -nobrowse -readonly "$dmg" | awk '/\/Volumes\//{print $3; exit}')"
    if [[ -z "${mount:-}" ]]; then
      echo "无法挂载 RetroArch.dmg"
      exit 1
    fi
    rm -rf "$dest/RetroArch.app"
    cp -R "$mount/RetroArch.app" "$dest/RetroArch.app"
    hdiutil detach "$mount" >/dev/null || true
  else
    echo "DMG 不可用，尝试 nightly .app.zip…"
    local z="$TMP/RetroArch.zip"
    download "https://buildbot.libretro.com/nightly/apple/osx/${ra_arch}/RetroArch_Metal.apple.app.zip" "$z" || \
      download "https://buildbot.libretro.com/nightly/apple/osx/${ra_arch}/RetroArch.apple.app.zip" "$z"
    rm -rf "$dest/RetroArch.app"
    unzip -o -q "$z" -d "$TMP/appout"
    local app
    app="$(find "$TMP/appout" -maxdepth 3 -name 'RetroArch.app' -type d | head -1)"
    [[ -n "$app" ]] || { echo "zip 内未找到 RetroArch.app"; exit 1; }
    cp -R "$app" "$dest/RetroArch.app"
  fi
  fetch_core "apple/osx/${ra_arch}" "fbneo_libretro.dylib" "$dest/cores"
  # 许可证摘录
  mkdir -p "$dest/licenses"
  cat >"$dest/licenses/NOTICE.txt" <<'EOF'
Bundled RetroArch and FBNeo libretro core are free software under GPL licenses.
Source: https://github.com/libretro/RetroArch
         https://github.com/libretro/FBNeo
Official builds: https://buildbot.libretro.com/
EOF
  echo "✓ $dest"
}

fetch_win() {
  local dest="$OUT/win32-x64"
  mkdir -p "$dest/cores"
  need 7z || need 7za || { echo "Windows 运行时需要 7z/7za 解压 RetroArch.7z"; exit 1; }
  local seven=7z
  command -v 7z >/dev/null || seven=7za
  local archive="$TMP/RetroArch.7z"
  download "https://buildbot.libretro.com/stable/${STABLE}/windows/x86_64/RetroArch.7z" "$archive"
  rm -rf "$dest/bin"
  mkdir -p "$dest/bin"
  "$seven" x -y "-o$dest/bin" "$archive" >/dev/null
  # 扁平化：找到 retroarch.exe
  local exe
  exe="$(find "$dest/bin" -name 'retroarch.exe' | head -1)"
  [[ -n "$exe" ]] || { echo "未找到 retroarch.exe"; exit 1; }
  # 保留整个解压树，记录相对路径标记
  printf '%s' "$(realpath --relative-to="$dest" "$(dirname "$exe")" 2>/dev/null || python3 -c "import os.path; print(os.path.relpath('$(dirname "$exe")','$dest'))")" >"$dest/bin_relpath.txt"
  # 若解压在子目录，把 exe 目录记下来供客户端解析
  fetch_core "windows/x86_64" "fbneo_libretro.dll" "$dest/cores"
  mkdir -p "$dest/licenses"
  cat >"$dest/licenses/NOTICE.txt" <<'EOF'
Bundled RetroArch and FBNeo libretro core are free software under GPL licenses.
Source: https://github.com/libretro/RetroArch
         https://github.com/libretro/FBNeo
Official builds: https://buildbot.libretro.com/
EOF
  echo "✓ $dest (exe: $exe)"
}

TARGET="${1:-auto}"
if [[ "$TARGET" == "auto" ]]; then
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) TARGET=darwin-arm64 ;;
    Darwin-x86_64) TARGET=darwin-x64 ;;
    MINGW*|MSYS*|CYGWIN*|Windows*) TARGET=win32-x64 ;;
    *) echo "无法自动识别平台，请显式传入 darwin-arm64|darwin-x64|win32-x64|all"; exit 1 ;;
  esac
fi

mkdir -p "$OUT"
case "$TARGET" in
  darwin-arm64) fetch_darwin arm64 ;;
  darwin-x64) fetch_darwin x64 ;;
  win32-x64) fetch_win ;;
  all)
    fetch_darwin arm64
    fetch_darwin x64
    fetch_win
    ;;
  *) echo "未知目标: $TARGET"; exit 1 ;;
esac

echo "完成。运行时目录: $OUT"
