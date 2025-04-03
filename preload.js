const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getExtensions: () => ipcRenderer.invoke('extensions:list'),
  installExtension: (path) => ipcRenderer.invoke('extensions:install', path),
  removeExtension: (id) => ipcRenderer.invoke('extensions:remove', id),
  openExtensionDialog: () => ipcRenderer.invoke('extensions:open-dialog'),
  showExtensionDetails: (id) => ipcRenderer.send('extension:show-details', id),
  onExtensionsUpdated: (callback) => {
    ipcRenderer.on('extensions:updated', (_, extensions) => callback(extensions));
  }
});
