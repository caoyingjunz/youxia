export {};

interface BundledRuntime {
  available: boolean;
  platform: string;
  retroarchPath: string;
  coresPath: string;
  root: string;
}

interface RomLocateResult {
  romHint: string;
  found: boolean;
  path: string;
}

interface YouxiaAPI {
  getSettings: () => Promise<Record<string, unknown> & { bundledRuntime?: BundledRuntime }>;
  setSettings: (patch: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setSession: (session: { token: string; username: string }) => Promise<boolean>;
  clearSession: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  gamepadHint: () => Promise<{ platform: string; hint: string }>;
  launchEmulator: (opts: Record<string, unknown>) => Promise<{ pid: number; args: string[]; localAddresses: string[] }>;
  stopEmulator: () => Promise<boolean>;
  runtimeStatus: () => Promise<BundledRuntime>;
  locateRom: (romHint: string) => Promise<RomLocateResult>;
  locateRoms: (romHints: string[]) => Promise<RomLocateResult[]>;
  downloadRom: (romHint: string) => Promise<{ romHint: string; path: string; url: string }>;
  onEmulatorExited: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    youxia: YouxiaAPI;
  }
}
