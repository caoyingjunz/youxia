import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, Game, MatchSocket } from './lib/api';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GamesPage from './pages/GamesPage';
import PadsPage from './pages/PadsPage';
import SettingsPage from './pages/SettingsPage';
import MatchPage from './pages/MatchPage';

type Tab = 'lobby' | 'games' | 'match' | 'pads' | 'settings';

export default function App() {
  const [ready, setReady] = useState(false);
  const [apiBase, setApiBase] = useState('http://127.0.0.1:8080');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [tab, setTab] = useState<Tab>('lobby');
  const [games, setGames] = useState<Game[]>([]);
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; body: string }[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [matchInfo, setMatchInfo] = useState<Record<string, unknown> | null>(null);
  const roleRef = useRef<'host' | 'guest' | ''>('');
  const gamesRef = useRef<Game[]>([]);
  const socket = useMemo(() => new MatchSocket(), []);

  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  useEffect(() => {
    (async () => {
      const s = await window.youxia.getSettings();
      setApiBase(String(s.apiBase || 'http://127.0.0.1:8080'));
      setToken(String(s.token || ''));
      setUsername(String(s.username || ''));
      setReady(true);
    })();
  }, []);

  const refreshCatalog = useCallback(async (base: string, t: string) => {
    const [g, a] = await Promise.all([
      api<Game[]>(base, '/api/games', { token: t }),
      api<{ id: string; title: string; body: string }[]>(base, '/api/announcements'),
    ]);
    setGames(g);
    setAnnouncements(a);
  }, []);

  useEffect(() => {
    if (!token) return;
    refreshCatalog(apiBase, token).catch((e) => setError(String(e.message || e)));
    socket.onMessage = async (msg) => {
      const type = String(msg.type || '');
      if (type === 'queued') setStatus(`匹配中… 队列位置 ${msg.position}`);
      if (type === 'matched') {
        const role = msg.role === 'host' ? 'host' : 'guest';
        roleRef.current = role;
        setMatchInfo(msg);
        setStatus(`已匹配！你是 ${role === 'host' ? '主机' : '客机'}`);
        setTab('match');
        const room = msg.room as { id: string; gameId: string };
        const catalog = gamesRef.current.length
          ? gamesRef.current
          : await api<Game[]>(apiBase, '/api/games');
        const game = catalog.find((x) => x.id === room.gameId);
        if (!game) return;
        if (role === 'host') {
          try {
            const launched = await window.youxia.launchEmulator({
              gameId: game.id,
              core: game.core,
              romHint: game.romHint,
              mode: 'host',
            });
            const addr = launched.localAddresses[0] || '127.0.0.1';
            const settings = await window.youxia.getSettings();
            socket.send({
              type: 'netplay_host',
              roomId: room.id,
              addr,
              port: Number(settings.netplayPort || 55435),
            });
          } catch (e) {
            setError(String((e as Error).message || e));
          }
        }
      }
      if (type === 'netplay_ready' && roleRef.current === 'guest') {
        const gameId = String(msg.gameId || '');
        const game = gamesRef.current.find((x) => x.id === gameId);
        if (!game) return;
        try {
          await window.youxia.launchEmulator({
            gameId: game.id,
            core: game.core,
            romHint: game.romHint,
            mode: 'guest',
            hostAddr: msg.hostAddr,
            hostPort: msg.hostPort,
          });
          setStatus(`正在连接主机 ${msg.hostAddr}:${msg.hostPort}`);
        } catch (e) {
          setError(String((e as Error).message || e));
        }
      }
      if (type === 'opponent_left') setStatus('对手已离开房间');
      if (type === 'error') setError(String(msg.error || '错误'));
    };
    socket.connect(apiBase, token);
    return () => socket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, apiBase]);

  async function onAuthed(nextToken: string, nextUser: string, base?: string) {
    const b = base || apiBase;
    await window.youxia.setSettings({ apiBase: b });
    await window.youxia.setSession({ token: nextToken, username: nextUser });
    setApiBase(b);
    setToken(nextToken);
    setUsername(nextUser);
    setError('');
    await refreshCatalog(b, nextToken);
  }

  async function logout() {
    await window.youxia.clearSession();
    socket.close();
    setToken('');
    setUsername('');
    setMatchInfo(null);
  }

  if (!ready) return null;

  if (!token) {
    return (
      <LoginPage
        apiBase={apiBase}
        onAuthed={onAuthed}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">游<span>侠</span></div>
        <div className="muted" style={{ fontSize: '0.85rem' }}>@{username}</div>
        <nav className="nav">
          {(
            [
              ['lobby', '大厅'],
              ['games', '游戏'],
              ['match', '对战'],
              ['pads', '手柄'],
              ['settings', '设置'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button className="secondary" onClick={logout}>退出登录</button>
      </aside>
      <main className="main">
        {error && <div className="panel error">{error}</div>}
        {status && <div className="panel ok">{status}</div>}
        {tab === 'lobby' && <LobbyPage announcements={announcements} />}
        {tab === 'games' && (
          <GamesPage
            games={games}
            onStatus={setStatus}
            onError={setError}
            onPlay={async (g) => {
              try {
                setError('');
                await window.youxia.launchEmulator({
                  gameId: g.id,
                  core: g.core,
                  romHint: g.romHint,
                  mode: 'local',
                });
                setStatus(`已启动：${g.title}`);
              } catch (e) {
                setError(String((e as Error).message || e));
              }
            }}
            onMatch={(g) => {
              setError('');
              setStatus(`正在为「${g.title}」排队…`);
              socket.send({ type: 'queue', gameId: g.id });
              setTab('match');
            }}
          />
        )}
        {tab === 'match' && (
          <MatchPage
            matchInfo={matchInfo}
            onCancel={() => {
              socket.send({ type: 'cancel_queue' });
              setStatus('已取消匹配');
            }}
          />
        )}
        {tab === 'pads' && <PadsPage />}
        {tab === 'settings' && (
          <SettingsPage
            apiBase={apiBase}
            onSaved={async (patch) => {
              const next = await window.youxia.setSettings(patch);
              setApiBase(String(next.apiBase || apiBase));
              setStatus('设置已保存');
            }}
          />
        )}
      </main>
    </div>
  );
}
