# 游侠 Youxia

街机联网对战平台：Windows / macOS 客户端、账号登录、USB 手柄本地游玩、在线匹配、官网下载。

参考：[游聚](https://www.gotvg.com/node/1/) · [奇趣电玩](https://www.qqarc.com/)

## 仓库结构

```
youxia/
  server/     Go API + WebSocket 匹配
  client/     Electron 客户端（Windows / macOS）
  web/        官网与下载页
  emulator/   RetroArch 启动配置模板
  docs/       设计与计划（含打包说明）
```

## 快速开始

### 1. 后端

```bash
cd server
go run ./cmd/server
# 默认 http://127.0.0.1:8080
```

### 2. 官网

```bash
cd web
npm install
npm run dev
```

### 3. 客户端（开发）

```bash
cd client
npm install
npm run dev
```

### 4. 模拟器

1. 安装 [RetroArch](https://www.retroarch.com/)
2. 下载 FBNeo（或对应）libretro 核心  
   - Windows：`*.dll`  
   - macOS：`*.dylib`
3. 在客户端「设置」中填写 RetroArch 路径与 ROM 目录（**ROM 需用户自备，本仓库不分发**）

## 客户端打包

完整说明见 **[docs/packaging.md](docs/packaging.md)**（GitHub Actions + 本地打包）。

### 本地速查

```bash
cd client
export CSC_IDENTITY_AUTO_DISCOVERY=false
# 可选（国内镜像）：
# export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
# export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

npm run dist:win   # 需在 Windows 上执行 → release/Youxia-Setup-*.exe / .zip
npm run dist:mac   # 需在 macOS 上执行 → release/Youxia-*-arm64|x64.dmg / .zip
```

### GitHub Actions

| Workflow | 用途 |
|----------|------|
| **Build Client Installers** | 手动选 `all` / `windows` / `mac`，一次打双端或单端 |
| **Build Windows Installer** | Windows NSIS + zip（push/PR 变更 client 时也会跑） |
| **Build macOS Installer** | macOS DMG + zip arm64/x64（同上） |

Actions 跑完后在对应 run 的 **Artifacts** 下载安装包（保留 14 天）。

> macOS 包默认未签名。本机首次打开若被拦截：右键 → 打开，或在「系统设置 → 隐私与安全性」中允许。
