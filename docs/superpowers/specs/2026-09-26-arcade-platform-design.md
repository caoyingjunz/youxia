# 游侠 Youxia — 街机联网对战平台设计

**日期:** 2026-09-26  
**状态:** 已锁定，直接实现（用户要求 A/B/C 一并交付、过程不逐项确认）

## 产品定位

对标 [游聚](https://www.gotvg.com/node/1/)、[奇趣电玩](https://www.qqarc.com/)：Windows 安装客户端 + 账号登录 + USB 街机手柄本地游玩 + 在线匹配对战 + 官网下载站。

**品牌名:** 游侠（Youxia）

## 合规边界

- 不内置、不分发任何商业 ROM/游戏本体；用户自备合法 ROM，客户端只配置路径。
- 模拟器侧对接开源 RetroArch + libretro 核心（如 FBNeo），安装包可引导下载/捆绑 GPL 组件。
- 适龄提示：18+；官方文案含防沉迷与拒绝盗版声明。

## 系统架构

```
┌─────────────┐     HTTPS/WS      ┌──────────────────┐
│  官网 web   │ ────────────────► │  API Server (Go) │
└─────────────┘                   │  - 账号/JWT      │
                                  │  - 游戏目录      │
┌─────────────┐     HTTPS/WS      │  - 匹配/房间     │
│ Electron    │ ◄───────────────► │  - 公告          │
│ 客户端      │                   └──────────────────┘
│  - 登录/大厅│
│  - 手柄检测 │                   ┌──────────────────┐
│  - 启动器   │ ──spawn─────────► │ RetroArch        │
└─────────────┘                   │ + USB 手柄透传   │
                                  │ + netplay 主机/客│
                                  └──────────────────┘
```

## 子系统

### 1. Windows 客户端（Electron + React + Vite）

- 安装：`electron-builder` 产出 NSIS `.exe` 安装包。
- 登录后进入大厅：公告、游戏列表、匹配、设置（RetroArch 路径、ROM 目录、手柄）。
- USB：Electron `navigator.getGamepads()` + 主进程枚举；启动游戏时把输入交给 RetroArch（原生支持 XInput/DInput 街机杆）。
- 本地游玩：拼装 RetroArch CLI（core + rom）。
- 联网：匹配成功后一方 `--host`，另一方 `--connect IP`（RetroArch netplay）；房间信令走服务端 WebSocket。

### 2. 后端（Go）

- REST：注册/登录、游戏目录、公告、健康检查。
- WebSocket：加入匹配队列、创建/加入房间、交换 netplay 地址与端口、房间状态。
- 存储：SQLite（开发默认），用户 bcrypt 密码 + JWT。

### 3. 官网（Vite + React）

- 首页卖点、立即下载安装包、关于我们、协议入口、备案/适龄文案位。

## 第一期可运行范围（MVP）

| 能力 | 状态 |
|------|------|
| 注册/登录 | 有 |
| 游戏元数据目录（无 ROM） | 有 |
| 本地启动 RetroArch | 有（需本机安装 RetroArch） |
| USB 手柄列表与测试页 | 有 |
| 匹配房间 + netplay 信令 | 有 |
| Windows NSIS 安装包构建配置 | 有 |
| 真实 rollback 级同步 | 依赖 RetroArch netplay；后续可换 GGPO |

## 技术栈

- Client: Electron 33+, React 18, TypeScript, Vite, electron-builder
- Server: Go 1.22+, chi/gorilla mux, gorilla/websocket, modernc.org/sqlite, golang-jwt, bcrypt
- Web: Vite + React + TypeScript
- Emulator bridge: 本地脚本/配置模板，不改 RetroArch 源码
