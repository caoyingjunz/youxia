import { FormEvent, useEffect, useState } from 'react';

type Props = {
  apiBase: string;
  onSaved: (patch: Record<string, unknown>) => Promise<void>;
};

type Bundled = {
  available: boolean;
  platform: string;
  retroarchPath: string;
  coresPath: string;
  root: string;
};

export default function SettingsPage({ apiBase, onSaved }: Props) {
  const [form, setForm] = useState({
    apiBase,
    retroarchPath: '',
    coresPath: '',
    romsPath: '',
    romSourceBaseUrl: '',
    netplayPort: 55435,
  });
  const [bundled, setBundled] = useState<Bundled | null>(null);

  useEffect(() => {
    window.youxia.getSettings().then((s) => {
      setForm({
        apiBase: String(s.apiBase || apiBase),
        retroarchPath: String(s.retroarchPath || ''),
        coresPath: String(s.coresPath || ''),
        romsPath: String(s.romsPath || ''),
        romSourceBaseUrl: String(s.romSourceBaseUrl || ''),
        netplayPort: Number(s.netplayPort || 55435),
      });
      setBundled((s.bundledRuntime as Bundled) || null);
    });
  }, [apiBase]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSaved(form);
  }

  async function useBundled() {
    const st = await window.youxia.runtimeStatus();
    setBundled(st);
    if (!st.available) return;
    const next = {
      ...form,
      retroarchPath: st.retroarchPath,
      coresPath: st.coresPath,
    };
    setForm(next);
    await onSaved(next);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>设置</h2>
      <p className="muted">
        安装包可内置 RetroArch + FBNeo。ROM 需自备或从运营配置的合法 HTTPS 镜像下载（不分发商业 ROM）。
      </p>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>内置运行时</h3>
        {bundled?.available ? (
          <p className="muted">
            已就绪（{bundled.platform}）
            <br />
            <code style={{ fontSize: '0.75rem' }}>{bundled.retroarchPath}</code>
          </p>
        ) : (
          <p className="muted">
            未检测到内置运行时。开发环境请执行：
            <br />
            <code>./scripts/fetch-runtime.sh</code>
          </p>
        )}
        <button type="button" className="secondary" onClick={useBundled} disabled={!bundled?.available}>
          使用内置 RetroArch / cores
        </button>
      </div>

      {(
        [
          ['apiBase', 'API 地址', 'http://127.0.0.1:8080'],
          ['retroarchPath', 'RetroArch 可执行文件', ''],
          ['coresPath', 'Cores 目录', ''],
          ['romsPath', 'ROM 目录', '~/YouxiaRoms'],
          [
            'romSourceBaseUrl',
            'ROM 合法镜像（HTTPS，可选）',
            'https://roms.example.com/arcade/',
          ],
        ] as const
      ).map(([key, label, placeholder]) => (
        <div className="form-row" key={key}>
          <label>{label}</label>
          <input
            value={String(form[key as keyof typeof form] ?? '')}
            placeholder={placeholder}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}
      <p className="muted" style={{ fontSize: '0.8rem' }}>
        镜像地址示例：填写 <code>https://你的域名/arcade/</code> 后，下载请求为{' '}
        <code>https://你的域名/arcade/kof97.zip</code>。勿配置盗版站点。
      </p>
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
