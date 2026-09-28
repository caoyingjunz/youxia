import { useEffect, useState } from 'react';
import { Game } from '../lib/api';

type Props = {
  games: Game[];
  onPlay: (g: Game) => void;
  onMatch: (g: Game) => void;
  onStatus?: (msg: string) => void;
  onError?: (msg: string) => void;
};

type RomState = Record<string, { found: boolean; path: string; busy?: boolean }>;

export default function GamesPage({ games, onPlay, onMatch, onStatus, onError }: Props) {
  const [roms, setRoms] = useState<RomState>({});
  const [scanning, setScanning] = useState(false);
  const [hasSource, setHasSource] = useState(false);

  async function refreshFlags() {
    const settings = await window.youxia.getSettings();
    setHasSource(Boolean(String(settings.romSourceBaseUrl || '').trim()));
    const hints = games.map((g) => g.romHint).filter(Boolean);
    if (!hints.length) return;
    const results = await window.youxia.locateRoms(hints);
    const next: RomState = {};
    for (const r of results) {
      next[r.romHint] = { found: r.found, path: r.path };
    }
    setRoms(next);
  }

  useEffect(() => {
    refreshFlags().catch((e) => onError?.(String((e as Error).message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  async function scanAll() {
    setScanning(true);
    onStatus?.('正在本机搜索 ROM…');
    try {
      await refreshFlags();
      const found = Object.values(roms).filter((x) => x.found).length;
      onStatus?.(`搜索完成：已找到部分/全部 ROM（见游戏卡片状态）`);
      void found;
    } catch (e) {
      onError?.(String((e as Error).message || e));
    } finally {
      setScanning(false);
      await refreshFlags();
    }
  }

  async function downloadOne(g: Game) {
    setRoms((prev) => ({
      ...prev,
      [g.romHint]: { ...(prev[g.romHint] || { found: false, path: '' }), busy: true },
    }));
    onStatus?.(`正在下载 ${g.romHint}…`);
    try {
      const r = await window.youxia.downloadRom(g.romHint);
      setRoms((prev) => ({
        ...prev,
        [g.romHint]: { found: true, path: r.path, busy: false },
      }));
      onStatus?.(`已下载到 ${r.path}`);
    } catch (e) {
      setRoms((prev) => ({
        ...prev,
        [g.romHint]: { ...(prev[g.romHint] || { found: false, path: '' }), busy: false },
      }));
      onError?.(String((e as Error).message || e));
    }
  }

  return (
    <div>
      <div className="panel">
        <h2>游戏列表</h2>
        <p className="muted">
          本地/匹配开玩前需本机有对应 ROM。可「搜索本机」，或在设置配置合法 HTTPS 镜像后「下载」。
        </p>
        <div className="form-actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" onClick={scanAll} disabled={scanning}>
            {scanning ? '搜索中…' : '搜索本机 ROM'}
          </button>
        </div>
      </div>
      <div className="game-grid">
        {games.map((g) => {
          const st = roms[g.romHint];
          return (
            <div className="game-card" key={g.id}>
              <div className="game-cover" style={{ background: g.coverColor }}>
                {g.platform}
              </div>
              <div className="game-body">
                <h3>{g.title}</h3>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  ROM: {g.romHint} · {g.players}P
                  {st?.found ? ' · 已找到' : ' · 未找到'}
                </span>
                <div className="game-actions">
                  <button type="button" onClick={() => onPlay(g)}>
                    本地
                  </button>
                  <button type="button" className="secondary" onClick={() => onMatch(g)}>
                    匹配
                  </button>
                  {hasSource && !st?.found && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={st?.busy}
                      onClick={() => downloadOne(g)}
                    >
                      {st?.busy ? '下载中…' : '下载'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
