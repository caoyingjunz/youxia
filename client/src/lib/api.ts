export type Game = {
  id: string;
  title: string;
  platform: string;
  core: string;
  romHint: string;
  coverColor: string;
  players: number;
};

export async function api<T>(
  base: string,
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

export class MatchSocket {
  private ws: WebSocket | null = null;
  onMessage: (msg: Record<string, unknown>) => void = () => {};

  connect(apiBase: string, token: string) {
    const u = new URL(apiBase);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/api/ws';
    u.search = `token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(u.toString());
    this.ws.onmessage = (ev) => {
      try {
        this.onMessage(JSON.parse(String(ev.data)));
      } catch {
        /* ignore */
      }
    };
  }

  send(msg: Record<string, unknown>) {
    this.ws?.readyState === WebSocket.OPEN && this.ws.send(JSON.stringify(msg));
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
