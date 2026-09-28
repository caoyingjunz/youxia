const path = require('path');
const fs = require('fs');
const https = require('https');
const { expandHome, findFile, defaultRomsPath } = require('./runtime.cjs');

const ROM_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.zip$/i;

function assertSafeRomHint(romHint) {
  const name = path.basename(String(romHint || ''));
  if (!ROM_NAME_RE.test(name)) {
    throw new Error('非法 ROM 文件名');
  }
  return name;
}

function searchRoots(settings) {
  const roots = [];
  const romsPath = expandHome(settings.romsPath || defaultRomsPath());
  if (romsPath) roots.push(romsPath);
  const extras = Array.isArray(settings.romSearchPaths) ? settings.romSearchPaths : [];
  for (const p of extras) {
    const e = expandHome(p);
    if (e && !roots.includes(e)) roots.push(e);
  }
  // 常见本机目录（只读搜索）
  const home = require('os').homedir();
  for (const rel of ['Rom', 'ROMs', 'roms', 'Games/Rom', 'Games/ROMs', 'Documents/ROMs']) {
    const p = path.join(home, rel);
    if (fs.existsSync(p) && !roots.includes(p)) roots.push(p);
  }
  return roots;
}

/** @returns {{ romHint: string, found: boolean, path: string }} */
function locateRom(romHint, settings) {
  const name = assertSafeRomHint(romHint);
  for (const root of searchRoots(settings)) {
    const hit = findFile(root, name, 5);
    if (hit) return { romHint: name, found: true, path: hit };
  }
  return { romHint: name, found: false, path: '' };
}

function locateMany(romHints, settings) {
  return (romHints || []).map((h) => locateRom(h, settings));
}

function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : null;
    if (!mod) {
      reject(new Error('仅允许 HTTPS 下载源'));
      return;
    }
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        const next = res.headers.location;
        if (!next.startsWith('https://')) {
          reject(new Error('重定向目标必须是 HTTPS'));
          return;
        }
        downloadToFile(next, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`下载失败 HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    });
    req.on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      file.close();
      fs.unlink(dest, () => {});
      reject(new Error('下载超时'));
    });
  });
}

/**
 * 从运营配置的合法镜像下载 ROM。
 * romSourceBaseUrl 示例：https://roms.example.com/arcade/
 * 实际请求：{base}{romHint}
 */
async function downloadRom(romHint, settings) {
  const name = assertSafeRomHint(romHint);
  const base = String(settings.romSourceBaseUrl || '').trim();
  if (!base) {
    throw new Error(
      '未配置 ROM 镜像地址。请在设置中填写合法的 HTTPS 源（romSourceBaseUrl），或将 ROM 放入 ROM 目录后点「搜索」。',
    );
  }
  let normalized = base;
  if (!normalized.endsWith('/')) normalized += '/';
  if (!normalized.startsWith('https://')) {
    throw new Error('ROM 镜像必须使用 HTTPS');
  }
  const url = normalized + name;
  const romsPath = expandHome(settings.romsPath || defaultRomsPath());
  fs.mkdirSync(romsPath, { recursive: true });
  const dest = path.join(romsPath, name);
  const tmp = `${dest}.part`;
  await downloadToFile(url, tmp);
  fs.renameSync(tmp, dest);
  return { romHint: name, path: dest, url };
}

module.exports = {
  locateRom,
  locateMany,
  downloadRom,
  searchRoots,
  assertSafeRomHint,
};
