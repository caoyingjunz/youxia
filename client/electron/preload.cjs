const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('youxia', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  setSession: (session) => ipcRenderer.invoke('auth:setSession', session),
  clearSession: () => ipcRenderer.invoke('auth:clearSession'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  gamepadHint: () => ipcRenderer.invoke('gamepad:list'),
  launchEmulator: (opts) => ipcRenderer.invoke('emulator:launch', opts),
  stopEmulator: () => ipcRenderer.invoke('emulator:stop'),
  onEmulatorExited: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('emulator:exited', handler);
    return () => ipcRenderer.removeListener('emulator:exited', handler);
  },
});
