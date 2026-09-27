# 客户端打包指南（Windows / macOS）

游侠客户端基于 Electron，使用 `electron-builder` 产出安装包。推荐优先用 **GitHub Actions**；本机打包需对应操作系统。

## 产物一览

输出目录：`client/release/`（已在 `.gitignore` 中忽略）

| 平台 | 命令 | 产物 |
|------|------|------|
| Windows x64 | `npm run dist:win` | `Youxia-Setup-<version>.exe`（NSIS）、`.zip` |
| macOS Apple 芯片 | `npm run dist:mac` | `Youxia-<version>-arm64.dmg` / `.zip` |
| macOS Intel | （同上一次打出） | `Youxia-<version>-x64.dmg` / `.zip` |

`version` 来自 `client/package.json` 的 `version` 字段（当前 `0.1.0`）。

---

## GitHub Actions（推荐）

仓库已配置三个 workflow：

| Workflow | 触发 | 说明 |
|----------|------|------|
| **Build Client Installers** | 手动（Actions → Run workflow） | 可选 `all` / `windows` / `mac`，一次触发双端或单端 |
| **Build Windows Installer** | 手动；或变更 `client/**`、`emulator/**` 时 push/PR | Windows NSIS + zip |
| **Build macOS Installer** | 手动；或变更 `client/**`、`emulator/**` 时 push/PR | macOS DMG + zip（arm64 + x64，未签名） |

### 使用步骤

1. 打开 GitHub 仓库 → **Actions**
2. 选择 **Build Client Installers**（或单独的 Windows / macOS workflow）
3. **Run workflow**，分支选当前开发分支；若用合并 workflow，平台可选 `all`
4. 等待 job 完成 → 打开该次 run → **Artifacts** 下载：
   - `Youxia-Windows-<sha>`
   - `Youxia-macOS-<sha>`
5. Artifact 默认保留 **14 天**

> macOS CI 包默认 **未签名 / 未公证**。用户本机首次打开可能被 Gatekeeper 拦截：右键 App → 打开，或在「系统设置 → 隐私与安全性」中允许。

---

## 本地打包

### 公共准备

```bash
cd client
npm ci   # 或 npm install
```

建议设置缓存目录（可选，加快重复构建）：

```bash
# macOS / Linux
export ELECTRON_CACHE="$PWD/.cache/electron"
export ELECTRON_BUILDER_CACHE="$PWD/.cache/electron-builder"
export CSC_IDENTITY_AUTO_DISCOVERY=false

# Windows PowerShell
$env:ELECTRON_CACHE = "$PWD\.cache\electron"
$env:ELECTRON_BUILDER_CACHE = "$PWD\.cache\electron-builder"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
```

国内网络若下载 Electron 较慢，可使用镜像：

```bash
# macOS / Linux
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

# Windows PowerShell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
```

### Windows（在 Windows 机器上）

```bash
cd client
npm run dist:win
```

产物：

- `release/Youxia-Setup-0.1.0.exe`
- `release/Youxia-Setup-0.1.0.zip`

> 不建议在 macOS 上交叉打 Windows 包（需额外 wine 等环境）；请用 Windows 本机或 GitHub Actions。

### macOS（在 Mac 上）

```bash
cd client
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist:mac
```

产物：

- `release/Youxia-0.1.0-arm64.dmg` / `.zip`
- `release/Youxia-0.1.0-x64.dmg` / `.zip`

未配置 Apple Developer 证书时，`package.json` 中 `mac.identity` 为 `null`，生成未签名包，便于本地 demo。

### 仅前端构建（不打包安装器）

```bash
cd client
npm run build    # 产出 client/dist，供 Electron 加载
npm run dev      # 开发：Vite + Electron
```

---

## 安装与运行注意

1. 安装客户端后，在「设置」中配置：
   - RetroArch 可执行文件路径
   - cores 目录（Windows：`*.dll`；macOS：`*.dylib`）
   - ROM 目录（**需用户自备合法 ROM，本仓库不分发**）
2. 后端 API 默认 `http://127.0.0.1:8080`，可在设置中修改
3. 官网下载按钮对应路径见 `web/src/App.tsx`（可用环境变量覆盖）：
   - `VITE_DOWNLOAD_URL_WIN`
   - `VITE_DOWNLOAD_URL_MAC_ARM`
   - `VITE_DOWNLOAD_URL_MAC_X64`
