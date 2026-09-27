import { useEffect, useState } from 'react';

type PadView = {
  index: number;
  id: string;
  buttons: number;
  pressed: number;
  axes: string;
};

export default function PadsPage() {
  const [pads, setPads] = useState<PadView[]>([]);
  const [hint, setHint] = useState('');

  useEffect(() => {
    window.youxia.gamepadHint().then((h) => setHint(h.hint));
    const tick = () => {
      const list = navigator.getGamepads?.() || [];
      const next: PadView[] = [];
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (!p) continue;
        const pressed = p.buttons.filter((b) => b.pressed).length;
        next.push({
          index: i,
          id: p.id,
          buttons: p.buttons.length,
          pressed,
          axes: p.axes.map((a) => a.toFixed(2)).join(', '),
        });
      }
      setPads(next);
    };
    const id = window.setInterval(tick, 100);
    window.addEventListener('gamepadconnected', tick);
    window.addEventListener('gamepaddisconnected', tick);
    tick();
    return () => {
      clearInterval(id);
      window.removeEventListener('gamepadconnected', tick);
      window.removeEventListener('gamepaddisconnected', tick);
    };
  }, []);

  return (
    <div>
      <div className="panel">
        <h2>USB 手柄 / 街机杆</h2>
        <p className="muted">{hint || '插入 USB 设备后应出现在下方列表。游戏内输入由 RetroArch 接管。'}</p>
      </div>
      <div className="pad-list">
        {pads.length === 0 && (
          <div className="panel muted">未检测到手柄。请插入 USB 街机杆并按任意键激活。</div>
        )}
        {pads.map((p) => (
          <div className="pad-item" key={p.index}>
            <div>
              <strong>#{p.index}</strong> {p.id}
              <div className="muted">{p.buttons} 键 · 按下 {p.pressed}</div>
            </div>
            <div className="axes">{p.axes}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
