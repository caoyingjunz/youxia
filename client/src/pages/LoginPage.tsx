import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

type Props = {
  apiBase: string;
  onAuthed: (token: string, username: string, apiBase?: string) => Promise<void>;
};

export default function LoginPage({ apiBase, onAuthed }: Props) {
  const [base, setBase] = useState(apiBase);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const data = await api<{ token: string; user: { username: string } }>(base, path, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      await onAuthed(data.token, data.user.username, base);
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>游侠</h1>
        <p className="muted">街机联网对战 · 安装后登录即可使用 USB 手柄开玩</p>
        <div className="form-row">
          <label>服务器</label>
          <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="http://127.0.0.1:8080" />
        </div>
        <div className="form-row">
          <label>用户名</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div className="form-row">
          <label>密码</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {mode === 'login' ? '登录' : '注册并登录'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
          </button>
        </div>
      </form>
    </div>
  );
}
