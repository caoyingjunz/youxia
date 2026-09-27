type Props = {
  matchInfo: Record<string, unknown> | null;
  onCancel: () => void;
};

export default function MatchPage({ matchInfo, onCancel }: Props) {
  const room = (matchInfo?.room || null) as {
    id?: string;
    gameId?: string;
    hostName?: string;
    guestName?: string;
  } | null;

  return (
    <div className="panel">
      <h2>联网对战</h2>
      <p className="muted">
        在「游戏」页点击「匹配」。两名玩家排队同一游戏后自动开房：主机开 netplay，客机连接。
      </p>
      {room ? (
        <div style={{ marginTop: '1rem' }}>
          <p>房间：{room.id}</p>
          <p>游戏：{room.gameId}</p>
          <p>
            {room.hostName}（主机） vs {room.guestName}（客机）
          </p>
          <p className="muted">角色：{String(matchInfo?.role)}</p>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: '1rem' }}>当前没有进行中的对局。</p>
      )}
      <div style={{ marginTop: '1rem' }}>
        <button type="button" className="secondary" onClick={onCancel}>取消排队</button>
      </div>
    </div>
  );
}
