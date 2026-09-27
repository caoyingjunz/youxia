import { Game } from '../lib/api';

type Props = {
  games: Game[];
  onPlay: (g: Game) => void;
  onMatch: (g: Game) => void;
};

export default function GamesPage({ games, onPlay, onMatch }: Props) {
  return (
    <div>
      <div className="panel">
        <h2>游戏列表</h2>
        <p className="muted">本地游玩依赖本机 ROM；联网对战通过匹配后由 RetroArch netplay 连接。</p>
      </div>
      <div className="game-grid">
        {games.map((g) => (
          <div className="game-card" key={g.id}>
            <div className="game-cover" style={{ background: g.coverColor }}>
              {g.platform}
            </div>
            <div className="game-body">
              <h3>{g.title}</h3>
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                ROM: {g.romHint} · {g.players}P
              </span>
              <div className="game-actions">
                <button type="button" onClick={() => onPlay(g)}>本地</button>
                <button type="button" className="secondary" onClick={() => onMatch(g)}>匹配</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
