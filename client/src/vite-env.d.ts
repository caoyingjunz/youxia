export {};

interface YouxiaAPI {
  getSettings: () => Promise<Record<string, unknown>>;
  setSettings: (patch: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setSession: (session: { token: string; username: string }) => Promise<boolean>;
  clearSession: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  gamepadHint: () => Promise<{ platform: string; hint: string }>;
  launchEmulator: (opts: Record<string, unknown>) => Promise<{ pid: number; args: string[]; localAddresses: string[] }>;
  stopEmulator: () => Promise<boolean>;
  onEmulatorExited: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    youxia: YouxiaAPI;
  }
}
