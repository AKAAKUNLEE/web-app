const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 扩展管理
  getExtensions: () => ipcRenderer.invoke('extensions:list'),
  installExtension: (path) => ipcRenderer.invoke('extensions:install', path),
  removeExtension: (id) => ipcRenderer.invoke('extensions:remove', id),
  openExtensionDialog: () => ipcRenderer.invoke('extensions:open-dialog'),

  // 网络控制
  retryConnection: () => ipcRenderer.invoke('network:retry'),
  checkConnection: () => ipcRenderer.invoke('network:check'),

  // 开发者工具
  openDevTools: () => ipcRenderer.send('devtools:open'),

  // 事件监听
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (_, status) => callback(status));
  }
});
