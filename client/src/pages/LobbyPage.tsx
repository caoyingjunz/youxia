type Props = {
  announcements: { id: string; title: string; body: string }[];
};

export default function LobbyPage({ announcements }: Props) {
  return (
    <div>
      <div className="panel">
        <h2>平台公告</h2>
        <p className="muted">欢迎使用游侠。请自备合法 ROM，并在设置中配置 RetroArch 与 cores / roms 路径。</p>
      </div>
      {announcements.map((a) => (
        <div className="panel" key={a.id}>
          <h2>{a.title}</h2>
          <p className="muted">{a.body}</p>
        </div>
      ))}
    </div>
  );
}
