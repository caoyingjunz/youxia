const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

function expandHome(p) {
  if (!p || typeof p !== 'string') return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function runtimeRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'emulator', 'runtime');
  }
  return path.join(__dirname, '..', '..', 'emulator', 'runtime');
}

function platformKey() {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  }
  if (process.platform === 'win32') {
    return 'win32-x64';
  }
  return `${process.platform}-${process.arch}`;
}

function findFile(dir, name, maxDepth = 4) {
  if (!dir || !fs.existsSync(dir)) return '';
  const stack = [{ d: dir, depth: 0 }];
  while (stack.length) {
    const { d, depth } = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      if (ent.isFile() && ent.name.toLowerCase() === name.toLowerCase()) return full;
      if (ent.isDirectory() && depth < maxDepth && !ent.name.startsWith('.')) {
        stack.push({ d: full, depth: depth + 1 });
      }
    }
  }
  return '';
}

/** @returns {{ available: boolean, platform: string, retroarchPath: string, coresPath: string, root: string }} */
function resolveBundledRuntime() {
  const root = path.join(runtimeRoot(), platformKey());
  const result = {
    available: false,
    platform: platformKey(),
    retroarchPath: '',
    coresPath: '',
    root,
  };
  if (!fs.existsSync(root)) return result;

  if (process.platform === 'darwin') {
    const appPath = path.join(root, 'RetroArch.app', 'Contents', 'MacOS', 'RetroArch');
    if (fs.existsSync(appPath)) result.retroarchPath = appPath;
  } else if (process.platform === 'win32') {
    const marked = path.join(root, 'bin_relpath.txt');
    if (fs.existsSync(marked)) {
      const rel = fs.readFileSync(marked, 'utf8').trim();
      const candidate = path.join(root, rel, 'retroarch.exe');
      if (fs.existsSync(candidate)) result.retroarchPath = candidate;
    }
    if (!result.retroarchPath) {
      result.retroarchPath = findFile(root, 'retroarch.exe', 5);
    }
  }

  const cores = path.join(root, 'cores');
  if (fs.existsSync(cores)) result.coresPath = cores;

  result.available = Boolean(result.retroarchPath && result.coresPath);
  return result;
}

function defaultRomsPath() {
  return path.join(os.homedir(), 'YouxiaRoms');
}

/**
 * 若用户未配置路径，则填入内置运行时 + 默认 ROM 目录。
 * 不覆盖用户已保存的非空值。
 */
function applyRuntimeDefaults(store) {
  const bundled = resolveBundledRuntime();
  const patch = {};
  if (!store.get('retroarchPath') && bundled.retroarchPath) {
    patch.retroarchPath = bundled.retroarchPath;
  }
  if (!store.get('coresPath') && bundled.coresPath) {
    patch.coresPath = bundled.coresPath;
  }
  if (!store.get('romsPath')) {
    const roms = defaultRomsPath();
    try {
      fs.mkdirSync(roms, { recursive: true });
    } catch (_) {}
    patch.romsPath = roms;
  }
  if (!store.get('romSourceBaseUrl')) {
    // 空字符串：未配置合法镜像时不提供下载
    patch.romSourceBaseUrl = store.get('romSourceBaseUrl') ?? '';
  }
  Object.entries(patch).forEach(([k, v]) => store.set(k, v));
  return { bundled, applied: patch };
}

module.exports = {
  expandHome,
  resolveBundledRuntime,
  applyRuntimeDefaults,
  defaultRomsPath,
  findFile,
  platformKey,
};
