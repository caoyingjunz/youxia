const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');

const store = new Store({
  name: 'youxia-settings',
  defaults: {
    apiBase: 'http://127.0.0.1:8080',
    retroarchPath: '',
    coresPath: '',
    romsPath: '',
    netplayPort: 55435,
    token: '',
    username: '',
  },
});

let mainWindow = null;
let gameProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: '游侠',
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('settings:get', () => store.store);
ipcMain.handle('settings:set', (_e, patch) => {
  Object.entries(patch || {}).forEach(([k, v]) => store.set(k, v));
  return store.store;
});

ipcMain.handle('auth:setSession', (_e, { token, username }) => {
  store.set('token', token || '');
  store.set('username', username || '');
  return true;
});

ipcMain.handle('auth:clearSession', () => {
  store.set('token', '');
  store.set('username', '');
  return true;
});

ipcMain.handle('shell:openExternal', (_e, url) => shell.openExternal(url));

ipcMain.handle('gamepad:list', async () => {
  // Renderer polls navigator.getGamepads; main process returns last known OS hint.
  return {
    platform: process.platform,
    hint: '插入 USB 街机杆后打开「手柄」页查看；RetroArch 将直接读取 XInput/DInput 设备。',
  };
});

function resolveCorePath(coresPath, coreName) {
  const exts = process.platform === 'win32' ? ['.dll'] : process.platform === 'darwin' ? ['.dylib'] : ['.so'];
  for (const ext of exts) {
    const p = path.join(coresPath, `${coreName}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  // Try with _libretro already in name
  for (const ext of exts) {
    const p = path.join(coresPath, coreName.endsWith(ext) ? coreName : `${coreName}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return path.join(coresPath, process.platform === 'win32' ? `${coreName}.dll` : `${coreName}.so`);
}

function buildArgs({ core, romPath, mode, hostAddr, hostPort, configPath }) {
  const args = [];
  if (configPath && fs.existsSync(configPath)) {
    args.push('--appendconfig', configPath);
  }
  args.push('-L', core, romPath);
  const port = hostPort || 55435;
  if (mode === 'host') {
    args.push('--host', '--port', String(port));
  } else if (mode === 'guest' && hostAddr) {
    args.push('--connect', hostAddr, '--port', String(port));
  }
  return args;
}

ipcMain.handle('emulator:launch', async (_e, opts) => {
  const settings = store.store;
  const retroarch = opts.retroarchPath || settings.retroarchPath;
  const coresPath = opts.coresPath || settings.coresPath;
  const romsPath = opts.romsPath || settings.romsPath;
  if (!retroarch || !fs.existsSync(retroarch)) {
    throw new Error('未找到 RetroArch，请在设置中填写可执行文件路径');
  }
  if (!coresPath) throw new Error('请设置 cores 目录');
  if (!romsPath) throw new Error('请设置 ROM 目录');

  const romFile = opts.romHint || `${opts.gameId}.zip`;
  const romPath = path.join(romsPath, romFile);
  if (!fs.existsSync(romPath)) {
    throw new Error(`未找到 ROM：${romPath}（请自备合法 ROM，本平台不分发）`);
  }

  const core = resolveCorePath(coresPath, opts.core || 'fbneo_libretro');
  let configPath = path.join(__dirname, '..', '..', 'emulator', 'retroarch-youxia.cfg');
  if (app.isPackaged) {
    configPath = path.join(process.resourcesPath, 'emulator', 'retroarch-youxia.cfg');
  }

  const args = buildArgs({
    core,
    romPath,
    mode: opts.mode || 'local',
    hostAddr: opts.hostAddr,
    hostPort: opts.hostPort || settings.netplayPort || 55435,
    configPath,
  });

  if (gameProcess && !gameProcess.killed) {
    try {
      gameProcess.kill();
    } catch (_) {}
  }

  gameProcess = spawn(retroarch, args, {
    detached: false,
    stdio: 'ignore',
    windowsHide: false,
  });
  gameProcess.on('exit', () => {
    gameProcess = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('emulator:exited');
    }
  });

  return {
    pid: gameProcess.pid,
    args,
    localAddresses: getLocalIPv4(),
  };
});

ipcMain.handle('emulator:stop', async () => {
  if (gameProcess && !gameProcess.killed) {
    gameProcess.kill();
    gameProcess = null;
  }
  return true;
});

function getLocalIPv4() {
  const ifaces = os.networkInterfaces();
  const out = [];
  for (const list of Object.values(ifaces)) {
    for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}
