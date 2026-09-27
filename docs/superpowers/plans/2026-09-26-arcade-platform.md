# 游侠 MVP Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Deliver Windows-installable arcade battle client + Go API + official site with login, USB pads, local RetroArch launch, and netplay matchmaking.

**Architecture:** Electron client talks to Go REST/WS; launches RetroArch for play/netplay; Vite marketing site for downloads.

**Tech Stack:** Go, Electron, React, TypeScript, Vite, electron-builder NSIS, RetroArch CLI.

## Global Constraints

- No commercial ROM distribution
- Age 18+ copy on web
- Default API `http://127.0.0.1:8080`

---

### Task 1: Server auth + catalog + match hub

- [x] SQLite users/games, JWT auth, seed catalog, WS matchmaking

### Task 2: Electron client

- [x] Login, lobby, games, pads, settings, emulator spawn, NSIS build config

### Task 3: Official web

- [x] Landing + download CTA + legal footer

### Task 4: Verify

- [ ] `go test` / `go build`, npm installs, health API smoke
