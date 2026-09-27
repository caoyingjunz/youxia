# 游侠 Youxia

街机联网对战平台：Windows 客户端安装包、账号登录、USB 手柄本地游玩、在线匹配、官网下载。

参考：[游聚](https://www.gotvg.com/node/1/) · [奇趣电玩](https://www.qqarc.com/)

## 仓库结构

```
youxia/
  server/     Go API + WebSocket 匹配
  client/     Electron Windows 客户端
  web/        官网与下载页
  emulator/   RetroArch 启动配置模板
  docs/       设计与计划
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

### 3. Windows 客户端

```bash
cd client
npm install
npm run dev          # 开发
npm run dist:win     # 产出 NSIS 安装包（需在 Windows 或 CI 上构建）
```

### 4. 模拟器

1. 安装 [RetroArch](https://www.retroarch.com/)
2. 下载 FBNeo（或对应）libretro 核心
3. 在客户端「设置」中填写 RetroArch 路径与 ROM 目录（**ROM 需用户自备，本仓库不分发**）

## Windows 安装包（产物）

已构建 NSIS 安装包：

- `dist/Youxia-Setup-0.1.0.exe`（推荐，约 84MB）
- `dist/Youxia-Setup-0.1.0.zip`（免安装绿色包）
- 同源副本：`client/release/`

在 Windows 上双击 `.exe` 安装后打开「游侠」，注册/登录，在设置里配置 RetroArch、cores、ROM 路径即可。

重新打包：

```bash
cd client
export ELECTRON_CACHE="$PWD/.cache/electron"
export ELECTRON_BUILDER_CACHE="$PWD/.cache/electron-builder"
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist:win
```

也可在 GitHub Actions 中手动触发 `Build Windows Installer`。
