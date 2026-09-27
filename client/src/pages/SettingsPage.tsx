import { FormEvent, useEffect, useState } from 'react';

type Props = {
  apiBase: string;
  onSaved: (patch: Record<string, unknown>) => Promise<void>;
};

export default function SettingsPage({ apiBase, onSaved }: Props) {
  const [form, setForm] = useState({
    apiBase,
    retroarchPath: '',
    coresPath: '',
    romsPath: '',
    netplayPort: 55435,
  });

  useEffect(() => {
    window.youxia.getSettings().then((s) => {
      setForm({
        apiBase: String(s.apiBase || apiBase),
        retroarchPath: String(s.retroarchPath || ''),
        coresPath: String(s.coresPath || ''),
        romsPath: String(s.romsPath || ''),
        netplayPort: Number(s.netplayPort || 55435),
      });
    });
  }, [apiBase]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSaved(form);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>设置</h2>
      <p className="muted">Windows 安装后在此填写 RetroArch 路径；ROM 需自行准备，平台不分发游戏文件。</p>
      {(
        [
          ['apiBase', 'API 地址'],
          ['retroarchPath', 'RetroArch 可执行文件'],
          ['coresPath', 'Cores 目录'],
          ['romsPath', 'ROM 目录'],
        ] as const
      ).map(([key, label]) => (
        <div className="form-row" key={key}>
          <label>{label}</label>
          <input
            value={String(form[key])}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}
      <div className="form-row">
        <label>Netplay 端口</label>
        <input
          type="number"
          value={form.netplayPort}
          onChange={(e) => setForm({ ...form, netplayPort: Number(e.target.value) })}
        />
      </div>
      <div className="form-actions">
        <button type="submit">保存</button>
      </div>
    </form>
  );
}
